'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function Login() {
  const { ready, authed, signIn } = useStore();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && authed) router.replace('/dashboard');
  }, [ready, authed, router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const err = await signIn(identifier, password);
    setBusy(false);
    if (err) setError(err);
  }

  function fillCreds(u: string, p: string) {
    setIdentifier(u);
    setPassword(p);
    setError('');
  }

  return (
    <div className="lg">
      <form className="pn" onSubmit={submit}>
        <div className="mono">G</div>
        <h1>Garwan Law Chamber</h1>
        <p className="mut" style={{ marginTop: 0 }}>
          Case manager for Advocate Maher Mehtab Hassan Garwan
        </p>

        <label>
          Username or Email
          <input
            name="identifier"
            type="text"
            required
            autoComplete="username"
            placeholder="superadmin or admin@garwanlaw.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p style={{ color: 'var(--dng)', margin: '0 0 12px', fontSize: 14 }}>{error}</p>}

        <button className="pri" disabled={busy} style={{ width: '100%', marginBottom: 14 }}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>

        {/* Demo Credentials Box */}
        <div
          style={{
            marginTop: 10,
            padding: 12,
            border: '1px dashed var(--brass)',
            background: 'var(--bg)',
            borderRadius: 2,
            fontSize: 13,
          }}
        >
          <b style={{ display: 'block', marginBottom: 6, color: 'var(--bur)' }}>Quick Login Accounts:</b>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              className="ghost sm"
              style={{ textAlign: 'left', padding: '5px 8px', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => fillCreds('superadmin', 'admin123')}
            >
              <span>👑 <b>Super Admin:</b> superadmin</span>
              <span className="sm mut">Pass: admin123</span>
            </button>
            <button
              type="button"
              className="ghost sm"
              style={{ textAlign: 'left', padding: '5px 8px', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => fillCreds('usman', 'usman123')}
            >
              <span>⚖️ <b>Associate:</b> usman</span>
              <span className="sm mut">Pass: usman123</span>
            </button>
            <button
              type="button"
              className="ghost sm"
              style={{ textAlign: 'left', padding: '5px 8px', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => fillCreds('hina', 'hina123')}
            >
              <span>⚖️ <b>Associate:</b> hina</span>
              <span className="sm mut">Pass: hina123</span>
            </button>
          </div>
          <small className="mut" style={{ marginTop: 8, display: 'block' }}>
            Click any account above to pre-fill credentials and test authorization.
          </small>
        </div>
      </form>
    </div>
  );
}
