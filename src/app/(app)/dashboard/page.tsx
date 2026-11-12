'use client';

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

  // Outcome breakdown (decided cases)
  const byOutcome: Record<string, number> = {};
  decided.forEach((c) => {
    const k = c.outcome || 'Not recorded';
    byOutcome[k] = (byOutcome[k] || 0) + 1;
  });
  const outcomeEntries = Object.entries(byOutcome).sort((a, b) => b[1] - a[1]);

  // Degree (case type) breakdown — all cases, grouped strictly by type field
  const byType: Record<string, number> = {};
  visibleCases.forEach((c) => {
    const k = c.type?.trim() || 'Unspecified';
    byType[k] = (byType[k] || 0) + 1;
  });
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  const upcoming = active
    .filter((c) => c.next && c.next >= t)
    .sort((a, b) => a.next.localeCompare(b.next))
    .slice(0, 5);

  const todays = active.filter((c) => c.next === t);

  return (
    <>
      {currentUser?.role === 'associate' && (
        <div className="note" style={{ borderColor: 'var(--navy2)', background: 'var(--tag)' }}>
          <b>Associate Portal:</b> Logged in as <b>{currentUser.name}</b>. Only cases where you are an authorized advocate are shown.
        </div>
      )}

      {/* KPI row */}
      <div className="two">
        <div className="pn kpi">
          <span className="kn">{active.length}</span>Active cases
        </div>
        <div className="pn kpi">
          <span className="kn">{active.filter((c) => c.next === tm).length}</span>Hearings tomorrow
        </div>
      </div>

      {/* Decided outcomes + Degree breakdown side by side */}
      <div className="two" style={{ alignItems: 'stretch' }}>
        {/* Decided outcomes */}
        <section className="pn reg" style={{ margin: 0 }}>
          <div className="seal">
            <span>{decided.length}</span>
          </div>
          <div className="regt">
            <h2>Cases decided</h2>
            <p className="mut">
              All cases marked as decided, with outcome breakdown.
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

        {/* Degree (case type) breakdown */}
        <section className="pn reg" style={{ margin: 0 }}>
          <div className="seal">
            <span>{visibleCases.length}</span>
          </div>
          <div className="regt">
            <h2>Cases by degree</h2>
            <p className="mut">
              All cases grouped by their legal category / degree.
            </p>
            <table className="ot">
              <tbody>
                {typeEntries.map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{v}</td>
                  </tr>
                ))}
                {!visibleCases.length && (
                  <tr>
                    <td className="mut">No cases yet.</td>
                  </tr>
                )}
              </tbody>
              {visibleCases.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(0,0,0,0.12)' }}>
                    <td style={{ fontWeight: 700, paddingTop: 6 }}>Total</td>
                    <td style={{ fontWeight: 700, paddingTop: 6 }}>{visibleCases.length}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
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

