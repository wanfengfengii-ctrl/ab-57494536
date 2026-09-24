import { describe, expect, it } from 'vitest';
import { parseModelJson, modelToJson } from './io';

describe('parseModelJson', () => {
  it('解析标准模型', () => {
    const r = parseModelJson(
      JSON.stringify({
        endpoints: [{ id: '1' }, { id: '2' }],
        candidates: [{ a: '1', b: '2', cost: 3 }],
      }),
    );
    expect(r.error).toBeUndefined();
    expect(r.model!.endpoints).toHaveLength(2);
    expect(r.model!.candidates[0].cost).toBe(3);
  });

  it('支持字符串形式端点', () => {
    const r = parseModelJson(JSON.stringify({ endpoints: ['A', 'B'], candidates: [] }));
    expect(r.model!.endpoints).toEqual([{ id: 'A' }, { id: 'B' }]);
  });

  it('JSON 语法错误给出提示', () => {
    expect(parseModelJson('{bad').error).toContain('语法错误');
  });

  it('顶层非对象 / 缺数组报错', () => {
    expect(parseModelJson('[]').error).toBeTruthy();
    expect(parseModelJson('{}').error).toContain('endpoints');
  });

  it('字段类型错误定位到下标', () => {
    const bad = parseModelJson(
      JSON.stringify({ endpoints: ['1', '2'], candidates: [{ a: '1', b: 2, cost: 0 }] }),
    );
    expect(bad.error).toContain('candidates[0]');
  });

  it('导出再导入保持一致', () => {
    const m = {
      endpoints: [{ id: '1' }, { id: '2' }],
      candidates: [{ a: '2', b: '1', cost: 5 }],
    };
    expect(parseModelJson(modelToJson(m)).model).toEqual(m);
  });
});
