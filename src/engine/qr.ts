/**
 * Standalone QR Code Generator for Canvas
 * Based on Project Nayuki (MIT License) - Zero Dependencies
 */

export namespace qrcodegen {
  export type bit = number;
  export type byte = number;
  export type int = number;

  export class QrCode {
    public static encodeText(text: string, ecl: Ecc): QrCode {
      const segs: QrSegment[] = QrSegment.makeSegments(text);
      return QrCode.encodeSegments(segs, ecl);
    }

    public static encodeSegments(
      segs: Readonly<Array<QrSegment>>,
      ecl: Ecc,
      minVersion: int = 1,
      maxVersion: int = 40,
      mask: int = -1,
      boostEcl: boolean = true
    ): QrCode {
      if (!(1 <= minVersion && minVersion <= maxVersion && maxVersion <= 40) || mask < -1 || mask > 7) {
        throw new RangeError('Invalid value');
      }

      let version: int;
      let dataUsedBits: int;
      for (version = minVersion; ; version++) {
        const dataCapacityBits: int = QrCode.getNumDataCodewords(version, ecl) * 8;
        const usedBits: number = QrSegment.getTotalBits(segs, version);
        if (usedBits <= dataCapacityBits) {
          dataUsedBits = usedBits;
          break;
        }
        if (version >= maxVersion) throw new RangeError('Data too long');
      }

      for (const newEcl of [Ecc.MEDIUM, Ecc.QUARTILE, Ecc.HIGH]) {
        if (boostEcl && dataUsedBits <= QrCode.getNumDataCodewords(version, newEcl) * 8) ecl = newEcl;
      }

      const bb: Array<bit> = [];
      for (const seg of segs) {
        bb.push(...QrCode.getBits(seg.mode.modeBits, 4));
        bb.push(...QrCode.getBits(seg.numChars, seg.mode.numCharCountBits(version)));
        for (const b of seg.getData()) bb.push(b);
      }

      const dataCapacityBits: int = QrCode.getNumDataCodewords(version, ecl) * 8;
      const terminatorBits = Math.min(4, dataCapacityBits - bb.length);
      for (let i = 0; i < terminatorBits; i++) bb.push(0);

      while (bb.length % 8 !== 0) bb.push(0);

      const padBytes = [0xec, 0x11];
      let padIdx = 0;
      while (bb.length < dataCapacityBits) {
        bb.push(...QrCode.getBits(padBytes[padIdx % 2], 8));
        padIdx++;
      }

      const dataCodewords: Array<byte> = [];
      while (dataCodewords.length * 8 < bb.length) {
        let b = 0;
        for (let i = 0; i < 8; i++) b = (b << 1) | bb[dataCodewords.length * 8 + i];
        dataCodewords.push(b);
      }

      return new QrCode(version, ecl, dataCodewords, mask);
    }

    public readonly size: int;
    public readonly mask: int;
    private readonly modules: Array<Array<boolean>> = [];
    private readonly isFunction: Array<Array<boolean>> = [];

    public constructor(
      public readonly version: int,
      public readonly errorCorrectionLevel: Ecc,
      dataCodewords: Readonly<Array<byte>>,
      msk: int
    ) {
      this.size = version * 4 + 17;
      const row: Array<boolean> = [];
      for (let i = 0; i < this.size; i++) row.push(false);
      for (let i = 0; i < this.size; i++) {
        this.modules.push(row.slice());
        this.isFunction.push(row.slice());
      }

      this.drawFunctionPatterns();
      const allCodewords: Array<byte> = this.addEccAndInterleave(dataCodewords);
      this.drawCodewords(allCodewords);

      if (msk === -1) {
        let minPenalty = 1000000000;
        for (let i = 0; i < 8; i++) {
          this.applyMask(i);
          this.drawFormatBits(i);
          const penalty = this.getPenaltyScore();
          if (penalty < minPenalty) {
            minPenalty = penalty;
            msk = i;
          }
          this.applyMask(i);
        }
      }
      this.mask = msk;
      this.applyMask(msk);
      this.drawFormatBits(msk);
      this.isFunction = [];
    }

    public getModule(x: int, y: int): boolean {
      return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y][x];
    }

    private drawFunctionPatterns(): void {
      for (let i = 0; i < this.size; i++) {
        this.setFunctionModule(6, i, i % 2 === 0);
        this.setFunctionModule(i, 6, i % 2 === 0);
      }
      this.drawFinderPattern(3, 3);
      this.drawFinderPattern(this.size - 4, 3);
      this.drawFinderPattern(3, this.size - 4);

      const alignPatPos: Array<int> = this.getAlignmentPatternPositions();
      const numAlign: int = alignPatPos.length;
      for (let i = 0; i < numAlign; i++) {
        for (let j = 0; j < numAlign; j++) {
          if (
            !(
              (i === 0 && j === 0) ||
              (i === 0 && j === numAlign - 1) ||
              (i === numAlign - 1 && j === 0)
            )
          ) {
            this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
          }
        }
      }

      this.drawFormatBits(0);
      this.drawVersion();
    }

    private drawFormatBits(mask: int): void {
      const data: int = (this.errorCorrectionLevel.formatBits << 3) | mask;
      let rem: int = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = ((data << 10) | rem) ^ 0x5412;

      for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, QrCode.getBit(bits, i));
      this.setFunctionModule(8, 7, QrCode.getBit(bits, 6));
      this.setFunctionModule(8, 8, QrCode.getBit(bits, 7));
      this.setFunctionModule(7, 8, QrCode.getBit(bits, 8));
      for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, QrCode.getBit(bits, i));

      for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, QrCode.getBit(bits, i));
      for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, QrCode.getBit(bits, i));
      this.setFunctionModule(8, this.size - 8, true);
    }

    private drawVersion(): void {
      if (this.version < 7) return;
      let rem: int = this.version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits: int = (this.version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const color: boolean = QrCode.getBit(bits, i);
        const a: int = this.size - 11 + (i % 3);
        const b: int = Math.floor(i / 3);
        this.setFunctionModule(a, b, color);
        this.setFunctionModule(b, a, color);
      }
    }

    private drawFinderPattern(x: int, y: int): void {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const dist: int = Math.max(Math.abs(dx), Math.abs(dy));
          const xx: int = x + dx;
          const yy: int = y + dy;
          if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size) {
            this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
          }
        }
      }
    }

    private drawAlignmentPattern(x: int, y: int): void {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }

    private setFunctionModule(x: int, y: int, isDark: boolean): void {
      this.modules[y][x] = isDark;
      this.isFunction[y][x] = true;
    }

    private addEccAndInterleave(data: Readonly<Array<byte>>): Array<byte> {
      const ver: int = this.version;
      const ecl: Ecc = this.errorCorrectionLevel;
      const numBlocks: int = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
      const blockEccLen: int = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
      const rawCodewords: int = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
      const numShortBlocks: int = numBlocks - (rawCodewords % numBlocks);
      const shortBlockLen: int = Math.floor(rawCodewords / numBlocks);

      const blocks: Array<Array<byte>> = [];
      const rsDiv: Array<byte> = QrCode.reedSolomonComputeDivisor(blockEccLen);
      for (let i = 0, k = 0; i < numBlocks; i++) {
        const dat: Array<byte> = data.slice(k, k + shortBlockLen - blockEccLen + (i >= numShortBlocks ? 1 : 0));
        k += dat.length;
        const ecc: Array<byte> = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
        if (i >= numShortBlocks) dat.push(0);
        blocks.push(dat.concat(ecc));
      }

      const result: Array<byte> = [];
      for (let i = 0; i < blocks[0].length; i++) {
        for (let j = 0; j < blocks.length; j++) {
          if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(blocks[j][i]);
        }
      }
      return result;
    }

    private drawCodewords(data: Readonly<Array<byte>>): void {
      let i: int = 0;
      for (let right = this.size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < this.size; vert++) {
          for (let j = 0; j < 2; j++) {
            const x: int = right - j;
            const upward: boolean = ((right + 1) & 2) === 0;
            const y: int = upward ? this.size - 1 - vert : vert;
            if (!this.isFunction[y][x] && i < data.length * 8) {
              this.modules[y][x] = QrCode.getBit(data[i >>> 3], 7 - (i & 7));
              i++;
            }
          }
        }
      }
    }

    private applyMask(mask: int): void {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          let invert: boolean;
          switch (mask) {
            case 0:  invert = (x + y) % 2 === 0; break;
            case 1:  invert = y % 2 === 0; break;
            case 2:  invert = x % 3 === 0; break;
            case 3:  invert = (x + y) % 3 === 0; break;
            case 4:  invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5:  invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6:  invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            case 7:  invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            default: throw new Error('Unreachable');
          }
          if (!this.isFunction[y][x] && invert) this.modules[y][x] = !this.modules[y][x];
        }
      }
    }

    private getPenaltyScore(): int {
      let result: int = 0;
      for (let y = 0; y < this.size; y++) {
        let runColor = false;
        let runVal = 0;
        for (let x = 0; x < this.size; x++) {
          if (this.modules[y][x] === runColor) {
            runVal++;
            if (runVal === 5) result += 3;
            else if (runVal > 5) result++;
          } else {
            runColor = this.modules[y][x];
            runVal = 1;
          }
        }
      }
      for (let x = 0; x < this.size; x++) {
        let runColor = false;
        let runVal = 0;
        for (let y = 0; y < this.size; y++) {
          if (this.modules[y][x] === runColor) {
            runVal++;
            if (runVal === 5) result += 3;
            else if (runVal > 5) result++;
          } else {
            runColor = this.modules[y][x];
            runVal = 1;
          }
        }
      }
      return result;
    }

    private getAlignmentPatternPositions(): Array<int> {
      if (this.version === 1) return [];
      const numAlign: int = Math.floor(this.version / 7) + 2;
      const step: int =
        this.version === 32 ? 26 : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
      const result: Array<int> = [6];
      for (let pos = this.size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
      return result;
    }

    private static getNumRawDataModules(ver: int): int {
      let result: int = (16 * ver + 128) * ver + 64;
      if (ver >= 2) {
        const numAlign: int = Math.floor(ver / 7) + 2;
        result -= (25 * numAlign - 10) * numAlign - 55;
        if (ver >= 7) result -= 36;
      }
      return result;
    }

    private static getNumDataCodewords(ver: int, ecl: Ecc): int {
      return (
        Math.floor(QrCode.getNumRawDataModules(ver) / 8) -
        QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] *
          QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver]
      );
    }

    private static reedSolomonComputeDivisor(degree: int): Array<byte> {
      const result: Array<byte> = [];
      for (let i = 0; i < degree - 1; i++) result.push(0);
      result.push(1);
      let root = 1;
      for (let i = 0; i < degree; i++) {
        for (let j = 0; j < result.length; j++) {
          result[j] = QrCode.reedSolomonMultiply(result[j], root);
          if (j + 1 < result.length) result[j] ^= result[j + 1];
        }
        root = QrCode.reedSolomonMultiply(root, 0x02);
      }
      return result;
    }

    private static reedSolomonComputeRemainder(data: Readonly<Array<byte>>, divisor: Readonly<Array<byte>>): Array<byte> {
      const result: Array<byte> = divisor.map((_) => 0);
      for (const b of data) {
        const factor: byte = b ^ (result.shift() as byte);
        result.push(0);
        divisor.forEach((coef, i) => (result[i] ^= QrCode.reedSolomonMultiply(coef, factor)));
      }
      return result;
    }

    private static reedSolomonMultiply(x: byte, y: byte): byte {
      let z: int = 0;
      for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
      }
      return z as byte;
    }

    private static getBit(x: int, i: int): boolean {
      return ((x >>> i) & 1) !== 0;
    }

    private static getBits(val: int, len: int): Array<bit> {
      const res: Array<bit> = [];
      for (let i = len - 1; i >= 0; i--) res.push((val >>> i) & 1);
      return res;
    }

    private static readonly ECC_CODEWORDS_PER_BLOCK: Array<Array<int>> = [
      [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
      [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    ];

    private static readonly NUM_ERROR_CORRECTION_BLOCKS: Array<Array<int>> = [
      [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
      [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
      [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
      [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
    ];
  }

  export class QrSegment {
    public static makeBytes(data: Readonly<Array<byte>>): QrSegment {
      const bb: Array<bit> = [];
      for (const b of data) {
        for (let i = 7; i >= 0; i--) bb.push((b >>> i) & 1);
      }
      return new QrSegment(Mode.BYTE, data.length, bb);
    }

    public static makeNumeric(digits: string): QrSegment {
      if (!QrSegment.isNumeric(digits)) throw new RangeError('String contains non-numeric characters');
      const bb: Array<bit> = [];
      for (let i = 0; i < digits.length; ) {
        const n: int = Math.min(digits.length - i, 3);
        const val: int = parseInt(digits.substring(i, i + n), 10);
        const len: int = n * 3 + 1;
        for (let j = len - 1; j >= 0; j--) bb.push((val >>> j) & 1);
        i += n;
      }
      return new QrSegment(Mode.NUMERIC, digits.length, bb);
    }

    public static makeAlphanumeric(text: string): QrSegment {
      if (!QrSegment.isAlphanumeric(text)) throw new RangeError('String contains unencodable characters in alphanumeric mode');
      const bb: Array<bit> = [];
      let i: int;
      for (i = 0; i + 2 <= text.length; i += 2) {
        const temp: int =
          QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45 +
          QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
        for (let j = 10; j >= 0; j--) bb.push((temp >>> j) & 1);
      }
      if (i < text.length) {
        const temp: int = QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i));
        for (let j = 5; j >= 0; j--) bb.push((temp >>> j) & 1);
      }
      return new QrSegment(Mode.ALPHANUMERIC, text.length, bb);
    }

    public static makeSegments(text: string): Array<QrSegment> {
      if (text === '') return [];
      if (QrSegment.isNumeric(text)) return [QrSegment.makeNumeric(text)];
      if (QrSegment.isAlphanumeric(text)) return [QrSegment.makeAlphanumeric(text)];
      return [QrSegment.makeBytes(new TextEncoder().encode(text))];
    }

    public static getTotalBits(segs: Readonly<Array<QrSegment>>, version: int): number {
      let result = 0;
      for (const seg of segs) {
        const cc: int = seg.mode.numCharCountBits(version);
        if (seg.numChars >= 1 << cc) return Infinity;
        result += 4 + cc + seg.getData().length;
      }
      return result;
    }

    private static isNumeric(text: string): boolean {
      return /^[0-9]*$/.test(text);
    }

    private static isAlphanumeric(text: string): boolean {
      return /^[A-Z0-9 $%*+.\/:-]*$/.test(text);
    }

    public static readonly ALPHANUMERIC_CHARSET: string = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

    public constructor(
      public readonly mode: Mode,
      public readonly numChars: int,
      private readonly bitData: Array<bit>
    ) {}

    public getData(): Array<bit> {
      return this.bitData.slice();
    }
  }

  export class Ecc {
    public static readonly LOW = new Ecc(0, 1);
    public static readonly MEDIUM = new Ecc(1, 0);
    public static readonly QUARTILE = new Ecc(2, 3);
    public static readonly HIGH = new Ecc(3, 2);
    private constructor(public readonly ordinal: int, public readonly formatBits: int) {}
  }

  export class Mode {
    public static readonly NUMERIC = new Mode(0x1, [10, 12, 14]);
    public static readonly ALPHANUMERIC = new Mode(0x2, [9, 11, 13]);
    public static readonly BYTE = new Mode(0x4, [8, 16, 16]);
    public static readonly KANJI = new Mode(0x8, [8, 10, 12]);
    public static readonly ECI = new Mode(0x7, [0, 0, 0]);

    private constructor(public readonly modeBits: int, private readonly numBitsCharCount: [int, int, int]) {}

    public numCharCountBits(ver: int): int {
      return this.numBitsCharCount[Math.floor((ver + 7) / 17)];
    }
  }
}

/**
 * Draws a pixel-perfect QR Code onto an HTML5 Canvas context
 */
export function drawQrOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  options?: {
    darkColor?: string;
    lightColor?: string;
    margin?: number;
    borderRadius?: number;
  }
): void {
  const darkColor = options?.darkColor || '#000000';
  const lightColor = options?.lightColor || '#ffffff';
  const margin = options?.margin ?? 2;
  const borderRadius = options?.borderRadius ?? 4;

  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.Ecc.MEDIUM);
  const totalModules = qr.size + margin * 2;
  const cellSize = size / totalModules;

  ctx.save();

  // Background card with rounded corners
  if (lightColor !== 'transparent') {
    ctx.fillStyle = lightColor;
    if (borderRadius > 0 && typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }

  // Draw dark modules
  ctx.fillStyle = darkColor;
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.getModule(c, r)) {
        const mx = x + (c + margin) * cellSize;
        const my = y + (r + margin) * cellSize;
        ctx.fillRect(Math.round(mx), Math.round(my), Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }

  ctx.restore();
}
