/**
 * 环形端点不交叉完美匹配求解器。
 *
 * 端点已按圆周顺序排列（order[0..n-1]，n 为偶数）。
 *
 * 通过区间 DP「完整比较全部可行配对」：
 *   设区间 [l,r]（长度为偶数）上的最优子结构。最左端点 l 必须与某个
 *   奇数步长外的 k（l<k<=r 且 k-l 为奇数）相连；弦 (l,k) 把区间分割为
 *   内部 [l+1,k-1] 与外部 [k+1,r] 两段互不相交的子区间。
 *   仅当 (l,k) 是允许候选且两个子区间各自存在可行完美匹配时才可行。
 *
 * 最优判据依次为：
 *   1. 总损耗最低；
 *   2. 按端点编号升序排列的「配对另一端序列」字典序最小。
 *      子区间的候选集合相同，其最早出现差异的端点必在该子区间内，
 *      因此子问题按编号升序做字典序比较与全局比较结论一致。
 *
 * 同时枚举统计全部可行完美匹配数量（feasibleCount）。
 * 当不存在任何可行配对时返回 null。
 */
import type { Candidate, ChosenChord, SolveResult } from './types';

/** 配对关系（按端点编号升序排列的第一项为键） */
export type PartnerEntry = { id: string; partner: string };

interface SubBest {
  cost: number;
  /** 本区间内按端点编号升序排列的配对关系 */
  pairs: PartnerEntry[];
  /** 本区间最左端点 l 的配对选择 */
  k: number;
}

/** 按 entry.id 字典序归并多个已升序排列的配对表 */
function mergeSorted(parts: PartnerEntry[][]): PartnerEntry[] {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const heads = parts.map(() => 0);
  const out: PartnerEntry[] = [];
  while (out.length < total) {
    let pick = -1;
    for (let i = 0; i < parts.length; i++) {
      if (heads[i] < parts[i].length) {
        const id = parts[i][heads[i]].id;
        if (pick === -1 || id < parts[pick][heads[pick]].id) pick = i;
      }
    }
    out.push(parts[pick][heads[pick]++]);
  }
  return out;
}

/** 配对另一端序列的字典序比较：a < b（两者端点编号序列一致，仅比较另一端） */
function lexLess(a: PartnerEntry[], b: PartnerEntry[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i].partner < b[i].partner) return true;
    if (a[i].partner > b[i].partner) return false;
  }
  return false;
}

export function solveNonCrossing(
  order: string[],
  candidates: Candidate[],
): SolveResult | null {
  const n = order.length;
  if (n === 0) {
    return {
      totalCost: 0,
      chords: [],
      feasibleCount: 1,
      partnerSequence: [],
    };
  }
  if (n % 2 !== 0) return null;

  // 允许边表：下标对 (i<j) -> 损耗
  const indexOf = new Map<string, number>();
  order.forEach((id, i) => indexOf.set(id, i));
  const edgeCost = new Map<number, number>();
  const edgeKey = (i: number, j: number): number => i * n + j;
  for (const c of candidates) {
    const i = indexOf.get(c.a);
    const j = indexOf.get(c.b);
    if (i === undefined || j === undefined || i === j) continue;
    const [lo, hi] = i < j ? [i, j] : [j, i];
    edgeCost.set(edgeKey(lo, hi), c.cost);
  }

  // best[l][r]：区间最优；null=尚未计算，undefined=不可行
  const best: (SubBest | null | undefined)[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null),
  );
  // 区间内可行完美匹配数量
  const count: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0),
  );

  const countOf = (l: number, r: number): number => {
    if (l > r) return 1; // 空区间恰有一种（空）匹配
    return count[l][r];
  };

  /** 取子区间最优：null=未计算需现算；undefined=不可行 */
  const sub = (l: number, r: number): SubBest | undefined => {
    if (l > r) return { cost: 0, pairs: [], k: -1 };
    return best[l][r] === null ? compute(l, r) : (best[l][r] ?? undefined);
  };

  const compute = (l: number, r: number): SubBest | undefined => {
    let found: SubBest | undefined;
    let ways = 0;

    // l 与 k 相连；区间长度须为偶数，故 k-l 必须为奇数
    for (let k = l + 1; k <= r; k += 2) {
      const w = edgeCost.get(edgeKey(l, k));
      if (w === undefined) continue;

      const inner = sub(l + 1, k - 1);
      const outer = sub(k + 1, r);
      if (!inner || !outer) continue;

      ways += countOf(l + 1, k - 1) * countOf(k + 1, r);

      const cost = w + inner.cost + outer.cost;
      const chordEntries: PartnerEntry[] = [
        { id: order[l], partner: order[k] },
        { id: order[k], partner: order[l] },
      ].sort((p, q) => (p.id < q.id ? -1 : 1));
      const pairs = mergeSorted([chordEntries, inner.pairs, outer.pairs]);

      if (
        found === undefined ||
        cost < found.cost ||
        (cost === found.cost && lexLess(pairs, found.pairs))
      ) {
        found = { cost, pairs, k };
      }
    }

    count[l][r] = ways;
    best[l][r] = found;
    return found;
  };

  const top = compute(0, n - 1);
  if (!top || count[0][n - 1] === 0) return null;

  // 回溯选中的弦
  const chords: ChosenChord[] = [];
  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length) {
    const [l, r] = stack.pop()!;
    if (l > r) continue;
    const cur = best[l][r];
    if (!cur) continue;
    const k = cur.k;
    const [idA, idB] = [order[l], order[k]];
    chords.push({
      a: idA < idB ? idA : idB,
      b: idA < idB ? idB : idA,
      cost: edgeCost.get(edgeKey(Math.min(l, k), Math.max(l, k)))!,
    });
    stack.push([l + 1, k - 1]);
    if (k + 1 <= r) stack.push([k + 1, r]);
  }
  chords.sort((p, q) =>
    p.a === q.a ? p.b.localeCompare(q.b) : p.a.localeCompare(q.a),
  );

  return {
    totalCost: top.cost,
    chords,
    feasibleCount: count[0][n - 1],
    partnerSequence: top.pairs,
  };
}
