'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import CaseDialog from '@/components/CaseDialog';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

const BASE_NAV = [
  ['/dashboard', 'Dashboard'],
  ['/cases', 'Cases'],
  ['/cause-list', 'Cause list'],
  ['/associates', 'Associates'],
  ['/reminders', 'Reminders'],
] as const;

export default function Shell({ children }: { children: ReactNode }) {
  const { ready, authed, currentUser, signOut, openPassDlg } = useStore();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (ready && !authed) router.replace('/login'); }, [ready, authed, router]);
  useEffect(() => { setOpen(false); }, [path]);

  if (!ready || !authed) return null;

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const navItems = isSuperAdmin
    ? [...BASE_NAV, ['/users', 'Users'] as const]
    : BASE_NAV;

  const title = navItems.find((n) => path.startsWith(n[0]))?.[1] ?? '';

  return (
    <div className="app">
      <aside className={'side' + (open ? ' open' : '')}>
        <div className="br">
          <div className="mono">G</div>
          <b>Garwan Law Chamber</b>
          <small>Advocate, Capital Defence</small>
        </div>
        {navItems.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={'nav' + (path.startsWith(href) ? ' on' : '')}
            style={{ textDecoration: 'none', color: '#ffffff' }}
          >
            {label}
          </Link>
        ))}
        <div className="sf">
          {isSuperAdmin ? (
            <>
              <b>Maher Mehtab Hassan Garwan</b>
              LL.B., University of London
            </>
          ) : (
            <>
              <b>{currentUser?.name || 'Associate Advocate'}</b>
              Associate Advocate, Garwan Chamber
            </>
          )}
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="col">
        <header className="top">
          <button id="menu" aria-label="Open menu" onClick={() => setOpen(true)}>Menu</button>
          <h1>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {currentUser && (
              <span className="sm mut hm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={currentUser.role === 'superadmin' ? 'tag dec' : 'tag'}>
                  {currentUser.role === 'superadmin' ? 'Super Admin' : 'Associate'}
                </span>
                <span>{currentUser.name}</span>
              </span>
            )}
            <button className="ghost sm" onClick={openPassDlg} title="Change your password">
              Change password
            </button>
            <button className="ghost sm" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
      <CaseDialog />
      <ChangePasswordDialog />
    </div>
  );
}
