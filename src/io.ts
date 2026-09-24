/**
 * JSON 导入/导出：
 *   { "endpoints": [{"id": "1"}, ...], "candidates": [{"a":"1","b":"2","cost":3}] }
 * 端点数组按圆周顺序排列。
 */
import type { Candidate, Endpoint, WiringModel } from './types';

export interface ParseResult {
  model?: WiringModel;
  error?: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseModelJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { error: `JSON 语法错误：${(e as Error).message}` };
  }
  if (!isObject(data)) {
    return { error: '顶层必须是对象，例如 {"endpoints":[...],"candidates":[...]}' };
  }

  const eps = data.endpoints;
  const cands = data.candidates;
  if (!Array.isArray(eps)) return { error: '缺少 endpoints 数组' };
  if (cands !== undefined && !Array.isArray(cands)) {
    return { error: 'candidates 必须是数组' };
  }

  try {
    const endpoints: Endpoint[] = eps.map((raw, i) => {
      if (typeof raw === 'string') return { id: raw };
      if (isObject(raw) && typeof raw.id === 'string') {
        return {
          id: raw.id,
          label: typeof raw.label === 'string' ? raw.label : undefined,
        };
      }
      throw new Error(`endpoints[${i}] 必须是字符串 id 或 {"id": ...} 对象`);
    });

    const candidates: Candidate[] = (cands ?? []).map((raw, i) => {
      if (!isObject(raw)) throw new Error(`candidates[${i}] 必须是对象`);
      const { a, b, cost } = raw;
      if (typeof a !== 'string') throw new Error(`candidates[${i}].a 必须是字符串`);
      if (typeof b !== 'string') throw new Error(`candidates[${i}].b 必须是字符串`);
      if (typeof cost !== 'number') {
        throw new Error(`candidates[${i}].cost 必须是数字（非负整数）`);
      }
      return { a, b, cost };
    });

    return { model: { endpoints, candidates } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function modelToJson(model: WiringModel): string {
  return JSON.stringify(model, null, 2);
}
