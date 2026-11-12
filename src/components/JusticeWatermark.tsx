'use client';

/**
 * Authentic Law & Justice Emblem Watermark
 * Features:
 *  - Classical Scales of Justice with balanced pans
 *  - Pillar of Justice & downward sword of truth
 *  - Laurel wreath of honor
 *  - Open Code of Law at the base
 *  - Double medallion ring with 'LEX ET JUSTITIA' motto
 */
export default function JusticeWatermark() {
  return (
    <div className="justice-watermark" aria-hidden="true">
      <svg
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="justice-svg"
      >
        {/* Outer concentric seal rings */}
        <circle cx="300" cy="300" r="280" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="300" cy="300" r="270" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="300" cy="300" r="236" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="300" cy="300" r="226" stroke="currentColor" strokeWidth="0.8" />

        {/* Circular text along path: LEX ET JUSTITIA • FIAT JUSTITIA */}
        <defs>
          <path id="textCircleTop" d="M 95,300 A 205,205 0 0,1 505,300" fill="none" />
          <path id="textCircleBottom" d="M 505,300 A 205,205 0 0,1 95,300" fill="none" />
        </defs>
        <text
          fontSize="17"
          fontWeight="700"
          letterSpacing="0.32em"
          fill="currentColor"
          fontFamily="var(--serif), Georgia, serif"
        >
          <textPath href="#textCircleTop" startOffset="50%" textAnchor="middle">
            FIAT JUSTITIA RUAT CAELUM
          </textPath>
        </text>
        <text
          fontSize="17"
          fontWeight="700"
          letterSpacing="0.32em"
          fill="currentColor"
          fontFamily="var(--serif), Georgia, serif"
        >
          <textPath href="#textCircleBottom" startOffset="50%" textAnchor="middle">
            • LEX • AEQUITAS • JUSTITIA •
          </textPath>
        </text>

        {/* Decorative Stars on Ring */}
        <polygon points="300,68 304,78 314,79 306,86 309,96 300,90 291,96 294,86 286,79 296,78" fill="currentColor" />
        <polygon points="300,532 304,522 314,521 306,514 309,504 300,510 291,504 294,514 286,521 296,522" fill="currentColor" />
        <polygon points="68,300 78,296 79,286 86,294 96,291 90,300 96,309 86,306 79,314 78,304" fill="currentColor" />
        <polygon points="532,300 522,296 521,286 514,294 504,291 510,300 504,309 514,306 521,314 522,304" fill="currentColor" />

        {/* Inner seal circle */}
        <circle cx="300" cy="300" r="190" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" />

        {/* ── Laurel Wreath (Left & Right) ── */}
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          {/* Left branch */}
          <path d="M 210,430 C 160,370 155,270 200,200" />
          <path d="M 190,410 C 170,410 165,395 178,390 C 190,385 195,400 190,410 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 172,375 C 152,370 150,355 163,350 C 176,346 180,362 172,375 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 160,335 C 142,328 143,312 157,310 C 170,308 171,324 160,335 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 158,290 C 142,282 145,268 159,268 C 173,268 171,282 158,290 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 168,245 C 154,235 160,220 174,224 C 187,227 182,242 168,245 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 190,210 C 178,198 186,186 200,192 C 212,198 204,212 190,210 Z" fill="currentColor" fillOpacity="0.2" />

          {/* Right branch */}
          <path d="M 390,430 C 440,370 445,270 400,200" />
          <path d="M 410,410 C 430,410 435,395 422,390 C 410,385 405,400 410,410 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 428,375 C 448,370 450,355 437,350 C 424,346 420,362 428,375 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 440,335 C 458,328 457,312 443,310 C 430,308 429,324 440,335 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 442,290 C 458,282 455,268 441,268 C 427,268 429,282 442,290 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 432,245 C 446,235 440,220 426,224 C 413,227 418,242 432,245 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M 410,210 C 422,198 414,186 400,192 C 388,198 396,212 410,210 Z" fill="currentColor" fillOpacity="0.2" />
        </g>

        {/* ── Central Sword of Justice (Vertical Axis) ── */}
        <g stroke="currentColor" strokeWidth="2" fill="none">
          {/* Pommel */}
          <circle cx="300" cy="120" r="8" fill="currentColor" fillOpacity="0.4" />
          {/* Grip */}
          <line x1="300" y1="128" x2="300" y2="155" strokeWidth="4" />
          {/* Guard */}
          <path d="M 270,155 Q 300,160 330,155" strokeWidth="4" strokeLinecap="round" />
          <circle cx="270" cy="155" r="3" fill="currentColor" />
          <circle cx="330" cy="155" r="3" fill="currentColor" />
          {/* Blade */}
          <path d="M 296,160 L 296,415 L 300,432 L 304,415 L 304,160 Z" fill="currentColor" fillOpacity="0.15" strokeWidth="1.5" />
          {/* Fuller line */}
          <line x1="300" y1="165" x2="300" y2="400" strokeWidth="1" strokeDasharray="3 3" />
        </g>

        {/* ── Scales of Justice Crossbeam & Fulcrum ── */}
        <g stroke="currentColor" strokeWidth="2" fill="none">
          {/* Top finial / ring */}
          <circle cx="300" cy="178" r="9" strokeWidth="2.5" fill="currentColor" fillOpacity="0.25" />
          <circle cx="300" cy="178" r="3" fill="currentColor" />

          {/* Central needle/indicator */}
          <path d="M 300,178 L 300,212" strokeWidth="2.5" strokeLinecap="round" />

          {/* Horizontal Balance Beam */}
          <path
            d="M 180,198 Q 240,192 300,192 Q 360,192 420,198"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Beam accents */}
          <circle cx="180" cy="198" r="4.5" fill="currentColor" />
          <circle cx="420" cy="198" r="4.5" fill="currentColor" />
          <line x1="240" y1="193" x2="240" y2="199" strokeWidth="2" />
          <line x1="360" y1="193" x2="360" y2="199" strokeWidth="2" />

          {/* ── Left Scale Pan ── */}
          {/* Triple Suspension cords */}
          <line x1="180" y1="198" x2="152" y2="295" strokeWidth="1.2" />
          <line x1="180" y1="198" x2="180" y2="295" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="180" y1="198" x2="208" y2="295" strokeWidth="1.2" />
          {/* Pan bowl */}
          <path
            d="M 148,295 C 148,322 212,322 212,295 Z"
            strokeWidth="2.5"
            fill="currentColor"
            fillOpacity="0.25"
          />
          <line x1="144" y1="295" x2="216" y2="295" strokeWidth="2.5" strokeLinecap="round" />

          {/* ── Right Scale Pan ── */}
          {/* Triple Suspension cords */}
          <line x1="420" y1="198" x2="392" y2="295" strokeWidth="1.2" />
          <line x1="420" y1="198" x2="420" y2="295" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="420" y1="198" x2="448" y2="295" strokeWidth="1.2" />
          {/* Pan bowl */}
          <path
            d="M 388,295 C 388,322 452,322 452,295 Z"
            strokeWidth="2.5"
            fill="currentColor"
            fillOpacity="0.25"
          />
          <line x1="384" y1="295" x2="456" y2="295" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* ── Base: Law Book & Pillar Foundation ── */}
        <g stroke="currentColor" strokeWidth="2" fill="none">
          {/* Pedestal steps */}
          <rect x="250" y="432" width="100" height="9" rx="2" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
          <rect x="235" y="441" width="130" height="11" rx="2" strokeWidth="2.5" fill="currentColor" fillOpacity="0.3" />

          {/* Open Book of Law (Code of Justice) */}
          <path
            d="M 300,432 C 285,422 250,422 230,428 L 230,441 C 250,435 285,435 300,442 C 315,435 350,435 370,441 L 370,428 C 350,422 315,422 300,432 Z"
            strokeWidth="2"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <line x1="300" y1="432" x2="300" y2="442" strokeWidth="2" />
          {/* Page text lines */}
          <line x1="244" y1="431" x2="288" y2="428" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="244" y1="435" x2="288" y2="432" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="312" y1="428" x2="356" y2="431" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="312" y1="432" x2="356" y2="435" strokeWidth="1" strokeDasharray="2 2" />
        </g>
      </svg>
    </div>
  );
}
