import { describe, expect, it } from 'vitest';
import { parseCandidates, parseEndpoints, parseModel } from '../src/core/parse';

describe('端点解析与校验', () => {
  it('接受合法端点列表并保持圆周顺序', () => {
    const { endpoints, issues } = parseEndpoints('A\nB\nC\nD');
    expect(issues).toEqual([]);
    expect(endpoints).toEqual(['A', 'B', 'C', 'D']);
  });

  it('忽略空行与 # 注释行', () => {
    const { endpoints, issues } = parseEndpoints('# 注释\nA\n\nB\n');
    expect(issues).toEqual([]);
    expect(endpoints).toEqual(['A', 'B']);
  });

  it('端点数为奇数时报整体错误', () => {
    const { issues } = parseEndpoints('A\nB\nC');
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('endpoints-odd');
    expect(issues[0].message).toContain('3');
  });

  it('端点不足 2 个时报错', () => {
    expect(parseEndpoints('').issues[0].code).toBe('endpoints-too-few');
    expect(parseEndpoints('A').issues[0].code).toBe('endpoints-too-few');
  });

  it('重复端点定位到行号与首次出现行', () => {
    const { issues } = parseEndpoints('A\nB\nA\nC');
    // 去重后剩 3 个端点，同时触发奇数数量错误
    expect(issues).toHaveLength(2);
    expect(issues[0].code).toBe('endpoint-duplicate');
    expect(issues[0].line).toBe(3);
    expect(issues[0].message).toContain('第 3 行');
    expect(issues[0].message).toContain('第 1 行');
    expect(issues[1].code).toBe('endpoints-odd');
  });
});

describe('候选解析与校验', () => {
  const endpoints = ['A', 'B', 'C', 'D'];

  it('接受合法候选并规范化为无向对', () => {
    const { candidates, issues } = parseCandidates('B A 3\nC D 0', endpoints);
    expect(issues).toEqual([]);
    expect(candidates).toEqual([
      { a: 0, b: 1, loss: 3, line: 1 },
      { a: 2, b: 3, loss: 0, line: 2 },
    ]);
  });

  it('支持逗号分隔', () => {
    const { candidates, issues } = parseCandidates('A, B, 7', endpoints);
    expect(issues).toEqual([]);
    expect(candidates[0]).toMatchObject({ a: 0, b: 1, loss: 7 });
  });

  it('段数不对时报格式错误并定位行号', () => {
    const { issues } = parseCandidates('A B\nA B 1 2', endpoints);
    expect(issues.map((i) => i.code)).toEqual(['candidate-format', 'candidate-format']);
    expect(issues[0].line).toBe(1);
    expect(issues[1].line).toBe(2);
  });

  it('损耗必须是非负整数', () => {
    const neg = parseCandidates('A B -1', endpoints);
    expect(neg.issues[0].code).toBe('candidate-loss');
    const frac = parseCandidates('A B 1.5', endpoints);
    expect(frac.issues[0].code).toBe('candidate-loss');
  });

  it('候选自连被定位拒绝', () => {
    const { issues } = parseCandidates('A B 1\nC C 2', endpoints);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('candidate-self-loop');
    expect(issues[0].line).toBe(2);
    expect(issues[0].message).toContain('C');
  });

  it('重复无向候选（含反向）被定位拒绝', () => {
    const { issues } = parseCandidates('A B 1\nB A 2\nC D 3\nD C 4', endpoints);
    expect(issues).toHaveLength(2);
    expect(issues[0].code).toBe('candidate-duplicate');
    expect(issues[0].line).toBe(2);
    expect(issues[0].message).toContain('第 1 行');
    expect(issues[1].line).toBe(4);
  });

  it('引用不存在端点时报错并指出端点名', () => {
    const { issues } = parseCandidates('A X 1\nY Z 2', endpoints);
    expect(issues).toHaveLength(2);
    expect(issues[0].code).toBe('candidate-unknown-endpoint');
    expect(issues[0].message).toContain('X');
    expect(issues[1].message).toContain('Y');
    expect(issues[1].message).toContain('Z');
  });
});

describe('整体模型', () => {
  it('全部合法时给出可用模型', () => {
    const { model, issues } = parseModel('A\nB\nC\nD', 'A B 1\nC D 2');
    expect(issues).toEqual([]);
    expect(model).not.toBeNull();
    expect(model!.endpoints).toHaveLength(4);
  });

  it('存在任何错误时 model 为 null', () => {
    const { model, issues } = parseModel('A\nB\nC', 'A B 1');
    expect(model).toBeNull();
    expect(issues.length).toBeGreaterThan(0);
  });
});
