'use client';

import { extractDistrict } from '@/lib/dsj-districts';

const DSJ_URL = 'https://dsj.punjab.gov.pk/';

interface DsjLinkProps {
  caseNo: string;
  court?: string;              // used to auto-detect Punjab district
  variant?: 'icon' | 'full';  // icon = compact icon button, full = labelled button
  onCopied?: () => void;
}

export default function DsjLink({ caseNo, court = '', variant = 'full', onCopied }: DsjLinkProps) {
  if (!caseNo?.trim()) return null;

  const district = extractDistrict(court);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation(); // prevent row click / dialog close
    try {
      await navigator.clipboard.writeText(caseNo.trim());
      onCopied?.();
    } catch {
      // clipboard not available — just open the site
    }
    window.open(DSJ_URL, '_blank', 'noopener,noreferrer');
  }

  /* ── Icon variant (table row) ── */
  if (variant === 'icon') {
    const tooltip = district
      ? `DSJ Punjab → ➊ Select district: ${district} → ➋ Paste: ${caseNo}`
      : `Open DSJ Punjab portal (case no. ${caseNo} copied)`;

    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltip}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: '1px solid rgba(0,0,0,0.18)',
          borderRadius: 4,
          padding: '3px 8px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--card)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'none';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)';
        }}
      >
        {/* Scales of justice SVG */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L2 7l10 4 10-4-10-4z"/>
          <path d="M2 17l10 4 10-4"/>
          <path d="M2 12l10 4 10-4"/>
        </svg>
        DSJ
        {district && (
          <span style={{
            marginLeft: 2,
            padding: '1px 5px',
            background: 'rgba(0,0,0,0.07)',
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}>
            {district}
          </span>
        )}
      </button>
    );
  }

  /* ── Full variant (case dialog) ── */
  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: 'linear-gradient(180deg, #16161a 0%, #060608 100%)',
          border: '1px solid #000',
          borderRadius: 6,
          padding: '9px 18px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          color: '#ffffff',
          whiteSpace: 'nowrap',
          boxShadow: '0 3px 12px rgba(0,0,0,0.14)',
          transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(0,0,0,0.22)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 3px 12px rgba(0,0,0,0.14)';
        }}
      >
        {/* Scales of justice icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L2 7l10 4 10-4-10-4z"/>
          <path d="M2 17l10 4 10-4"/>
          <path d="M2 12l10 4 10-4"/>
        </svg>
        Open on DSJ Punjab
        {/* External link icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>

      {/* District + paste hint */}
      {district ? (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 6,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 16px',
          alignItems: 'center',
          fontSize: 12.5,
          color: 'var(--mut)',
          lineHeight: 1.5,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              background: 'var(--ink)',
              color: 'var(--card)',
              borderRadius: '50%',
              fontSize: 10,
              fontWeight: 800,
              flexShrink: 0,
            }}>1</span>
            Select district:&nbsp;<strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{district}</strong>
          </span>
          <span style={{ color: 'rgba(0,0,0,0.2)', fontSize: 16, lineHeight: 1 }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              background: 'var(--ink)',
              color: 'var(--card)',
              borderRadius: '50%',
              fontSize: 10,
              fontWeight: 800,
              flexShrink: 0,
            }}>2</span>
            Paste case no.:&nbsp;<strong style={{ color: 'var(--ink)', fontWeight: 700, fontFamily: 'monospace' }}>{caseNo}</strong>
          </span>
        </div>
      ) : court ? (
        <p style={{ marginTop: 7, fontSize: 11.5, color: 'var(--mut)', lineHeight: 1.4 }}>
          💡 Add a district name to the court field (e.g. &ldquo;Sessions Court, Multan&rdquo;) for auto-detection.
        </p>
      ) : null}
    </div>
  );
}
