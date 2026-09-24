import { useEffect, useMemo, useState } from 'react';
import { parseModel } from './core/parse';
import { solveMatching } from './core/solve';
import { conflictsOf, findConflicts } from './core/geometry';
import { exportModelJson, importModelFile } from './core/importExport';
import type { SolveResult } from './core/types';
import { CircleView, type ChordView } from './components/CircleView';
import { EditorPanel } from './components/EditorPanel';
import { ResultPanel } from './components/ResultPanel';

const SAMPLE_ENDPOINTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].join('\n');
const SAMPLE_CANDIDATES = [
  'A B 5',
  'B C 5',
  'C D 5',
  'D E 5',
  'E F 5',
  'F G 5',
  'G H 5',
  'H A 5',
  'A F 1',
  'C H 1',
  'B F 2',
  'E H 3',
  'B E 8',
  'D G 8',
].join('\n');

export default function App() {
  const [endpointsText, setEndpointsText] = useState(SAMPLE_ENDPOINTS);
  const [candidatesText, setCandidatesText] = useState(SAMPLE_CANDIDATES);
  const [showCandidates, setShowCandidates] = useState(true);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [selectedChord, setSelectedChord] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // 实时解析与校验，错误随输入即时定位反馈。
  const { model, issues } = useMemo(
    () => parseModel(endpointsText, candidatesText),
    [endpointsText, candidatesText],
  );

  // 任何模型修改都立即撤下已生成的连线与结论。
  useEffect(() => {
    setResult(null);
    setSelectedChord(null);
  }, [endpointsText, candidatesText]);

  const conflicts = useMemo(
    () => (model ? findConflicts(model.candidates, model.endpoints.length) : []),
    [model],
  );

  const chords: ChordView[] | null = useMemo(() => {
    if (!model || !result || result.status !== 'optimal') return null;
    const lossOf = new Map<number, number>();
    for (const c of model.candidates) lossOf.set(c.a * model.endpoints.length + c.b, c.loss);
    return result.pairs.map(([a, b]) => ({
      a,
      b,
      loss: lossOf.get(a * model.endpoints.length + b) ?? 0,
    }));
  }, [model, result]);

  const chordConflicts: number[][] = useMemo(() => {
    if (!model || !result || result.status !== 'optimal') return [];
    return result.pairs.map(([a, b]) => conflictsOf(a, b, model.candidates, model.endpoints.length));
  }, [model, result]);

  const conflictCandidates: ReadonlySet<number> = useMemo(() => {
    if (selectedChord === null) return new Set<number>();
    return new Set(chordConflicts[selectedChord] ?? []);
  }, [selectedChord, chordConflicts]);

  const handleSolve = () => {
    setSelectedChord(null);
    if (!model) {
      // 模型存在错误：不生成任何连线，错误已在编辑区定位展示。
      setResult(null);
      return;
    }
    // 无可行配对时返回 infeasible，旧结论一并清除。
    setResult(solveMatching(model));
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const texts = importModelFile(String(reader.result ?? ''));
        setEndpointsText(texts.endpointsText);
        setCandidatesText(texts.candidatesText);
        setImportError(null);
      } catch (e) {
        setImportError(e instanceof Error ? e.message : String(e));
      }
    };
    reader.onerror = () => setImportError('文件读取失败');
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([exportModelJson(endpointsText, candidatesText)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ring-model.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header>
        <h1>环形接驳板回流线配对</h1>
        <p className="muted">
          每个端点恰好连接一次、弦不在圆内交叉；完整比较全部可行配对，先取总损耗最低，
          再取配对另一端编号序列字典序最小的方案。
        </p>
      </header>

      <main>
        <EditorPanel
          endpointsText={endpointsText}
          candidatesText={candidatesText}
          issues={issues}
          importError={importError}
          showCandidates={showCandidates}
          onEndpointsChange={setEndpointsText}
          onCandidatesChange={setCandidatesText}
          onImportFile={handleImportFile}
          onExport={handleExport}
          onLoadSample={() => {
            setEndpointsText(SAMPLE_ENDPOINTS);
            setCandidatesText(SAMPLE_CANDIDATES);
            setImportError(null);
          }}
          onSolve={handleSolve}
          onToggleCandidates={setShowCandidates}
        />

        <section className="panel circle-panel">
          <h2>环形布局</h2>
          {model ? (
            <CircleView
              endpoints={model.endpoints}
              candidates={model.candidates}
              showCandidates={showCandidates}
              chords={chords}
              selectedChord={selectedChord}
              onSelectChord={setSelectedChord}
              conflictCandidates={conflictCandidates}
            />
          ) : (
            <div className="circle-empty">模型存在错误，修正后此处展示环形布局</div>
          )}
          <div className="legend">
            <span className="legend-item">
              <span className="swatch swatch-chord" /> 已选连线（标注损耗）
            </span>
            <span className="legend-item">
              <span className="swatch swatch-candidate" /> 候选连线
            </span>
            <span className="legend-item">
              <span className="swatch swatch-conflict" /> 与选中弦冲突的候选
            </span>
          </div>
        </section>

        {model && (
          <ResultPanel
            result={result}
            model={model}
            selectedChord={selectedChord}
            onSelectChord={setSelectedChord}
            conflicts={conflicts}
            chordConflicts={chordConflicts}
          />
        )}
        {!model && (
          <section className="panel result-panel">
            <h2>求解结果</h2>
            <p className="muted">模型存在错误，无法求解；请根据左侧定位信息修正。</p>
          </section>
        )}
      </main>
    </div>
  );
}
