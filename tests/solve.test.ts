import { describe, expect, it } from 'vitest';
import { solveMatching, solveMatchingBrute } from '../src/core/solve';
import { hasCrossing } from '../src/core/geometry';
import type { Candidate, Model } from '../src/core/types';

function makeModel(n: number, triples: [number, number, number][]): Model {
  const endpoints = Array.from({ length: n }, (_, i) => `P${i + 1}`);
  const candidates: Candidate[] = triples.map(([a, b, loss], i) => ({
    a: Math.min(a, b),
    b: Math.max(a, b),
    loss,
    line: i + 1,
  }));
  return { endpoints, candidates };
}

/** 生成全部对都允许、损耗相同的完全图模型。 */
function completeModel(n: number, loss = 1): Model {
  const triples: [number, number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) triples.push([i, j, loss]);
  return makeModel(n, triples);
}

describe('精确求解', () => {
  it('两个端点只有唯一连法', () => {
    const r = solveMatching(makeModel(2, [[0, 1, 7]]));
    expect(r.status).toBe('optimal');
    if (r.status !== 'optimal') return;
    expect(r.totalLoss).toBe(7);
    expect(r.pairs).toEqual([[0, 1]]);
    expect(r.partnerSeq).toEqual([1, 0]);
    expect(r.feasibleCount).toBe(1n);
  });

  it('交叉弦即使更便宜也不能选', () => {
    // (0,2) 与 (1,3) 交叉且损耗为 0，但合法方案只能取邻边配对
    const r = solveMatching(
      makeModel(4, [
        [0, 2, 0],
        [1, 3, 0],
        [0, 1, 5],
        [2, 3, 5],
        [1, 2, 5],
        [0, 3, 5],
      ]),
    );
    expect(r.status).toBe('optimal');
    if (r.status !== 'optimal') return;
    expect(r.totalLoss).toBe(10);
    expect(hasCrossing(r.pairs, 4)).toBe(false);
  });

  it('每个端点恰好连接一次', () => {
    const r = solveMatching(completeModel(8));
    expect(r.status).toBe('optimal');
    if (r.status !== 'optimal') return;
    const used = new Array(8).fill(0);
    for (const [a, b] of r.pairs) {
      used[a]++;
      used[b]++;
    }
    expect(used).toEqual(new Array(8).fill(1));
    expect(r.pairs).toHaveLength(4);
  });

  it('总损耗相同时取配对另一端序列字典序最小者', () => {
    // 4 点的非交叉完美配对只有 {0-1,2-3} 与 {0-3,1-2}，序列 [1,0,3,2] < [3,2,1,0]
    const r = solveMatching(completeModel(4));
    expect(r.status).toBe('optimal');
    if (r.status !== 'optimal') return;
    expect(r.pairs).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(r.partnerSeq).toEqual([1, 0, 3, 2]);
  });

  it('字典序平局打破在更复杂的平局中也成立', () => {
    // 两种最优：{(0,5),(1,2),(3,4),(6,7)} 与 {(0,1),(2,7),(3,4),(5,6)}，总损耗均 16
    // 序列 [5,2,1,4,3,0,7,6] 与 [1,0,7,4,3,6,5,2]，应取后者
    const r = solveMatching(
      makeModel(8, [
        [0, 1, 5],
        [1, 2, 5],
        [2, 3, 5],
        [3, 4, 5],
        [4, 5, 5],
        [5, 6, 5],
        [6, 7, 5],
        [0, 7, 5],
        [0, 5, 1],
        [2, 7, 1],
        [1, 6, 2],
        [4, 7, 3],
        [1, 4, 8],
        [3, 6, 8],
      ]),
    );
    expect(r.status).toBe('optimal');
    if (r.status !== 'optimal') return;
    expect(r.totalLoss).toBe(16);
    expect(r.partnerSeq).toEqual([1, 0, 7, 4, 3, 6, 5, 2]);
    expect(hasCrossing(r.pairs, 8)).toBe(false);
  });

  it('候选不足时报告无可行配对且不残留结果', () => {
    const r = solveMatching(makeModel(4, [[0, 1, 1]]));
    expect(r.status).toBe('infeasible');
    if (r.status !== 'infeasible') return;
    expect(r.feasibleCount).toBe(0n);
  });

  it('候选允许交叉配对但不允许非交叉配对时不可行', () => {
    // 只允许 (0,2) 与 (1,3)：二者交叉，无法同时选
    const r = solveMatching(makeModel(4, [[0, 2, 1], [1, 3, 1]]));
    expect(r.status).toBe('infeasible');
  });

  it('feasibleCount 等于非交叉完美配对总数（完全图为 Catalan 数）', () => {
    const r = solveMatching(completeModel(8));
    expect(r.status).toBe('optimal');
    if (r.status !== 'optimal') return;
    expect(r.feasibleCount).toBe(14n); // C_4 = 14
  });
});

describe('与暴力枚举对照（随机模型）', () => {
  /** 确定性伪随机数发生器，保证测试可复现。 */
  function mulberry32(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const sizes = [2, 4, 6, 8, 10];

  it.each(sizes)('n=%i 时 DP 与暴力枚举结果一致', (n) => {
    const rand = mulberry32(1000 + n);
    for (let iter = 0; iter < 60; iter++) {
      const triples: [number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (rand() < 0.55) triples.push([i, j, Math.floor(rand() * 20)]);
        }
      }
      const model = makeModel(n, triples);
      const fast = solveMatching(model);
      const slow = solveMatchingBrute(model);
      expect(fast.status).toBe(slow.status);
      expect(fast.feasibleCount).toBe(slow.feasibleCount);
      if (fast.status === 'optimal' && slow.status === 'optimal') {
        expect(fast.totalLoss).toBe(slow.totalLoss);
        expect(fast.partnerSeq).toEqual(slow.partnerSeq);
        expect(hasCrossing(fast.pairs, n)).toBe(false);
      }
    }
  });
});
