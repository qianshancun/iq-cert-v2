import { ARCHETYPES, DIMENSION_KEYS, DIMENSION_LABELS } from '../../shared/constants';
import type { IQArchetype, IQDimensionKey, IQDimensionScore } from '../../shared/types';

export function getArchetype(score: number): IQArchetype {
  for (const a of ARCHETYPES) {
    if (score <= a.max) return a;
  }
  return ARCHETYPES[ARCHETYPES.length - 1];
}

export function normalizeDimensions(
  input?: IQDimensionScore[] | Record<string, number> | number[]
): IQDimensionScore[] {
  if (Array.isArray(input) && input.length === 7 && typeof input[0] === 'number') {
    return DIMENSION_KEYS.map((key, i) => ({
      key,
      label: key,
      percent: Math.min(100, Math.max(0, (input as number[])[i])),
    }));
  }

  if (Array.isArray(input)) {
    const list = input as IQDimensionScore[];
    return DIMENSION_KEYS.map((k) => {
      const found = list.find((d) => d.key === k);
      return {
        key: k,
        label: found?.label || k,
        percent: found ? Math.min(100, Math.max(0, found.percent)) : 75,
      };
    });
  }

  if (input && typeof input === 'object') {
    const map = input as Record<string, number>;
    return DIMENSION_KEYS.map((k) => ({
      key: k,
      label: k,
      percent: typeof map[k] === 'number' ? Math.min(100, Math.max(0, map[k])) : 75,
    }));
  }

  // Default fallback values if no dimension data was provided
  return [
    { key: 'pattern', label: 'Pattern', percent: 80 },
    { key: 'spatial', label: 'Spatial', percent: 82 },
    { key: 'numerical', label: 'Numerical', percent: 75 },
    { key: 'logic', label: 'Logic', percent: 88 },
    { key: 'memory', label: 'Memory', percent: 70 },
    { key: 'planning', label: 'Planning', percent: 85 },
    { key: 'attention', label: 'Attention', percent: 90 },
  ];
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'center',
  maxWidth: number = 0
): void {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  if (maxWidth > 0) {
    const metrics = ctx.measureText(text);
    if (metrics.width > maxWidth) {
      const scale = maxWidth / metrics.width;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillText(text, 0, 0);
      ctx.restore();
      return;
    }
  }

  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = 'center'
): number {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  const words = text.includes(' ') ? text.split(' ') : Array.from(text);
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line && text.includes(' ') ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n];
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
  ctx.restore();
  return curY + lineHeight;
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  percent: number,
  bgColor: string,
  fillColor: string,
  radius: number = 3
): void {
  ctx.save();
  // Background
  ctx.fillStyle = bgColor;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, width, height);
  }

  // Active fill
  const fillWidth = Math.max(0, Math.min(width, (width * percent) / 100));
  if (fillWidth > 0) {
    ctx.fillStyle = fillColor;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, fillWidth, height, radius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, fillWidth, height);
    }
  }
  ctx.restore();
}

/**
 * Draws a 7-axis heptagonal Radar/Spider Chart on Canvas
 */
export function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  dimensions: IQDimensionScore[],
  lang: string,
  theme: {
    gridColor: string;
    axisColor: string;
    fillColor: string;
    strokeColor: string;
    labelColor: string;
    valueColor: string;
  }
): void {
  const count = dimensions.length;
  if (count < 3) return;

  const angleStep = (Math.PI * 2) / count;
  const startAngle = -Math.PI / 2; // top vertex

  ctx.save();

  // Draw concentric webs (25%, 50%, 75%, 100%)
  const steps = [0.25, 0.5, 0.75, 1.0];
  ctx.strokeStyle = theme.gridColor;
  ctx.lineWidth = 1;

  for (const step of steps) {
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const r = radius * step;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw radial axis lines
  ctx.strokeStyle = theme.axisColor;
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Draw polygon data area
  ctx.beginPath();
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const ratio = Math.max(0.1, Math.min(1.0, dimensions[i].percent / 100));
    const r = radius * ratio;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    points.push({ x, y });
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Translucent fill
  ctx.fillStyle = theme.fillColor;
  ctx.fill();

  // Border line
  ctx.strokeStyle = theme.strokeColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw vertex dots
  ctx.fillStyle = theme.strokeColor;
  for (const pt of points) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw outer labels
  const isZh = lang === 'cn' || lang === 'zh-CN';
  ctx.font = 'bold 11px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const labelDist = radius + 22;
    const lx = centerX + Math.cos(angle) * labelDist;
    const ly = centerY + Math.sin(angle) * labelDist;

    const dimKey = dimensions[i].key;
    const labelText = DIMENSION_LABELS.en[dimKey]?.name || dimKey;

    let align: CanvasTextAlign = 'center';
    if (Math.cos(angle) > 0.3) align = 'left';
    else if (Math.cos(angle) < -0.3) align = 'right';

    ctx.fillStyle = theme.labelColor;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(`${labelText} ${dimensions[i].percent}%`, lx, ly);
  }

  ctx.restore();
}
