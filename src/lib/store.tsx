'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Associate, Case, LogEntry, User } from './types';
import { backend, resetLocal, supabase } from './backend';

interface Store {
  ready: boolean;
  authed: boolean;
  currentUser: User | null;
  users: User[];
  cases: Case[];
  visibleCases: Case[];
  assoc: Associate[];
  phone: string;
  log: LogEntry[];
  dlg: { open: boolean; c: Case | null };
  passDlgOpen: boolean;
  signIn(identifier: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  openCase(c: Case | null): void;
  closeCase(): void;
  openPassDlg(): void;
  closePassDlg(): void;
  changePassword(newPass: string, oldPass?: string): Promise<string | null>;
  addUser(u: Omit<User, 'id' | 'createdAt'>): Promise<string | null>;
  updateUser(u: User): Promise<string | null>;
  deleteUser(id: string): Promise<string | null>;
  saveCase(c: Case): Promise<void>;
  deleteCase(id: string): Promise<void>;
  addAssociate(name: string, phone: string): Promise<void>;
  removeAssociate(id: string): Promise<void>;
  setPhone(p: string): Promise<void>;
  simulateSend(entries: LogEntry[]): Promise<void>;
  resetDemo(): Promise<void>;
  toast(m: string): void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
};

const AUTH_KEY = 'glc-next-demo-auth';
const USER_KEY = 'glc-current-user-id';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [assoc, setAssoc] = useState<Associate[]>([]);
  const [phone, setPhoneState] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [dlg, setDlg] = useState<{ open: boolean; c: Case | null }>({ open: false, c: null });
  const [passDlgOpen, setPassDlgOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2400);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await backend.load();
      setCases(d.cases);
      setAssoc(d.assoc);
      setUsers(d.users);
      setPhoneState(d.phone);
      setLog(d.log);

      // Re-hydrate current user if set
      const storedUid = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
      if (storedUid) {
        const found = d.users.find((u) => u.id === storedUid);
        if (found) {
          setCurrentUser(found);
          setAuthed(true);
        }
      } else if (typeof window !== 'undefined' && localStorage.getItem(AUTH_KEY) === '1') {
        const defAdmin = d.users.find((u) => u.role === 'superadmin') || d.users[0] || null;
        setCurrentUser(defAdmin);
        if (defAdmin) localStorage.setItem(USER_KEY, defAdmin.id);
        setAuthed(true);
      }
    } catch (e) {
      toast('Could not load data: ' + (e as Error).message);
    }
  }, [toast]);

  // Session initialization
  useEffect(() => {
    async function init() {
      try {
        const d = await backend.load();
        setCases(d.cases);
        setAssoc(d.assoc);
        setUsers(d.users);
        setPhoneState(d.phone);
        setLog(d.log);

        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const isSession = !!data.session;
          setAuthed(isSession);
          if (isSession) {
            const email = data.session?.user?.email?.toLowerCase();
            const u = d.users.find((x) => x.email.toLowerCase() === email) || d.users[0];
            setCurrentUser(u || null);
          }
        } else {
          const storedUid = localStorage.getItem(USER_KEY);
          if (storedUid) {
            const u = d.users.find((x) => x.id === storedUid);
            if (u) {
              setCurrentUser(u);
              setAuthed(true);
            }
          } else if (localStorage.getItem(AUTH_KEY) === '1') {
            const defAdmin = d.users.find((u) => u.role === 'superadmin') || d.users[0] || null;
            setCurrentUser(defAdmin);
            setAuthed(true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
      }
    }

    init();
  }, []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { toast((e as Error).message); }
  }, [toast]);

  // Cases filtered by role and authorization
  const visibleCases = useMemo(() => {
    if (!currentUser) return cases;
    if (currentUser.role === 'superadmin') return cases;
    if (currentUser.role === 'associate') {
      const assocId = currentUser.associateId;
      if (!assocId) return [];
      return cases.filter((c) => c.assoc.includes(assocId));
    }
    return cases;
  }, [cases, currentUser]);

  const value = useMemo<Store>(() => ({
    ready,
    authed,
    currentUser,
    users,
    cases,
    visibleCases,
    assoc,
    phone,
    log,
    dlg,
    passDlgOpen,

    async signIn(identifier: string, password: string) {
      const idTrim = identifier.trim().toLowerCase();
      // Ensure users are loaded
      let userPool = users;
      if (!userPool.length) {
        const d = await backend.load();
        userPool = d.users;
        setUsers(d.users);
      }

      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
        if (error) return error.message;
        const matched = userPool.find((u) => u.email.toLowerCase() === idTrim || u.username.toLowerCase() === idTrim) || userPool[0];
        setCurrentUser(matched || null);
        setAuthed(true);
        return null;
      }

      const match = userPool.find(
        (u) => u.username.toLowerCase() === idTrim || u.email.toLowerCase() === idTrim
      );

      if (!match) {
        return 'No user found with that username or email.';
      }

      if (match.password !== password) {
        return 'Incorrect password.';
      }

      try {
        localStorage.setItem(AUTH_KEY, '1');
        localStorage.setItem(USER_KEY, match.id);
      } catch {}

      setCurrentUser(match);
      setAuthed(true);
      return null;
    },

    async signOut() {
      if (supabase) await supabase.auth.signOut();
      try {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {}
      setAuthed(false);
      setCurrentUser(null);
    },

    openCase: (c) => {
      // Authorization check for associates
      if (c && currentUser?.role === 'associate') {
        const aId = currentUser.associateId;
        if (!aId || !c.assoc.includes(aId)) {
          toast('You are not authorized to view or edit this case.');
          return;
        }
      }
      setDlg({ open: true, c });
    },

    closeCase: () => setDlg({ open: false, c: null }),
    openPassDlg: () => setPassDlgOpen(true),
    closePassDlg: () => setPassDlgOpen(false),

    async changePassword(newPass: string, oldPass?: string) {
      if (!currentUser) return 'Not signed in';
      if (oldPass && oldPass !== currentUser.password) {
        return 'Current password does not match.';
      }
      if (!newPass || newPass.trim().length < 4) {
        return 'New password must be at least 4 characters.';
      }

      try {
        await backend.updatePassword(currentUser.id, newPass);
        const updated = { ...currentUser, password: newPass };
        setCurrentUser(updated);
        setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
        toast('Password updated successfully');
        setPassDlgOpen(false);
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    },

    async addUser(u) {
      const usernameLower = u.username.trim().toLowerCase();
      if (users.some((x) => x.username.toLowerCase() === usernameLower)) {
        toast('A user with that username already exists.');
        return 'A user with that username already exists.';
      }
      try {
        const saved = await backend.saveUser({
          ...u,
          id: '',
          createdAt: new Date().toISOString().split('T')[0],
        });
        setUsers((prev) => [...prev, saved]);
        toast('User created successfully');
        return null;
      } catch (e) {
        const m = (e as Error).message;
        toast(m);
        return m;
      }
    },

    async updateUser(u) {
      try {
        const saved = await backend.saveUser(u);
        setUsers((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
        if (currentUser && currentUser.id === saved.id) {
          setCurrentUser(saved);
        }
        toast('User updated successfully');
        return null;
      } catch (e) {
        const m = (e as Error).message;
        toast(m);
        return m;
      }
    },

    async deleteUser(id: string) {
      const target = users.find((u) => u.id === id);
      if (target?.username === 'superadmin' || target?.role === 'superadmin') {
        toast('Cannot delete the main Super Admin account.');
        return 'Cannot delete the main Super Admin account.';
      }
      if (currentUser && currentUser.id === id) {
        toast('Cannot delete the currently signed in account.');
        return 'Cannot delete the currently signed in account.';
      }
      try {
        await backend.deleteUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast('User deleted');
        return null;
      } catch (e) {
        const m = (e as Error).message;
        toast(m);
        return m;
      }
    },

    saveCase: (c) => run(async () => {
      // If associate is saving a case, ensure their associate ID is attached
      let caseToSave = c;
      if (currentUser?.role === 'associate' && currentUser.associateId) {
        if (!caseToSave.assoc.includes(currentUser.associateId)) {
          caseToSave = { ...caseToSave, assoc: [...caseToSave.assoc, currentUser.associateId] };
        }
      }
      const s = await backend.saveCase(caseToSave);
      setCases((p) => (c.id ? p.map((x) => (x.id === s.id ? s : x)) : [s, ...p]));
      setDlg({ open: false, c: null });
      toast('Case saved');
    }),

    deleteCase: (id) => run(async () => {
      if (currentUser?.role === 'associate') {
        toast('Associates cannot delete cases. Contact chamber super admin.');
        return;
      }
      await backend.deleteCase(id);
      setCases((p) => p.filter((x) => x.id !== id));
      setDlg({ open: false, c: null });
      toast('Case deleted');
    }),

    addAssociate: (name, ph) => run(async () => {
      const a = await backend.addAssociate({ name, phone: ph });
      setAssoc((p) => [...p, a]);
      toast('Associate added');
    }),

    removeAssociate: (id) => run(async () => {
      await backend.removeAssociate(id);
      setAssoc((p) => p.filter((x) => x.id !== id));
      setCases((p) => p.map((c) => ({ ...c, assoc: c.assoc.filter((x) => x !== id) })));
      setUsers((p) => p.map((u) => (u.associateId === id ? { ...u, associateId: undefined } : u)));
    }),

    setPhone: (p) => run(async () => { await backend.setPhone(p); setPhoneState(p); }),

    simulateSend: (entries) => run(async () => {
      await backend.addLog(entries);
      setLog((p) => [...entries, ...p]);
    }),

    resetDemo: async () => {
      resetLocal();
      await refresh();
      toast('Demo data reset');
    },

    toast,
  }), [ready, authed, currentUser, users, cases, visibleCases, assoc, phone, log, dlg, passDlgOpen, run, toast, refresh]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div id="toast" className={msg ? 'show' : ''} role="status">{msg}</div>
    </Ctx.Provider>
  );
}
