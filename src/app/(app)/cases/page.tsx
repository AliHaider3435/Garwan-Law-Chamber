'use client';

import { useState } from 'react';
import CaseTable from '@/components/CaseTable';
import { useStore } from '@/lib/store';

type Filter = 'all' | 'active' | 'decided';

export default function Cases() {
  const { visibleCases, openCase, currentUser } = useStore();
  const [flt, setFlt] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const count = (s: Filter) => (s === 'all' ? visibleCases.length : visibleCases.filter((c) => c.status === s).length);
  const s = q.toLowerCase();
  const list = visibleCases.filter(
    (c) =>
      (flt === 'all' || c.status === flt) &&
      (!s || [c.title, c.court, c.clientName, c.caseNo, c.fir].join(' ').toLowerCase().includes(s)),
  );

  return (
    <>
      {currentUser?.role === 'associate' && (
        <div className="note" style={{ borderColor: 'var(--navy2)', background: 'var(--tag)' }}>
          Showing cases where <b>{currentUser.name}</b> is assigned. Other chamber cases are restricted.
        </div>
      )}

      <div className="bar">
        <input
          type="search"
          placeholder="Search by title, court or client"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ margin: 0 }}
        />
        <button className="pri" onClick={() => openCase(null)}>Add case</button>
      </div>
      <div className="tabs">
        {(['all', 'active', 'decided'] as Filter[]).map((k) => (
          <button key={k} className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>
            {k[0].toUpperCase() + k.slice(1)} ({count(k)})
          </button>
        ))}
      </div>
      <div className="pn">
        <CaseTable list={list} empty="No cases match. Use Add case to create one." />
      </div>
    </>
  );
}
