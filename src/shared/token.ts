import type { IQCertificatePayload } from './types';

const SECRET_SALT = 'AREALME_IQ_CERT_2026_SALT_SECURE_AUTH';

/**
 * Fast Base64URL encoder/decoder supporting Unicode strings
 */
export function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Computes a fast 8-character hex signature for tamper-proofing
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

/**
 * Serializes payload into a URL token
 */
export async function encodeCertificateToken(
  payloadWithoutSig: Omit<IQCertificatePayload, 'sig'>
): Promise<string> {
  const sig = await computeSignature(payloadWithoutSig);
  const fullPayload: IQCertificatePayload = {
    ...payloadWithoutSig,
    sig,
  };
  const json = JSON.stringify(fullPayload);
  return base64UrlEncode(json);
}

/**
 * Deserializes and validates a URL token
 */
export async function decodeCertificateToken(
  token: string
): Promise<{ valid: boolean; payload: IQCertificatePayload | null }> {
  try {
    const json = base64UrlDecode(token);
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
