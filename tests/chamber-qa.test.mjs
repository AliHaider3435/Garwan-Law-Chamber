import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ActionError, authorizeCase, executeChamberAction, requireActor } from '../src/lib/chamber-actions.ts';
import { consumeLoginAttempt, resetLoginAttempts } from '../src/lib/auth-throttle.ts';
import { saveCaseAtomically } from '../src/lib/case-persistence.ts';
import { casesForDate } from '../src/lib/case-list.ts';
import { restrictChamberData } from '../src/lib/data-access.ts';
import { InputError, NotFoundError } from '../src/lib/errors.ts';
import { fromRow, toRow } from '../src/lib/mapping.ts';
import { readJsonBody, RequestBodyError } from '../src/lib/request-body.ts';
import { sendSms, SmsGatewayError } from '../src/lib/sms.ts';
import {
  resolveBrowserSupabaseConfig,
  resolveServerSupabaseConfig,
  SupabaseConfigurationError,
} from '../src/lib/supabase-config.ts';

const admin = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'admin',
  name: 'Chamber Admin',
  email: 'admin@example.test',
  role: 'superadmin',
  createdAt: '2026-01-01',
  sessionVersion: 1,
};
const associateId = '00000000-0000-4000-8000-000000000002';
const caseId = '00000000-0000-4000-8000-000000000003';
const userId = '00000000-0000-4000-8000-000000000004';
const caseInput = {
  title: 'State v/s Test Client',
  status: 'active',
  next: '2026-12-01',
  station: 'Central',
  codeStation: 'MLT-01',
  district: 'Multan',
  tehsil: 'Multan City',
  typeOther: 'Special proceeding',
  stageOther: 'Awaiting notices',
  assoc: [associateId],
};
const fullSupabaseConfig = {
  url: 'https://test-project.supabase.co',
  anonKey: 'test-anon-key',
  serviceRoleKey: 'test-service-role-key',
};

function fixture() {
  const state = { cases: [], associates: [], users: [], phone: '', log: [] };
  const ops = {
    async loadChamber() { return structuredClone(state); },
    async getCaseById(id) { return structuredClone(state.cases.find((c) => c.id === id) ?? null); },
    async saveCase(c) {
      const saved = { ...c, id: c.id || caseId };
      const i = state.cases.findIndex((x) => x.id === saved.id);
      if (i < 0) state.cases.unshift(saved);
      else state.cases[i] = saved;
      return structuredClone(saved);
    },
    async deleteCase(id) { state.cases = state.cases.filter((c) => c.id !== id); },
    async addAssociate(a) {
      const saved = { ...a, id: associateId };
      state.associates.push(saved);
      return saved;
    },
    async removeAssociate(id) { state.associates = state.associates.filter((a) => a.id !== id); },
    async setPhone(phone) { state.phone = phone; },
    async addLog(entries) { state.log.push(...entries); },
    async saveUser(user) {
      const saved = { ...user, id: user.id || userId };
      const i = state.users.findIndex((x) => x.id === saved.id);
      if (i < 0) state.users.push(saved);
      else state.users[i] = saved;
      return structuredClone(saved);
    },
    async getUserById(id) { return structuredClone(state.users.find((u) => u.id === id) ?? null); },
    async deleteUser(id) { state.users = state.users.filter((u) => u.id !== id); },
    async verifyUserPassword() { return true; },
    async updatePassword() {},
  };
  return { state, ops };
}

async function action(ops, who, name, payload) {
  return executeChamberAction(who, name, payload, ops);
}

test('creates a valid case and maps every case field to a declared database column', async () => {
  const { ops } = fixture();
  const result = await action(ops, admin, 'saveCase', caseInput);
  assert.equal(result.data.id, caseId);
  const row = toRow(result.data);
  assert.equal(row.police_station, 'Central');
  assert.equal(row.code_station, 'MLT-01');
  assert.equal(row.district, 'Multan');
  assert.equal(row.tehsil, 'Multan City');
  assert.notEqual(row.police_station, row.code_station);
  const mappedBack = fromRow({ ...row, id: caseId, status: 'active' });
  assert.equal(mappedBack.station, 'Central');
  assert.equal(mappedBack.codeStation, 'MLT-01');
  assert.equal(mappedBack.typeOther, 'Special proceeding');
  assert.equal(mappedBack.stageOther, 'Awaiting notices');

  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const caseTable = schema.match(/create table cases \(([\s\S]*?)\n\);/i)?.[1];
  assert.ok(caseTable, 'cases table declaration exists');
  const columns = new Set([...caseTable.matchAll(/^\s{2}([a-z_]+)\s+/gim)].map((match) => match[1]));
  for (const column of Object.keys(row)) assert.ok(columns.has(column), `cases.${column} exists in schema`);
});

test('updates a stored case without losing its associates', async () => {
  const { state, ops } = fixture();
  state.cases.push({ ...caseInput, id: caseId, assoc: [associateId] });
  const saved = await action(ops, admin, 'saveCase', {
    ...caseInput, id: caseId, title: 'Updated title',
  });
  assert.equal(saved.data.title, 'Updated title');
  assert.deepEqual(state.cases[0].assoc, [associateId]);
});

test('rejects invalid case payloads before writing', async () => {
  const { state, ops } = fixture();
  await assert.rejects(action(ops, admin, 'saveCase', { title: '', status: 'pending' }), ActionError);
  await assert.rejects(action(ops, admin, 'saveCase', { title: 'Bad date', next: '2026-02-30' }), ActionError);
  await assert.rejects(action(ops, admin, 'saveCase', { title: 'Bad date', next: '9999-99-99' }), ActionError);
  assert.equal(state.cases.length, 0);
});

test('allows missing optional case fields and supplies safe defaults', async () => {
  const { ops } = fixture();
  const saved = await action(ops, admin, 'saveCase', { title: 'Minimal case' });
  assert.equal(saved.data.title, 'Minimal case');
  assert.equal(saved.data.station, '');
  assert.equal(saved.data.sections, '');
  assert.deepEqual(saved.data.assoc, []);
  assert.equal(saved.data.status, 'active');
});

test('persists case data across a subsequent load action', async () => {
  const { ops } = fixture();
  await action(ops, admin, 'saveCase', caseInput);
  const loaded = await action(ops, admin, 'load');
  assert.equal(loaded.data.cases[0].title, caseInput.title);
  assert.equal(loaded.data.cases[0].station, 'Central');
});

test('restricts associates to assigned cases and preserves server-side assignments', async () => {
  const { state, ops } = fixture();
  const actor = { ...admin, role: 'associate', associateId };
  await action(ops, actor, 'saveCase', { ...caseInput, assoc: [] });
  assert.deepEqual(state.cases[0].assoc, [associateId]);
  const updated = await action(ops, actor, 'saveCase', {
    ...caseInput, id: caseId, assoc: ['00000000-0000-4000-8000-000000000099'],
  });
  assert.deepEqual(updated.data.assoc, [associateId]);

  const unassigned = { ...caseInput, id: userId, assoc: [] };
  assert.throws(() => authorizeCase(actor, unassigned, unassigned), (error) => error.status === 403);
  await assert.rejects(action(ops, actor, 'deleteCase', caseId), (error) => error.status === 403);
});

test('associate chamber data includes only authorized cases and self, hiding contact details', () => {
  const associate = { ...admin, role: 'associate', associateId };
  const filtered = restrictChamberData({
    cases: [
      { id: caseId, assoc: [associateId] },
      { id: userId, assoc: [] },
    ],
    assoc: [
      { id: associateId, name: 'Self', phone: '03000000000' },
      { id: 'other-associate', name: 'Other', phone: '03111111111' },
    ],
    users: [associate, { ...admin, id: userId, name: 'Other user' }],
    phone: '03222222222',
    log: [
      { key: 'allowed', caseId, to: 'Client', num: '03000000000', t: 'today' },
      { key: 'private', caseId: userId, to: 'Other client', num: '0311', t: 'today' },
    ],
  }, associate);
  assert.deepEqual(filtered.cases.map((item) => item.id), [caseId]);
  assert.deepEqual(filtered.assoc, [{ id: associateId, name: 'Self', phone: '' }]);
  assert.deepEqual(filtered.users.map((item) => item.id), [associate.id]);
  assert.equal(filtered.phone, '');
  assert.deepEqual(filtered.log.map((item) => item.key), ['allowed']);
  assert.equal(filtered.log[0].num, '');
});

test('rejects unauthenticated API actors', () => {
  assert.throws(() => requireActor(null), (error) => error.status === 401);
});

test('rejects unsupported action and payload fields', async () => {
  const { ops } = fixture();
  await assert.rejects(action(ops, admin, 'load', {}), ActionError);
  await assert.rejects(action(ops, admin, 'saveCase', { title: 'Strict', unexpected: true }), ActionError);
  await assert.rejects(action(ops, admin, 'addAssociate', { name: 'Counsel', phone: '', role: 'admin' }), ActionError);
  await assert.rejects(action(ops, admin, 'updatePassword', {
    userId, newPass: 'valid password', extra: true,
  }), ActionError);
});

test('parses JSON requests and rejects malformed or oversized bodies', async () => {
  const good = new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'load' }),
  });
  assert.deepEqual(await readJsonBody(good, 100), { action: 'load' });
  const bad = new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  await assert.rejects(readJsonBody(bad, 100), RequestBodyError);
  const big = new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '123456',
  });
  await assert.rejects(readJsonBody(big, 5), (error) => error instanceof RequestBodyError && error.status === 413);
});

test('rate limit keys are opaque and include both IP and normalized account buckets', async () => {
  let call;
  const allowed = await consumeLoginAttempt({
    async rpc(name, args) {
      call = { name, args };
      return { data: false, error: null };
    },
  }, '203.0.113.8', 'Counsel@Example.Test', 'test-session-secret');
  assert.equal(allowed, false);
  assert.equal(call.name, 'consume_login_attempt');
  assert.match(call.args.p_ip_key, /^[0-9a-f]{64}$/);
  assert.match(call.args.p_account_key, /^[0-9a-f]{64}$/);
  assert.notEqual(call.args.p_ip_key, call.args.p_account_key);
  assert.equal(call.args.p_ip_max_attempts, 30);
  assert.equal(call.args.p_account_max_attempts, 10);
});

test('successful login resets both normalized IP and account rate-limit buckets', async () => {
  let call;
  await resetLoginAttempts({
    async rpc(name, args) {
      call = { name, args };
      return { data: null, error: null };
    },
  }, '203.0.113.8', 'Counsel@Example.Test', 'test-session-secret');
  assert.equal(call.name, 'reset_login_attempts');
  assert.deepEqual(Object.keys(call.args).sort(), ['p_account_key', 'p_ip_key']);
  assert.match(call.args.p_ip_key, /^[0-9a-f]{64}$/);
  assert.match(call.args.p_account_key, /^[0-9a-f]{64}$/);
});

test('case persistence uses one atomic database RPC and propagates update/assignment failures', async () => {
  const calls = [];
  const db = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: caseId, error: null };
    },
  };
  const saved = await saveCaseAtomically(db, { ...caseInput, id: caseId });
  assert.equal(saved.id, caseId);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'save_case_with_associates');
  assert.deepEqual(calls[0].args.p_associate_ids, [associateId]);

  await assert.rejects(saveCaseAtomically({
    async rpc() { return { data: null, error: { code: '23503', message: 'assignment FK failed' } }; },
  }, { ...caseInput, id: caseId }), InputError);
  await assert.rejects(saveCaseAtomically({
    async rpc() { return { data: null, error: { code: 'P0002', message: 'Case not found' } }; },
  }, { ...caseInput, id: caseId }), NotFoundError);
});

test('validates and persists user create, update and delete operations', async () => {
  const { state, ops } = fixture();
  const input = {
    username: 'counsel',
    name: 'Associate Counsel',
    email: 'counsel@example.test',
    role: 'associate',
    associateId,
    password: 'a secure password',
  };
  const created = await action(ops, admin, 'saveUser', input);
  assert.equal(created.data.id, userId);
  const updated = await action(ops, admin, 'saveUser', { ...input, id: userId, name: 'Updated Counsel' });
  assert.equal(updated.data.name, 'Updated Counsel');
  await action(ops, admin, 'deleteUser', userId);
  assert.equal(state.users.length, 0);
  await assert.rejects(action(ops, admin, 'saveUser', { ...input, username: 'x' }), ActionError);
});

test('records reminder logs and changes the password only for an authorized actor', async () => {
  const { state, ops } = fixture();
  state.users.push(admin);
  await action(ops, admin, 'addLog', [{ key: 'reminder-1', to: 'Client', num: '03001234567', t: 'today' }]);
  assert.equal(state.log.length, 1);
  let changed;
  ops.updatePassword = async (id, password) => { changed = { id, password }; };
  const updated = await action(ops, admin, 'updatePassword', {
    userId: admin.id, newPass: 'a secure new password', currentPass: 'current password',
  });
  assert.equal(changed.id, admin.id);
  assert.equal(updated.refreshSession, admin.sessionVersion);
  await assert.rejects(action(ops, { ...admin, role: 'associate', associateId }, 'updatePassword', {
    userId, newPass: 'a secure new password',
  }), (error) => error.status === 403);
});

test('allows associate management only for the super admin', async () => {
  const { state, ops } = fixture();
  const associate = { ...admin, role: 'associate', associateId };
  await assert.rejects(
    action(ops, associate, 'saveUser', { username: 'other', name: 'Other User', role: 'associate' }),
    (error) => error.status === 403,
  );
  await assert.rejects(action(ops, associate, 'addAssociate', { name: 'Other Counsel' }), (error) => error.status === 403);
  const added = await action(ops, admin, 'addAssociate', { name: 'Other Counsel' });
  assert.equal(added.data.id, associateId);
  await action(ops, admin, 'removeAssociate', associateId);
  assert.equal(state.associates.length, 0);
});

test('associates are denied every case-management, reminder, phone and user-admin action', async () => {
  const { state, ops } = fixture();
  const associate = { ...admin, role: 'associate', associateId };
  state.users.push({ ...admin, id: userId, username: 'other' });
  const forbidden = [
    ['deleteCase', caseId],
    ['addAssociate', { name: 'Other Counsel', phone: '' }],
    ['removeAssociate', associateId],
    ['setPhone', '03001234567'],
    ['addLog', []],
    ['saveUser', {
      username: 'another-user', name: 'Another User', email: 'another@example.test',
      role: 'associate', password: 'a secure password',
    }],
    ['deleteUser', userId],
    ['updatePassword', { userId, newPass: 'a secure new password' }],
  ];
  for (const [name, payload] of forbidden) {
    await assert.rejects(action(ops, associate, name, payload), (error) => error.status === 403, name);
  }
});

test('deletes a case and keeps it absent from later loads', async () => {
  const { state, ops } = fixture();
  state.cases.push({ ...caseInput, id: caseId });
  await action(ops, admin, 'deleteCase', caseId);
  const loaded = await action(ops, admin, 'load');
  assert.equal(loaded.data.cases.length, 0);
});

test('selects active hearings for the cause list only', () => {
  const cases = [
    { id: 'a', status: 'active', next: '2026-12-01' },
    { id: 'd', status: 'decided', next: '2026-12-01' },
    { id: 'o', status: 'active', next: '2026-12-02' },
  ];
  assert.deepEqual(casesForDate(cases, '2026-12-01').map((c) => c.id), ['a']);
});

test('responsive styles retain mobile navigation and narrow-screen form/table layouts', async () => {
  const css = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /@media\s*\(min-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /@media\s*\(max-width:\s*520px\)/);
  assert.match(css, /\.tbl-wrap\s*\{[^}]*overflow-x:\s*auto/s);
});

test('migration adds optional columns without deleting or rewriting any records', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261113000000_add_case_metadata_columns.sql', import.meta.url),
    'utf8',
  );
  for (const column of ['code_station', 'district', 'tehsil', 'type_other', 'stage_other']) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column} text`, 'i'));
  }
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDELETE\s+FROM\s+public\.cases\b/i);
  assert.match(migration, /NOTIFY\s+pgrst,\s*'reload schema'/i);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.save_case_with_associates/i);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.consume_login_attempt/i);
  assert.match(migration, /interval '15 minutes'/i);
  assert.match(migration, /login_rate_limits_window_started_at_idx/i);
  assert.match(migration, /LIMIT 500/i);
  assert.match(migration, /IF v_count > v_limit THEN\s+RETURN false/i);
});

test('sample account seed contains no plaintext demo passwords', async () => {
  const backend = await readFile(new URL('../src/lib/backend.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(backend, /password:\s*['"`]/);
});

test('marks rejected SMS provider responses as failures without contacting a real gateway', async (context) => {
  const previous = {
    url: process.env.SMS_API_URL,
    key: process.env.SMS_API_KEY,
    sender: process.env.SMS_SENDER_ID,
    fetch: globalThis.fetch,
  };
  context.after(() => {
    if (previous.url === undefined) delete process.env.SMS_API_URL;
    else process.env.SMS_API_URL = previous.url;
    if (previous.key === undefined) delete process.env.SMS_API_KEY;
    else process.env.SMS_API_KEY = previous.key;
    if (previous.sender === undefined) delete process.env.SMS_SENDER_ID;
    else process.env.SMS_SENDER_ID = previous.sender;
    globalThis.fetch = previous.fetch;
  });
  process.env.SMS_API_URL = 'https://sms.invalid.test';
  process.env.SMS_API_KEY = 'test-key';
  process.env.SMS_SENDER_ID = 'TEST';
  globalThis.fetch = async () => new Response('rejected', { status: 503 });
  await assert.rejects(sendSms('03001234567', 'QA fixture'), (error) =>
    error instanceof SmsGatewayError && error.rejected,
  );
});

test('Supabase config accepts all required variables without exposing server key to browser config', () => {
  const browser = resolveBrowserSupabaseConfig({
    ...fullSupabaseConfig,
    serviceRoleKeyConfigured: true,
    deployment: 'production',
  });
  const server = resolveServerSupabaseConfig({
    ...fullSupabaseConfig,
    deployment: 'production',
  });
  assert.equal(browser.configured, true);
  assert.equal(browser.url, fullSupabaseConfig.url);
  assert.equal(browser.anonKey, fullSupabaseConfig.anonKey);
  assert.equal('serviceRoleKey' in browser, false);
  assert.equal(server.configured, true);
  assert.equal(server.serviceRoleKey, fullSupabaseConfig.serviceRoleKey);
});

test('Supabase config rejects a missing URL with a non-secret error', () => {
  assert.throws(() => resolveServerSupabaseConfig({
    ...fullSupabaseConfig,
    url: '',
    deployment: 'production',
  }), (error) => {
    assert.ok(error instanceof SupabaseConfigurationError);
    assert.deepEqual(error.missing, ['NEXT_PUBLIC_SUPABASE_URL']);
    assert.doesNotMatch(error.message, /test-project|test-anon-key|test-service-role-key/);
    return true;
  });
});

test('Supabase config rejects a missing anon key', () => {
  assert.throws(() => resolveServerSupabaseConfig({
    ...fullSupabaseConfig,
    anonKey: '',
    deployment: 'production',
  }), (error) => {
    assert.ok(error instanceof SupabaseConfigurationError);
    assert.deepEqual(error.missing, ['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
    return true;
  });
});

test('Supabase config rejects a missing service-role key', () => {
  assert.throws(() => resolveServerSupabaseConfig({
    ...fullSupabaseConfig,
    serviceRoleKey: '',
    deployment: 'production',
  }), (error) => {
    assert.ok(error instanceof SupabaseConfigurationError);
    assert.deepEqual(error.missing, ['SUPABASE_SERVICE_ROLE_KEY']);
    return true;
  });
});

test('partial Supabase configuration is rejected for Production and Preview', () => {
  for (const deployment of ['production', 'preview']) {
    assert.throws(() => resolveServerSupabaseConfig({
      url: fullSupabaseConfig.url,
      anonKey: fullSupabaseConfig.anonKey,
      deployment,
    }), (error) => {
      assert.ok(error instanceof SupabaseConfigurationError);
      assert.deepEqual(error.missing, ['SUPABASE_SERVICE_ROLE_KEY']);
      return true;
    }, deployment);
  }
});

test('browser config rejects a missing service-role-key presence flag in Production and Preview', () => {
  for (const deployment of ['production', 'preview']) {
    assert.throws(() => resolveBrowserSupabaseConfig({
      url: fullSupabaseConfig.url,
      anonKey: fullSupabaseConfig.anonKey,
      deployment,
    }), (error) => {
      assert.ok(error instanceof SupabaseConfigurationError);
      assert.deepEqual(error.missing, ['SUPABASE_SERVICE_ROLE_KEY']);
      return true;
    }, deployment);
  }
});

test('local development with no Supabase config remains in local demo mode', () => {
  const browser = resolveBrowserSupabaseConfig({ deployment: 'development' });
  const server = resolveServerSupabaseConfig({ deployment: 'development' });
  assert.equal(browser.configured, false);
  assert.equal(server.configured, false);
});
