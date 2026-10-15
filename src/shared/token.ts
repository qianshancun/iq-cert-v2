import { publicReference } from './reference';
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
 * Computes a public-client checksum. This is not proof of issuer authenticity.
 */
export async function computeSignature(payload: Omit<IQCertificatePayload, 'sig'>): Promise<string> {
  const reference = payload.v >= 4 && payload.r ? `|v4|${JSON.stringify(publicReference(payload.r, true))}` : '';
  const message = `${payload.id}|${payload.n}|${payload.s}|${payload.d}|${payload.m.join(',')}|${payload.l}|${SECRET_SALT}${reference}`;
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

const REFERENCE_KINDS = ['pooled','age-adjusted','approximate'] as const;
const REFERENCE_MODES = ['quick','complete','standard'] as const;
const REFERENCE_AGES = ['', 'under_13','13_17','18_34','35_54','55_plus'];
function encodeReference(value: NonNullable<IQCertificatePayload['r']>): Uint8Array {
  const model = new TextEncoder().encode(value.model);
  const bytes = new Uint8Array(1 + model.length + 13);
  bytes[0] = model.length; bytes.set(model,1);
  const view = new DataView(bytes.buffer); let i=1+model.length;
  bytes[i++] = REFERENCE_KINDS.indexOf(value.kind); bytes[i++] = REFERENCE_MODES.indexOf(value.mode);
  view.setUint32(i,value.sampleSize);i+=4;
  view.setUint16(i,dateToDays(value.period[0]));i+=2;
  view.setUint16(i,dateToDays(value.period[1]));i+=2;
  view.setUint16(i,value.percentile === null ? 65535 : Math.round(value.percentile*10));i+=2;
  bytes[i] = Math.max(0,REFERENCE_AGES.indexOf(value.ageGroup || ''));
  return bytes;
}
function decodeReference(bytes: Uint8Array): IQCertificatePayload['r'] {
  const length=bytes[0];
  if (!length || bytes.length !== 1+length+13) return undefined;
  const model=new TextDecoder().decode(bytes.subarray(1,1+length));
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let i=1+length;
  const kind=REFERENCE_KINDS[bytes[i++]],mode=REFERENCE_MODES[bytes[i++]];
  const sampleSize=view.getUint32(i);i+=4;
  const start=daysToDate(view.getUint16(i)).replace(/\./g,'-');i+=2;
  const end=daysToDate(view.getUint16(i)).replace(/\./g,'-');i+=2;
  const p=view.getUint16(i);i+=2;
  const age=bytes[i];if(age>=REFERENCE_AGES.length)return undefined;
  return publicReference({model,kind,mode,sampleSize,period:[start,end],percentile:p===65535?null:p/10,
    ...(age ? {ageGroup:REFERENCE_AGES[age]} : {})},true);
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

  const ref = publicReference(payloadWithoutSig.r, true);
  if (payloadWithoutSig.r && !ref) throw new Error('Invalid score reference');
  const refBytes = ref ? encodeReference(ref) : new Uint8Array();
  if (refBytes.length > 1024) throw new Error('Reference too large');
  const langBytes = encoder.encode(payloadWithoutSig.l || 'en');
  const nameBytes = encoder.encode(payloadWithoutSig.n);
  if (langBytes.length > 32 || nameBytes.length > 255) throw new Error('Certificate text too long');

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
    (ref ? 2 + refBytes.length : 0) +
    4; // signature

  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  buffer[offset++] = ref ? 0x04 : 0x03;
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

  if (ref) {
    buffer[offset++] = (refBytes.length >> 8) & 0xff;
    buffer[offset++] = refBytes.length & 0xff;
    buffer.set(refBytes, offset);
    offset += refBytes.length;
  }
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
    if (token.length > 4096) return { valid: false, payload: null };
    const bytes = base64UrlToBytes(token);
    if (bytes.length === 0) return { valid: false, payload: null };

    // Format v3: Compact Binary
    if (bytes[0] === 0x03 || bytes[0] === 0x04) {
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

      let reference;
      if (bytes[0] === 0x04) {
        const length = (bytes[offset++] << 8) | bytes[offset++];
        if (length > 1024 || offset + length + 4 !== bytes.length) return { valid: false, payload: null };
        reference = decodeReference(bytes.subarray(offset, offset + length));
        if (!reference) return { valid: false, payload: null };
        offset += length;
      }
      if (offset + 4 !== bytes.length || score > 160 || m.some(x => x > 100)) return { valid: false, payload: null };
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
        v: bytes[0],
        ...(reference ? { r: reference } : {}),
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
    if (!payload || typeof payload.n !== 'string' || !payload.n || typeof payload.s !== 'number' || !Array.isArray(payload.m) || payload.r !== undefined || payload.v >= 4) {
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
