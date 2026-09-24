import { useMemo, useRef, useState } from 'react';
import type { Candidate, SolveResult, WiringModel } from './types';
import { solveNonCrossing } from './solver';
import { validateModel, hasErrors, type ValidationIssue } from './validation';
import { parseModelJson, modelToJson } from './io';
import { computeConflictLists, RingView } from './RingView';
import { SAMPLE_MODEL } from './sample';

const solveSample = (): SolveResult | null =>
  solveNonCrossing(
    SAMPLE_MODEL.endpoints.map((e) => e.id),
    SAMPLE_MODEL.candidates,
  );

export default function App() {
  const [model, setModel] = useState<WiringModel>(() =>
    JSON.parse(JSON.stringify(SAMPLE_MODEL)),
  );
  const [result, setResult] = useState<SolveResult | null>(solveSample);
  const [attempted, setAttempted] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** 任何模型修改都必须立即撤下已生成的连线 */
  const mutate = (fn: (m: WiringModel) => WiringModel) => {
    setModel((prev) => fn(structuredClone(prev)));
    setResult(null);
    setAttempted(false);
    setHovered(null);
  };

  const issues = useMemo(() => validateModel(model), [model]);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const valid = !hasErrors(issues);

  const order = useMemo(
    () => model.endpoints.map((e) => e.id.trim()).filter(Boolean),
    [model.endpoints],
  );
  // 候选编号统一 trim，避免「能通过校验却找不到边」的不一致
  const normCandidates = useMemo<Candidate[]>(
    () => model.candidates.map((c) => ({ ...c, a: c.a.trim(), b: c.b.trim() })),
    [model.candidates],
  );
  const conflicts = useMemo(
    () => computeConflictLists(order, normCandidates),
    [order, normCandidates],
  );

  // 每行行内问题索引
  const epIssueAt = useMemo(() => {
    const map = new Map<number, ValidationIssue[]>();
    issues
      .filter((i) => i.kind === 'endpoint')
      .forEach((i) => {
        if (i.index === undefined) return;
        map.set(i.index, [...(map.get(i.index) ?? []), i]);
      });
    return map;
  }, [issues]);
  const candIssueAt = useMemo(() => {
    const map = new Map<number, ValidationIssue[]>();
    issues
      .filter((i) => i.kind === 'candidate')
      .forEach((i) => {
        if (i.index === undefined) return;
        map.set(i.index, [...(map.get(i.index) ?? []), i]);
      });
    return map;
  }, [issues]);

  const onSolve = () => {
    if (!valid) return;
    const r = solveNonCrossing(order, normCandidates);
    // 无可行配对时显式写入 null，不保留旧结论
    setResult(r);
    setAttempted(true);
  };

  const chosenPairSet = useMemo(() => {
    const s = new Set<string>();
    result?.chords.forEach(({ a, b }) => {
      s.add(JSON.stringify([a, b].sort()));
    });
    return s;
  }, [result]);

  const candidateRowChosen = (c: Candidate): boolean =>
    chosenPairSet.has(JSON.stringify([c.a.trim(), c.b.trim()].sort()));

  // ---------- 表格编辑 ----------
  const setEpId = (i: number, id: string) =>
    mutate((m) => {
      m.endpoints[i].id = id;
      return m;
    });
  const moveEndpoint = (i: number, dir: -1 | 1) =>
    mutate((m) => {
      const j = i + dir;
      if (j < 0 || j >= m.endpoints.length) return m;
      const [row] = m.endpoints.splice(i, 1);
      m.endpoints.splice(j, 0, row);
      return m;
    });
  const addEndpoint = () =>
    mutate((m) => {
      let n = m.endpoints.length + 1;
      let id = `E${n}`;
      const exist = new Set(m.endpoints.map((e) => e.id.trim()));
      while (exist.has(id)) id = `E${++n}`;
      m.endpoints.push({ id });
      return m;
    });
  const delEndpoint = (i: number) =>
    mutate((m) => {
      m.endpoints.splice(i, 1);
      return m;
    });

  const setCandidate = (i: number, patch: Partial<Candidate>) =>
    mutate((m) => {
      m.candidates[i] = { ...m.candidates[i], ...patch };
      return m;
    });
  const addCandidate = () =>
    mutate((m) => {
      const a = m.endpoints[0]?.id.trim() ?? '';
      const b = m.endpoints[1]?.id.trim() ?? a;
      m.candidates.push({ a, b, cost: 0 });
      return m;
    });
  const delCandidate = (i: number) =>
    mutate((m) => {
      m.candidates.splice(i, 1);
      return m;
    });

  // ---------- 导入/导出 ----------
  const doImport = (text: string) => {
    const parsed = parseModelJson(text);
    if (parsed.error) {
      setImportError(parsed.error);
      return;
    }
    setModel(parsed.model!);
    setResult(null);
    setAttempted(false);
    setHovered(null);
    setImportOpen(false);
    setImportText('');
    setImportError(null);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => doImport(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const exportJson = () => {
    const blob = new Blob([modelToJson(model)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wiring-model.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSample = () => {
    const clone = JSON.parse(JSON.stringify(SAMPLE_MODEL));
    setModel(clone);
    setResult(
      solveNonCrossing(
        clone.endpoints.map((e: { id: string }) => e.id),
        clone.candidates,
      ),
    );
    setAttempted(true);
    setHovered(null);
  };

  // ---------- 渲染 ----------
  return (
    <div className="app">
      <header className="app-header">
        <h1>环形接驳板 · 回流线排布复原</h1>
        <p>
          端点按圆周顺序排列；每个端点恰好连接一次，选中弦在圆内不相交；
          在全部可行配对中依次取总损耗最低、配对另一端序列字典序最小者。
        </p>
        <div className="toolbar">
          <button className="primary" onClick={onSolve} disabled={!valid}>
            本地启动复原
          </button>
          <button onClick={() => setImportOpen((v) => !v)}>导入 JSON</button>
          <button onClick={exportJson}>导出 JSON</button>
          <button onClick={loadSample}>载入示例</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
          <button onClick={() => fileRef.current?.click()}>选择文件…</button>
          {!attempted && result === null && (
            <span className="stale-note">模型已修改，当前连线已撤下，请重新复原</span>
          )}
        </div>
      </header>

      {importOpen && (
        <div className="panel">
          <h2>导入模型（JSON）</h2>
          <p className="hint">
            格式：{'{"endpoints":[{"id":"E1"},…]（按圆周顺序）, "candidates":[{"a":"E1","b":"E2","cost":3}]}'}
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            style={{
              width: '100%',
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 8,
              fontFamily: 'monospace',
            }}
            placeholder='{"endpoints":["E1","E2","E3","E4"],"candidates":[{"a":"E1","b":"E2","cost":1}]}'
          />
          {importError && <div className="banner error" style={{ marginTop: 8 }}>{importError}</div>}
          <div className="toolbar" style={{ marginTop: 8 }}>
            <button className="primary" onClick={() => doImport(importText)}>
              导入
            </button>
            <button onClick={() => { setImportOpen(false); setImportError(null); }}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="layout" style={{ marginTop: 16 }}>
        {/* 左：编辑区 */}
        <div>
          <div className="panel">
            <h2>① 端点（圆周顺序，编号唯一，偶数个）</h2>
            <table className="grid">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>序</th>
                  <th>编号</th>
                  <th style={{ width: 92 }}>调整顺序</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {model.endpoints.map((ep, i) => {
                  const bad = epIssueAt.get(i);
                  return (
                    <tr key={i}>
                      <td className="hint">{i + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={ep.id}
                          className={bad && bad.some((x) => x.field === 'id') ? 'bad' : ''}
                          title={bad?.map((x) => x.message).join('\n')}
                          onChange={(e) => setEpId(i, e.target.value)}
                        />
                      </td>
                      <td>
                        <button className="row-btn" onClick={() => moveEndpoint(i, -1)} disabled={i === 0}>↑</button>{' '}
                        <button
                          className="row-btn"
                          onClick={() => moveEndpoint(i, 1)}
                          disabled={i === model.endpoints.length - 1}
                        >
                          ↓
                        </button>
                      </td>
                      <td>
                        <button className="row-btn danger" onClick={() => delEndpoint(i)}>删</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="toolbar" style={{ marginTop: 8 }}>
              <button onClick={addEndpoint}>＋ 添加端点</button>
            </div>
          </div>

          <div className="panel">
            <h2>② 允许连接的候选对与非负整数损耗</h2>
            <table className="grid">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>行</th>
                  <th>端点 A</th>
                  <th>端点 B</th>
                  <th style={{ width: 90 }}>损耗</th>
                  <th>圆内冲突行</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {model.candidates.map((cand, i) => {
                  const bad = candIssueAt.get(i);
                  const rowCls = [
                    'cand-row',
                    candidateRowChosen(cand) && result ? 'chosen' : '',
                    hovered === i ? 'hl' : '',
                  ].join(' ');
                  return (
                    <tr
                      key={i}
                      className={rowCls}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <td className="hint">{i + 1}</td>
                      <td>
                        <input
                          type="text"
                          list="endpoint-list"
                          value={cand.a}
                          className={bad && bad.some((x) => x.field === 'a') ? 'bad' : ''}
                          onChange={(e) => setCandidate(i, { a: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          list="endpoint-list"
                          value={cand.b}
                          className={bad && bad.some((x) => x.field === 'b') ? 'bad' : ''}
                          onChange={(e) => setCandidate(i, { b: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={Number.isNaN(cand.cost) ? '' : cand.cost}
                          className={'mini ' + (bad && bad.some((x) => x.field === 'cost') ? 'bad' : '')}
                          onChange={(e) =>
                            setCandidate(i, { cost: e.target.value === '' ? NaN : Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        {conflicts[i] && conflicts[i].length > 0 ? (
                          <span className="conflict-cell" title="与这些候选弦在圆内相交，不能同时入选">
                            ✕ {conflicts[i].map((j) => j + 1).join('、')}
                          </span>
                        ) : (
                          <span className="no-conflict">—</span>
                        )}
                      </td>
                      <td>
                        <button className="row-btn danger" onClick={() => delCandidate(i)}>删</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="endpoint-list">
              {order.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
            <div className="toolbar" style={{ marginTop: 8 }}>
              <button onClick={addCandidate} disabled={model.endpoints.length < 2}>
                ＋ 添加候选对
              </button>
            </div>
            {badRowsHint(candIssueAt)}
          </div>

          {(errors.length > 0 || warnings.length > 0) && (
            <div className="panel">
              <h2>校验反馈（定位到行/字段）</h2>
              <ul className="issues">
                {issues.map((iss, i) => (
                  <li key={i} className={iss.severity}>
                    <span className="loc">
                      {iss.kind === 'endpoint' && `端点行 ${(iss.index ?? 0) + 1}`}
                      {iss.kind === 'candidate' && `候选行 ${(iss.index ?? 0) + 1}`}
                      {iss.kind === 'model' && '模型'}
                      {iss.field ? ` · ${fieldName(iss.field)}` : ''}：
                    </span>
                    {iss.message.replace(/^候选 \d+：/, '').replace(/^端点 \d+：/, '')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 右：环形布局与结果 */}
        <div>
          <div className="panel">
            <h2>环形布局</h2>
            <p className="hint">
              灰线为允许候选；绿线为本次入选回流线（线中标损耗）；悬停任一弦时，与之在圆内相交的弦标红虚线。
            </p>
            <div className="ring-wrap">
              {order.length >= 2 ? (
                <RingView
                  order={order}
                  candidates={normCandidates}
                  result={result}
                  hovered={hovered}
                  onHover={setHovered}
                />
              ) : (
                <div className="banner info">至少需要 2 个端点才能绘制环形布局。</div>
              )}
            </div>
          </div>

          <div className="panel">
            <h2>复原结果</h2>
            {!valid && (
              <div className="banner error">
                存在 {errors.length} 个阻断性错误，请先按左侧定位修复后再复原。
              </div>
            )}
            {valid && attempted && result === null && (
              <div className="banner error">
                无可行配对：在给定候选下，无法让每个端点恰好连接一次且所有弦互不相交。
                （未保留任何旧结论）
              </div>
            )}
            {valid && !attempted && result === null && (
              <div className="banner info">模型已变更，点击「本地启动复原」查看新结果。</div>
            )}
            {result && (
              <>
                <div className="stat-row">
                  <div className="stat">
                    <div className="k">总损耗</div>
                    <div className="v">{result.totalCost}</div>
                  </div>
                  <div className="stat">
                    <div className="k">入选弦数</div>
                    <div className="v">{result.chords.length}</div>
                  </div>
                  <div className="stat">
                    <div className="k">枚举到的可行配对</div>
                    <div className="v">{result.feasibleCount}</div>
                  </div>
                </div>
                <div className="hint" style={{ marginBottom: 4 }}>
                  次优判据：按端点编号升序的配对另一端序列（字典序最小）
                </div>
                <div className="partner-seq">
                  [{result.partnerSequence.map(({ id, partner }) => `${id}→${partner}`).join(',  ')}]
                </div>

                <table className="grid" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>入选回流线</th>
                      <th style={{ width: 80 }}>损耗</th>
                      <th>该线与哪些候选弦冲突</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.chords.map((ch, k) => {
                      const rowIdx = model.candidates.findIndex(
                        (c) =>
                          JSON.stringify([c.a.trim(), c.b.trim()].sort()) ===
                          JSON.stringify([ch.a, ch.b].sort()),
                      );
                      const cf = rowIdx >= 0 ? conflicts[rowIdx] : [];
                      return (
                        <tr
                          key={k}
                          className={'cand-row' + (hovered === rowIdx ? ' hl' : '')}
                          onMouseEnter={() => rowIdx >= 0 && setHovered(rowIdx)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          <td>
                            <span className="tag chosen">入选</span> {ch.a} — {ch.b}
                          </td>
                          <td>{ch.cost}</td>
                          <td>
                            {cf.length ? (
                              <span className="conflict-cell">
                                ✕ 候选行 {cf.map((j) => j + 1).join('、')}
                              </span>
                            ) : (
                              <span className="no-conflict">与任何候选弦都不相交</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function fieldName(f: string): string {
  return { id: '编号', a: '端点 A', b: '端点 B', cost: '损耗' }[f] ?? f;
}

function badRowsHint(map: Map<number, ValidationIssue[]>) {
  const count = [...map.values()].reduce((n, arr) => n + arr.length, 0);
  if (count === 0) return null;
  return (
    <div className="banner error" style={{ marginTop: 8 }}>
      本表有 {count} 处字段错误（红框），详见下方「校验反馈」。
    </div>
  );
}
