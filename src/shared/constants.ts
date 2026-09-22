import type { IQArchetype, IQDimensionKey } from './types';

export const DIMENSION_KEYS: IQDimensionKey[] = [
  'pattern',
  'spatial',
  'numerical',
  'logic',
  'memory',
  'planning',
  'attention',
];

export const DIMENSION_LABELS: Record<
  string,
  Record<IQDimensionKey, { name: string; desc: string }>
> = {
  en: {
    pattern: {
      name: 'Pattern Recognition',
      desc: 'Identifying underlying order and geometric progression in complex visual sequences.',
    },
    spatial: {
      name: 'Visual-Spatial',
      desc: 'Mental manipulation, rotation, and structural reasoning in 2D and 3D space.',
    },
    numerical: {
      name: 'Numerical Ability',
      desc: 'Mathematical relationships, series convergence, and rapid quantitative intuition.',
    },
    logic: {
      name: 'Logical Reasoning',
      desc: 'Deductive and inductive inference based on formal premise constraints.',
    },
    memory: {
      name: 'Working Memory',
      desc: 'Temporary retention and active processing of multi-faceted symbolic elements.',
    },
    planning: {
      name: 'Planning Ability',
      desc: 'Formulating step-by-step strategies to achieve optimal solutions in minimum moves.',
    },
    attention: {
      name: 'Attention & Focus',
      desc: 'Sustained perceptual vigilance and error-free discrimination under time pressure.',
    },
  },
  cn: {
    pattern: {
      name: '模式识别',
      desc: '在复杂视觉图形中洞察潜在规律与结构演变能力。',
    },
    spatial: {
      name: '视觉空间',
      desc: '在二维与三维空间中进行心智旋转、透视与空间构想能力。',
    },
    numerical: {
      name: '数字能力',
      desc: '数列规律、数量关系辨析与严谨的定量直觉计算。',
    },
    logic: {
      name: '逻辑推理',
      desc: '根据严格逻辑公理进行演绎推导与有效归纳推理能力。',
    },
    memory: {
      name: '工作记忆',
      desc: '在心智中即时保持多重信息单元并执行动态加工的能力。',
    },
    planning: {
      name: '规划能力',
      desc: '预见可能步骤、前瞻性统筹全局并制定最优策略的能力。',
    },
    attention: {
      name: '注意力',
      desc: '在高难度任务中维持高度专注与抗干扰抗疲劳的敏锐度。',
    },
  },
};

export const ARCHETYPES: IQArchetype[] = [
  {
    max: 99,
    titleEn: 'Cognitive Explorer',
    titleCn: '认知探索者',
    subtitleEn: 'Demonstrates foundational cognitive awareness and adaptable problem solving.',
    subtitleCn: '具备扎实的日常认知理解力与敏捷的问题适应能力。',
    percentile: 'Top 50%',
  },
  {
    max: 114,
    titleEn: 'Analytical Thinker',
    titleCn: '理性思考者',
    subtitleEn: 'Solid reasoning skills, systematic approach, and balanced processing speed.',
    subtitleCn: '思维严密，拥有优于常人的系统化分析与综合逻辑推理能力。',
    percentile: 'Top 25%',
  },
  {
    max: 129,
    titleEn: 'High Distinction Strategist',
    titleCn: '杰出战略家',
    subtitleEn: 'Sharp cognitive faculties, rapid pattern extraction, and superior comprehension.',
    subtitleCn: '认知洞察力敏锐，能够以极高速度提炼复杂规律与应对高维挑战。',
    percentile: 'Top 5%',
  },
  {
    max: 144,
    titleEn: 'Superior Intellect Visionary',
    titleCn: '超常智力 · 远见者',
    subtitleEn: 'Exceptional abstract reasoning, multi-layered synthesis, and rare mental agility.',
    subtitleCn: '卓越的高阶抽象思维与罕见的超常多层认知整合力。',
    percentile: 'Top 0.5%',
  },
  {
    max: 999,
    titleEn: 'Grandmaster Sovereign',
    titleCn: '大师级认知领袖',
    subtitleEn: 'Pinnacle cognitive processing power and extraordinary intellectual prowess.',
    subtitleCn: '人类智力分布顶峰水准，极致的逻辑推演与超凡认知掌控力。',
    percentile: 'Top 0.1%',
  },
];

export {
  COMPACT_BLACKLIST,
  WORD_BLACKLIST,
  isSensitiveName,
  normalizeInputName,
} from './sensitive';

/** Legacy array export maintained for backward compatibility. */
export const BLACKLIST = [
  'KKK',
  'ASS',
  'SEX',
  'FUC',
  'FUK',
  'CNT',
  'GAY',
  'NIG',
  'WAP',
  'WTF',
  'JAP',
  'SB',
  'FUCK',
  'SHIT',
  'BITCH',
  'NIGGER',
  'CNM',
  'NMSL',
];

/** Canonical SEO-friendly verification base path (no trailing slash). */
export const DEFAULT_VERIFY_BASE_URL = 'https://www.arealme.com/iq/cert/v';

/**
 * Build a path-based verification URL:
 *   https://www.arealme.com/iq/cert/v/<compact-token>
 */
export function buildVerifyUrl(token: string, baseUrl: string = DEFAULT_VERIFY_BASE_URL): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/${token}`;
}

/**
 * Extract a certificate token from either:
 *   /iq/cert/v/<token>
 *   /cert/iq/v/<token>
 *   /iq/cert/verify/<token>
 *   /cert/iq/verify/<token>
 *   ?d=<token>   (legacy query form)
 */
export function extractTokenFromLocation(
  pathname: string,
  search: string | URLSearchParams = ''
): string | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search) : search;
  const queryToken = params.get('d');
  if (queryToken) return queryToken;

  const cleaned = pathname.replace(/\/+$/, '');
  const match = cleaned.match(/\/(?:v|verify)\/([^/?#]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
