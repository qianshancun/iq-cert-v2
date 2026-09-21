import type { IQCertificatePayload } from './types';

const SECRET_SALT = 'AREALME_IQ_CERT_2026_SALT_SECURE_AUTH';
const EPOCH_DATE = new Date('2020-01-01T00:00:00Z').getTime();
const MS_PER_DAY = 86400000;

export function dateToDays(dateStr: string): number {
  const parts = dateStr.split(/[.-]/).map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return Math.floor((Date.now() - EPOCH_DATE) / MS_PER_DAY);
  }
  const d = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  return Math.max(0, Math.floor((d - EPOCH_DATE) / MS_PER_DAY));
}

export function daysToDate(days: number): string {
  const d = new Date(EPOCH_DATE + days * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlToBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return bytesToBase64Url(bytes);
}

export function base64UrlDecode(str: string): string {
  const bytes = base64UrlToBytes(str);
  return new TextDecoder().decode(bytes);
}

/**
 * Computes an 8-character hex signature for tamper-proofing
 */
export async function computeSignature(payload: Omit<IQCertificatePayload, 'sig'>): Promise<string> {
  const message = `${payload.id}|${payload.n}|${payload.s}|${payload.d}|${payload.m.join(',')}|${payload.l}|${SECRET_SALT}`;
  const data = new TextEncoder().encode(message);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8);
  }

  // Fallback FNV-1a 32-bit hash
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Serializes payload into a high-density compact binary URL token (v3).
 * Reduces payload size by ~70% compared to JSON Base64.
 */
export async function encodeCertificateToken(
  payloadWithoutSig: Omit<IQCertificatePayload, 'sig'>
): Promise<string> {
  const sig = await computeSignature(payloadWithoutSig);
  const encoder = new TextEncoder();

  const langBytes = encoder.encode(payloadWithoutSig.l || 'en');
  const nameBytes = encoder.encode(payloadWithoutSig.n);

  const rawId = payloadWithoutSig.id || '';
  const isUuid = UUID_REGEX.test(rawId);

  let idHeader = 0;
  let idBytes: Uint8Array;
  if (isUuid) {
    idHeader = 0xff; // 0xFF marks 16-byte packed UUID
    const cleanHex = rawId.replace(/-/g, '');
    idBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      idBytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
  } else {
    idBytes = encoder.encode(rawId.slice(0, 48));
    idHeader = idBytes.length;
  }

  // Parse signature into 4 bytes
  const sigHex = (sig + '00000000').slice(0, 8);
  const sigBytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    sigBytes[i] = parseInt(sigHex.substr(i * 2, 2), 16) || 0;
  }

  const days = dateToDays(payloadWithoutSig.d);
  const dims = payloadWithoutSig.m.slice(0, 7);
  while (dims.length < 7) dims.push(75);

  // Buffer: [ver=0x03, score, dayHi, dayLo, m0..m6, langLen, ...lang, nameLen, ...name, idHeader, ...idBytes, sig0..sig3]
  const totalLength =
    1 + // version 3
    1 + // score
    2 + // days (uint16)
    7 + // 7 dimensions
    1 + langBytes.length +
    1 + nameBytes.length +
    1 + idBytes.length +
    4; // signature

  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  buffer[offset++] = 0x03; // version 3
  buffer[offset++] = Math.max(0, Math.min(255, Math.round(payloadWithoutSig.s)));

  buffer[offset++] = (days >> 8) & 0xff;
  buffer[offset++] = days & 0xff;

  for (let i = 0; i < 7; i++) {
    buffer[offset++] = Math.max(0, Math.min(100, Math.round(dims[i])));
  }

  buffer[offset++] = langBytes.length;
  buffer.set(langBytes, offset);
  offset += langBytes.length;

  buffer[offset++] = nameBytes.length;
  buffer.set(nameBytes, offset);
  offset += nameBytes.length;

  buffer[offset++] = idHeader;
  buffer.set(idBytes, offset);
  offset += idBytes.length;

  buffer.set(sigBytes, offset);

  return bytesToBase64Url(buffer);
}

/**
 * Deserializes and validates a URL token.
 * Supports both modern Compact v3 tokens and legacy JSON tokens (v2).
 */
export async function decodeCertificateToken(
  token: string
): Promise<{ valid: boolean; payload: IQCertificatePayload | null }> {
  try {
    const bytes = base64UrlToBytes(token);
    if (bytes.length === 0) return { valid: false, payload: null };

    // Format v3: Compact Binary
    if (bytes[0] === 0x03) {
      if (bytes.length < 18) return { valid: false, payload: null };

      let offset = 1;
      const score = bytes[offset++];
      const days = (bytes[offset++] << 8) | bytes[offset++];
      const date = daysToDate(days);

      const m: number[] = [];
      for (let i = 0; i < 7; i++) {
        m.push(bytes[offset++]);
      }

      const langLen = bytes[offset++];
      const lang = new TextDecoder().decode(bytes.subarray(offset, offset + langLen)) || 'en';
      offset += langLen;

      const nameLen = bytes[offset++];
      const name = new TextDecoder().decode(bytes.subarray(offset, offset + nameLen));
      offset += nameLen;

      const idHeader = bytes[offset++];
      let id = '';
      if (idHeader === 0xff) {
        // Reconstruct UUID
        const hexParts: string[] = [];
        for (let i = 0; i < 16; i++) {
          hexParts.push(bytes[offset++].toString(16).padStart(2, '0'));
        }
        const fullHex = hexParts.join('');
        id = `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-${fullHex.slice(12, 16)}-${fullHex.slice(16, 20)}-${fullHex.slice(20)}`;
      } else {
        id = new TextDecoder().decode(bytes.subarray(offset, offset + idHeader));
        offset += idHeader;
      }

      const sigParts: string[] = [];
      for (let i = 0; i < 4; i++) {
        sigParts.push(bytes[offset++].toString(16).padStart(2, '0'));
      }
      const sig = sigParts.join('');

      const basePayload: Omit<IQCertificatePayload, 'sig'> = {
        id,
        n: name,
        s: score,
        d: date,
        m,
        l: lang,
        v: 3,
      };

      const expectedSig = await computeSignature(basePayload);
      const valid = sig.toLowerCase() === expectedSig.toLowerCase();

      return {
        valid,
        payload: {
          ...basePayload,
          sig,
        },
      };
    }

    // Format v2: Legacy JSON
    const json = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json) as IQCertificatePayload;
    if (!payload || !payload.n || typeof payload.s !== 'number' || !Array.isArray(payload.m)) {
      return { valid: false, payload: null };
    }
    const expectedSig = await computeSignature({
      id: payload.id || '',
      n: payload.n,
      s: payload.s,
      d: payload.d || '',
      m: payload.m,
      l: payload.l || 'en',
      v: payload.v || 2,
    });
    const valid = payload.sig === expectedSig;
    return { valid, payload };
  } catch (_e) {
    return { valid: false, payload: null };
  }
}
