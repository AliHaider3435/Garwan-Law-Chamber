'use client';

import { useState } from 'react';
import { D1, addDays, fmt, iso, today } from '@/lib/dates';
import { useStore } from '@/lib/store';

export default function CauseList() {
  const { visibleCases, openCase, currentUser } = useStore();
  const [wk, setWk] = useState(0);
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  const mon = addDays(now, -dow + wk * 7);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(mon, i));
  const short = { day: 'numeric', month: 'short' } as const;

  return (
    <>
      {currentUser?.role === 'associate' && (
        <div className="note" style={{ borderColor: 'var(--navy2)', background: 'var(--tag)' }}>
          Showing cause list for cases assigned to <b>{currentUser.name}</b>.
        </div>
      )}

      <div className="pn wkhd">
        <button className="ghost" onClick={() => setWk(wk - 1)}>Previous</button>
        <div>
          <h2>{wk === 0 ? 'This week' : 'Week of ' + fmt(iso(days[0]), short)}</h2>
          <p>{fmt(iso(days[0]), short)} - {fmt(iso(days[6]), D1)}</p>
        </div>
        <button className="ghost" onClick={() => setWk(wk + 1)}>Next</button>
      </div>
      <div className="pn">
        {days.map((d) => {
          const k = iso(d);
          const cs = visibleCases.filter((c) => c.status === 'active' && c.next === k);
          return (
            <div key={k} className={'dy' + (k === today() ? ' now' : '')}>
              <div className="dd"><b>{fmt(k, { weekday: 'long' })}</b><span>{fmt(k, short)}</span></div>
              <div className="dc2">
                {cs.length
                  ? cs.map((c) => (
                      <button key={c.id} className="ln" onClick={() => openCase(c)}>
                        <b>{c.title}</b><small>{c.court}</small>
                      </button>
                    ))
                  : <span className="mut">No hearings</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
