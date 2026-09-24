import type { Candidate } from './types';

/**
 * 圆上弦的交叉判定。
 * 端点 0..n-1 按圆周顺序排列，四条端点互不相同的弦 (a,b) 与 (c,d)
 * 在圆内相交，当且仅当 c、d 恰好一个落在 a→b 的顺时针开弧内。
 * 共享端点的弦不算交叉。
 */
export function chordsCross(a: number, b: number, c: number, d: number, n: number): boolean {
  if (a === c || a === d || b === c || b === d) return false;
  const from = (x: number) => (x - a + n) % n; // 以 a 为 0 的顺时针距离
  const rb = from(b);
  const rc = from(c);
  const rd = from(d);
  return rc < rb !== rd < rb;
}

/** 一组弦（圆序下标对）内部是否存在交叉。 */
export function hasCrossing(pairs: readonly [number, number][], n: number): boolean {
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      if (chordsCross(pairs[i][0], pairs[i][1], pairs[j][0], pairs[j][1], n)) return true;
    }
  }
  return false;
}

/** 一对冲突的候选（按下标引用 candidates 数组，i < j）。 */
export interface CandidateConflict {
  i: number;
  j: number;
}

/** 完整枚举候选集合中所有互相交叉的候选对。 */
export function findConflicts(candidates: readonly Candidate[], n: number): CandidateConflict[] {
  const conflicts: CandidateConflict[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const p = candidates[i];
      const q = candidates[j];
      if (chordsCross(p.a, p.b, q.a, q.b, n)) conflicts.push({ i, j });
    }
  }
  return conflicts;
}

/** 与指定弦交叉的全部候选下标。 */
export function conflictsOf(
  a: number,
  b: number,
  candidates: readonly Candidate[],
  n: number,
): number[] {
  const out: number[] = [];
  candidates.forEach((c, idx) => {
    if (chordsCross(a, b, c.a, c.b, n)) out.push(idx);
  });
  return out;
}
