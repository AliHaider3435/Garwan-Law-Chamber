import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Associate, Case, LogEntry, User } from './types';
import { fromRow, toRow } from './mapping';
import { addDays, iso } from './dates';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase client. null means demo mode (data stays in this browser). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
export const LIVE = !!supabase;

export interface Data {
  cases: Case[];
  assoc: Associate[];
  users: User[];
  phone: string;
  log: LogEntry[];
}

export interface Backend {
  load(): Promise<Data>;
  saveCase(c: Case): Promise<Case>;
  deleteCase(id: string): Promise<void>;
  addAssociate(a: Omit<Associate, 'id'>): Promise<Associate>;
  removeAssociate(id: string): Promise<void>;
  setPhone(p: string): Promise<void>;
  addLog(entries: LogEntry[]): Promise<void>;
  saveUser(u: User): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updatePassword(userId: string, newPass: string): Promise<void>;
}

/* ---------------- Demo backend (localStorage) ---------------- */

const KEY = 'glc-next-demo-v2';

function seed(): Data {
  const t = new Date();
  const d = (n: number) => iso(addDays(t, n));
  let i = 1;
  const mk = (
    title: string, court: string, client: string, phone: string, type: string, stage: string,
    next: number, assoc: string[], dec?: number, out?: string,
  ): Case => ({
    id: 'c' + i++, title, caseNo: '', court, judge: '', clientName: client, clientPhone: phone,
    opposing: 'State', type, fir: '', station: '', sections: '', stage,
    status: dec ? 'decided' : 'active', next: dec ? '' : d(next), assoc,
    decidedOn: dec ? d(dec) : '', outcome: out ?? '',
  });

  const assocList: Associate[] = [
    { id: 'a1', name: 'Adv. Usman Tariq', phone: '03001234567' },
    { id: 'a2', name: 'Adv. Hina Malik', phone: '03217654321' },
  ];

  const defaultUsers: User[] = [
    {
      id: 'u-superadmin',
      username: 'superadmin',
      email: 'admin@garwanlaw.com',
      password: 'admin123',
      name: 'Maher Mehtab Hassan Garwan',
      role: 'superadmin',
      createdAt: '2026-01-01',
    },
    {
      id: 'u-usman',
      username: 'usman',
      email: 'usman@garwanlaw.com',
      password: 'usman123',
      name: 'Adv. Usman Tariq',
      role: 'associate',
      associateId: 'a1',
      createdAt: '2026-01-01',
    },
    {
      id: 'u-hina',
      username: 'hina',
      email: 'hina@garwanlaw.com',
      password: 'hina123',
      name: 'Adv. Hina Malik',
      role: 'associate',
      associateId: 'a2',
      createdAt: '2026-01-01',
    },
  ];

  return {
    phone: '',
    log: [],
    assoc: assocList,
    users: defaultUsers,
    cases: [
      // Active cases (5 active, with Kamran Ali today Tue 13 Oct, Waqas Hanif Sun 18 Oct, 0 tomorrow)
      mk('State v/s Kamran Ali', 'ATC, Multan', 'Ali Family', '03004561234', 'Murder (302 PPC)', 'Notices', 0, ['a2']),
      mk('State v/s Waqas Hanif', 'Sessions Court, Multan', 'Hanif Family', '', 'Criminal appeal', 'Arguments', 5, []),
      mk('State v/s Bilal Ahmad', 'Sessions Court, Multan', 'Ahmad Family', '03217654321', 'Narcotics (CNSA)', 'Arguments', 7, ['a1', 'a2']),
      mk('State v/s Imran Shah', 'Sessions Court, Multan', 'Shah Family', '03111234567', 'Murder (302 PPC)', 'Evidence', 10, ['a1']),
      mk('Rukhsana Bibi v/s State', 'LHC, Multan Bench', 'Rukhsana Bibi', '', 'Bail application', 'Bail hearing', 14, []),
      // Decided cases (4 decided: Acquitted 2, Bail granted 1, Sentence reduced 1)
      mk('State v/s Tariq Mehmood', 'Sessions Court, Multan', 'Mehmood Family', '', 'Murder (302 PPC)', 'Judgment reserved', 0, ['a1'], -30, 'Acquitted'),
      mk('State v/s Saeed Khan', 'Sessions Court, Multan', 'Khan Family', '', 'Bail application', 'Bail hearing', 0, [], -12, 'Bail granted'),
      mk('State v/s Zahid Iqbal', 'LHC, Multan Bench', 'Iqbal Family', '', 'Criminal appeal', 'Arguments', 0, ['a2'], -60, 'Sentence reduced'),
      mk('Asif Raza v/s State', 'Sessions Court, Multan', 'Asif Raza', '', 'Narcotics (CNSA)', 'Evidence', 0, [], -90, 'Acquitted'),
    ],
  };
}

function read(): Data {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const data = JSON.parse(s) as Data;
      if (!data.users || data.users.length === 0) {
        data.users = seed().users;
        write(data);
      }
      return data;
    }
  } catch {}
  const d = seed();
  write(d);
  return d;
}

function write(d: Data) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

export const resetLocal = () => {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('glc-next-demo-v1');
    localStorage.removeItem('glc-current-user');
  } catch {}
};

export const localBackend: Backend = {
  async load() { return read(); },
  async saveCase(c) {
    const d = read();
    const saved = c.id ? c : { ...c, id: 'c' + Date.now() };
    d.cases = c.id ? d.cases.map((x) => (x.id === c.id ? saved : x)) : [saved, ...d.cases];
    write(d);
    return saved;
  },
  async deleteCase(id) {
    const d = read();
    d.cases = d.cases.filter((c) => c.id !== id);
    write(d);
  },
  async addAssociate(a) {
    const d = read();
    const n = { ...a, id: 'a' + Date.now() };
    d.assoc.push(n);
    write(d);
    return n;
  },
  async removeAssociate(id) {
    const d = read();
    d.assoc = d.assoc.filter((a) => a.id !== id);
    d.cases = d.cases.map((c) => ({ ...c, assoc: c.assoc.filter((x) => x !== id) }));
    d.users = d.users.map((u) => (u.associateId === id ? { ...u, associateId: undefined } : u));
    write(d);
  },
  async setPhone(p) { const d = read(); d.phone = p; write(d); },
  async addLog(entries) { const d = read(); d.log = [...entries, ...d.log].slice(0, 100); write(d); },
  async saveUser(u) {
    const d = read();
    const id = u.id || ('u-' + Date.now());
    const saved: User = { ...u, id, createdAt: u.createdAt || iso(new Date()) };
    d.users = u.id ? d.users.map((x) => (x.id === u.id ? saved : x)) : [saved, ...d.users];
    write(d);
    return saved;
  },
  async deleteUser(id) {
    const d = read();
    d.users = d.users.filter((x) => x.id !== id);
    write(d);
  },
  async updatePassword(userId, newPass) {
    const d = read();
    d.users = d.users.map((u) => (u.id === userId ? { ...u, password: newPass } : u));
    write(d);
  },
};

/* ---------------- Live backend (Supabase) ---------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = () => supabase as SupabaseClient;
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

export const liveBackend: Backend = {
  async load() {
    const [c, a, s, l, u] = await Promise.all([
      db().from('cases').select('*, case_associates(associate_id)').order('created_at', { ascending: false }),
      db().from('associates').select('*').order('name'),
      db().from('settings').select('value').eq('key', 'advocate_phone').maybeSingle(),
      db().from('reminder_log').select('*').order('sent_at', { ascending: false }).limit(15),
      db().from('chamber_users').select('*').order('created_at', { ascending: true }),
    ]);
    fail(c.error); fail(a.error); fail(s.error); fail(l.error); fail(u.error);
    const usersList: User[] = (u.data ?? []).map((x: any) => ({
      id: x.id,
      username: x.username,
      email: x.email ?? '',
      password: x.password,
      name: x.name,
      role: x.role,
      associateId: x.associate_id ?? undefined,
      createdAt: x.created_at ? iso(new Date(x.created_at)) : iso(new Date()),
    }));

    return {
      cases: (c.data ?? []).map(fromRow),
      assoc: (a.data ?? []).map((x: any) => ({ id: x.id, name: x.name, phone: x.phone ?? '' })),
      users: usersList,
      phone: (s.data as any)?.value ?? '',
      log: (l.data ?? []).map((x: any) => ({
        key: String(x.id), to: x.recipient ?? '', num: x.phone,
        t: new Date(x.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      })),
    };
  },
  async saveCase(c) {
    let id = c.id;
    if (id) {
      const { error } = await db().from('cases').update(toRow(c)).eq('id', id);
      fail(error);
    } else {
      const { data, error } = await db().from('cases').insert(toRow(c)).select('id').single();
      fail(error);
      id = (data as any).id as string;
    }
    const del = await db().from('case_associates').delete().eq('case_id', id);
    fail(del.error);
    if (c.assoc.length) {
      const ins = await db().from('case_associates').insert(c.assoc.map((a) => ({ case_id: id, associate_id: a })));
      fail(ins.error);
    }
    return { ...c, id };
  },
  async deleteCase(id) {
    const { error } = await db().from('cases').delete().eq('id', id);
    fail(error);
  },
  async addAssociate(a) {
    const { data, error } = await db().from('associates').insert({ name: a.name, phone: a.phone || null }).select('*').single();
    fail(error);
    return { id: (data as any).id, name: (data as any).name, phone: (data as any).phone ?? '' };
  },
  async removeAssociate(id) {
    const { error } = await db().from('associates').delete().eq('id', id);
    fail(error);
  },
  async setPhone(p) {
    const { error } = await db().from('settings').upsert({ key: 'advocate_phone', value: p });
    fail(error);
  },
  async addLog() { /* the cron route writes reminder_log in live mode */ },
  async saveUser(u) {
    if (u.id && !u.id.startsWith('u-')) {
      const { data, error } = await db().from('chamber_users').update({
        username: u.username,
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        associate_id: u.associateId || null,
      }).eq('id', u.id).select('*').single();
      fail(error);
      return { ...u, id: (data as any).id };
    } else {
      const { data, error } = await db().from('chamber_users').insert({
        username: u.username,
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        associate_id: u.associateId || null,
      }).select('*').single();
      fail(error);
      return { ...u, id: (data as any).id };
    }
  },
  async deleteUser(id) {
    const { error } = await db().from('chamber_users').delete().eq('id', id);
    fail(error);
  },
  async updatePassword(userId, newPass) {
    const { error } = await db().from('chamber_users').update({ password: newPass }).eq('id', userId);
    fail(error);
  },
};

export const backend: Backend = LIVE ? liveBackend : localBackend;
