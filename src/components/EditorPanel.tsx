import { useRef } from 'react';
import type { ModelIssue } from '../core/types';

interface EditorPanelProps {
  endpointsText: string;
  candidatesText: string;
  issues: ModelIssue[];
  importError: string | null;
  showCandidates: boolean;
  onEndpointsChange: (text: string) => void;
  onCandidatesChange: (text: string) => void;
  onImportFile: (file: File) => void;
  onExport: () => void;
  onLoadSample: () => void;
  onSolve: () => void;
  onToggleCandidates: (show: boolean) => void;
}

/** 模型编辑区：端点、候选文本编辑，导入导出，定位化错误反馈。 */
export function EditorPanel(props: EditorPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="panel editor-panel">
      <h2>模型编辑</h2>

      <div className="toolbar">
        <button className="primary" onClick={props.onSolve}>
          开始复原
        </button>
        <button onClick={props.onLoadSample}>载入示例</button>
        <button onClick={() => fileRef.current?.click()}>导入文件</button>
        <button onClick={props.onExport}>导出 JSON</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onImportFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {props.importError && <p className="banner banner-error">导入失败：{props.importError}</p>}

      <label className="field">
        <span className="field-title">端点（每行一个，按圆周顺序，须为偶数个且唯一）</span>
        <textarea
          value={props.endpointsText}
          onChange={(e) => props.onEndpointsChange(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={'A\nB\nC\nD'}
        />
      </label>

      <label className="field">
        <span className="field-title">候选连线（每行：端点A 端点B 损耗，损耗为非负整数）</span>
        <textarea
          value={props.candidatesText}
          onChange={(e) => props.onCandidatesChange(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={'A B 5\nB C 6'}
        />
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={props.showCandidates}
          onChange={(e) => props.onToggleCandidates(e.target.checked)}
        />
        在环形图上显示全部候选连线
      </label>

      {props.issues.length > 0 && (
        <div className="issues">
          <h3>模型问题（{props.issues.length}）</h3>
          <ul>
            {props.issues.map((issue, i) => (
              <li key={i} className="issue">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
