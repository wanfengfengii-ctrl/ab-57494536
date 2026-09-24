import type { Candidate, Model, ModelIssue, ParseOutcome } from './types';

/**
 * 端点文本格式：每行一个端点 id（非空白、不含逗号），按行序即圆周顺序。
 * 空行与以 # 开头的行会被忽略；行号始终按原始文本计（1 起），用于错误定位。
 */
export function parseEndpoints(text: string): { endpoints: string[]; issues: ModelIssue[] } {
  const issues: ModelIssue[] = [];
  const endpoints: string[] = [];
  const seen = new Map<string, number>(); // id -> 首次出现的行号

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const id = raw.trim();
    if (id === '' || id.startsWith('#')) return;
    if (/\s/.test(id) || id.includes(',')) {
      issues.push({
        code: 'endpoint-invalid',
        scope: 'endpoints',
        line,
        message: `端点第 ${line} 行：端点 id「${id}」不能包含空白或逗号`,
      });
      return;
    }
    const first = seen.get(id);
    if (first !== undefined) {
      issues.push({
        code: 'endpoint-duplicate',
        scope: 'endpoints',
        line,
        message: `端点第 ${line} 行：端点「${id}」与第 ${first} 行重复，端点必须唯一`,
      });
      return;
    }
    seen.set(id, line);
    endpoints.push(id);
  });

  if (endpoints.length < 2) {
    issues.push({
      code: 'endpoints-too-few',
      scope: 'endpoints',
      message: `端点数量必须是不小于 2 的偶数（当前 ${endpoints.length} 个）`,
    });
  } else if (endpoints.length % 2 !== 0) {
    issues.push({
      code: 'endpoints-odd',
      scope: 'endpoints',
      message: `端点数量为 ${endpoints.length}，不是偶数，无法做到每个端点恰好连接一次`,
    });
  }
  return { endpoints, issues };
}

/**
 * 候选文本格式：每行 `端点A 端点B 损耗`，分隔符可为空白或逗号，损耗为非负整数。
 * 无向候选：(A B 3) 与 (B A 3) 视为同一条，重复出现即报错。
 */
export function parseCandidates(
  text: string,
  endpoints: string[],
): { candidates: Candidate[]; issues: ModelIssue[] } {
  const issues: ModelIssue[] = [];
  const candidates: Candidate[] = [];
  const indexOf = new Map<string, number>(endpoints.map((id, i) => [id, i]));
  const seenPairs = new Map<string, number>(); // 规范化无向对 -> 首次行号

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;

    const tokens = trimmed.split(/[\s,]+/).filter((t) => t !== '');
    if (tokens.length !== 3) {
      issues.push({
        code: 'candidate-format',
        scope: 'candidates',
        line,
        message: `候选第 ${line} 行：格式应为「端点A 端点B 损耗」三段（当前 ${tokens.length} 段）`,
      });
      return;
    }
    const [idA, idB, lossToken] = tokens;

    if (!/^\d+$/.test(lossToken)) {
      issues.push({
        code: 'candidate-loss',
        scope: 'candidates',
        line,
        message: `候选第 ${line} 行：损耗「${lossToken}」不是非负整数`,
      });
      return;
    }
    const loss = Number(lossToken);
    if (!Number.isSafeInteger(loss)) {
      issues.push({
        code: 'candidate-loss',
        scope: 'candidates',
        line,
        message: `候选第 ${line} 行：损耗「${lossToken}」超出安全整数范围`,
      });
      return;
    }

    if (idA === idB) {
      issues.push({
        code: 'candidate-self-loop',
        scope: 'candidates',
        line,
        message: `候选第 ${line} 行：「${idA}」与自身相连，候选不允许自连`,
      });
      return;
    }

    const a = indexOf.get(idA);
    const b = indexOf.get(idB);
    if (a === undefined || b === undefined) {
      const missing = [idA, idB].filter((id) => !indexOf.has(id));
      issues.push({
        code: 'candidate-unknown-endpoint',
        scope: 'candidates',
        line,
        message: `候选第 ${line} 行：引用了不存在的端点 ${missing.map((m) => `「${m}」`).join('、')}`,
      });
      return;
    }

    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}-${hi}`;
    const first = seenPairs.get(key);
    if (first !== undefined) {
      issues.push({
        code: 'candidate-duplicate',
        scope: 'candidates',
        line,
        message: `候选第 ${line} 行：无向候选「${idA}—${idB}」与第 ${first} 行重复`,
      });
      return;
    }
    seenPairs.set(key, line);
    candidates.push({ a: lo, b: hi, loss, line });
  });

  return { candidates, issues };
}

/** 解析并校验完整模型；存在任何错误时 model 为 null。 */
export function parseModel(endpointsText: string, candidatesText: string): ParseOutcome {
  const { endpoints, issues: epIssues } = parseEndpoints(endpointsText);
  const { candidates, issues: cdIssues } = parseCandidates(candidatesText, endpoints);
  const issues = [...epIssues, ...cdIssues];
  const model: Model | null = issues.length === 0 ? { endpoints, candidates } : null;
  return { model, issues };
}
