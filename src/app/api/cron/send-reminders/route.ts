// Runs every evening via Vercel Cron (vercel.json: 13:00 UTC = 18:00 PKT).
// Sends SMS for hearings due tomorrow (Pakistan time) to Mehtab, the client and linked associates.
import { createClient } from '@supabase/supabase-js';
import { fromRow } from '@/lib/mapping';
import { buildReminders } from '@/lib/reminders';
import { sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response('Supabase env vars missing', { status: 500 });
  const db = createClient(url, key);

  // Tomorrow's date in Pakistan time, as YYYY-MM-DD
  const date = new Date(Date.now() + 24 * 3600e3).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

  const [c, a, s] = await Promise.all([
    db.from('cases').select('*, case_associates(associate_id)').eq('status', 'active').eq('next_hearing', date),
    db.from('associates').select('*'),
    db.from('settings').select('value').eq('key', 'advocate_phone').maybeSingle(),
  ]);
  if (c.error || a.error) return new Response((c.error || a.error)!.message, { status: 500 });

  const advocate = (s.data as any)?.value || process.env.ADVOCATE_PHONE || '';
  const assoc = (a.data ?? []).map((x: any) => ({ id: x.id, name: x.name, phone: x.phone ?? '' }));
  const rows = buildReminders((c.data ?? []).map(fromRow), assoc, advocate, date);

  let sent = 0, skipped = 0, failed = 0;
  for (const r of rows) {
    if (!r.num) { skipped++; continue; }
    // reminder_log has a unique key (case, date, phone), so a rerun never sends twice
    const ins = await db.from('reminder_log').insert({
      case_id: r.caseId, hearing_date: date, phone: r.num, recipient: r.who, body: r.text,
    });
    if (ins.error) { skipped++; continue; }
    try {
      const res = await sendSms(r.num, r.text);
      await db.from('reminder_log').update({ provider_response: res })
        .match({ case_id: r.caseId, hearing_date: date, phone: r.num });
      sent++;
    } catch (e) {
      failed++;
      await db.from('reminder_log').update({ provider_response: 'ERROR: ' + (e as Error).message })
        .match({ case_id: r.caseId, hearing_date: date, phone: r.num });
    }
  }
  return Response.json({ date, sent, skipped, failed });
}
