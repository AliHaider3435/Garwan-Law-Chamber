import { Associate, Case, ChamberData, LogEntry, User } from './types';
import { fromRow, toRow } from './mapping';
import { iso } from './dates';
import { serviceDb } from './server-db';
import { hashPassword, isPasswordHash, verifyPassword } from './password';

/* eslint-disable @typescript-eslint/no-explicit-any */
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

function mapUser(x: any): User {
  return {
    id: x.id,
    username: x.username,
    email: x.email ?? '',
    name: x.name,
    role: x.role,
    associateId: x.associate_id ?? undefined,
    createdAt: x.created_at ? iso(new Date(x.created_at)) : iso(new Date()),
    sessionVersion: Number(x.session_version ?? 1),
  };
}

export async function findUserByLogin(identifier: string, password: string): Promise<User | null> {
  const db = serviceDb();
  const id = identifier.trim().toLowerCase();
  let { data, error } = await db.from('chamber_users').select('*').eq('username', id).maybeSingle();
  fail(error);
  if (!data) {
    const result = await db.from('chamber_users').select('*').eq('email', id).maybeSingle();
    fail(result.error);
    data = result.data;
  }
  if (!data) return null;

  const storedPassword = String(data.password_hash ?? '');
  if (!(await verifyPassword(password, storedPassword))) return null;
  if (!isPasswordHash(storedPassword)) {
    const passwordHash = await hashPassword(password);
    const result = await db.from('chamber_users').update({ password_hash: passwordHash }).eq('id', data.id);
    fail(result.error);
    data.password_hash = passwordHash;
  }
  return mapUser(data);
}

export async function getUserById(id: string): Promise<User | null> {
  const db = serviceDb();
  const { data, error } = await db.from('chamber_users')
    .select('id, username, email, name, role, associate_id, created_at, session_version')
    .eq('id', id).maybeSingle();
  fail(error);
  return data ? mapUser(data) : null;
}

export async function loadChamber(actor: User): Promise<ChamberData> {
  const db = serviceDb();
  const selection = actor.role === 'associate'
    ? '*, case_associates!inner(associate_id)'
    : '*, case_associates(associate_id)';
  let casesQuery = db.from('cases').select(selection).order('created_at', { ascending: false });
  if (actor.role === 'associate') {
    casesQuery = casesQuery.eq(
      'case_associates.associate_id',
      actor.associateId ?? '00000000-0000-0000-0000-000000000000',
    );
  }

  const { data: caseRows, error: caseError } = await casesQuery;
  fail(caseError);
  const caseIds = (caseRows ?? []).map((x: any) => x.id as string);

  const [a, s, u] = await Promise.all([
    db.from('associates').select('*').order('name'),
    db.from('settings').select('value').eq('key', 'advocate_phone').maybeSingle(),
    db.from('chamber_users')
      .select('id, username, email, name, role, associate_id, created_at, session_version')
      .order('created_at', { ascending: true }),
  ]);
  fail(a.error); fail(s.error); fail(u.error);

  let logRows: any[] = [];
  if (actor.role === 'superadmin') {
    const { data, error } = await db.from('reminder_log').select('*').order('sent_at', { ascending: false }).limit(15);
    fail(error);
    logRows = data ?? [];
  } else if (caseIds.length) {
    const { data, error } = await db.from('reminder_log')
      .select('*').in('case_id', caseIds).order('sent_at', { ascending: false }).limit(15);
    fail(error);
    logRows = data ?? [];
  }

  let usersList: User[] = (u.data ?? []).map(mapUser);
  if (actor.role !== 'superadmin') {
    usersList = usersList.filter((x) => x.id === actor.id);
  }

  return {
    cases: (caseRows ?? []).map(fromRow),
    assoc: (a.data ?? []).map((x: any) => ({ id: x.id, name: x.name, phone: x.phone ?? '' })),
    users: usersList,
    phone: (s.data as any)?.value ?? '',
    log: logRows.map((x: any) => ({
      key: String(x.id),
      to: x.recipient ?? '',
      num: x.phone,
      t: new Date(x.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    })),
  };
}

export async function getCaseById(id: string): Promise<Case | null> {
  const db = serviceDb();
  const { data, error } = await db.from('cases')
    .select('*, case_associates(associate_id)').eq('id', id).maybeSingle();
  fail(error);
  return data ? fromRow(data) : null;
}

export async function saveCase(c: Case): Promise<Case> {
  const db = serviceDb();
  let id = c.id;
  if (id) {
    const { error } = await db.from('cases').update(toRow(c)).eq('id', id);
    fail(error);
  } else {
    const { data, error } = await db.from('cases').insert(toRow(c)).select('id').single();
    fail(error);
    id = (data as any).id as string;
  }
  const del = await db.from('case_associates').delete().eq('case_id', id);
  fail(del.error);
  if (c.assoc.length) {
    const ins = await db.from('case_associates').insert(c.assoc.map((a) => ({ case_id: id, associate_id: a })));
    fail(ins.error);
  }
  return { ...c, id };
}

export async function deleteCase(id: string) {
  const db = serviceDb();
  const { error } = await db.from('cases').delete().eq('id', id);
  fail(error);
}

export async function addAssociate(a: Omit<Associate, 'id'>): Promise<Associate> {
  const db = serviceDb();
  const { data, error } = await db.from('associates').insert({ name: a.name, phone: a.phone || null }).select('*').single();
  fail(error);
  return { id: (data as any).id, name: (data as any).name, phone: (data as any).phone ?? '' };
}

export async function removeAssociate(id: string) {
  const db = serviceDb();
  const { error } = await db.from('associates').delete().eq('id', id);
  fail(error);
}

export async function setPhone(p: string) {
  const db = serviceDb();
  const { error } = await db.from('settings').upsert({ key: 'advocate_phone', value: p });
  fail(error);
}

export async function addLog(entries: LogEntry[]) {
  const db = serviceDb();
  if (!entries.length) return;
  const { error } = await db.from('reminder_log').insert(
    entries.map((e) => ({ phone: e.num, recipient: e.to, body: '', hearing_date: iso(new Date()) })),
  );
  fail(error);
}

export async function saveUser(u: User): Promise<User> {
  const db = serviceDb();
  const row: Record<string, string | number | null> = {
    username: u.username.trim().toLowerCase(),
    email: u.email.trim().toLowerCase(),
    name: u.name,
    role: u.role,
    associate_id: u.associateId || null,
  };
  const newPassword = u.password;
  if (newPassword) {
    if (newPassword.trim().length < 8 || newPassword.length > 256) {
      throw new Error('Passwords must be 8-256 characters long.');
    }
    row.password_hash = await hashPassword(newPassword);
  }

  if (u.id && !u.id.startsWith('u-')) {
    if (newPassword) {
      const existing = await getUserById(u.id);
      if (!existing) throw new Error('User not found.');
      row.session_version = (existing.sessionVersion ?? 1) + 1;
    }
    const { data, error } = await db.from('chamber_users').update(row).eq('id', u.id).select('*').single();
    fail(error);
    return mapUser(data);
  }
  if (!newPassword) throw new Error('A password is required when creating a user.');
  const { data, error } = await db.from('chamber_users').insert(row).select('*').single();
  fail(error);
  return mapUser(data);
}

export async function deleteUser(id: string) {
  const db = serviceDb();
  const { error } = await db.from('chamber_users').delete().eq('id', id);
  fail(error);
}

export async function verifyUserPassword(userId: string, password: string) {
  const db = serviceDb();
  const { data, error } = await db.from('chamber_users').select('password_hash').eq('id', userId).maybeSingle();
  fail(error);
  if (!data) return false;

  const storedPassword = String(data.password_hash ?? '');
  const valid = await verifyPassword(password, storedPassword);
  if (valid && !isPasswordHash(storedPassword)) {
    const passwordHash = await hashPassword(password);
    const result = await db.from('chamber_users').update({ password_hash: passwordHash }).eq('id', userId);
    fail(result.error);
  }
  return valid;
}

export async function updatePassword(userId: string, newPass: string) {
  if (newPass.trim().length < 8 || newPass.length > 256) {
    throw new Error('Passwords must be 8-256 characters long.');
  }
  const db = serviceDb();
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found.');
  const passwordHash = await hashPassword(newPass);
  const { error } = await db.from('chamber_users')
    .update({ password_hash: passwordHash, session_version: (user.sessionVersion ?? 1) + 1 })
    .eq('id', userId);
  fail(error);
}

export async function snapshotBackup() {
  const db = serviceDb();
  const [c, a, u, s, l] = await Promise.all([
    db.from('cases').select('*, case_associates(associate_id)'),
    db.from('associates').select('*'),
    db.from('chamber_users').select('id, username, email, name, role, associate_id, created_at'),
    db.from('settings').select('*'),
    db.from('reminder_log').select('*'),
  ]);
  fail(c.error); fail(a.error); fail(u.error); fail(s.error); fail(l.error);
  const payload = { cases: c.data, associates: a.data, users: u.data, settings: s.data, reminder_log: l.data };
  const { error } = await db.from('chamber_backups').insert({ payload });
  fail(error);
  const old = await db.from('chamber_backups').select('id').order('created_at', { ascending: false });
  fail(old.error);
  const drop = (old.data ?? []).slice(14).map((x: any) => x.id);
  if (drop.length) {
    const del = await db.from('chamber_backups').delete().in('id', drop);
    fail(del.error);
  }
  return { kept: Math.min((old.data ?? []).length + 1, 14) };
}
