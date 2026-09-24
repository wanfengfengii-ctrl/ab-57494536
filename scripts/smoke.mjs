#!/usr/bin/env node
/**
 * HTTP 冒烟检查：用 Node 内置 http 静态托管 dist/，
 * 请求首页与构建产物，全部 200 且首页包含挂载点则退出 0，否则退出 1。
 * 用法：node scripts/smoke.mjs [distDir]
 */
import { createServer, get } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const distDir = resolve(process.argv[2] ?? 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function httpGet(port, path) {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = get({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolvePromise({ status: res.statusCode, body }));
    });
    req.on('error', rejectPromise);
    req.setTimeout(5000, () => req.destroy(new Error('请求超时')));
  });
}

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`[smoke] 未找到 ${distDir}/index.html，请先执行构建`);
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = join(distDir, path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address();
  try {
    const home = await httpGet(port, '/');
    assert(home.status === 200, `首页状态码 ${home.status}，期望 200`);
    assert(home.body.includes('id="root"'), '首页缺少 #root 挂载点');
    console.log('[smoke] GET / -> 200，包含 #root 挂载点');

    const assetMatch = home.body.match(/src="(\/assets\/[^"]+\.js)"/);
    assert(assetMatch, '首页未引用构建后的 JS 资产');
    const asset = await httpGet(port, assetMatch[1]);
    assert(asset.status === 200, `资产 ${assetMatch[1]} 状态码 ${asset.status}`);
    console.log(`[smoke] GET ${assetMatch[1]} -> 200`);

    console.log('[smoke] 冒烟检查通过');
    server.close(() => process.exit(0));
  } catch (err) {
    console.error(`[smoke] 失败：${err.message}`);
    server.close(() => process.exit(1));
  }
});
