import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
let server;
let baseUrl;

async function unusedPort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const address = listener.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate a test port.');
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

test.before(async () => {
  const port = await unusedPort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'ignore',
    windowsHide: true,
  });
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js test server exited with ${server.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`);
      if (response.ok || response.status === 503) return;
    } catch {}
    await delay(250);
  }
  server.kill();
  throw new Error('Next.js test server did not become ready.');
});

test.after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await Promise.race([once(server, 'exit'), delay(5000)]);
  }
});

test('HTTP API rejects unauthenticated chamber requests without reading database data', async () => {
  const response = await fetch(`${baseUrl}/api/chamber`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'load' }),
  });
  assert.ok([401, 503].includes(response.status));
  if (response.status === 401) {
    assert.equal((await response.json()).error, 'Please sign in.');
  }
});

test('HTTP login endpoint rejects malformed and oversized JSON before authentication', async () => {
  const malformed = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.ok([400, 503].includes(malformed.status));

  const oversized = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'x'.repeat(5000), password: 'x' }),
  });
  assert.ok([413, 503].includes(oversized.status));
});
