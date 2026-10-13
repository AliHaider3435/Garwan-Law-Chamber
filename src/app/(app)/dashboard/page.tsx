'use client';

import Link from 'next/link';
import CaseTable from '@/components/CaseTable';
import { addDays, iso, today } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { LIVE } from '@/lib/backend';

export default function Dashboard() {
  const { visibleCases, resetDemo, currentUser } = useStore();
  const t = today();
  const tm = iso(addDays(new Date(), 1));

  const active = visibleCases.filter((c) => c.status === 'active');
  const decided = visibleCases.filter((c) => c.status === 'decided');

  const by: Record<string, number> = {};
  decided.forEach((c) => {
    const k = c.outcome || 'Not recorded';
    by[k] = (by[k] || 0) + 1;
  });

  // Sort by count descending so Acquitted (2), Bail granted (1), Sentence reduced (1)
  const outcomeEntries = Object.entries(by).sort((a, b) => b[1] - a[1]);

  const upcoming = active
    .filter((c) => c.next && c.next >= t)
    .sort((a, b) => a.next.localeCompare(b.next))
    .slice(0, 5);

  const todays = active.filter((c) => c.next === t);

  return (
    <>
      {!LIVE && (
        <div className="note">
          Demo version: data is saved in this browser only. The live version will use a shared database.
        </div>
      )}

      {currentUser?.role === 'associate' && (
        <div className="note" style={{ borderColor: 'var(--navy2)', background: 'var(--tag)' }}>
          <b>Associate Portal:</b> Logged in as <b>{currentUser.name}</b>. Only cases where you are an authorized advocate are shown.
        </div>
      )}

      <section className="pn reg">
        <div className="seal">
          <span>{decided.length}</span>
        </div>
        <div className="regt">
          <h2>Total cases decided</h2>
          <p className="mut">
            Every case marked as decided, whether it was decided before or after you started using this app.
          </p>
          <table className="ot">
            <tbody>
              {outcomeEntries.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
              {!decided.length && (
                <tr>
                  <td className="mut">No decided cases yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two">
        <div className="pn kpi">
          <span className="kn">{active.length}</span>Active cases
        </div>
        <div className="pn kpi">
          <span className="kn">{active.filter((c) => c.next === tm).length}</span>Hearings tomorrow
        </div>
      </div>

      <section className="pn">
        <h2>Today&apos;s cause list</h2>
        <CaseTable list={todays} empty="No hearings scheduled for today." />
      </section>

      <section className="pn">
        <h2>Upcoming hearings</h2>
        <CaseTable list={upcoming} empty="No upcoming hearings. Add a case to get started." />
      </section>

      {!LIVE && currentUser?.role === 'superadmin' && (
        <div style={{ marginTop: 24, paddingBottom: 24 }}>
          <button className="ghost sm" onClick={() => resetDemo()}>
            Reset demo data
          </button>
        </div>
      )}
    </>
  );
}
