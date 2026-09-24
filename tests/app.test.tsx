import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import App from '../src/App';

describe('应用渲染', () => {
  it('首屏可服务端渲染且包含关键区块', () => {
    const html = renderToString(createElement(App));
    expect(html).toContain('环形接驳板回流线配对');
    expect(html).toContain('模型编辑');
    expect(html).toContain('环形布局');
    expect(html).toContain('求解结果');
    expect(html).toContain('开始复原');
  });
});
