import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/chamber-ops';
import { clearSession, readSession } from '@/lib/session';
import { isLiveConfigured } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isLiveConfigured()) {
      return NextResponse.json({ user: null });
    }
    const session = await readSession();
    if (!session) return NextResponse.json({ user: null });
    const user = await getUserById(session.userId);
    if (!user) return NextResponse.json({ user: null });
    if ((user.sessionVersion ?? 1) !== session.sessionVersion) {
      await clearSession();
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
