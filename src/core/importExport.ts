/**
 * 模型文件的导入导出。
 * 支持两种格式：
 *  1. JSON：{ "endpoints": ["A", ...], "candidates": [{"a":"A","b":"B","loss":3} | ["A","B",3], ...] }
 *  2. 分节文本：
 *       [endpoints]        —— 之后每行一个端点
 *       [candidates]       —— 之后每行「端点A 端点B 损耗」
 * 导入结果统一转换为编辑器使用的两段纯文本，后续仍走统一的解析与校验。
 */

export interface ImportedTexts {
  endpointsText: string;
  candidatesText: string;
}

interface RawCandidate {
  a: string;
  b: string;
  loss: number;
}

function normalizeJson(data: unknown): ImportedTexts {
  if (typeof data !== 'object' || data === null) {
    throw new Error('JSON 顶层必须是对象，包含 endpoints 与 candidates 两个字段');
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.endpoints)) {
    throw new Error('JSON 字段 endpoints 必须是字符串数组');
  }
  const endpoints = obj.endpoints.map((e, i) => {
    if (typeof e !== 'string' || e.trim() === '') {
      throw new Error(`JSON endpoints[${i}] 必须是非空字符串`);
    }
    return e.trim();
  });
  if (!Array.isArray(obj.candidates)) {
    throw new Error('JSON 字段 candidates 必须是数组');
  }
  const candidates: RawCandidate[] = obj.candidates.map((c, i) => {
    if (Array.isArray(c)) {
      const [a, b, loss] = c;
      if (typeof a !== 'string' || typeof b !== 'string' || typeof loss !== 'number') {
        throw new Error(`JSON candidates[${i}] 数组形式应为 ["端点A","端点B",损耗]`);
      }
      return { a: a.trim(), b: b.trim(), loss };
    }
    if (typeof c === 'object' && c !== null) {
      const r = c as Record<string, unknown>;
      if (typeof r.a !== 'string' || typeof r.b !== 'string' || typeof r.loss !== 'number') {
        throw new Error(`JSON candidates[${i}] 对象形式应为 {"a":"端点A","b":"端点B","loss":损耗}`);
      }
      return { a: r.a.trim(), b: r.b.trim(), loss: r.loss };
    }
    throw new Error(`JSON candidates[${i}] 无法识别，应为对象或三元数组`);
  });
  for (const [i, c] of candidates.entries()) {
    if (!Number.isInteger(c.loss) || c.loss < 0) {
      throw new Error(`JSON candidates[${i}] 的损耗 ${c.loss} 不是非负整数`);
    }
  }
  return toTexts(endpoints, candidates);
}

function normalizeSections(text: string): ImportedTexts {
  const endpoints: string[] = [];
  const candidates: RawCandidate[] = [];
  let section: 'none' | 'endpoints' | 'candidates' = 'none';

  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const t = raw.trim();
    if (t === '' || t.startsWith('#')) return;
    const head = t.toLowerCase();
    if (head === '[endpoints]' || head === '[端点]') {
      section = 'endpoints';
      return;
    }
    if (head === '[candidates]' || head === '[候选]') {
      section = 'candidates';
      return;
    }
    if (section === 'endpoints') {
      endpoints.push(t);
    } else if (section === 'candidates') {
      const tokens = t.split(/[\s,]+/).filter((s) => s !== '');
      if (tokens.length !== 3) {
        throw new Error(`第 ${line} 行：候选应为「端点A 端点B 损耗」三段`);
      }
      const loss = Number(tokens[2]);
      if (!Number.isInteger(loss) || loss < 0) {
        throw new Error(`第 ${line} 行：损耗「${tokens[2]}」不是非负整数`);
      }
      candidates.push({ a: tokens[0], b: tokens[1], loss });
    } else {
      throw new Error(`第 ${line} 行：内容必须位于 [endpoints] 或 [candidates] 节内`);
    }
  });
  return toTexts(endpoints, candidates);
}

function toTexts(endpoints: string[], candidates: RawCandidate[]): ImportedTexts {
  return {
    endpointsText: endpoints.join('\n'),
    candidatesText: candidates.map((c) => `${c.a} ${c.b} ${c.loss}`).join('\n'),
  };
}

/** 解析导入文件内容；无法识别时抛出带定位信息的 Error。 */
export function importModelFile(content: string): ImportedTexts {
  const trimmed = content.trim();
  if (trimmed === '') throw new Error('文件内容为空');
  if (trimmed.startsWith('{')) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch (e) {
      throw new Error(`JSON 解析失败：${e instanceof Error ? e.message : String(e)}`);
    }
    return normalizeJson(data);
  }
  return normalizeSections(trimmed);
}

/** 导出为规范 JSON 文本。 */
export function exportModelJson(endpointsText: string, candidatesText: string): string {
  const endpoints = endpointsText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '' && !s.startsWith('#'));
  const candidates = candidatesText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '' && !s.startsWith('#'))
    .map((line) => {
      const [a, b, loss] = line.split(/[\s,]+/).filter((s) => s !== '');
      return { a, b, loss: Number(loss) };
    });
  return JSON.stringify({ endpoints, candidates }, null, 2);
}
