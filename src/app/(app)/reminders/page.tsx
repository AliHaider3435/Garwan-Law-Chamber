'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmt, tomorrow } from '@/lib/dates';
import { buildReminders, segments } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { LIVE } from '@/lib/backend';

export default function Reminders() {
  const { visibleCases, assoc, phone, setPhone, log, simulateSend, toast, currentUser } = useStore();
  const [num, setNum] = useState(phone);
  useEffect(() => setNum(phone), [phone]);

  const date = tomorrow();
  const rows = useMemo(() => buildReminders(visibleCases, assoc, phone, date), [visibleCases, assoc, phone, date]);
  const total = rows.filter((r) => r.num).reduce((s, r) => s + segments(r.text), 0);

  async function send() {
    let n = 0, skipped = 0;
    const entries = [];
    for (const r of rows) {
      if (!r.num) continue;
      const key = `${date}|${r.num}|${r.text}`;
      if (log.some((l) => l.key === key)) { skipped++; continue; }
      entries.push({ key, to: r.who, num: r.num, t: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) });
      n++;
    }
    await simulateSend(entries);
    toast(`${n} sent (demo), ${skipped} already sent`);
  }

  return (
    <>
      {currentUser?.role === 'associate' && (
        <div className="note" style={{ borderColor: 'var(--navy2)', background: 'var(--tag)' }}>
          Reminders configured for cases authorized to <b>{currentUser.name}</b>.
        </div>
      )}

      <div className="pn pp">
        <h2>Tomorrow, {fmt(date)}</h2>
        <p className="mut" style={{ margin: '6px 0 12px' }}>
          Every evening the app sends reminders for hearings due the next day. Only active cases are included.
        </p>
        <label>Your phone number
          <input type="tel" value={num} placeholder="03xx xxxxxxx" onChange={(e) => setNum(e.target.value)} onBlur={() => num !== phone && setPhone(num.trim())} />
        </label>
      </div>

      {rows.length ? (
        <div className="pn">
          <h2>Messages to send ({total} SMS)</h2>
          {rows.map((r, i) => (
            <div className="msg" key={i}>
              <b>{r.who}</b>
              {r.num ? <small>{r.num}, {segments(r.text)} SMS</small> : <> <span className="tag">No number</span></>}
              <p>{r.text}</p>
            </div>
          ))}
          {!LIVE && <div className="pad"><button className="pri" onClick={send}>Send reminders (demo)</button></div>}
        </div>
      ) : (
        <div className="pn pp"><p className="mut" style={{ margin: 0 }}>No hearings tomorrow, so there is nothing to send.</p></div>
      )}

      <div className="pn">
        <h2>Sent log</h2>
        {log.slice(0, 15).map((l) => (
          <div className="row" key={l.key}><span><b>{l.to}</b><small>{l.num}</small></span><small>{l.t}</small></div>
        ))}
        {!log.length && <p className="mut pad" style={{ margin: 0 }}>Nothing sent yet.</p>}
      </div>
    </>
  );
}
