import { useMemo } from 'react';
import type { Candidate, SolveResult } from './types';
import { chordsCrossByIndex, pointOnCircle } from './geometry';

interface RingViewProps {
  order: string[];
  candidates: Candidate[];
  result: SolveResult | null;
  /** 当前悬停/聚焦的候选弦下标（与候选表行对应），由父组件共享 */
  hovered: number | null;
  onHover: (i: number | null) => void;
}

const SIZE = 560;
const C = SIZE / 2;
const R = 205;

export function RingView({ order, candidates, result, hovered, onHover }: RingViewProps) {
  const n = order.length;
  const pos = useMemo(() => new Map(order.map((id, i) => [id, i])), [order]);

  // 候选弦的下标对与相互冲突关系
  const candIndex = useMemo(() => {
    const arr: Array<{ x: number; y: number } | null> = candidates.map((c) => {
      const x = pos.get(c.a);
      const y = pos.get(c.b);
      if (x === undefined || y === undefined || x === y) return null;
      return x < y ? { x, y } : { x: y, y: x };
    });
    return arr;
  }, [candidates, pos]);

  const conflictsOf = useMemo(() => {
    const list: number[][] = candidates.map(() => []);
    for (let i = 0; i < candidates.length; i++) {
      const p = candIndex[i];
      if (!p) continue;
      for (let j = i + 1; j < candidates.length; j++) {
        const q = candIndex[j];
        if (!q) continue;
        if (chordsCrossByIndex(p.x, p.y, q.x, q.y)) {
          list[i].push(j);
          list[j].push(i);
        }
      }
    }
    return list;
  }, [candidates, candIndex]);

  // 选中弦 → 候选行下标
  const chosenIndex = useMemo(() => {
    const keyOf = (x: number, y: number) => `${x}|${y}`;
    const byPair = new Map<string, number>();
    candIndex.forEach((p, i) => {
      if (p) byPair.set(keyOf(p.x, p.y), i);
    });
    if (!result) return [] as number[];
    return result.chords.map((ch) => {
      const x = pos.get(ch.a)!;
      const y = pos.get(ch.b)!;
      return byPair.get(keyOf(Math.min(x, y), Math.max(x, y))) ?? -1;
    });
  }, [result, candIndex, pos]);

  const chosenSet = useMemo(() => new Set(chosenIndex), [chosenIndex]);
  const activeConflicts = hovered !== null ? new Set(conflictsOf[hovered] ?? []) : new Set<number>();

  const points = useMemo(
    () => order.map((_, i) => pointOnCircle(i, Math.max(n, 1), R, C, C)),
    [order, n],
  );

  const chordPath = (i: number) => {
    const p = candIndex[i];
    if (!p) return null;
    const p1 = points[p.x];
    const p2 = points[p.y];
    return { p1, p2 };
  };

  const mid = (i: number) => {
    const path = chordPath(i);
    if (!path) return { x: C, y: C };
    return { x: (path.p1.x + path.p2.x) / 2, y: (path.p1.y + path.p2.y) / 2 };
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="ring-svg"
      role="img"
      aria-label="环形端点与回流线布局"
      onMouseLeave={() => onHover(null)}
    >
      <circle cx={C} cy={C} r={R} className="ring-base" />

      {/* 未选中的允许候选弦（底色） */}
      {candidates.map((_, i) => {
        if (chosenSet.has(i)) return null;
        const path = chordPath(i);
        if (!path) return null;
        const cls = [
          'chord',
          'chord--candidate',
          hovered === i ? 'chord--hover' : '',
          activeConflicts.has(i) ? 'chord--conflict' : '',
        ].join(' ');
        return (
          <line
            key={`cand-${i}`}
            x1={path.p1.x}
            y1={path.p1.y}
            x2={path.p2.x}
            y2={path.p2.y}
            className={cls}
            onMouseEnter={() => onHover(i)}
          />
        );
      })}

      {/* 选中的回流线 */}
      {chosenIndex.map((i, k) => {
        const path = i >= 0 ? chordPath(i) : null;
        if (!path) return null;
        const cls = [
          'chord',
          'chord--chosen',
          hovered === i ? 'chord--hover' : '',
          activeConflicts.has(i) ? 'chord--conflict' : '',
        ].join(' ');
        const m = mid(i);
        return (
          <g key={`chosen-${k}`} onMouseEnter={() => onHover(i)} className="chord-group">
            <line
              x1={path.p1.x}
              y1={path.p1.y}
              x2={path.p2.x}
              y2={path.p2.y}
              className={cls}
            />
            <g transform={`translate(${m.x},${m.y})`}>
              <rect
                x={-16}
                y={-10}
                width={32}
                height={20}
                rx={6}
                className="cost-pill"
              />
              <text textAnchor="middle" dominantBaseline="central" className="cost-text">
                {candidates[i].cost}
              </text>
            </g>
          </g>
        );
      })}

      {/* 悬停候选弦的损耗提示 */}
      {hovered !== null && !chosenSet.has(hovered) && candIndex[hovered] && (
        (() => {
          const m = mid(hovered);
          return (
            <g transform={`translate(${m.x},${m.y})`} pointerEvents="none">
              <rect x={-16} y={-10} width={32} height={20} rx={6} className="cost-pill cost-pill--cand" />
              <text textAnchor="middle" dominantBaseline="central" className="cost-text">
                {candidates[hovered].cost}
              </text>
            </g>
          );
        })()
      )}

      {/* 端点节点与编号 */}
      {order.map((id, i) => {
        const p = points[i];
        const lp = pointOnCircle(i, Math.max(n, 1), R + 30, C, C);
        return (
          <g key={id}>
            <circle cx={p.x} cy={p.y} r={12} className="endpoint" />
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="endpoint-index"
            >
              {i + 1}
            </text>
            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central" className="endpoint-label">
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 供结果表使用：返回每个候选行与其相交的候选行下标 */
export function computeConflictLists(
  order: string[],
  candidates: Candidate[],
): number[][] {
  const pos = new Map(order.map((id, i) => [id, i]));
  const idx = candidates.map((c) => {
    const x = pos.get(c.a);
    const y = pos.get(c.b);
    if (x === undefined || y === undefined || x === y) return null;
    return x < y ? { x, y } : { x: y, y: x };
  });
  const list: number[][] = candidates.map(() => []);
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (idx[i] && idx[j] && chordsCrossByIndex(idx[i]!.x, idx[i]!.y, idx[j]!.x, idx[j]!.y)) {
        list[i].push(j);
        list[j].push(i);
      }
    }
  }
  return list;
}
