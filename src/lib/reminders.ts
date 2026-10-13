import { Associate, Case } from './types';
import { D1, fmt } from './dates';

export interface ReminderRow {
  caseId: string;
  who: string;
  num: string;
  text: string;
}

const SIG = ' - Garwan Law Chamber';

/** SMS length: 160 chars for one segment, 153 per segment when longer. */
export const segments = (t: string) => (t.length <= 160 ? 1 : Math.ceil(t.length / 153));

/** Used by both the Reminders page (preview) and the cron route (real sending). */
export function buildReminders(cases: Case[], assoc: Associate[], advocatePhone: string, date: string): ReminderRow[] {
  const cs = cases.filter((c) => c.status === 'active' && c.next === date);
  if (!cs.length) return [];
  const one = (c: Case) =>
    `Hearing reminder: ${c.title}, ${fmt(c.next, D1)}${c.court ? ', ' + c.court : ''}.${SIG}`;
  const list = cs.map((c, i) => `${i + 1}) ${c.title}`).join('; ');
  const rows: ReminderRow[] = [
    {
      caseId: cs[0].id,
      who: 'You (Mehtab)',
      num: advocatePhone,
      text: `Tomorrow ${cs.length} hearing${cs.length > 1 ? 's' : ''}: ${list}.${SIG}`,
    },
  ];
  for (const c of cs) {
    rows.push({ caseId: c.id, who: 'Client: ' + (c.clientName || 'not set'), num: c.clientPhone, text: one(c) });
    for (const id of c.assoc) {
      const a = assoc.find((x) => x.id === id);
      if (a) rows.push({ caseId: c.id, who: a.name, num: a.phone, text: one(c) });
    }
  }
  return rows;
}
