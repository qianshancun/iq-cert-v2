import type { IQCertificatePayload, IQCertificateReference } from './types';
const ageLabels: Record<string, string> = { under_13: '<13', '13_17': '13–17', '18_34': '18–34', '35_54': '35–54', '55_plus': '55+' };
/** Whitelist fields: private age metadata is never copied to a public token by default. */
export function publicReference(value: unknown, publishAge = false): IQCertificateReference | undefined {
  const r = value as IQCertificateReference;
  if (!r || typeof r.model !== 'string' || !/^(n\d{8}[a-z]|linear-v1)$/.test(r.model)
    || !['pooled','age-adjusted','approximate'].includes(r.kind) || !['quick','complete','standard'].includes(r.mode)
    || !Number.isInteger(r.sampleSize) || r.sampleSize < 0 || r.sampleSize > 100000000
    || !Array.isArray(r.period) || r.period.length !== 2 || !r.period.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x))
    || (r.percentile !== null && (!Number.isFinite(r.percentile) || r.percentile < 0 || r.percentile > 100))) return undefined;
  return { model: r.model, kind: r.kind, mode: r.mode, sampleSize: r.sampleSize,
    period: [...r.period] as [string,string], percentile: r.percentile === null ? null : Math.round(r.percentile * 10) / 10,
    ...(publishAge && r.ageGroup && Object.prototype.hasOwnProperty.call(ageLabels, r.ageGroup) ? { ageGroup: r.ageGroup } : {}) };
}
export function referenceFooter(payload: IQCertificatePayload): string {
  const r = payload.r;
  if (!r) return 'Historical result · Original scoring model · Online test record';
  const basis = r.kind === 'age-adjusted' ? 'Age-adjusted reference' : r.kind === 'pooled' ? 'Overall reference' : 'Approximate result';
  return `${r.model} · ${basis}${r.ageGroup ? ` · Age ${ageLabels[r.ageGroup]}` : ''} · ${r.mode === 'quick' ? 'Quick' : r.mode === 'complete' ? 'Complete' : 'Standard'}`;
}
export function referenceDetail(payload: IQCertificatePayload): string {
  const r = payload.r;
  return r && r.sampleSize ? `All languages · N=${r.sampleSize} · ${r.period.join('–')} · Online test; not clinical`
    : 'Online test record · Not a clinical assessment';
}
export function percentileLabel(payload: IQCertificatePayload): string {
  return payload.r?.percentile != null ? `P${payload.r.percentile.toFixed(1)}` : 'RECORDED SCORE';
}
