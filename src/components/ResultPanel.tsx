import type { Candidate, Model, SolveResult } from '../core/types';
import type { CandidateConflict } from '../core/geometry';

interface ResultPanelProps {
  result: SolveResult | null;
  model: Model;
  selectedChord: number | null;
  onSelectChord: (idx: number | null) => void;
  /** 全部候选中的交叉冲突对。 */
  conflicts: CandidateConflict[];
  /** 每条结果弦（按 pairs 顺序）冲突的候选下标。 */
  chordConflicts: number[][];
}

const nameOf = (model: Model, i: number) => `${model.endpoints[i]}(#${i + 1})`;
const candName = (model: Model, c: Candidate) =>
  `${model.endpoints[c.a]}—${model.endpoints[c.b]}(损耗${c.loss})`;

/** 求解结果：总损耗、配对另一端序列、逐线损耗与冲突关系。 */
export function ResultPanel(props: ResultPanelProps) {
  const { result, model, selectedChord, onSelectChord, conflicts, chordConflicts } = props;

  if (result === null) {
    return (
      <section className="panel result-panel">
        <h2>求解结果</h2>
        <p className="muted">尚未生成连线。点击「开始复原」后在此展示方案；修改模型会立即撤下已生成的连线。</p>
      </section>
    );
  }

  if (result.status === 'infeasible') {
    return (
      <section className="panel result-panel">
        <h2>求解结果</h2>
        <p className="banner banner-error">
          无可行配对：现有候选无法让每个端点恰好连接一次且弦不交叉。已撤下全部连线，请调整模型后重新求解。
        </p>
      </section>
    );
  }

  const lossOf = new Map<number, number>();
  for (const c of model.candidates) lossOf.set(c.a * model.endpoints.length + c.b, c.loss);

  return (
    <section className="panel result-panel">
      <h2>求解结果</h2>
      <p className="banner banner-ok">
        已完整比较 <strong>{result.feasibleCount.toString()}</strong> 种可行配对，最优总损耗{' '}
        <strong>{result.totalLoss}</strong>
      </p>
      <p className="muted">
        配对另一端序列（按编号 1..{model.endpoints.length} 升序）：⟨
        {result.partnerSeq.map((p) => p + 1).join(', ')}⟩
      </p>

      <h3>逐线明细（点击行查看冲突关系）</h3>
      <table className="result-table">
        <thead>
          <tr>
            <th>弦</th>
            <th>端点 A</th>
            <th>端点 B</th>
            <th>损耗</th>
            <th>冲突候选</th>
          </tr>
        </thead>
        <tbody>
          {result.pairs.map(([a, b], idx) => {
            const cc = chordConflicts[idx];
            return (
              <tr
                key={idx}
                className={idx === selectedChord ? 'row-selected' : ''}
                onClick={() => onSelectChord(idx === selectedChord ? null : idx)}
              >
                <td>{idx + 1}</td>
                <td>{nameOf(model, a)}</td>
                <td>{nameOf(model, b)}</td>
                <td>{lossOf.get(a * model.endpoints.length + b)}</td>
                <td>{cc.length === 0 ? '无' : `${cc.length} 条`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedChord !== null && chordConflicts[selectedChord] && (
        <div className="conflict-detail">
          <h4>
            与弦 {selectedChord + 1}（
            {nameOf(model, result.pairs[selectedChord][0])} —{' '}
            {nameOf(model, result.pairs[selectedChord][1])}）交叉的候选：
          </h4>
          {chordConflicts[selectedChord].length === 0 ? (
            <p className="muted">该弦不与任何候选交叉。</p>
          ) : (
            <ul>
              {chordConflicts[selectedChord].map((ci) => (
                <li key={ci}>
                  候选第 {model.candidates[ci].line} 行：{candName(model, model.candidates[ci])}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h3>候选间全部冲突关系（{conflicts.length} 对）</h3>
      {conflicts.length === 0 ? (
        <p className="muted">候选集合内不存在互相交叉的连线。</p>
      ) : (
        <ul className="conflict-list">
          {conflicts.map(({ i, j }) => (
            <li key={`${i}-${j}`}>
              {candName(model, model.candidates[i])} ✕ {candName(model, model.candidates[j])}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
