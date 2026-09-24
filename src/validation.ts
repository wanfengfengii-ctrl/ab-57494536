/**
 * 模型校验：把所有问题定位到具体端点行或候选行（含字段），
 * 便于 UI 就地反馈，而不是只给笼统报错。
 */
import type { WiringModel } from './types';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  /** 问题所在位置类型 */
  kind: 'endpoint' | 'candidate' | 'model';
  /** 行下标（0 基，对应编辑表格行号 - 1） */
  index?: number;
  /** 字段名 */
  field?: 'id' | 'a' | 'b' | 'cost';
  message: string;
}

const norm = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');

export function validateModel(model: WiringModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const endpoints = model.endpoints ?? [];
  const candidates = model.candidates ?? [];

  // ---- 端点 ----
  const idCount = new Map<string, number>();
  endpoints.forEach((ep, i) => {
    const id = norm(ep?.id);
    if (!id) {
      issues.push({
        severity: 'error',
        kind: 'endpoint',
        index: i,
        field: 'id',
        message: `端点 ${i + 1}：编号为空`,
      });
    } else {
      idCount.set(id, (idCount.get(id) ?? 0) + 1);
    }
  });
  for (const [id, c] of idCount) {
    if (c > 1) {
      endpoints.forEach((ep, i) => {
        if (norm(ep?.id) === id) {
          issues.push({
            severity: 'error',
            kind: 'endpoint',
            index: i,
            field: 'id',
            message: `端点编号「${id}」重复，编号必须唯一`,
          });
        }
      });
    }
  }

  const n = endpoints.length;
  if (endpoints.length === 0) {
    issues.push({
      severity: 'error',
      kind: 'model',
      message: '至少需要 2 个按圆周顺序排列的端点',
    });
  } else if (n % 2 !== 0) {
    issues.push({
      severity: 'error',
      kind: 'model',
      message: `端点数 ${n} 为奇数，必须是偶数才能让每个端点恰好连接一次`,
    });
  }

  // ---- 候选 ----
  const known = new Set(
    endpoints.map((ep) => norm(ep?.id)).filter((s) => s !== ''),
  );
  const pairKey = (a: string, b: string): string =>
    JSON.stringify(a < b ? [a, b] : [b, a]);
  const seenPair = new Map<string, number>();

  candidates.forEach((c, i) => {
    const a = norm(c?.a);
    const b = norm(c?.b);

    if (!a) {
      issues.push({
        severity: 'error',
        kind: 'candidate',
        index: i,
        field: 'a',
        message: `候选 ${i + 1}：端点 A 为空`,
      });
    } else if (!known.has(a)) {
      issues.push({
        severity: 'error',
        kind: 'candidate',
        index: i,
        field: 'a',
        message: `候选 ${i + 1}：端点「${a}」不存在`,
      });
    }
    if (!b) {
      issues.push({
        severity: 'error',
        kind: 'candidate',
        index: i,
        field: 'b',
        message: `候选 ${i + 1}：端点 B 为空`,
      });
    } else if (!known.has(b)) {
      issues.push({
        severity: 'error',
        kind: 'candidate',
        index: i,
        field: 'b',
        message: `候选 ${i + 1}：端点「${b}」不存在`,
      });
    }

    if (a && b && a === b) {
      issues.push({
        severity: 'error',
        kind: 'candidate',
        index: i,
        field: 'b',
        message: `候选 ${i + 1}：端点不能自连（${a}—${b}）`,
      });
    }

    if (a && b && a !== b && known.has(a) && known.has(b)) {
      const key = pairKey(a, b);
      const prev = seenPair.get(key);
      if (prev !== undefined) {
        issues.push({
          severity: 'error',
          kind: 'candidate',
          index: i,
          message: `候选 ${i + 1}：与候选 ${prev + 1} 是重复的无向对（${a < b ? a : b}—${
            a < b ? b : a
          }）`,
        });
      } else {
        seenPair.set(key, i);
      }
    }

    const cost = c?.cost;
    if (
      cost === undefined ||
      cost === null ||
      typeof cost !== 'number' ||
      !Number.isInteger(cost) ||
      cost < 0
    ) {
      const shown = typeof cost === 'number' && Number.isFinite(cost) ? `（收到 ${cost}）` : '';
      issues.push({
        severity: 'error',
        kind: 'candidate',
        index: i,
        field: 'cost',
        message: `候选 ${i + 1}：损耗必须是非负整数${shown}`,
      });
    }
  });

  // 孤立端点（非阻断性提示）
  if (issues.every((x) => x.severity !== 'error')) {
    const degree = new Map<string, number>();
    known.forEach((id) => degree.set(id, 0));
    for (const c of candidates) {
      const a = norm(c.a);
      const b = norm(c.b);
      if (known.has(a) && known.has(b)) {
        degree.set(a, (degree.get(a) ?? 0) + 1);
        degree.set(b, (degree.get(b) ?? 0) + 1);
      }
    }
    for (const [id, d] of degree) {
      if (d === 0) {
        issues.push({
          severity: 'warning',
          kind: 'model',
          message: `端点「${id}」没有任何候选连线，不可能存在可行配对`,
        });
      }
    }
  }

  return issues;
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
