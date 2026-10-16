import { NextResponse } from 'next/server';
import { clearSession, readSession, setSession } from '@/lib/session';
import { isLiveConfigured } from '@/lib/server-db';
import { Case } from '@/lib/types';
import * as ops from '@/lib/chamber-ops';

export async function POST(req: Request) {
  try {
    if (!isLiveConfigured()) {
      return NextResponse.json({ error: 'Shared database is not configured.' }, { status: 503 });
    }
    const session = await readSession();
    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const actor = await ops.getUserById(session.userId);
    if (!actor) return NextResponse.json({ error: 'Session expired. Sign in again.' }, { status: 401 });
    if ((actor.sessionVersion ?? 1) !== session.sessionVersion) {
      await clearSession();
      return NextResponse.json({ error: 'Password changed. Sign in again.' }, { status: 401 });
    }

    const { action, payload } = await req.json();

    switch (action) {
      case 'load':
        return NextResponse.json({ data: await ops.loadChamber(actor) });
      case 'saveCase': {
        let caseData = payload as Case;
        if (actor.role === 'associate') {
          if (!actor.associateId) {
            return NextResponse.json({ error: 'Your account is not linked to an associate profile.' }, { status: 403 });
          }
          if (caseData.id) {
            const existing = await ops.getCaseById(caseData.id);
            if (!existing || !existing.assoc.includes(actor.associateId)) {
              return NextResponse.json({ error: 'You are not authorized to edit this case.' }, { status: 403 });
            }
            caseData = { ...caseData, assoc: existing.assoc };
          } else {
            caseData = { ...caseData, assoc: [actor.associateId] };
          }
        }
        return NextResponse.json({ data: await ops.saveCase(caseData) });
      }
      case 'deleteCase':
        if (actor.role === 'associate') {
          return NextResponse.json({ error: 'Associates cannot delete cases.' }, { status: 403 });
        }
        await ops.deleteCase(payload);
        return NextResponse.json({ data: true });
      case 'addAssociate':
        if (actor.role !== 'superadmin') {
          return NextResponse.json({ error: 'Only the super admin can manage associates.' }, { status: 403 });
        }
        return NextResponse.json({ data: await ops.addAssociate(payload) });
      case 'removeAssociate':
        if (actor.role !== 'superadmin') {
          return NextResponse.json({ error: 'Only the super admin can manage associates.' }, { status: 403 });
        }
        await ops.removeAssociate(payload);
        return NextResponse.json({ data: true });
      case 'setPhone':
        if (actor.role !== 'superadmin') {
          return NextResponse.json({ error: 'Only the super admin can change the chamber phone number.' }, { status: 403 });
        }
        await ops.setPhone(payload);
        return NextResponse.json({ data: true });
      case 'addLog':
        await ops.addLog(payload);
        return NextResponse.json({ data: true });
      case 'saveUser':
        if (actor.role !== 'superadmin') {
          return NextResponse.json({ error: 'Only the super admin can manage users.' }, { status: 403 });
        }
        return NextResponse.json({ data: await ops.saveUser(payload) });
      case 'deleteUser':
        if (actor.role !== 'superadmin') {
          return NextResponse.json({ error: 'Only the super admin can manage users.' }, { status: 403 });
        }
        await ops.deleteUser(payload);
        return NextResponse.json({ data: true });
      case 'updatePassword': {
        const { userId, newPass, currentPass } = payload as {
          userId: string;
          newPass: string;
          currentPass?: string;
        };
        if (actor.role !== 'superadmin' && actor.id !== userId) {
          return NextResponse.json({ error: 'You can only change your own password.' }, { status: 403 });
        }
        if (actor.id === userId) {
          if (!currentPass || !(await ops.verifyUserPassword(userId, currentPass))) {
            return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
          }
        }
        await ops.updatePassword(userId, newPass);
        if (actor.id === userId) {
          const updated = await ops.getUserById(userId);
          if (!updated) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
          await setSession(userId, updated.sessionVersion ?? 1);
        }
        return NextResponse.json({ data: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
