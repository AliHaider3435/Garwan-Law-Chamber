'use client';

import { Case } from '@/lib/types';
import { D1, D2, fmt } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { extractDistrict } from '@/lib/dsj-districts';
import DsjLink from './DsjLink';

export function StatusTag({ c }: { c: Case }) {
  const displayStage = c.stage === 'Other' && c.stageOther ? c.stageOther : (c.stage || 'Active');
  return c.status === 'decided'
    ? <span className="tag dec">{c.outcome || 'Decided'}</span>
    : <span className="tag">{displayStage}</span>;
}

export default function CaseTable({ list, empty }: { list: Case[]; empty: string }) {
  const { openCase, toast } = useStore();
  if (!list.length) return <p className="mut pad" style={{ margin: 0 }}>{empty}</p>;
  return (
    <div className="tbl-wrap">
    <table className="tb">
      <thead>
        <tr><th>Case</th><th className="hm">Court</th><th>Status</th><th>Date</th><th className="hm">DSJ</th></tr>
      </thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id} tabIndex={0} data-edit={c.id} onClick={() => openCase(c)} onKeyDown={(e) => { if (e.key === 'Enter') openCase(c); }}>
            <td><b>{c.title}</b><small>{c.clientName || 'Client not set'}</small></td>
            <td className="hm">{c.court || '-'}</td>
            <td><StatusTag c={c} /></td>
            <td className="nw">{c.status === 'decided' ? fmt(c.decidedOn, D1) : c.next ? fmt(c.next, D2) : 'Not set'}</td>
            <td className="hm" onClick={(e) => e.stopPropagation()}>
              {c.caseNo ? (
                <DsjLink
                  caseNo={c.caseNo}
                  court={c.court}
                  variant="icon"
                  onCopied={() => {
                    const d = extractDistrict(c.court || '');
                    toast(d
                      ? `Copied ${c.caseNo} — Select "${d}" on DSJ, then paste`
                      : `Case no. ${c.caseNo} copied — paste it in the DSJ search box`
                    );
                  }}
                />
              ) : (
                <span style={{ fontSize: 12, color: 'var(--mut)' }}>No case no.</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
