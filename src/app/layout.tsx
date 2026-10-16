import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import { Cormorant_Garamond, Source_Serif_4 } from 'next/font/google';
import { StoreProvider } from '@/lib/store';
import './globals.css';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const body = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Garwan Law Chamber - Case Manager',
  description: 'Case management for Advocate Maher Mehtab Hassan Garwan',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', maximumScale: 5 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${body.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
