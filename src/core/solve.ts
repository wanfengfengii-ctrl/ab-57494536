import type { Model, SolveResult } from './types';
import { hasCrossing } from './geometry';

/**
 * 区间最优解：partner 为长度 n 的数组，仅 [l, r] 内的位置被赋值，
 * 区间外为 -1。比较规则：先总损耗升序，再按区间内配对另一端编号序列字典序。
 */
interface IntervalBest {
  loss: number;
  partner: number[];
}

function compareInterval(a: IntervalBest, b: IntervalBest, l: number, r: number): number {
  if (a.loss !== b.loss) return a.loss - b.loss;
  for (let i = l; i <= r; i++) {
    if (a.partner[i] !== b.partner[i]) return a.partner[i] - b.partner[i];
  }
  return 0;
}

/**
 * 精确求解：在全部可行（非交叉、每点恰好一次）的完美配对中，
 * 依次取总损耗最低、配对另一端编号序列字典序最小的方案。
 *
 * 区间 DP：f(l, r) 只需求解偶数长度区间；区间左端 l 必与某个 m 配对，
 * 要求 (l, m) 是候选且 m-l 为奇数（保证两侧均为偶数长度），
 * 则 f(l, r) = min over m of loss(l, m) + f(l+1, m-1) + f(m+1, r)。
 * 子区间按 (损耗, 局部配对序列) 字典序取优即可保证全局字典序最优：
 * 总损耗相同时，左区间序列先于右区间参与比较，独立取优不会漏解。
 */
export function solveMatching(model: Model): SolveResult {
  const n = model.endpoints.length;
  const lossOf = new Map<number, number>();
  for (const c of model.candidates) lossOf.set(c.a * n + c.b, c.loss);

  const memo = new Map<number, IntervalBest | null>();
  const countMemo = new Map<number, bigint>();

  const emptyBest = (): IntervalBest => ({ loss: 0, partner: new Array<number>(n).fill(-1) });

  /** 区间 [l, r]（含端点）内的可行非交叉完美配对数。 */
  function count(l: number, r: number): bigint {
    if (l > r) return 1n;
    if ((r - l + 1) % 2 !== 0) return 0n;
    const key = l * n + r;
    const hit = countMemo.get(key);
    if (hit !== undefined) return hit;
    let total = 0n;
    for (let m = l + 1; m <= r; m += 2) {
      if (!lossOf.has(l * n + m)) continue;
      total += count(l + 1, m - 1) * count(m + 1, r);
    }
    countMemo.set(key, total);
    return total;
  }

  function best(l: number, r: number): IntervalBest | null {
    if (l > r) return emptyBest();
    if ((r - l + 1) % 2 !== 0) return null;
    const key = l * n + r;
    if (memo.has(key)) return memo.get(key) ?? null;

    let result: IntervalBest | null = null;
    for (let m = l + 1; m <= r; m += 2) {
      const w = lossOf.get(l * n + m);
      if (w === undefined) continue;
      const left = best(l + 1, m - 1);
      if (left === null) continue;
      const right = best(m + 1, r);
      if (right === null) continue;

      const partner = left.partner.slice();
      for (let i = m + 1; i <= r; i++) partner[i] = right.partner[i];
      partner[l] = m;
      partner[m] = l;
      const candidate: IntervalBest = { loss: w + left.loss + right.loss, partner };
      if (result === null || compareInterval(candidate, result, l, r) < 0) result = candidate;
    }
    memo.set(key, result);
    return result;
  }

  const feasibleCount = n === 0 ? 0n : count(0, n - 1);
  if (n === 0 || feasibleCount === 0n) return { status: 'infeasible', feasibleCount: 0n };

  const top = best(0, n - 1);
  if (top === null) return { status: 'infeasible', feasibleCount: 0n };

  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const j = top.partner[i];
    if (j > i) pairs.push([i, j]);
  }
  return {
    status: 'optimal',
    totalLoss: top.loss,
    pairs,
    partnerSeq: top.partner.slice(),
    feasibleCount,
  };
}

/**
 * 暴力枚举参照实现（仅供测试对照）：枚举所有完美配对，
 * 逐一检查候选许可与交叉约束，按同一比较规则取最优。
 */
export function solveMatchingBrute(model: Model): SolveResult {
  const n = model.endpoints.length;
  const lossOf = new Map<number, number>();
  for (const c of model.candidates) lossOf.set(c.a * n + c.b, c.loss);

  let bestPairs: [number, number][] | null = null;
  let bestLoss = Infinity;
  let feasibleCount = 0n;

  const used = new Array<boolean>(n).fill(false);
  const current: [number, number][] = [];

  const partnerSeqOf = (pairs: [number, number][]): number[] => {
    const seq = new Array<number>(n).fill(-1);
    for (const [i, j] of pairs) {
      seq[i] = j;
      seq[j] = i;
    }
    return seq;
  };

  const consider = (pairs: [number, number][], loss: number) => {
    feasibleCount += 1n;
    if (bestPairs === null || loss < bestLoss) {
      bestPairs = pairs.slice();
      bestLoss = loss;
      return;
    }
    if (loss === bestLoss) {
      const a = partnerSeqOf(pairs);
      const b = partnerSeqOf(bestPairs);
      for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) {
          if (a[i] < b[i]) bestPairs = pairs.slice();
          return;
        }
      }
    }
  };

  const walk = (loss: number) => {
    let i = 0;
    while (i < n && used[i]) i++;
    if (i === n) {
      if (!hasCrossing(current, n)) consider(current, loss);
      return;
    }
    used[i] = true;
    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      const w = lossOf.get(Math.min(i, j) * n + Math.max(i, j));
      if (w === undefined) continue;
      used[j] = true;
      current.push([i, j]);
      walk(loss + w);
      current.pop();
      used[j] = false;
    }
    used[i] = false;
  };
  walk(0);

  if (bestPairs === null) return { status: 'infeasible', feasibleCount: 0n };
  const pairs = bestPairs as [number, number][];
  return {
    status: 'optimal',
    totalLoss: bestLoss,
    pairs: pairs.slice().sort((x, y) => x[0] - y[0]),
    partnerSeq: partnerSeqOf(pairs),
    feasibleCount,
  };
}
