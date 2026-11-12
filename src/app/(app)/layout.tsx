'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import CaseDialog from '@/components/CaseDialog';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import NotificationBell from '@/components/NotificationBell';
import Image from 'next/image';

const BASE_NAV = [
  ['/dashboard', 'Dashboard'],
  ['/cases', 'Cases'],
  ['/cause-list', 'Cause list'],
  ['/notifications', 'Notifications'],
  ['/associates', 'Associates'],
  ['/reminders', 'Reminders'],
] as const;

function renderNavIcon(href: string) {
  switch (href) {
    case '/dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9"/>
          <rect x="14" y="3" width="7" height="5"/>
          <rect x="14" y="12" width="7" height="9"/>
          <rect x="3" y="16" width="7" height="5"/>
        </svg>
      );
    case '/cases':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case '/cause-list':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      );
    case '/notifications':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      );
    case '/associates':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      );
    case '/reminders':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      );
    case '/users':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      );
    default:
      return null;
  }
}

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
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={'nav' + (path.startsWith(href) ? ' on' : '')}
            >
              {renderNavIcon(href)}
              <span>{label}</span>
            </Link>
          ))}
        </nav>
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
          <div className="top-actions">
            {currentUser && (
              <span className="sm mut hm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={currentUser.role === 'superadmin' ? 'tag dec' : 'tag'}>
                  {currentUser.role === 'superadmin' ? 'Super Admin' : 'Associate'}
                </span>
                <span>{currentUser.name}</span>
              </span>
            )}
            <NotificationBell />
            <button className="ghost sm" onClick={openPassDlg} title="Change your password">
              Change password
            </button>
            <button className="ghost sm" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </header>
        <main>{children}</main>
        <footer className="app-footer">
          <span>Developed by</span>
          <a
            href="https://techagenz.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Tech Agenz - Software Development Agency"
          >
            <Image src="/tech-agenz-logo.png" alt="Tech Agenz" width={92} height={62} priority />
          </a>
        </footer>
      </div>
      <CaseDialog />
      <ChangePasswordDialog />
    </div>
  );
}
