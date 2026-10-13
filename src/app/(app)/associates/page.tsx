'use client';

import { FormEvent } from 'react';
import { useStore } from '@/lib/store';

export default function Associates() {
  const { assoc, addAssociate, removeAssociate, currentUser } = useStore();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    addAssociate(String(fd.get('name')).trim(), String(fd.get('phone')).trim());
    form.reset();
  }

  return (
    <>
      {isSuperAdmin && (
        <form className="pn pp" onSubmit={submit}>
          <h2>Add associate</h2>
          <div className="g2" style={{ marginTop: 12 }}>
            <label>Name<input name="name" required placeholder="Adv. ..." /></label>
            <label>Phone<input name="phone" type="tel" placeholder="03xx xxxxxxx" /></label>
          </div>
          <button className="pri">Add associate</button>
        </form>
      )}

      <div className="pn">
        <h2>Chamber Associates ({assoc.length})</h2>
        {assoc.map((a) => (
          <div className="row" key={a.id}>
            <span>
              <b>{a.name}</b>
              {currentUser?.associateId === a.id && <span className="tag" style={{ marginLeft: 8 }}>You</span>}
              <small>{a.phone || 'No phone number'}</small>
            </span>
            {isSuperAdmin && (
              <button className="ghost sm" onClick={() => removeAssociate(a.id)}>Remove</button>
            )}
          </div>
        ))}
        {!assoc.length && <p className="mut pad" style={{ margin: 0 }}>No associates yet.</p>}
      </div>
    </>
  );
}
