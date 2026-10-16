'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';

export default function ChangePasswordDialog() {
  const { passDlgOpen, closePassDlg, currentUser, changePassword, toast } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (passDlgOpen && !d.open) {
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setError('');
      d.showModal();
    }
    if (!passDlgOpen && d.open) {
      d.close();
    }
  }, [passDlgOpen]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPass.trim().length < 12 || newPass.length > 256) {
      setError('Password must be 12-256 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('New passwords do not match.');
      return;
    }

    setBusy(true);
    const err = await changePassword(newPass, currentPass);
    setBusy(false);

    if (err) {
      setError(err);
    } else {
      toast('Your password has been changed successfully.');
      closePassDlg();
    }
  }

  if (!currentUser) return null;

  return (
    <dialog ref={ref} onClose={closePassDlg} style={{ maxWidth: 460 }}>
      {passDlgOpen && (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderBottom: '2px solid var(--navy)', paddingBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Change password</h2>
            <small style={{ color: 'var(--mut)' }}>
              Logged in as: <b>{currentUser.name}</b> (@{currentUser.username})
            </small>
          </div>

          <label>
            Current password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Enter current password"
            />
          </label>

          <label>
            New password
            <input
              type="password"
              required
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Enter new password (12-256 characters)"
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-type new password"
            />
          </label>

          {error && (
            <p style={{ color: 'var(--dng)', margin: 0, fontSize: 14 }}>
              {error}
            </p>
          )}

          <div className="act" style={{ marginTop: 10 }}>
            <button type="button" className="ghost" onClick={closePassDlg}>
              Cancel
            </button>
            <span />
            <button className="pri" disabled={busy}>
              {busy ? 'Saving...' : 'Update password'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
