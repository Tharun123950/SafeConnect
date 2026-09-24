import React from 'react';

/**
 * SafeConnectAuthBackground
 * Dedicated futuristic background visual ONLY for Login and Signup pages.
 * Features:
 * - Holographic security shield
 * - Connected user nodes & network topology
 * - AI neural protection pathways & data pulses
 * - Ambient violet lighting & cyber grid
 * Pure SVG + lightweight CSS animations with pointer-events: none.
 */
export default function SafeConnectAuthBackground() {
  return (
    <div className="safeconnect-auth-bg" aria-hidden="true">
      {/* Ambient background glows */}
      <div className="sc-bg-ambient-orb sc-orb-top" />
      <div className="sc-bg-ambient-orb sc-orb-bottom-left" />
      <div className="sc-bg-ambient-orb sc-orb-bottom-right" />

      <svg
        className="sc-bg-svg"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Violet Gradient Conduits */}
          <linearGradient id="scVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="scShieldGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="scCyanVioletGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.5" />
          </linearGradient>

          <radialGradient id="scCenterAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#4c1d95" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0f0728" stopOpacity="0" />
          </radialGradient>

          {/* Glow Filters */}
          <filter id="scGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="scSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Subtle Grid Pattern */}
          <pattern id="scCyberGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(168, 85, 247, 0.05)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.2" fill="rgba(168, 85, 247, 0.18)" />
          </pattern>
        </defs>

        {/* 1. Cyber Grid Matrix */}
        <rect width="100%" height="100%" fill="url(#scCyberGrid)" />

        {/* 2. Central Aura Behind Card */}
        <circle cx="720" cy="450" r="480" fill="url(#scCenterAura)" />

        {/* 3. Radar & Safety Concentric Rings */}
        <g className="sc-rotate-slow" style={{ transformOrigin: '720px 450px' }}>
          <circle cx="720" cy="450" r="320" stroke="rgba(168, 85, 247, 0.12)" strokeWidth="1.2" strokeDasharray="6 8" />
          <circle cx="720" cy="450" r="420" stroke="rgba(139, 92, 246, 0.08)" strokeWidth="1" strokeDasharray="16 12 4 12" />
          <circle cx="720" cy="450" r="540" stroke="rgba(192, 132, 252, 0.06)" strokeWidth="1" strokeDasharray="8 14" />
        </g>

        <g className="sc-rotate-reverse" style={{ transformOrigin: '720px 450px' }}>
          <circle cx="720" cy="450" r="360" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" strokeDasharray="12 18" />
          <circle cx="720" cy="450" r="480" stroke="rgba(168, 85, 247, 0.09)" strokeWidth="1.2" strokeDasharray="20 16 6 16" />
        </g>

        {/* 4. Central Holographic Security Shield (Holo-HUD) */}
        <g className="sc-pulse-shield" style={{ transformOrigin: '720px 430px' }}>
          {/* Outer Shield Contour */}
          <path
            d="M720 220 C790 220 860 240 880 270 C880 370 840 480 720 540 C600 480 560 370 560 270 C580 240 650 220 720 220 Z"
            fill="url(#scShieldGrad)"
            stroke="url(#scVioletGrad)"
            strokeWidth="2"
            filter="url(#scGlow)"
          />
          {/* Inner Shield Contour */}
          <path
            d="M720 250 C770 250 820 265 835 288 C835 365 805 450 720 498 C635 450 605 365 605 288 C620 265 670 250 720 250 Z"
            fill="none"
            stroke="rgba(192, 132, 252, 0.3)"
            strokeWidth="1.2"
            strokeDasharray="10 6"
          />

          {/* Central SafeConnect Shield Emblem */}
          <g transform="translate(680, 310) scale(0.8)">
            <circle cx="50" cy="50" r="46" fill="rgba(17, 10, 38, 0.6)" stroke="#c084fc" strokeWidth="2.5" filter="url(#scGlow)" />
            <path
              fill="url(#scCyanVioletGrad)"
              d="M51.4 72.4c-.66.85-2.02.38-2.02-.7V61.4a2.26 2.26 0 0 0-2.26-2.26H35.8c-.92 0-1.46-1.04-.92-1.79l7.48-10.47c1.07-1.5 0-3.58-1.84-3.58H26.7c-.92 0-1.46-1.04-.92-1.79l9.7-13.56c.21-.3.56-.47.92-.47h28.9c.92 0 1.46 1.04.92 1.78l-7.48 10.48c-1.07 1.5 0 3.58 1.84 3.58h11.38c.94 0 1.47 1.08.89 1.83L51.4 72.4z"
            />
          </g>

          {/* HUD Target Brackets around Shield */}
          <path d="M 520 240 L 500 240 L 500 260" stroke="#a855f7" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M 920 240 L 940 240 L 940 260" stroke="#a855f7" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M 500 520 L 500 540 L 520 540" stroke="#a855f7" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M 940 520 L 940 540 L 920 540" stroke="#a855f7" strokeWidth="2" fill="none" opacity="0.6" />
        </g>

        {/* 5. Connected User & Network Topology Lines */}
        <g className="sc-data-network">
          {/* Left Network Channels */}
          <path d="M 220 240 Q 420 260 560 300" stroke="url(#scVioletGrad)" strokeWidth="1.5" strokeDasharray="8 6" className="sc-stream-1" />
          <path d="M 160 580 Q 380 520 600 460" stroke="url(#scVioletGrad)" strokeWidth="1.5" strokeDasharray="8 6" className="sc-stream-2" />
          <path d="M 220 240 L 160 580" stroke="rgba(139, 92, 246, 0.18)" strokeWidth="1" strokeDasharray="4 6" />
          <path d="M 320 120 L 220 240" stroke="rgba(168, 85, 247, 0.22)" strokeWidth="1.2" />
          <path d="M 320 120 Q 520 160 680 230" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.2" strokeDasharray="6 8" />

          {/* Right Network Channels */}
          <path d="M 1220 240 Q 1020 260 880 300" stroke="url(#scVioletGrad)" strokeWidth="1.5" strokeDasharray="8 6" className="sc-stream-1" />
          <path d="M 1280 580 Q 1060 520 840 460" stroke="url(#scVioletGrad)" strokeWidth="1.5" strokeDasharray="8 6" className="sc-stream-2" />
          <path d="M 1220 240 L 1280 580" stroke="rgba(139, 92, 246, 0.18)" strokeWidth="1" strokeDasharray="4 6" />
          <path d="M 1120 120 L 1220 240" stroke="rgba(168, 85, 247, 0.22)" strokeWidth="1.2" />
          <path d="M 1120 120 Q 920 160 760 230" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.2" strokeDasharray="6 8" />

          {/* Bottom Defense Grid Channels */}
          <path d="M 420 740 Q 570 660 720 540" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1.2" strokeDasharray="6 8" />
          <path d="M 1020 740 Q 870 660 720 540" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1.2" strokeDasharray="6 8" />
          <path d="M 420 740 L 1020 740" stroke="rgba(139, 92, 246, 0.15)" strokeWidth="1" strokeDasharray="10 10" />
        </g>

        {/* 6. Interconnected Network Nodes */}
        {/* Node 1: Left User Node */}
        <g transform="translate(220, 240)">
          <circle cx="0" cy="0" r="24" fill="rgba(18, 12, 36, 0.85)" stroke="#a855f7" strokeWidth="1.8" filter="url(#scGlow)" />
          <circle cx="0" cy="0" r="14" fill="rgba(168, 85, 247, 0.2)" />
          {/* User Icon */}
          <circle cx="0" cy="-3" r="4.5" fill="#c084fc" />
          <path d="M -7 8 C -7 4 7 4 7 8" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="32" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" strokeDasharray="4 4" className="sc-rotate-slow" />
          <text x="32" y="4" fill="#c084fc" fontSize="10" fontFamily="monospace" letterSpacing="1" opacity="0.75">USER NODE A</text>
        </g>

        {/* Node 2: Top-Left AI Sentinel Node */}
        <g transform="translate(320, 120)">
          <circle cx="0" cy="0" r="20" fill="rgba(18, 12, 36, 0.85)" stroke="#38bdf8" strokeWidth="1.8" filter="url(#scGlow)" />
          <circle cx="0" cy="0" r="6" fill="#38bdf8" />
          <circle cx="0" cy="0" r="28" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" strokeDasharray="5 3" className="sc-rotate-reverse" />
          <text x="32" y="4" fill="#38bdf8" fontSize="10" fontFamily="monospace" letterSpacing="1" opacity="0.8">AI MODERATION SENTINEL</text>
        </g>

        {/* Node 3: Bottom-Left Connected User Node */}
        <g transform="translate(160, 580)">
          <circle cx="0" cy="0" r="22" fill="rgba(18, 12, 36, 0.85)" stroke="#8b5cf6" strokeWidth="1.8" filter="url(#scGlow)" />
          <circle cx="0" cy="0" r="12" fill="rgba(139, 92, 246, 0.2)" />
          <circle cx="0" cy="-2" r="4" fill="#a855f7" />
          <path d="M -6 7 C -6 3 6 3 6 7" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
          <text x="28" y="4" fill="#a855f7" fontSize="10" fontFamily="monospace" letterSpacing="1" opacity="0.75">USER NODE B</text>
        </g>

        {/* Node 4: Top-Right Shield Gateway */}
        <g transform="translate(1120, 120)">
          <circle cx="0" cy="0" r="20" fill="rgba(18, 12, 36, 0.85)" stroke="#38bdf8" strokeWidth="1.8" filter="url(#scGlow)" />
          <circle cx="0" cy="0" r="6" fill="#38bdf8" />
          <circle cx="0" cy="0" r="28" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" strokeDasharray="5 3" className="sc-rotate-slow" />
          <text x="-155" y="4" fill="#38bdf8" fontSize="10" fontFamily="monospace" letterSpacing="1" opacity="0.8">SECURE SHIELD GATEWAY</text>
        </g>

        {/* Node 5: Right User Node */}
        <g transform="translate(1220, 240)">
          <circle cx="0" cy="0" r="24" fill="rgba(18, 12, 36, 0.85)" stroke="#a855f7" strokeWidth="1.8" filter="url(#scGlow)" />
          <circle cx="0" cy="0" r="14" fill="rgba(168, 85, 247, 0.2)" />
          <circle cx="0" cy="-3" r="4.5" fill="#c084fc" />
          <path d="M -7 8 C -7 4 7 4 7 8" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="32" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" strokeDasharray="4 4" className="sc-rotate-reverse" />
          <text x="-105" y="4" fill="#c084fc" fontSize="10" fontFamily="monospace" letterSpacing="1" opacity="0.75">USER NODE C</text>
        </g>

        {/* Node 6: Bottom-Right Connected User Node */}
        <g transform="translate(1280, 580)">
          <circle cx="0" cy="0" r="22" fill="rgba(18, 12, 36, 0.85)" stroke="#8b5cf6" strokeWidth="1.8" filter="url(#scGlow)" />
          <circle cx="0" cy="0" r="12" fill="rgba(139, 92, 246, 0.2)" />
          <circle cx="0" cy="-2" r="4" fill="#a855f7" />
          <path d="M -6 7 C -6 3 6 3 6 7" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
          <text x="-105" y="4" fill="#a855f7" fontSize="10" fontFamily="monospace" letterSpacing="1" opacity="0.75">USER NODE D</text>
        </g>

        {/* Node 7: Bottom Filter Node Left */}
        <g transform="translate(420, 740)">
          <circle cx="0" cy="0" r="16" fill="rgba(18, 12, 36, 0.85)" stroke="#c084fc" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#c084fc" />
          <text x="24" y="4" fill="#c084fc" fontSize="9" fontFamily="monospace" letterSpacing="1" opacity="0.7">ACTIVE DEFENSE MESH</text>
        </g>

        {/* Node 8: Bottom Filter Node Right */}
        <g transform="translate(1020, 740)">
          <circle cx="0" cy="0" r="16" fill="rgba(18, 12, 36, 0.85)" stroke="#c084fc" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#c084fc" />
          <text x="-135" y="4" fill="#c084fc" fontSize="9" fontFamily="monospace" letterSpacing="1" opacity="0.7">ENCRYPTED PIPELINE</text>
        </g>

        {/* 7. Floating AI Particle Clusters */}
        <g className="sc-particles">
          <circle cx="480" cy="280" r="2.5" fill="#38bdf8" opacity="0.7" className="sc-float-1" />
          <circle cx="530" cy="380" r="2" fill="#c084fc" opacity="0.6" className="sc-float-2" />
          <circle cx="950" cy="270" r="2.5" fill="#38bdf8" opacity="0.7" className="sc-float-1" />
          <circle cx="910" cy="390" r="2" fill="#c084fc" opacity="0.6" className="sc-float-3" />
          <circle cx="680" cy="620" r="2.2" fill="#a855f7" opacity="0.65" className="sc-float-2" />
          <circle cx="760" cy="620" r="2.2" fill="#38bdf8" opacity="0.65" className="sc-float-3" />
          <circle cx="280" cy="460" r="1.8" fill="#8b5cf6" opacity="0.5" className="sc-float-1" />
          <circle cx="1160" cy="460" r="1.8" fill="#8b5cf6" opacity="0.5" className="sc-float-2" />
        </g>

        {/* 8. Futuristic Status HUD Legends */}
        <g opacity="0.65">
          <text x="50" y="860" fill="#a855f7" fontSize="11" fontFamily="monospace" letterSpacing="2">
            SAFECONNECT // PROTOCOL: AI_INTEGRITY_SHIELD_V4
          </text>
          <text x="1080" y="860" fill="#a855f7" fontSize="11" fontFamily="monospace" letterSpacing="2">
            STATUS: ACTIVE // ZERO_TOLERANCE_ABUSE
          </text>
        </g>
      </svg>
    </div>
  );
}
