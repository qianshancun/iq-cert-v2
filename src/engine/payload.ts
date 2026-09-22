import { DEFAULT_VERIFY_BASE_URL, buildVerifyUrl } from '../shared/constants';
import { encodeCertificateToken } from '../shared/token';
import type { IQCertificatePayload, IQCertificateStartData } from '../shared/types';

export interface BuiltCertificate {
  payload: IQCertificatePayload;
  token: string;
  verifyUrl: string;
}

/** Normalise host data + bearer name into a signed payload and its verification URL. */
export async function buildCertificatePayload(
  data: IQCertificateStartData,
  name: string
): Promise<BuiltCertificate> {
  const score = Number(data.score) || 100;
  const date = data.date || new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const attemptId = data.attemptId || Math.random().toString(36).slice(2, 10);
  const recordedLang = (data.lang || 'en').trim();

  const rawDimensions = data.dimensions;
  let norm: number[];
  if (Array.isArray(rawDimensions) && rawDimensions.length === 7 && typeof rawDimensions[0] === 'number') {
    norm = rawDimensions as number[];
  } else if (Array.isArray(rawDimensions)) {
    norm = (rawDimensions as Array<{ percent?: number }>).map((d) => d.percent ?? 75);
  } else if (rawDimensions && typeof rawDimensions === 'object') {
    const map = rawDimensions as Record<string, number>;
    norm = ['pattern', 'spatial', 'numerical', 'logic', 'memory', 'planning', 'attention'].map((k) =>
      typeof map[k] === 'number' ? map[k] : 75
    );
  } else {
    norm = [80, 82, 75, 88, 70, 85, 90];
  }

  const basePayload: Omit<IQCertificatePayload, 'sig'> = {
    id: attemptId,
    n: name.trim(),
    s: score,
    d: date,
    m: norm,
    l: recordedLang,
    v: 3,
  };

  const token = await encodeCertificateToken(basePayload);
  const verifyUrl = buildVerifyUrl(token, data.verifyBaseUrl || DEFAULT_VERIFY_BASE_URL);

  return {
    payload: { ...basePayload, sig: token.slice(-8) },
    token,
    verifyUrl,
  };
}
