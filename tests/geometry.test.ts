import { describe, expect, it } from 'vitest';
import { chordsCross, conflictsOf, findConflicts, hasCrossing } from '../src/core/geometry';
import type { Candidate } from '../src/core/types';

const cand = (a: number, b: number, line = 0): Candidate => ({ a, b, loss: 0, line });

describe('弦交叉判定', () => {
  const n = 6;

  it('交错端点的弦相交', () => {
    expect(chordsCross(0, 3, 1, 4, n)).toBe(true);
    expect(chordsCross(1, 4, 0, 3, n)).toBe(true);
  });

  it('嵌套或分离的弦不相交', () => {
    expect(chordsCross(0, 5, 1, 4, n)).toBe(false); // 嵌套
    expect(chordsCross(0, 1, 2, 3, n)).toBe(false); // 分离
    expect(chordsCross(0, 3, 3, 5, n)).toBe(false); // 共享端点
  });

  it('跨越编号边界的弦按圆序正确判定', () => {
    expect(chordsCross(4, 1, 0, 2, n)).toBe(true); // 圆序 4<0<1<2
    expect(chordsCross(4, 1, 2, 3, n)).toBe(false);
  });

  it('hasCrossing 检测整组弦', () => {
    expect(hasCrossing([[0, 3], [1, 4]], n)).toBe(true);
    expect(hasCrossing([[0, 1], [2, 3], [4, 5]], n)).toBe(false);
  });
});

describe('冲突枚举', () => {
  it('找出候选集合中所有交叉对', () => {
    const candidates = [cand(0, 3), cand(1, 4), cand(0, 1), cand(2, 5)];
    const conflicts = findConflicts(candidates, 6);
    // (0,3)×(1,4)、(0,3)×(2,5)、(1,4)×(2,5) 交叉；(0,1) 与谁都不交叉
    expect(conflicts).toEqual([
      { i: 0, j: 1 },
      { i: 0, j: 3 },
      { i: 1, j: 3 },
    ]);
  });

  it('conflictsOf 返回与指定弦交叉的候选下标', () => {
    const candidates = [cand(0, 3), cand(1, 4), cand(4, 5)];
    // (2,4) 与 (0,3) 交错（0<2<3<4），与 (1,4)、(4,5) 共享端点不算交叉
    expect(conflictsOf(2, 4, candidates, 6)).toEqual([0]);
    expect(conflictsOf(0, 1, candidates, 6)).toEqual([]);
  });
});
