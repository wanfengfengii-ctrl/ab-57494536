import { describe, expect, it } from 'vitest';
import { chordsCrossByIndex, chordsCross } from './geometry';

describe('chordsCrossByIndex', () => {
  it('交错端点判定为相交', () => {
    // 圆周 0,1,2,3：弦 (0,2) 与 (1,3) 交叉
    expect(chordsCrossByIndex(0, 2, 1, 3)).toBe(true);
    expect(chordsCrossByIndex(1, 3, 0, 2)).toBe(true);
  });

  it('非交错弦不相交（嵌套与相邻）', () => {
    expect(chordsCrossByIndex(0, 3, 1, 2)).toBe(false); // 嵌套
    expect(chordsCrossByIndex(0, 1, 2, 3)).toBe(false); // 相邻边界弦
    expect(chordsCrossByIndex(0, 1, 1, 2)).toBe(false); // 共端点
  });

  it('跨 0 点的弧也能正确判定', () => {
    // 8 点圆周，弦 (7,1) 跨过 0；弦 (0,4) 与之交错
    expect(chordsCrossByIndex(7, 1, 0, 4)).toBe(true);
    // 弦 (2,3) 完全落在 (1..7) 弧内，不交叉
    expect(chordsCrossByIndex(7, 1, 2, 3)).toBe(false);
  });

  it('字符串编号按给定圆周顺序判定', () => {
    const order = ['A', 'B', 'C', 'D', 'E', 'F'];
    expect(chordsCross('A', 'D', 'B', 'E', order)).toBe(true);
    expect(chordsCross('A', 'B', 'C', 'D', order)).toBe(false);
    expect(chordsCross('F', 'B', 'A', 'C', order)).toBe(true);
  });
});
