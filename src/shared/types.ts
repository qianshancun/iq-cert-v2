/**
 * ARealMe IQ Certificate System 2.0 - Shared Types
 */

export type IQDimensionKey =
  | 'pattern'
  | 'spatial'
  | 'numerical'
  | 'logic'
  | 'memory'
  | 'planning'
  | 'attention';

export interface IQDimensionScore {
  key: IQDimensionKey;
  label: string;
  percent: number; // 0 - 100
}

export type IQCertDesign = 'academic' | 'swiss' | 'royal';

export type IQLanguage = 'en' | 'cn' | 'zh-CN';

export interface IQCertificateStartData {
  score: number;
  date?: string; // YYYY.MM.DD
  attemptId?: string;
  dimensions?: IQDimensionScore[] | Record<string, number> | number[];
  lang?: IQLanguage | string;
  lockedName?: string;
  verifyBaseUrl?: string;
  reference?: IQCertificateReference;
  publishAgeGroup?: boolean;
  ageDisclosureLabel?: string;
}

export interface IQCertificateReference {
  model: string;
  kind: 'pooled' | 'age-adjusted' | 'approximate';
  mode: 'quick' | 'complete' | 'standard';
  sampleSize: number;
  period: [string, string];
  percentile: number | null;
  ageGroup?: string;
}
export interface IQCertificatePayload {
  r?: IQCertificateReference;
  id: string;        // Attempt ID / Unique Hash
  n: string;         // Candidate Name / Initials
  s: number;         // Score (e.g. 141)
  d: string;         // Date (YYYY.MM.DD)
  m: number[];       // 7 Dimension percentages in standard order: [pattern, spatial, numerical, logic, memory, planning, attention]
  l: string;         // Language ('en' | 'cn')
  sig?: string;      // Public-client integrity checksum; not issuer authentication
  v: number;         // Payload version (2, 3 or 4)
}

export interface IQArchetype {
  max: number;
  titleEn: string;
  titleCn: string;
  subtitleEn: string;
  subtitleCn: string;
  percentile: string;
}
