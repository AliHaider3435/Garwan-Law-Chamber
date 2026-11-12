'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Case, CASE_TYPES, OUTCOMES, STAGES, blankCase } from '@/lib/types';
import { today } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { extractDistrict } from '@/lib/dsj-districts';
import DsjLink from './DsjLink';

export default function CaseDialog() {
  const { dlg, closeCase } = useStore();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (dlg.open && !d.open) d.showModal();
    if (!dlg.open && d.open) d.close();
  }, [dlg.open]);

  return (
    <dialog ref={ref} onClose={closeCase}>
      {dlg.open && <CaseForm key={dlg.c?.id || 'new'} initial={dlg.c} />}
    </dialog>
  );
}

function CaseForm({ initial }: { initial: Case | null }) {
  const { assoc, saveCase, deleteCase, closeCase, toast, currentUser } = useStore();
  const isNew = !initial;
  const isAssociate = currentUser?.role === 'associate';

  const [f, setF] = useState<Case>(() => {
    if (initial) {
      return {
        ...initial,
        typeOther: initial.typeOther ?? '',
        stageOther: initial.stageOther ?? '',
        codeStation: initial.codeStation ?? '',
        district: initial.district ?? '',
        tehsil: initial.tehsil ?? '',
      };
    }
    const b = blankCase();
    if (isAssociate && currentUser.associateId) {
      b.assoc = [currentUser.associateId];
    }
    return b;
  });

  const [armed, setArmed] = useState(false);
  const set = <K extends keyof Case>(k: K, v: Case[K]) => setF((p) => ({ ...p, [k]: v }));

  function setStatus(s: Case['status']) {
    setF((p) => ({
      ...p,
      status: s,
      decidedOn: s === 'decided' ? p.decidedOn || today() : p.decidedOn,
      outcome: s === 'decided' ? p.outcome || OUTCOMES[0] : p.outcome,
    }));
  }

  function toggleAssoc(id: string) {
    if (isAssociate && currentUser?.associateId === id) {
      toast('You cannot remove yourself from your authorized case.');
      return;
    }
    set('assoc', f.assoc.includes(id) ? f.assoc.filter((x) => x !== id) : [...f.assoc, id]);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) { toast('Enter the case title'); return; }
    const c: Case = { ...f };
    if (c.status === 'decided') c.next = '';
    else { c.decidedOn = ''; c.outcome = ''; }
    saveCase(c);
  }

  const input = (label: string, k: keyof Case, type = 'text', ph = '') => (
    <label>{label}
      <input type={type} value={String(f[k] ?? '')} placeholder={ph} onChange={(e) => set(k, e.target.value as never)} />
    </label>
  );
  const select = (label: string, k: keyof Case, options: string[]) => (
    <label>{label}
      <select value={String(f[k] ?? '')} onChange={(e) => set(k, e.target.value as never)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <form onSubmit={submit} id="cf">

      {/* ── Header row: title + stage pill + close button ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{isNew ? 'Add case' : 'Edit case'}</h2>
        </div>
        {/* Stage quick-select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mut)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Stage
            <select
              value={f.stage}
              onChange={(e) => set('stage', e.target.value)}
              style={{
                margin: 0,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid rgba(0,0,0,0.18)',
                borderRadius: 5,
                background: 'var(--card)',
                color: 'var(--ink)',
                cursor: 'pointer',
                minWidth: 130,
              }}
            >
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          {/* Close × button */}
          <button
            type="button"
            onClick={closeCase}
            title="Close"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, flexShrink: 0,
              background: 'none', border: '1px solid rgba(0,0,0,0.14)',
              borderRadius: 6, cursor: 'pointer', color: 'var(--mut)',
              fontSize: 18, lineHeight: 1, transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--card)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--mut)';
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* "Other" free-text field for stage */}
      {f.stage === 'Other' && (
        <label style={{ marginBottom: 14 }}>
          Specify case stage
          <input
            type="text"
            value={f.stageOther ?? ''}
            placeholder="Enter stage description…"
            onChange={(e) => set('stageOther', e.target.value)}
          />
        </label>
      )}

      {/* Case title */}
      {input('Case title', 'title', 'text', 'State v/s ...')}

      {/* Case no. + Court */}
      <div className="g2">{input('Case no.', 'caseNo')}{input('Court', 'court')}</div>

      {/* DSJ link (existing cases only) */}
      {!isNew && f.caseNo && (
        <div style={{ marginBottom: 14, marginTop: -6 }}>
          <DsjLink
            caseNo={f.caseNo}
            court={f.court}
            variant="full"
            onCopied={() => {
              const d = extractDistrict(f.court || '');
              toast(d
                ? `Copied ${f.caseNo} — Select "${d}" on DSJ, then paste`
                : `Case no. ${f.caseNo} copied — paste it in the DSJ search box`
              );
            }}
          />
        </div>
      )}

      {/* Client name + phone */}
      <div className="g2">{input('Client name', 'clientName')}{input('Client phone', 'clientPhone', 'tel', '03xx xxxxxxx')}</div>

      {/* Opposing + Case type */}
      <div className="g2">
        {input('Opposing party', 'opposing')}
        <label>Case type
          <select value={f.type} onChange={(e) => set('type', e.target.value)}>
            {CASE_TYPES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
      </div>

      {/* "Other" free-text field for case type */}
      {f.type === 'Other' && (
        <label>Specify case type
          <input
            type="text"
            value={f.typeOther ?? ''}
            placeholder="Enter case type…"
            onChange={(e) => set('typeOther', e.target.value)}
          />
        </label>
      )}

      {/* District + Tehsil */}
      <div className="g2">{input('District', 'district', 'text', 'e.g. Multan')}{input('Tehsil', 'tehsil', 'text', 'e.g. Multan City')}</div>

      {/* FIR no. + Police Station + Code Station */}
      <div className="g2">{input('FIR no.', 'fir')}{input('Police station', 'station')}</div>
      {input('Station code', 'codeStation', 'text', 'e.g. MLT-01')}

      {/* Sections */}
      {input('Sections', 'sections')}

      {/* Status row (stage moved to header) */}
      <label>Status
        <select value={f.status} onChange={(e) => setStatus(e.target.value as Case['status'])}>
          <option value="active">Active</option>
          <option value="decided">Decided</option>
        </select>
      </label>

      {f.status === 'active'
        ? input('Next hearing', 'next', 'date')
        : <div className="g2">{input('Decision date', 'decidedOn', 'date')}{select('Outcome', 'outcome', OUTCOMES)}</div>}

      {/* Associates */}
      <fieldset>
        <legend className="sm mut">Associates on this case</legend>
        {assoc.length === 0 && <small>Add associates first.</small>}
        {assoc.map((a) => (
          <label key={a.id} className="ck">
            <input
              type="checkbox"
              checked={f.assoc.includes(a.id)}
              disabled={isAssociate && currentUser?.associateId === a.id}
              onChange={() => toggleAssoc(a.id)}
            />
            {a.name}
            {isAssociate && currentUser?.associateId === a.id && ' (You)'}
          </label>
        ))}
      </fieldset>

      {/* Action buttons */}
      <div className="act">
        {!isNew && !isAssociate && (
          <button type="button" className="dng" onClick={() => (armed ? deleteCase(f.id) : setArmed(true))}>
            {armed ? 'Tap again to delete' : 'Delete case'}
          </button>
        )}
        <span />
        <button type="button" className="ghost" onClick={closeCase}>Cancel</button>
        <button className="pri">Save case</button>
      </div>
    </form>
  );
}
