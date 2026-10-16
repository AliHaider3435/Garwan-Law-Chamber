import { NextResponse } from 'next/server';
import { findUserByLogin } from '@/lib/chamber-ops';
import { setSession } from '@/lib/session';
import { isLiveConfigured } from '@/lib/server-db';

export async function POST(req: Request) {
  try {
    if (!isLiveConfigured()) {
      return NextResponse.json({ error: 'Shared database is not configured.' }, { status: 503 });
    }
    const body = await req.json();
    const identifier = String(body.identifier || '');
    const password = String(body.password || '');
    if (!identifier.trim() || identifier.length > 254 || !password || password.length > 256) {
      return NextResponse.json({ error: 'Enter username or email and password.' }, { status: 400 });
    }
    const user = await findUserByLogin(identifier, password);
    if (!user) {
      return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
    }
    await setSession(user.id, user.sessionVersion ?? 1);
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
