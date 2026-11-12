'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Case } from '@/lib/types';
import { D1, D2, addDays, fmt, iso, today } from '@/lib/dates';
import DsjLink from '@/components/DsjLink';
import { StatusTag } from '@/components/CaseTable';

type FilterTab = 'all' | 'today' | 'tomorrow' | 'week' | 'future';

export default function NotificationsPage() {
  const { visibleCases, openCase, toast, currentUser } = useStore();
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const t = today();
  const tm = iso(addDays(new Date(), 1));
  const in7 = iso(addDays(new Date(), 7));

  // Active cases with upcoming dates
  const activeWithDates = useMemo(() => {
    return visibleCases
      .filter((c) => c.status === 'active' && c.next)
      .sort((a, b) => a.next.localeCompare(b.next));
  }, [visibleCases]);

  const todayCases = useMemo(() => activeWithDates.filter((c) => c.next === t), [activeWithDates, t]);
  const tomorrowCases = useMemo(() => activeWithDates.filter((c) => c.next === tm), [activeWithDates, tm]);
  const weekCases = useMemo(() => activeWithDates.filter((c) => c.next >= t && c.next <= in7), [activeWithDates, t, in7]);
  const futureCases = useMemo(() => activeWithDates.filter((c) => c.next > in7), [activeWithDates, in7]);

  // Filtered list based on active tab and search
  const displayedCases = useMemo(() => {
    let list: Case[] = [];
    if (tab === 'today') list = todayCases;
    else if (tab === 'tomorrow') list = tomorrowCases;
    else if (tab === 'week') list = weekCases;
    else if (tab === 'future') list = futureCases;
    else list = activeWithDates.filter((c) => c.next >= t);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.court.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.caseNo.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tab, activeWithDates, todayCases, tomorrowCases, weekCases, futureCases, search, t]);

  return (
    <>
      {currentUser?.role === 'associate' && (
        <div className="note" style={{ borderColor: 'var(--navy2)', background: 'var(--tag)' }}>
          <b>Associate Portal:</b> Logged in as <b>{currentUser.name}</b>. Only notifications for cases assigned to you are shown.
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="two" style={{ marginBottom: 18 }}>
        <div
          className="pn kpi"
          style={{ cursor: 'pointer', borderTop: tab === 'today' ? '3px solid var(--ink)' : undefined }}
          onClick={() => setTab('today')}
        >
          <span className="kn">{todayCases.length}</span>Hearings Today
        </div>
        <div
          className="pn kpi"
          style={{ cursor: 'pointer', borderTop: tab === 'tomorrow' ? '3px solid var(--ink)' : undefined }}
          onClick={() => setTab('tomorrow')}
        >
          <span className="kn">{tomorrowCases.length}</span>Hearings Tomorrow
        </div>
      </div>

      <div className="two" style={{ marginBottom: 24 }}>
        <div
          className="pn kpi"
          style={{ cursor: 'pointer', borderTop: tab === 'week' ? '3px solid var(--ink)' : undefined }}
          onClick={() => setTab('week')}
        >
          <span className="kn">{weekCases.length}</span>Next 7 Days
        </div>
        <div
          className="pn kpi"
          style={{ cursor: 'pointer', borderTop: tab === 'all' ? '3px solid var(--ink)' : undefined }}
          onClick={() => setTab('all')}
        >
          <span className="kn">{activeWithDates.filter((c) => c.next >= t).length}</span>Total Upcoming
        </div>
      </div>

      {/* Main Notification Section */}
      <section className="pn">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Hearing Notifications & Alerts</h2>
            <p className="mut" style={{ margin: '4px 0 0', fontSize: 13.5 }}>
              Upcoming court appearance reminders and case schedules.
            </p>
          </div>
          {/* Quick search input */}
          <input
            type="search"
            placeholder="Filter notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 'min(280px, 100%)', margin: 0, padding: '7px 12px', fontSize: 13 }}
          />
        </div>

        {/* Filter Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={tab === 'all' ? 'on' : ''}
            onClick={() => setTab('all')}
          >
            All Upcoming ({activeWithDates.filter((c) => c.next >= t).length})
          </button>
          <button
            type="button"
            className={tab === 'today' ? 'on' : ''}
            onClick={() => setTab('today')}
          >
            Today ({todayCases.length})
          </button>
          <button
            type="button"
            className={tab === 'tomorrow' ? 'on' : ''}
            onClick={() => setTab('tomorrow')}
          >
            Tomorrow ({tomorrowCases.length})
          </button>
          <button
            type="button"
            className={tab === 'week' ? 'on' : ''}
            onClick={() => setTab('week')}
          >
            Next 7 Days ({weekCases.length})
          </button>
          <button
            type="button"
            className={tab === 'future' ? 'on' : ''}
            onClick={() => setTab('future')}
          >
            Later ({futureCases.length})
          </button>
        </div>

        {/* Notification Cards List */}
        {displayedCases.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--mut)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <p style={{ margin: 0, fontSize: 14 }}>No hearing notifications found for this period.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayedCases.map((c) => {
              const isToday = c.next === t;
              const isTomorrow = c.next === tm;
              const badgeText = isToday
                ? 'TODAY'
                : isTomorrow
                ? 'TOMORROW'
                : fmt(c.next, D2);

              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    borderRadius: 8,
                    background: isToday ? 'rgba(0, 0, 0, 0.035)' : 'rgba(255, 255, 255, 0.6)',
                    border: isToday ? '1px solid rgba(0, 0, 0, 0.25)' : '1px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: isToday ? '0 3px 12px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left: Case Info */}
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: isToday ? '#000' : isTomorrow ? '#222' : 'rgba(0,0,0,0.08)',
                          color: isToday || isTomorrow ? '#fff' : 'var(--ink)',
                        }}
                      >
                        {badgeText}
                      </span>
                      <StatusTag c={c} />
                      {c.type && (
                        <span style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>
                          {c.type}
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => openCase(c)}
                      style={{
                        margin: '2px 0 4px',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: 'var(--ink)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {c.title}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12.5, color: 'var(--mut)' }}>
                      <span>
                        <b>Court:</b> {c.court || 'Not set'}
                      </span>
                      {c.clientName && (
                        <span>
                          <b>Client:</b> {c.clientName}
                          {c.clientPhone && ` (${c.clientPhone})`}
                        </span>
                      )}
                      {c.fir && (
                        <span>
                          <b>FIR:</b> {c.fir}
                        </span>
                      )}
                      {c.station && (
                        <span>
                          <b>PS:</b> {c.station}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {c.caseNo && (
                      <DsjLink
                        caseNo={c.caseNo}
                        court={c.court}
                        variant="icon"
                        onCopied={() => toast(`Copied ${c.caseNo} — ready to paste in DSJ`)}
                      />
                    )}
                    <button
                      type="button"
                      className="pri sm"
                      onClick={() => openCase(c)}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      View Case
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
