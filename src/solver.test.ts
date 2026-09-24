import { describe, expect, it } from 'vitest';
import { solveNonCrossing } from './solver';
import type { Candidate } from './types';

const c = (a: string, b: string, cost: number): Candidate => ({ a, b, cost });
const ids = (n: number): string[] => Array.from({ length: n }, (_, i) => String(i + 1));

/** 暴力枚举所有完美匹配（O((n-1)!!)），用于与 DP 结果对拍 */
function bruteForce(
  order: string[],
  candidates: Candidate[],
): { feasible: number; best: { cost: number; seq: string[] } | null } {
  const costMap = new Map<string, number>();
  for (const { a, b, cost } of candidates) {
    const key = JSON.stringify([a, b].sort());
    costMap.set(key, cost);
  }
  const crosses = (pairs: Array<[number, number]>): boolean => {
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [a, b] = pairs[i];
        const [x, y] = pairs[j];
        const inArc = (p: number) =>
          a < b ? p > a && p < b : p > a || p < b;
        if (inArc(x) !== inArc(y)) return true;
      }
    }
    return false;
  };

  const used = new Array(order.length).fill(false);
  const pairs: Array<[number, number]> = [];
  let feasible = 0;
  let best: { cost: number; seq: string[] } | null = null;

  const lex = (a: string[], b: string[]): number => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return 0;
  };

  const rec = (): void => {
    const i = used.indexOf(false);
    if (i === -1) {
      if (crosses(pairs)) return;
      let total = 0;
      for (const [a, b] of pairs) {
        const w = costMap.get(JSON.stringify([order[a], order[b]].sort()));
        if (w === undefined) return;
        total += w;
      }
      feasible++;
      // 按端点编号升序的配对另一端序列
      const mate = new Map<string, string>();
      for (const [a, b] of pairs) {
        mate.set(order[a], order[b]);
        mate.set(order[b], order[a]);
      }
      const seq = [...order].sort().map((id) => mate.get(id)!);
      const better =
        !best || total < best.cost || (total === best.cost && lex(seq, best.seq) < 0);
      if (better) best = { cost: total, seq };
      return;
    }
    used[i] = true;
    for (let j = i + 1; j < order.length; j++) {
      if (used[j]) continue;
      used[j] = true;
      pairs.push([i, j]);
      rec();
      pairs.pop();
      used[j] = false;
    }
    used[i] = false;
  };
  rec();
  return { feasible, best };
}

describe('solveNonCrossing', () => {
  it('4 点基础：选取不交叉且更便宜的配对', () => {
    // 相邻配对比交叉配对便宜
    const r = solveNonCrossing(ids(4), [
      c('1', '2', 1),
      c('3', '4', 1),
      c('1', '4', 5),
      c('2', '3', 5),
      c('1', '3', 1), // 交叉方案的一边
      c('2', '4', 1),
    ]);
    expect(r).not.toBeNull();
    expect(r!.totalCost).toBe(2);
    expect(r!.chords.map((x) => [x.a, x.b])).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(r!.feasibleCount).toBe(2);
  });

  it('交叉方案更便宜时也不得选交叉：强制选合法的较贵方案', () => {
    const r = solveNonCrossing(ids(4), [
      c('1', '2', 10),
      c('3', '4', 10),
      c('1', '4', 10),
      c('2', '3', 10),
      c('1', '3', 1),
      c('2', '4', 1),
    ]);
    expect(r!.totalCost).toBe(20);
  });

  it('总损耗并列时取配对序列字典序最小', () => {
    // 方案甲 (1,2)(3,4) seq=2,1,4,3；方案乙 (1,4)(2,3) seq=4,3,2,1
    // 首项 2 < 4，选甲
    const r = solveNonCrossing(ids(4), [
      c('1', '2', 5),
      c('3', '4', 5),
      c('1', '4', 5),
      c('2', '3', 5),
    ]);
    expect(r!.totalCost).toBe(10);
    expect(r!.partnerSequence).toEqual([
      { id: '1', partner: '2' },
      { id: '2', partner: '1' },
      { id: '3', partner: '4' },
      { id: '4', partner: '3' },
    ]);
  });

  it('无可行配对返回 null', () => {
    expect(solveNonCrossing(ids(4), [c('1', '2', 1), c('1', '3', 1)])).toBeNull();
    expect(solveNonCrossing(ids(2), [])).toBeNull();
  });

  it('奇数端点返回 null', () => {
    expect(solveNonCrossing(ids(3), [c('1', '2', 1)])).toBeNull();
  });

  it('2 点最简情形', () => {
    const r = solveNonCrossing(ids(2), [c('1', '2', 7)]);
    expect(r!.totalCost).toBe(7);
    expect(r!.feasibleCount).toBe(1);
    expect(r!.partnerSequence).toEqual([
      { id: '1', partner: '2' },
      { id: '2', partner: '1' },
    ]);
  });

  it('非数字编号按字符串排序与字典序比较', () => {
    const r = solveNonCrossing(['A', 'B', 'C', 'D'], [
      c('A', 'B', 1),
      c('C', 'D', 1),
      c('A', 'D', 1),
      c('B', 'C', 1),
    ]);
    // seq: 甲 B,A,D,C；乙 D,C,B,A → 甲
    expect(r!.partnerSequence).toEqual([
      { id: 'A', partner: 'B' },
      { id: 'B', partner: 'A' },
      { id: 'C', partner: 'D' },
      { id: 'D', partner: 'C' },
    ]);
  });

  it('圆周顺序与编号序不同：并列时按编号升序而非圆周位置判定', () => {
    // 圆周顺序：2,3,1,4（位置 0..3）
    // P：(2,3)(1,4) 位置 (0,1)(2,3)；编号序 seq = [4,3,2,1]
    // Q：(2,4)(3,1) 位置 (0,3)(1,2) 嵌套；编号序 seq = [3,4,1,2]
    // 总损耗相同；编号序字典序 Q 更小（3<4），尽管按圆周位置 P 更小
    const r = solveNonCrossing(['2', '3', '1', '4'], [
      c('2', '3', 10),
      c('1', '4', 10),
      c('2', '4', 10),
      c('1', '3', 10),
    ]);
    expect(r!.totalCost).toBe(20);
    expect(r!.chords.map((x) => [x.a, x.b])).toEqual([
      ['1', '3'],
      ['2', '4'],
    ]);
    expect(r!.partnerSequence.map((e) => e.partner)).toEqual(['3', '4', '1', '2']);
  });

  it('6 点完全图：DP 与暴力枚举对拍（枚举数与最优解）', () => {
    const order = ids(6);
    const candidates: Candidate[] = [];
    let w = 0;
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        candidates.push(c(order[i], order[j], ((i + 1) * 7 + (j + 1) * 3) % 11));
        w++;
      }
    }
    const r = solveNonCrossing(order, candidates)!;
    const brute = bruteForce(order, candidates);
    expect(r.feasibleCount).toBe(brute.feasible);
    // 6 个点的不交叉完美匹配数 = Catalan(3) = 5
    expect(r.feasibleCount).toBe(5);
    expect(r.totalCost).toBe(brute.best!.cost);
    expect(r.partnerSequence.map((e) => e.partner)).toEqual(brute.best!.seq);
  });

  it('8 点随机权重完全图：DP 与暴力对拍', () => {
    const order = ids(8);
    const candidates: Candidate[] = [];
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % 20;
    };
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        candidates.push(c(order[i], order[j], rnd()));
      }
    }
    const r = solveNonCrossing(order, candidates)!;
    const brute = bruteForce(order, candidates);
    expect(r.feasibleCount).toBe(14); // Catalan(4)
    expect(r.totalCost).toBe(brute.best!.cost);
    expect(r.partnerSequence.map((e) => e.partner)).toEqual(brute.best!.seq);
  });

  it('稀疏候选图的可行数与暴力一致', () => {
    const order = ids(6);
    const candidates = [
      c('1', '2', 3),
      c('3', '6', 2),
      c('4', '5', 4),
      c('1', '6', 1),
      c('2', '5', 9),
      c('3', '4', 1),
      c('2', '3', 2),
      c('5', '6', 3),
    ];
    const r = solveNonCrossing(order, candidates)!;
    const brute = bruteForce(order, candidates);
    expect(r.feasibleCount).toBe(brute.feasible);
    expect(r.totalCost).toBe(brute.best!.cost);
  });
});
