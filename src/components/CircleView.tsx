import type { Candidate } from '../core/types';

export interface ChordView {
  a: number;
  b: number;
  loss: number;
}

interface CircleViewProps {
  endpoints: string[];
  candidates: Candidate[];
  showCandidates: boolean;
  /** 已生成的连线（求解结果）；为 null 时不画任何弦。 */
  chords: ChordView[] | null;
  selectedChord: number | null;
  onSelectChord: (idx: number | null) => void;
  /** 与当前选中弦冲突的候选下标集合，用于红色高亮。 */
  conflictCandidates: ReadonlySet<number>;
}

const R = 88;
const LABEL_R = 104;

function pointAt(i: number, n: number, r: number): { x: number; y: number } {
  const angle = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
}

/** 环形布局：端点按圆序排布，候选连线灰色虚线，结果弦蓝色实线并标注损耗。 */
export function CircleView(props: CircleViewProps) {
  const { endpoints, candidates, showCandidates, chords, selectedChord, onSelectChord } = props;
  const n = endpoints.length;

  if (n === 0) {
    return <div className="circle-empty">暂无有效端点，请先修正左侧模型</div>;
  }

  const pts = endpoints.map((_, i) => pointAt(i, n, R));

  return (
    <svg
      className="circle-view"
      viewBox="-125 -125 250 250"
      role="img"
      aria-label="环形接驳板布局"
      onClick={() => onSelectChord(null)}
    >
      <circle className="ring" cx={0} cy={0} r={R} />

      {showCandidates &&
        candidates.map((c, idx) => (
          <line
            key={`cand-${idx}`}
            className={`candidate-line${props.conflictCandidates.has(idx) ? ' conflict' : ''}`}
            x1={pts[c.a].x}
            y1={pts[c.a].y}
            x2={pts[c.b].x}
            y2={pts[c.b].y}
          >
            <title>{`候选 ${endpoints[c.a]}—${endpoints[c.b]}，损耗 ${c.loss}`}</title>
          </line>
        ))}

      {chords &&
        chords.map((ch, idx) => {
          const p = pts[ch.a];
          const q = pts[ch.b];
          const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
          const label = { x: mid.x * 0.78, y: mid.y * 0.78 };
          const selected = idx === selectedChord;
          return (
            <g
              key={`chord-${idx}`}
              className={`chord${selected ? ' selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectChord(selected ? null : idx);
              }}
            >
              <line className="chord-hit" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
              <line className="chord-line" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
              <text className="chord-loss" x={label.x} y={label.y}>
                {ch.loss}
                <title>{`连线 ${endpoints[ch.a]}—${endpoints[ch.b]}，损耗 ${ch.loss}`}</title>
              </text>
            </g>
          );
        })}

      {endpoints.map((id, i) => {
        const p = pts[i];
        const lp = pointAt(i, n, LABEL_R);
        const anchor = Math.abs(lp.x) < 12 ? 'middle' : lp.x > 0 ? 'start' : 'end';
        return (
          <g key={`ep-${i}`} className="endpoint">
            <circle className="endpoint-dot" cx={p.x} cy={p.y} r={4.5} />
            <text className="endpoint-label" x={lp.x} y={lp.y} textAnchor={anchor} dominantBaseline="middle">
              {`#${i + 1} ${id}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
