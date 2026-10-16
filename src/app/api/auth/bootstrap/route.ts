import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/chamber-ops';
import { hashPassword } from '@/lib/password';
import { serviceDb } from '@/lib/server-db';
import { setSession } from '@/lib/session';

export async function POST(req: Request) {
  const setupSecret = process.env.INITIAL_ADMIN_SETUP_SECRET;
  if (!setupSecret || setupSecret.length < 32) {
    return NextResponse.json({ error: 'Initial admin setup is not enabled.' }, { status: 503 });
  }

  const authorization = req.headers.get('authorization') ?? '';
  const suppliedSecret = Buffer.from(authorization.replace(/^Bearer\s+/i, ''));
  const expectedSecret = Buffer.from(setupSecret);
  if (
    !/^Bearer\s+/i.test(authorization) ||
    suppliedSecret.length !== expectedSecret.length ||
    !timingSafeEqual(suppliedSecret, expectedSecret)
  ) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const username = String(body.username ?? '').trim().toLowerCase();
    const email = String(body.email ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim();
    const password = String(body.password ?? '');

    if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3-40 letters, numbers, dots, dashes or underscores.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 120) {
      return NextResponse.json({ error: 'Enter a valid email address and name.' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 256) {
      return NextResponse.json({ error: 'Password must be 8-256 characters long.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const { data: userId, error } = await serviceDb().rpc('bootstrap_chamber_admin', {
      p_username: username,
      p_email: email,
      p_password_hash: passwordHash,
      p_name: name,
    });
    if (error) {
      if (error.message.includes('already configured')) {
        return NextResponse.json({ error: 'Initial admin is already configured.' }, { status: 409 });
      }
      throw new Error(error.message);
    }

    const user = await getUserById(String(userId));
    if (!user) throw new Error('Initial admin was created but could not be loaded.');
    await setSession(user.id, user.sessionVersion ?? 1);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
