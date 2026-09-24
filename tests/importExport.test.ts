import { describe, expect, it } from 'vitest';
import { exportModelJson, importModelFile } from '../src/core/importExport';

describe('模型文件导入', () => {
  it('导入对象形式 JSON', () => {
    const t = importModelFile(
      JSON.stringify({
        endpoints: ['A', 'B', 'C', 'D'],
        candidates: [{ a: 'A', b: 'B', loss: 3 }],
      }),
    );
    expect(t.endpointsText).toBe('A\nB\nC\nD');
    expect(t.candidatesText).toBe('A B 3');
  });

  it('导入三元数组形式 JSON', () => {
    const t = importModelFile(
      JSON.stringify({ endpoints: ['A', 'B'], candidates: [['A', 'B', 0]] }),
    );
    expect(t.candidatesText).toBe('A B 0');
  });

  it('导入分节文本', () => {
    const t = importModelFile('[endpoints]\nA\nB\n[candidates]\nA B 5\n');
    expect(t.endpointsText).toBe('A\nB');
    expect(t.candidatesText).toBe('A B 5');
  });

  it('JSON 语法错误与结构错误均抛出定位信息', () => {
    expect(() => importModelFile('{oops')).toThrow('JSON 解析失败');
    expect(() => importModelFile('{"endpoints":"x"}')).toThrow('endpoints');
    expect(() => importModelFile('{"endpoints":["A"],"candidates":[{"a":"A","b":"B"}]}')).toThrow(
      'candidates[0]',
    );
    expect(() =>
      importModelFile('{"endpoints":["A"],"candidates":[["A","B",-2]]}'),
    ).toThrow('非负整数');
  });

  it('空文件与节外内容报错', () => {
    expect(() => importModelFile('   ')).toThrow('为空');
    expect(() => importModelFile('A B 1')).toThrow('[endpoints]');
  });

  it('导出 JSON 可被重新导入（往返一致）', () => {
    const json = exportModelJson('A\nB\nC\nD', 'A B 1\nC D 2');
    const t = importModelFile(json);
    expect(t.endpointsText).toBe('A\nB\nC\nD');
    expect(t.candidatesText).toBe('A B 1\nC D 2');
  });
});
