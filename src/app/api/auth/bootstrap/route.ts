import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/chamber-ops';
import { hashPassword } from '@/lib/password';
import { serviceDb } from '@/lib/server-db';
import { setSession } from '@/lib/session';
import { readJsonBody, RequestBodyError } from '@/lib/request-body';

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
    const body = await readJsonBody(req, 8 * 1024);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const keys = Object.keys(input);
    if (keys.some((key) => !['username', 'email', 'name', 'password'].includes(key))) {
      return NextResponse.json({ error: 'Request contains unsupported fields.' }, { status: 400 });
    }
    if (['username', 'email', 'name', 'password'].some((key) => typeof input[key] !== 'string')) {
      return NextResponse.json({ error: 'Enter valid username, email, name, and password fields.' }, { status: 400 });
    }
    const username = (input.username as string).trim().toLowerCase();
    const email = (input.email as string).trim().toLowerCase();
    const name = (input.name as string).trim();
    const password = input.password as string;

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
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
