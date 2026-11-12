'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Case } from '@/lib/types';
import { D2, addDays, fmt, iso, today } from '@/lib/dates';

export default function NotificationBell() {
  const { visibleCases, openCase } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const t = today();
  const in7 = iso(addDays(new Date(), 7));

  // Hearings today, tomorrow, and within 7 days
  const alerts = visibleCases
    .filter((c) => c.status === 'active' && c.next && c.next >= t && c.next <= in7)
    .sort((a, b) => a.next.localeCompare(b.next));

  const todayList = alerts.filter((c) => c.next === t);
  const tomorrowList = alerts.filter((c) => c.next === iso(addDays(new Date(), 1)));
  const soonList = alerts.filter((c) => c.next > iso(addDays(new Date(), 1)));

  const count = alerts.length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          background: open ? 'var(--ink)' : 'none',
          border: '1px solid rgba(0,0,0,0.14)',
          borderRadius: 7,
          cursor: 'pointer',
          color: open ? 'var(--card)' : 'var(--ink)',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 17,
            height: 17,
            background: '#000',
            color: '#fff',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--card)',
            lineHeight: 1,
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 330,
          background: 'var(--card)',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          zIndex: 999,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Upcoming Hearings
            </span>
            {count > 0 && (
              <span style={{
                background: 'var(--ink)',
                color: 'var(--card)',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
              }}>
                {count} within 7 days
              </span>
            )}
          </div>

          {/* Body */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {count === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--mut)', fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>✓</div>
                No hearings in the next 7 days
              </div>
            ) : (
              <>
                {todayList.length > 0 && (
                  <NotifGroup
                    label="Today"
                    color="#000"
                    cases={todayList}
                    onSelect={(c) => {
                      setOpen(false);
                      openCase(c);
                    }}
                  />
                )}
                {tomorrowList.length > 0 && (
                  <NotifGroup
                    label="Tomorrow"
                    color="rgba(0,0,0,0.7)"
                    cases={tomorrowList}
                    onSelect={(c) => {
                      setOpen(false);
                      openCase(c);
                    }}
                  />
                )}
                {soonList.length > 0 && (
                  <NotifGroup
                    label="Coming soon"
                    color="rgba(0,0,0,0.5)"
                    cases={soonList}
                    onSelect={(c) => {
                      setOpen(false);
                      openCase(c);
                    }}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer button: Go to all notifications page */}
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            background: 'rgba(0,0,0,0.025)',
          }}>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                width: '100%',
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                background: 'linear-gradient(180deg, #16161a 0%, #060608 100%)',
                color: '#ffffff',
                borderRadius: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'none';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              }}
            >
              <span>View all notifications</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifGroup({
  label,
  color,
  cases,
  onSelect,
}: {
  label: string;
  color: string;
  cases: Case[];
  onSelect: (c: Case) => void;
}) {
  return (
    <div>
      <div style={{
        padding: '7px 16px 3px',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color,
        background: 'rgba(0,0,0,0.025)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        {label}
      </div>
      {cases.map((c) => (
        <div
          key={c.id}
          onClick={() => onSelect(c)}
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>
            {c.title}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--mut)' }}>
            {c.court || 'Court not set'}
            {c.clientName && ` · ${c.clientName}`}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink)',
            marginTop: 1,
            fontFamily: 'monospace',
            letterSpacing: '0.03em',
          }}>
            {fmt(c.next, D2)}
          </span>
        </div>
      ))}
    </div>
  );
}
