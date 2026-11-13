import { NextResponse } from 'next/server';
import { clearSession, readSession, setSession } from '@/lib/session';
import { getSupabaseConfigurationError } from '@/lib/server-db';
import { executeChamberAction, requireActor, ActionError } from '@/lib/chamber-actions';
import * as ops from '@/lib/chamber-ops';
import { InputError, NotFoundError } from '@/lib/errors';
import { readJsonBody, RequestBodyError } from '@/lib/request-body';

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(req: Request) {
  try {
    const configError = getSupabaseConfigurationError();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }
    const session = await readSession();
    if (!session) throw new ActionError('Please sign in.', 401);
    const actor = requireActor(await ops.getUserById(session.userId));
    if ((actor.sessionVersion ?? 1) !== session.sessionVersion) {
      await clearSession();
      throw new ActionError('Password changed. Sign in again.', 401);
    }

    const body = await readJsonBody(req, MAX_BODY_BYTES);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ActionError('Invalid request payload.');
    }
    const request = body as Record<string, unknown>;
    if (Object.keys(request).some((key) => key !== 'action' && key !== 'payload')) {
      throw new ActionError('Request contains unsupported fields.');
    }
    const { action, payload } = request as { action?: unknown; payload?: unknown };
    const result = await executeChamberAction(actor, action, payload, ops);
    if (result.refreshSession !== undefined) {
      await setSession(actor.id, result.refreshSession);
    }
    return NextResponse.json({ data: result.data });
  } catch (e) {
    if (e instanceof ActionError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof RequestBodyError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof InputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('Chamber API request failed:', e);
    return NextResponse.json({ error: 'The request could not be completed.' }, { status: 500 });
  }
}
