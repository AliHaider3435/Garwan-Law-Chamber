import type { Case } from './types';
import { InputError, NotFoundError } from './errors.ts';
import { toRow } from './mapping.ts';

interface RpcResult {
  data: unknown;
  error: { code?: string; message: string } | null;
}

export interface CaseRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
}

export async function saveCaseAtomically(db: CaseRpcClient, c: Case): Promise<Case> {
  const { data, error } = await db.rpc('save_case_with_associates', {
    p_case_id: c.id || null,
    p_case: toRow(c),
    p_associate_ids: c.assoc,
  });
  if (error?.code === 'P0002') throw new NotFoundError('Case not found.');
  if (error?.code === '22023' || error?.code === '23503') {
    throw new InputError(error.message);
  }
  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('Database returned an invalid case ID.');
  return { ...c, id: data };
}
