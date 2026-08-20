#!/usr/bin/env node
/**
 * 一键启动开发环境：
 * 先启动后端，轮询等待 3001 端口就绪，再启动前端。
 * 避免 Vite 抢跑导致 /api 代理在启动初期产生 ECONNREFUSED。
 */
import { spawn } from 'node:child_process';

const READY_URL = 'http://localhost:3001/api';
const READY_TIMEOUT_MS = 60_000;
const children = new Map();

function run(label, ...args) {
  const child = spawn('bun', args, { stdio: 'inherit' });
  children.set(label, child);
  child.on('exit', (code) => {
    for (const [name, c] of children) {
      if (c !== child) c.kill('SIGINT');
    }
    process.exit(code ?? 0);
  });
  return child;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(READY_URL); // 任一 HTTP 响应即表示已监听
      return;
    } catch {
      await sleep(300);
    }
  }
  throw new Error(`后端未在 ${READY_TIMEOUT_MS / 1000}s 内就绪，请检查 apps/server 日志`);
}

const server = run('server', 'run', 'dev:server');
process.on('SIGINT', () => server.kill('SIGINT'));

try {
  await waitForServer();
  run('web', 'run', 'dev:web');
  console.log('[dev] 后端已就绪，前端已启动 → http://localhost:5173');
} catch (err) {
  console.error(`[dev] ${err.message}`);
  server.kill('SIGINT');
  process.exit(1);
}
