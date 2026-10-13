import { Case } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const fromRow = (r: any): Case => ({
  id: r.id,
  title: r.title,
  caseNo: r.case_no ?? '',
  court: r.court ?? '',
  judge: r.judge ?? '',
  clientName: r.client_name ?? '',
  clientPhone: r.client_phone ?? '',
  opposing: r.opposing_party ?? '',
  type: r.case_type ?? '',
  fir: r.fir_no ?? '',
  station: r.police_station ?? '',
  sections: r.sections ?? '',
  stage: r.stage ?? '',
  status: r.status,
  next: r.next_hearing ?? '',
  decidedOn: r.decided_on ?? '',
  outcome: r.outcome ?? '',
  assoc: (r.case_associates ?? []).map((x: any) => x.associate_id),
});

export const toRow = (c: Case) => ({
  title: c.title.trim(),
  case_no: c.caseNo || null,
  court: c.court || null,
  judge: c.judge || null,
  client_name: c.clientName || null,
  client_phone: c.clientPhone || null,
  opposing_party: c.opposing || null,
  case_type: c.type || null,
  fir_no: c.fir || null,
  police_station: c.station || null,
  sections: c.sections || null,
  stage: c.stage || null,
  status: c.status,
  next_hearing: c.status === 'active' && c.next ? c.next : null,
  decided_on: c.status === 'decided' && c.decidedOn ? c.decidedOn : null,
  outcome: c.status === 'decided' ? c.outcome || null : null,
});
