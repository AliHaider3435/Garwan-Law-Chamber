'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import PasswordInput from '@/components/PasswordInput';
import WhatsAppLink from '@/components/WhatsAppLink';
import { LIVE } from '@/lib/backend';

export default function Login() {
  const { ready, authed, users, signIn, signInDemo } = useStore();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const localDemo = !LIVE && process.env.NODE_ENV !== 'production';

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

  return (
    <div className="lg">
      {localDemo ? (
        <div className="pn pp">
          <div className="mono">G</div>
          <h1>Garwan Law Chamber</h1>
          <p className="mut">Local demo mode. Choose a sample account; demo accounts do not use passwords.</p>
          {users.map((user) => (
            <button key={user.id} className="pri" style={{ width: '100%', marginTop: 8 }} onClick={() => signInDemo(user.id)}>
              Continue as {user.name} ({user.role})
            </button>
          ))}
        </div>
      ) : (
        <form className="pn pp" onSubmit={submit}>
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
              placeholder="Username or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </label>

          <label>
            Password
            <PasswordInput
              name="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="Enter password"
              required
            />
          </label>

          {error && <p style={{ color: 'var(--dng)', margin: '0 0 12px', fontSize: 14 }}>{error}</p>}

          <button className="pri" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      )}
      {!localDemo && (
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--mut)' }}>
          <span>Developed by</span>
          <a
            href="https://techagenz.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Tech Agenz - Software Development Agency"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', transition: 'transform 0.18s' }}
          >
            <Image src="/tech-agenz-logo.png" alt="Tech Agenz" width={84} height={56} style={{ width: 84, height: 'auto', display: 'block' }} />
          </a>
        </div>
      )}
      <WhatsAppLink className="whatsapp-login" />
    </div>
  );
}
