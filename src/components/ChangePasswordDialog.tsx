'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import PasswordInput from './PasswordInput';

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

    if (newPass.trim().length < 8 || newPass.length > 256) {
      setError('Password must be 8-256 characters long.');
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
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, borderBottom: '2px solid var(--navy)', paddingBottom: 10 }}>
            <div>
              <h2 style={{ margin: 0 }}>Change password</h2>
              <small style={{ color: 'var(--mut)' }}>
                Logged in as: <b>{currentUser.name}</b> (@{currentUser.username})
              </small>
            </div>
            <button
              type="button"
              onClick={closePassDlg}
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

          <label>
            Current password
            <PasswordInput
              value={currentPass}
              onChange={setCurrentPass}
              autoComplete="current-password"
              placeholder="Enter current password"
              required
            />
          </label>

          <label>
            New password
            <PasswordInput
              value={newPass}
              onChange={setNewPass}
              autoComplete="new-password"
              placeholder="Enter new password (min 8 characters)"
              required
              minLength={8}
              maxLength={256}
            />
          </label>

          <label>
            Confirm new password
            <PasswordInput
              value={confirmPass}
              onChange={setConfirmPass}
              autoComplete="new-password"
              placeholder="Re-type new password"
              required
            />
          </label>

          {/* Strength hint */}
          {newPass.length > 0 && (
            <div style={{ marginTop: -6 }}>
              <StrengthBar password={newPass} />
            </div>
          )}

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

function StrengthBar({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['', '#888', '#888', '#555', '#222', '#000'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            height: 4,
            flex: 1,
            borderRadius: 2,
            background: i <= score ? colors[score] : 'rgba(0,0,0,0.1)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score] || 'var(--mut)', fontWeight: 600, minWidth: 60 }}>
        {labels[score] || ''}
      </span>
    </div>
  );
}
