'use client';

import { Case } from '@/lib/types';
import { D1, D2, fmt } from '@/lib/dates';
import { useStore } from '@/lib/store';

export function StatusTag({ c }: { c: Case }) {
  return c.status === 'decided'
    ? <span className="tag dec">{c.outcome || 'Decided'}</span>
    : <span className="tag">{c.stage || 'Active'}</span>;
}

export default function CaseTable({ list, empty }: { list: Case[]; empty: string }) {
  const { openCase } = useStore();
  if (!list.length) return <p className="mut pad" style={{ margin: 0 }}>{empty}</p>;
  return (
    <table className="tb">
      <thead>
        <tr><th>Case</th><th className="hm">Court</th><th>Status</th><th>Date</th></tr>
      </thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id} tabIndex={0} data-edit={c.id} onClick={() => openCase(c)} onKeyDown={(e) => { if (e.key === 'Enter') openCase(c); }}>
            <td><b>{c.title}</b><small>{c.clientName || 'Client not set'}</small></td>
            <td className="hm">{c.court || '-'}</td>
            <td><StatusTag c={c} /></td>
            <td className="nw">{c.status === 'decided' ? fmt(c.decidedOn, D1) : c.next ? fmt(c.next, D2) : 'Not set'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
