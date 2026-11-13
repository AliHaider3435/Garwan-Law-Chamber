import { NextResponse } from 'next/server';
import { findUserByLogin } from '@/lib/chamber-ops';
import { setSession } from '@/lib/session';
import { isLiveConfigured, serviceDb } from '@/lib/server-db';
import { consumeLoginAttempt, requestIp, resetLoginAttempts } from '@/lib/auth-throttle';
import { readJsonBody, RequestBodyError } from '@/lib/request-body';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createHmac } from 'crypto';

const MAX_BODY_BYTES = 4 * 1024;
const DUMMY_HASH_SECRET = 'invalid-login-account';
let dummyHashPromise: Promise<string> | undefined;

export async function POST(req: Request) {
  try {
    if (!isLiveConfigured()) {
      return NextResponse.json({ error: 'Shared database is not configured.' }, { status: 503 });
    }
    let body: unknown;
    try {
      body = await readJsonBody(req, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }
    const input = body as { identifier?: unknown; password?: unknown };
    if (Object.keys(body).some((key) => key !== 'identifier' && key !== 'password')) {
      return NextResponse.json({ error: 'Request contains unsupported fields.' }, { status: 400 });
    }
    if (
      typeof input.identifier !== 'string' ||
      typeof input.password !== 'string' ||
      !input.identifier.trim() ||
      input.identifier.length > 254 ||
      !input.password ||
      input.password.length > 256
    ) {
      return NextResponse.json({ error: 'Enter username or email and password.' }, { status: 400 });
    }
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error('SESSION_SECRET is required to rate limit logins.');
    const allowed = await consumeLoginAttempt(
      serviceDb(),
      requestIp(req),
      input.identifier,
      secret,
    );
    if (!allowed) {
      return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 429 });
    }
    const user = await findUserByLogin(input.identifier, input.password);
    if (!user) {
      if (!dummyHashPromise) {
        dummyHashPromise = hashPassword(createHmac('sha256', DUMMY_HASH_SECRET).update(secret).digest('hex'));
      }
      await verifyPassword(input.password, await dummyHashPromise);
      return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
    }
    await resetLoginAttempts(serviceDb(), requestIp(req), input.identifier, secret);
    await setSession(user.id, user.sessionVersion ?? 1);
    return NextResponse.json({ user });
  } catch (e) {
    console.error('Login request failed:', e);
    return NextResponse.json({ error: 'The sign-in request could not be completed.' }, { status: 500 });
  }
}
