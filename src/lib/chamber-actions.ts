import type { Associate, Case, ChamberData, LogEntry, User } from './types';
import type * as ChamberOps from './chamber-ops';

type Operations = typeof ChamberOps;

export class ActionError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type CaseActor = Pick<User, 'role' | 'associateId'>;

const CASE_FIELDS = new Set([
  'id', 'title', 'caseNo', 'court', 'judge', 'clientName', 'clientPhone', 'opposing',
  'type', 'typeOther', 'fir', 'station', 'codeStation', 'district', 'tehsil', 'sections',
  'stage', 'stageOther', 'status', 'next', 'decidedOn', 'outcome', 'assoc',
]);
const USER_FIELDS = new Set([
  'id', 'username', 'email', 'password', 'name', 'role', 'associateId', 'createdAt', 'sessionVersion',
]);

function record(value: unknown, fields?: Set<string>): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ActionError('Invalid request payload.');
  }
  const result = value as Record<string, unknown>;
  if (fields && Object.keys(result).some((key) => !fields.has(key))) {
    throw new ActionError('Request payload contains unsupported fields.');
  }
  return result;
}

function text(value: unknown, label: string, max: number, optional = true): string {
  if (value === undefined || value === null) {
    if (optional) return '';
    throw new ActionError(`${label} is required.`);
  }
  if (typeof value !== 'string') throw new ActionError(`${label} must be text.`);
  const result = value.trim();
  if (!optional && !result) throw new ActionError(`${label} is required.`);
  if (result.length > max) throw new ActionError(`${label} must be ${max} characters or fewer.`);
  return result;
}

function uuid(value: unknown, label: string, optional = false): string {
  const result = text(value, label, 36, optional);
  if (!result && optional) return '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new ActionError(`${label} is invalid.`);
  }
  return result;
}

function date(value: unknown, label: string): string {
  const result = text(value, label, 10);
  if (result) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
      throw new ActionError(`${label} must be a valid YYYY-MM-DD date.`);
    }
    const parsed = new Date(`${result}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
      throw new ActionError(`${label} must be a valid YYYY-MM-DD date.`);
    }
  }
  return result;
}

function password(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new ActionError(`${label} must be text.`);
  if (value.length < 8 || value.length > 256) {
    throw new ActionError(`${label} must be 8-256 characters long.`);
  }
  return value;
}

function currentPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 256) {
    throw new ActionError('Current password is required.');
  }
  return value;
}

export function validateCase(value: unknown): Case {
  const input = record(value, CASE_FIELDS);
  const id = uuid(input.id, 'Case ID', true);
  const rawStatus = input.status ?? 'active';
  if (rawStatus !== 'active' && rawStatus !== 'decided') {
    throw new ActionError('Case status must be active or decided.');
  }
  if (input.assoc !== undefined && !Array.isArray(input.assoc)) {
    throw new ActionError('Case associates must be a list.');
  }
  const assoc = (input.assoc ?? []).map((value: unknown) => uuid(value, 'Associate ID'));
  if (new Set(assoc).size !== assoc.length) throw new ActionError('Case associates must be unique.');

  return {
    id,
    title: text(input.title, 'Case title', 240, false),
    caseNo: text(input.caseNo, 'Case number', 120),
    court: text(input.court, 'Court', 160),
    judge: text(input.judge, 'Judge', 120),
    clientName: text(input.clientName, 'Client name', 120),
    clientPhone: text(input.clientPhone, 'Client phone', 32),
    opposing: text(input.opposing, 'Opposing party', 120),
    type: text(input.type, 'Case type', 80),
    typeOther: text(input.typeOther, 'Other case type', 120),
    fir: text(input.fir, 'FIR number', 80),
    station: text(input.station, 'Police station', 120),
    codeStation: text(input.codeStation, 'Police station code', 80),
    district: text(input.district, 'District', 120),
    tehsil: text(input.tehsil, 'Tehsil', 120),
    sections: text(input.sections, 'Sections', 250),
    stage: text(input.stage, 'Stage', 80),
    stageOther: text(input.stageOther, 'Other case stage', 120),
    status: rawStatus,
    next: date(input.next, 'Next hearing'),
    decidedOn: date(input.decidedOn, 'Decision date'),
    outcome: text(input.outcome, 'Outcome', 80),
    assoc,
  };
}

function validateAssociate(value: unknown): Omit<Associate, 'id'> {
  const input = record(value);
  if (Object.keys(input).some((key) => key !== 'name' && key !== 'phone')) {
    throw new ActionError('Request payload contains unsupported fields.');
  }
  return {
    name: text(input.name, 'Associate name', 120, false),
    phone: text(input.phone, 'Associate phone', 32),
  };
}

function validateUser(value: unknown): User {
  const input = record(value, USER_FIELDS);
  const id = uuid(input.id, 'User ID', true);
  const username = text(input.username, 'Username', 40, false).toLowerCase();
  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
    throw new ActionError('Username must be 3-40 letters, numbers, dots, dashes or underscores.');
  }
  const email = text(input.email, 'Email', 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ActionError('Enter a valid email address.');
  }
  const name = text(input.name, 'Name', 120, false);
  if (input.role !== 'superadmin' && input.role !== 'associate') {
    throw new ActionError('User role must be superadmin or associate.');
  }
  const associateId = input.associateId ? uuid(input.associateId, 'Associate ID') : undefined;
  const userPassword = input.password === undefined
    ? undefined
    : password(input.password, 'Password');
  return {
    id,
    username,
    email,
    name,
    role: input.role,
    associateId: input.role === 'associate' ? associateId : undefined,
    createdAt: '',
    password: userPassword,
  };
}

export function requireActor(actor: User | null): User {
  if (!actor) throw new ActionError('Please sign in.', 401);
  return actor;
}

export function authorizeCase(
  actor: CaseActor,
  incoming: Case,
  existing: Case | null,
): Case {
  if (actor.role !== 'associate') return incoming;
  if (!actor.associateId) {
    throw new ActionError('Your account is not linked to an associate profile.', 403);
  }
  if (incoming.id) {
    if (!existing || !existing.assoc.includes(actor.associateId)) {
      if (!existing) throw new ActionError('Case not found.', 404);
      throw new ActionError('You are not authorized to edit this case.', 403);
    }
    return { ...incoming, assoc: existing.assoc };
  }
  return { ...incoming, assoc: [actor.associateId] };
}

export async function executeChamberAction(
  actor: User,
  action: unknown,
  payload: unknown,
  ops: Operations,
): Promise<{ data: unknown; refreshSession?: number }> {
  if (typeof action !== 'string') throw new ActionError('Unknown action');

  switch (action) {
    case 'load':
      if (payload !== undefined) throw new ActionError('Load does not accept a payload.');
      return { data: await ops.loadChamber(actor) as ChamberData };
    case 'saveCase': {
      const incoming = validateCase(payload);
      const existing = incoming.id ? await ops.getCaseById(incoming.id) : null;
      const authorized = authorizeCase(actor, incoming, existing);
      return { data: await ops.saveCase(authorized) };
    }
    case 'deleteCase': {
      if (actor.role === 'associate') throw new ActionError('Associates cannot delete cases.', 403);
      await ops.deleteCase(uuid(payload, 'Case ID'));
      return { data: true };
    }
    case 'addAssociate':
      if (actor.role !== 'superadmin') throw new ActionError('Only the super admin can manage associates.', 403);
      return { data: await ops.addAssociate(validateAssociate(payload)) };
    case 'removeAssociate':
      if (actor.role !== 'superadmin') throw new ActionError('Only the super admin can manage associates.', 403);
      await ops.removeAssociate(uuid(payload, 'Associate ID'));
      return { data: true };
    case 'setPhone': {
      if (actor.role !== 'superadmin') {
        throw new ActionError('Only the super admin can change the chamber phone number.', 403);
      }
      const phone = text(payload, 'Phone number', 32);
      await ops.setPhone(phone);
      return { data: true };
    }
    case 'addLog': {
      if (actor.role !== 'superadmin') throw new ActionError('Only the super admin can manage reminders.', 403);
      if (!Array.isArray(payload) || payload.length > 100) {
        throw new ActionError('Reminder entries must be a list of at most 100 items.');
      }
      const entries: LogEntry[] = payload.map((value: unknown) => {
        const entry = record(value);
        if (Object.keys(entry).some((key) => !['key', 'to', 'num', 't'].includes(key))) {
          throw new ActionError('Reminder entry contains unsupported fields.');
        }
        return {
          key: text(entry.key, 'Reminder key', 160, false),
          to: text(entry.to, 'Recipient', 120),
          num: text(entry.num, 'Phone number', 32, false),
          t: text(entry.t, 'Reminder time', 80),
        };
      });
      await ops.addLog(entries);
      return { data: true };
    }
    case 'saveUser':
      if (actor.role !== 'superadmin') throw new ActionError('Only the super admin can manage users.', 403);
      return { data: await ops.saveUser(validateUser(payload)) };
    case 'deleteUser': {
      if (actor.role !== 'superadmin') throw new ActionError('Only the super admin can manage users.', 403);
      const id = uuid(payload, 'User ID');
      if (id === actor.id) throw new ActionError('You cannot delete your own account.', 403);
      const target = await ops.getUserById(id);
      if (!target) throw new ActionError('User not found.', 404);
      if (target.role === 'superadmin' && target.username === 'superadmin') {
        throw new ActionError('The primary Super Admin account cannot be deleted.', 403);
      }
      await ops.deleteUser(id);
      return { data: true };
    }
    case 'updatePassword': {
      const input = record(payload);
      if (Object.keys(input).some((key) => !['userId', 'newPass', 'currentPass'].includes(key))) {
        throw new ActionError('Password request contains unsupported fields.');
      }
      const userId = uuid(input.userId, 'User ID');
      const newPass = password(input.newPass, 'New password');
      const currentPass = input.currentPass === undefined
        ? ''
        : currentPassword(input.currentPass);
      if (actor.role !== 'superadmin' && actor.id !== userId) {
        throw new ActionError('You can only change your own password.', 403);
      }
      if (actor.id === userId && (!currentPass || !(await ops.verifyUserPassword(userId, currentPass)))) {
        throw new ActionError('Current password is incorrect.');
      }
      await ops.updatePassword(userId, newPass);
      if (actor.id !== userId) return { data: true };
      const updated = await ops.getUserById(userId);
      if (!updated) throw new ActionError('User not found.', 404);
      return { data: true, refreshSession: updated.sessionVersion ?? 1 };
    }
    default:
      throw new ActionError('Unknown action');
  }
}
