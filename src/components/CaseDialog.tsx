'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Case, CASE_TYPES, OUTCOMES, STAGES, blankCase } from '@/lib/types';
import { today } from '@/lib/dates';
import { useStore } from '@/lib/store';

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
    if (initial) return initial;
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
      <h2>{isNew ? 'Add case' : 'Edit case'}</h2>
      {input('Case title', 'title', 'text', 'State v/s ...')}
      <div className="g2">{input('Case no.', 'caseNo')}{input('Court', 'court')}</div>
      <div className="g2">{input('Client name', 'clientName')}{input('Client phone', 'clientPhone', 'tel', '03xx xxxxxxx')}</div>
      <div className="g2">{input('Opposing party', 'opposing')}{select('Case type', 'type', CASE_TYPES)}</div>
      <div className="g2">{input('FIR no.', 'fir')}{input('Police station', 'station')}</div>
      {input('Sections', 'sections')}
      <div className="g2">
        {select('Stage', 'stage', STAGES)}
        <label>Status
          <select value={f.status} onChange={(e) => setStatus(e.target.value as Case['status'])}>
            <option value="active">Active</option>
            <option value="decided">Decided</option>
          </select>
        </label>
      </div>
      {f.status === 'active'
        ? input('Next hearing', 'next', 'date')
        : <div className="g2">{input('Decision date', 'decidedOn', 'date')}{select('Outcome', 'outcome', OUTCOMES)}</div>}
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
