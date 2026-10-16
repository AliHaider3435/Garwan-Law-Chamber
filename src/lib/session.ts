import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'glc_session';
const MAX_AGE = 60 * 60 * 24 * 30;

export interface SessionClaims {
  userId: string;
  sessionVersion: number;
}

function secret() {
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY is required');
  return s;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export async function setSession(userId: string, sessionVersion: number) {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, sessionVersion, exp })).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  cookies().set(COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  cookies().set(COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function readSession(): Promise<SessionClaims | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionClaims & { exp: number };
    if (
      typeof data.userId !== 'string' ||
      !data.userId ||
      !Number.isInteger(data.sessionVersion) ||
      data.sessionVersion < 1 ||
      !Number.isFinite(data.exp) ||
      data.exp < Date.now()
    ) return null;
    return { userId: data.userId, sessionVersion: data.sessionVersion };
  } catch {
    return null;
  }
}
