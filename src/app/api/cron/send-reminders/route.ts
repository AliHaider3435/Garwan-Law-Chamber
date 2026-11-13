// Runs every evening via Vercel Cron (vercel.json: 13:00 UTC = 18:00 PKT).
// Sends SMS for hearings due tomorrow (Pakistan time) to Mehtab, the client and linked associates.
import { fromRow } from '@/lib/mapping';
import { buildReminders } from '@/lib/reminders';
import { isSmsConfigured, sendSms, SmsGatewayError } from '@/lib/sms';
import { getSupabaseConfigurationError, serviceDb } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const configError = getSupabaseConfigurationError();
  if (configError) return Response.json({ error: configError }, { status: 503 });
  if (!isSmsConfigured()) return new Response('SMS provider is not configured', { status: 503 });
  const db = serviceDb();

  // Tomorrow's date in Pakistan time, as YYYY-MM-DD
  const date = new Date(Date.now() + 24 * 3600e3).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

  const [c, a, s] = await Promise.all([
    db.from('cases').select('*, case_associates(associate_id)').eq('status', 'active').eq('next_hearing', date),
    db.from('associates').select('*'),
    db.from('settings').select('value').eq('key', 'advocate_phone').maybeSingle(),
  ]);
  if (c.error || a.error || s.error) {
    console.error('Reminder data could not be loaded:', c.error || a.error || s.error);
    return new Response('Reminder data could not be loaded', { status: 500 });
  }

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
    if (ins.error) {
      if (ins.error.code === '23505') skipped++;
      else {
        failed++;
        console.error('Reminder attempt could not be recorded:', ins.error);
      }
      continue;
    }
    try {
      const res = await sendSms(r.num, r.text);
      const saved = await db.from('reminder_log').update({ provider_response: res })
        .match({ case_id: r.caseId, hearing_date: date, phone: r.num });
      if (saved.error) {
        failed++;
        console.error('Reminder delivery was not logged:', saved.error);
      } else {
        sent++;
      }
    } catch (e) {
      failed++;
      const failure = e instanceof Error ? e.message : 'Unknown SMS delivery error.';
      const saved = await db.from('reminder_log').update({ provider_response: 'ERROR: ' + failure })
        .match({ case_id: r.caseId, hearing_date: date, phone: r.num });
      if (saved.error) console.error('Reminder failure was not logged:', saved.error);
      if (e instanceof SmsGatewayError && e.rejected) {
        const removed = await db.from('reminder_log').delete()
          .match({ case_id: r.caseId, hearing_date: date, phone: r.num });
        if (removed.error) console.error('Rejected reminder reservation could not be released:', removed.error);
      }
    }
  }
  return Response.json({ date, sent, skipped, failed });
}
