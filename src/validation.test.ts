import { describe, expect, it } from 'vitest';
import { validateModel, hasErrors } from './validation';
import type { WiringModel } from './types';

const ep = (id: string) => ({ id });

describe('validateModel', () => {
  it('合法模型无错误', () => {
    const m: WiringModel = {
      endpoints: [ep('1'), ep('2'), ep('3'), ep('4')],
      candidates: [
        { a: '1', b: '2', cost: 0 },
        { a: '3', b: '4', cost: 10 },
      ],
    };
    const issues = validateModel(m);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('端点数为奇数时定位到 model 级错误', () => {
    const m: WiringModel = {
      endpoints: [ep('1'), ep('2'), ep('3')],
      candidates: [],
    };
    const issues = validateModel(m);
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('奇数'))).toBe(true);
  });

  it('空编号与重复编号定位到具体行和字段', () => {
    const m: WiringModel = {
      endpoints: [{ id: ' X ' }, { id: 'X' }, { id: '' }, { id: 'Y' }],
      candidates: [],
    };
    const issues = validateModel(m);
    const dup = issues.filter((i) => i.kind === 'endpoint' && i.field === 'id');
    // X 重复出现两次，空编号一次
    expect(dup.some((i) => i.index === 0 && i.message.includes('重复'))).toBe(true);
    expect(dup.some((i) => i.index === 1 && i.message.includes('重复'))).toBe(true);
    expect(dup.some((i) => i.index === 2 && i.message.includes('为空'))).toBe(true);
  });

  it('候选自连被拒绝', () => {
    const m: WiringModel = {
      endpoints: [ep('1'), ep('2')],
      candidates: [{ a: '1', b: '1', cost: 0 }],
    };
    const issues = validateModel(m);
    expect(issues.some((i) => i.kind === 'candidate' && i.index === 0 && i.message.includes('自连'))).toBe(true);
  });

  it('重复无向候选（正反顺序）被识别并指向先出现行', () => {
    const m: WiringModel = {
      endpoints: [ep('1'), ep('2'), ep('3'), ep('4')],
      candidates: [
        { a: '1', b: '2', cost: 1 },
        { a: '2', b: '1', cost: 9 },
      ],
    };
    const issues = validateModel(m);
    const dup = issues.find((i) => i.message.includes('重复'));
    expect(dup?.index).toBe(1);
    expect(dup?.message).toContain('候选 1');
  });

  it('引用不存在端点定位到字段', () => {
    const m: WiringModel = {
      endpoints: [ep('1'), ep('2')],
      candidates: [{ a: '1', b: '9', cost: 1 }],
    };
    const issues = validateModel(m);
    expect(issues.some((i) => i.index === 0 && i.field === 'b' && i.message.includes('不存在'))).toBe(true);
  });

  it('非整数、负数、非数损耗被拒绝', () => {
    const m: WiringModel = {
      endpoints: [ep('1'), ep('2'), ep('3'), ep('4')],
      candidates: [
        { a: '1', b: '2', cost: -1 },
        { a: '3', b: '4', cost: 1.5 },
      ],
    };
    const issues = validateModel(m);
    const costIssues = issues.filter((i) => i.field === 'cost');
    expect(costIssues).toHaveLength(2);
  });

  it('孤立端点给出警告', () => {
    const m: WiringModel = {
      endpoints: [ep('1'), ep('2'), ep('3'), ep('4')],
      candidates: [{ a: '1', b: '2', cost: 1 }],
    };
    const issues = validateModel(m);
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('3'))).toBe(true);
  });
});
