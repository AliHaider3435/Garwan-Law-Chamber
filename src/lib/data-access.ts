import type { ChamberData, User } from './types';

export function restrictChamberData(data: ChamberData, actor: User): ChamberData {
  if (actor.role === 'superadmin') return data;
  const associateId = actor.associateId;
  const cases = associateId ? data.cases.filter((item) => item.assoc.includes(associateId)) : [];
  const caseIds = new Set(cases.map((item) => item.id));
  return {
    cases,
    assoc: data.assoc
      .filter((item) => item.id === associateId)
      .map((item) => ({ ...item, phone: '' })),
    users: data.users.filter((item) => item.id === actor.id),
    phone: '',
    log: data.log
      .filter((item) => item.caseId !== undefined && caseIds.has(item.caseId))
      .map((item) => ({ ...item, num: '' })),
  };
}
