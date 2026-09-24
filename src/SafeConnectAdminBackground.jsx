import React from 'react';

/**
 * SafeConnectAdminBackground
 * Dedicated cybersecurity / admin security-control themed background visual.
 * Strictly used ONLY on the Admin Login page.
 * Features:
 * - Central AI Security Core & Cyber Fortress Shield
 * - Real-time Threat Analysis waveform & telemetry
 * - System Architecture & Network Control monitoring nodes
 * - Slow radar security sweep & polar coordinate grid
 * - Futuristic SOC (Security Operations Center) aesthetic in deep violet & indigo
 * Pure SVG + lightweight CSS animations with pointer-events: none.
 */
export default function SafeConnectAdminBackground() {
  return (
    <div className="safeconnect-admin-bg" aria-hidden="true">
      {/* Ambient background glows tailored for Admin Security */}
      <div className="sc-admin-ambient-orb sc-admin-orb-center" />
      <div className="sc-admin-ambient-orb sc-admin-orb-left" />
      <div className="sc-admin-ambient-orb sc-admin-orb-right" />

      <svg
        className="sc-admin-bg-svg"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Admin Deep Violet Gradients */}
          <linearGradient id="scAdminVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="scAdminShieldGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#6d28d9" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#1e1035" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="scAdminPanelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(24, 12, 48, 0.75)" />
            <stop offset="100%" stopColor="rgba(12, 6, 26, 0.85)" />
          </linearGradient>

          <linearGradient id="scAdminRadarBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.35)" />
            <stop offset="60%" stopColor="rgba(139, 92, 246, 0.08)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
          </linearGradient>

          <radialGradient id="scAdminCoreAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="45%" stopColor="#581c87" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0a0418" stopOpacity="0" />
          </radialGradient>

          {/* Glow Filters */}
          <filter id="scAdminGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="scAdminIntenseGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Polar & Matrix Grid Patterns */}
          <pattern id="scAdminMatrixGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(168, 85, 247, 0.04)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1" fill="rgba(192, 132, 252, 0.14)" />
          </pattern>
        </defs>

        {/* 1. Underlying Cyber Matrix Grid */}
        <rect width="100%" height="100%" fill="url(#scAdminMatrixGrid)" />

        {/* 2. Central Core Aura Behind Login Card */}
        <circle cx="720" cy="450" r="520" fill="url(#scAdminCoreAura)" />

        {/* 3. Slow Radar Security Sweep Scan */}
        <g className="sc-admin-radar-scan" style={{ transformOrigin: '720px 450px' }}>
          <path
            d="M720 450 L1150 200 A480 480 0 0 0 720 -30 Z"
            fill="url(#scAdminRadarBeam)"
          />
        </g>

        {/* 4. Polar Security Coordinates & Concentric Telemetry Rings */}
        <g style={{ transformOrigin: '720px 450px' }}>
          <circle cx="720" cy="450" r="280" stroke="rgba(168, 85, 247, 0.16)" strokeWidth="1.2" strokeDasharray="4 6" />
          <circle cx="720" cy="450" r="380" stroke="rgba(139, 92, 246, 0.12)" strokeWidth="1" strokeDasharray="12 8" />
          <circle cx="720" cy="450" r="480" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1.2" strokeDasharray="20 10 4 10" />
          <circle cx="720" cy="450" r="580" stroke="rgba(168, 85, 247, 0.06)" strokeWidth="1" />

          {/* Coordinate Axis Lines */}
          <line x1="140" y1="450" x2="1300" y2="450" stroke="rgba(168, 85, 247, 0.08)" strokeWidth="1" strokeDasharray="6 8" />
          <line x1="720" y1="80" x2="720" y2="820" stroke="rgba(168, 85, 247, 0.08)" strokeWidth="1" strokeDasharray="6 8" />
          <line x1="310" y1="140" x2="1130" y2="760" stroke="rgba(168, 85, 247, 0.05)" strokeWidth="1" strokeDasharray="4 8" />
          <line x1="310" y1="760" x2="1130" y2="140" stroke="rgba(168, 85, 247, 0.05)" strokeWidth="1" strokeDasharray="4 8" />
        </g>

        {/* Rotating Concentric Tick Ring */}
        <g className="sc-admin-rotate-ticks" style={{ transformOrigin: '720px 450px' }}>
          <circle cx="720" cy="450" r="340" stroke="rgba(192, 132, 252, 0.18)" strokeWidth="1.5" strokeDasharray="2 18" />
          {/* Degree Markers */}
          <text x="720" y="95" fill="#a855f7" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">000° SEC_N</text>
          <text x="1085" y="454" fill="#a855f7" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">090° SEC_E</text>
          <text x="720" y="805" fill="#a855f7" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">180° SEC_S</text>
          <text x="355" y="454" fill="#a855f7" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.6">270° SEC_W</text>
        </g>

        {/* 5. Central Holographic Security Shield (Administrative Fortress) */}
        <g className="sc-admin-shield-pulse" style={{ transformOrigin: '720px 440px' }}>
          {/* Outer Cyber Fortress Shield */}
          <path
            d="M720 180 C820 180 910 210 930 250 C930 400 870 540 720 620 C570 540 510 400 510 250 C530 210 620 180 720 180 Z"
            fill="url(#scAdminShieldGrad)"
            stroke="url(#scAdminVioletGrad)"
            strokeWidth="2.2"
            filter="url(#scAdminGlow)"
          />

          {/* Inner Hex-Armor Shield Facet */}
          <path
            d="M720 210 C800 210 870 232 888 268 C888 385 840 500 720 570 C600 500 552 385 552 268 C570 232 640 210 720 210 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.3)"
            strokeWidth="1.2"
            strokeDasharray="8 6"
          />

          {/* Central AI Security Core Ring */}
          <circle cx="720" cy="380" r="48" fill="rgba(15, 8, 32, 0.7)" stroke="#c084fc" strokeWidth="2" filter="url(#scAdminGlow)" />
          <circle cx="720" cy="380" r="36" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1.5" strokeDasharray="6 4" className="sc-admin-rotate-ticks" style={{ transformOrigin: '720px 380px' }} />
          <circle cx="720" cy="380" r="16" fill="rgba(168, 85, 247, 0.3)" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="720" cy="380" r="6" fill="#38bdf8" filter="url(#scAdminIntenseGlow)" />

          {/* High-Tech Tactical Corner Reticles */}
          <path d="M 460 210 L 430 210 L 430 240" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.75" />
          <path d="M 980 210 L 1010 210 L 1010 240" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.75" />
          <path d="M 430 580 L 430 610 L 460 610" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.75" />
          <path d="M 1010 580 L 1010 610 L 980 610" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.75" />
        </g>

        {/* 6. LEFT COMMAND WING: Threat Analysis & AI Moderation Monitoring */}
        <g transform="translate(60, 200)">
          {/* Telemetry Panel Backdrop */}
          <rect width="360" height="280" rx="8" fill="url(#scAdminPanelGrad)" stroke="rgba(168, 85, 247, 0.28)" strokeWidth="1.2" />
          <path d="M 0 0 L 24 0 L 0 24 Z" fill="rgba(168, 85, 247, 0.4)" />
          <path d="M 336 280 L 360 280 L 360 256 Z" fill="rgba(56, 189, 248, 0.4)" />

          {/* Panel Header */}
          <text x="18" y="28" fill="#c084fc" fontSize="11" fontFamily="monospace" fontWeight="700" letterSpacing="1.5">
            [AI_SENTINEL // THREAT_MONITOR]
          </text>
          <circle cx="338" cy="24" r="4" fill="#38bdf8" filter="url(#scAdminGlow)" />
          <line x1="18" y1="38" x2="342" y2="38" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />

          {/* Threat Spectrum Waveform (Dynamic Oscilloscope Path) */}
          <g transform="translate(18, 55)">
            <rect width="324" height="60" rx="4" fill="rgba(10, 5, 22, 0.6)" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="1" />
            <path
              d="M 10 30 Q 30 10 50 30 T 90 30 T 130 10 T 150 48 T 170 12 T 190 40 T 220 30 T 260 22 T 290 35 T 314 30"
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.8"
              className="sc-admin-wave"
              filter="url(#scAdminGlow)"
            />
            <path
              d="M 10 30 Q 30 20 60 30 T 110 30 T 145 20 T 165 38 T 185 22 T 210 30 T 250 28 T 280 30 T 314 30"
              fill="none"
              stroke="rgba(56, 189, 248, 0.65)"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text x="12" y="16" fill="#a78bfa" fontSize="8" fontFamily="monospace" opacity="0.8">SPECTRUM_SCAN: REAL_TIME_STREAM</text>
          </g>

          {/* Security Telemetry Status Bars */}
          <g transform="translate(18, 136)">
            {/* Bar 1: Abuse Detection Engine */}
            <text x="0" y="10" fill="#f8fafc" fontSize="9" fontFamily="monospace" letterSpacing="1">AI TEXT MODERATION</text>
            <text x="324" y="10" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="end">99.8% ONLINE</text>
            <rect x="0" y="16" width="324" height="6" rx="3" fill="rgba(30, 16, 60, 0.8)" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
            <rect x="0" y="16" width="310" height="6" rx="3" fill="url(#scAdminVioletGrad)" filter="url(#scAdminGlow)" />

            {/* Bar 2: Vision & OCR Filter */}
            <text x="0" y="42" fill="#f8fafc" fontSize="9" fontFamily="monospace" letterSpacing="1">VISION & OCR SCANNER</text>
            <text x="324" y="42" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="end">ACTIVE</text>
            <rect x="0" y="48" width="324" height="6" rx="3" fill="rgba(30, 16, 60, 0.8)" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
            <rect x="0" y="48" width="285" height="6" rx="3" fill="#8b5cf6" />

            {/* Bar 3: Synthetic / Deepfake Guard */}
            <text x="0" y="74" fill="#f8fafc" fontSize="9" fontFamily="monospace" letterSpacing="1">SYNTHETIC DETECTOR</text>
            <text x="324" y="74" fill="#a78bfa" fontSize="9" fontFamily="monospace" textAnchor="end">ARMED</text>
            <rect x="0" y="80" width="324" height="6" rx="3" fill="rgba(30, 16, 60, 0.8)" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
            <rect x="0" y="80" width="295" height="6" rx="3" fill="#a855f7" />

            {/* Footer Telemetry Tags */}
            <text x="0" y="112" fill="#7c6f96" fontSize="8" fontFamily="monospace">
              STATUS: ZERO_TOLERANCE // ANOMALIES: 0 DETECTED
            </text>
          </g>

          {/* Connection Line Leading Towards Center Core */}
          <path d="M 360 140 Q 420 140 490 230" stroke="url(#scAdminVioletGrad)" strokeWidth="1.5" strokeDasharray="6 4" className="sc-admin-stream" />
        </g>

        {/* 7. RIGHT COMMAND WING: System Control & Network Defense Architecture */}
        <g transform="translate(1020, 200)">
          {/* Telemetry Panel Backdrop */}
          <rect width="360" height="280" rx="8" fill="url(#scAdminPanelGrad)" stroke="rgba(168, 85, 247, 0.28)" strokeWidth="1.2" />
          <path d="M 336 0 L 360 0 L 360 24 Z" fill="rgba(56, 189, 248, 0.4)" />
          <path d="M 0 280 L 24 280 L 0 256 Z" fill="rgba(168, 85, 247, 0.4)" />

          {/* Panel Header */}
          <text x="18" y="28" fill="#c084fc" fontSize="11" fontFamily="monospace" fontWeight="700" letterSpacing="1.5">
            [SYS_CONTROL // INFRASTRUCTURE]
          </text>
          <circle cx="338" cy="24" r="4" fill="#a855f7" filter="url(#scAdminGlow)" />
          <line x1="18" y1="38" x2="342" y2="38" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />

          {/* Network Architecture Node Topology Diagram */}
          <g transform="translate(24, 55)">
            {/* Connection Paths */}
            <path d="M 30 35 L 90 15 L 170 35 L 250 15" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M 90 15 L 90 65 L 170 35" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1.2" />
            <path d="M 170 35 L 250 65" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Architecture Node 1: Admin Gateway */}
            <g transform="translate(30, 35)">
              <circle cx="0" cy="0" r="14" fill="#1b0c36" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="5" fill="#38bdf8" />
              <text x="0" y="24" fill="#a78bfa" fontSize="8" fontFamily="monospace" textAnchor="middle">GATEWAY</text>
            </g>

            {/* Architecture Node 2: Firewall Cluster */}
            <g transform="translate(90, 15)">
              <circle cx="0" cy="0" r="12" fill="#1b0c36" stroke="#a855f7" strokeWidth="1.5" />
              <rect x="-4" y="-4" width="8" height="8" fill="#a855f7" />
              <text x="0" y="22" fill="#c084fc" fontSize="8" fontFamily="monospace" textAnchor="middle">FW_ALPHA</text>
            </g>

            {/* Architecture Node 3: AI Inference Engine */}
            <g transform="translate(170, 35)">
              <circle cx="0" cy="0" r="16" fill="#1b0c36" stroke="#c084fc" strokeWidth="2" filter="url(#scAdminGlow)" />
              <circle cx="0" cy="0" r="7" fill="#38bdf8" />
              <text x="0" y="26" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="700">AI_CORE</text>
            </g>

            {/* Architecture Node 4: DB Encrypted Vault */}
            <g transform="translate(250, 15)">
              <circle cx="0" cy="0" r="12" fill="#1b0c36" stroke="#a855f7" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="4" fill="#a855f7" />
              <text x="0" y="22" fill="#c084fc" fontSize="8" fontFamily="monospace" textAnchor="middle">DB_VAULT</text>
            </g>

            {/* Architecture Node 5: Audit Log Node */}
            <g transform="translate(90, 65)">
              <circle cx="0" cy="0" r="10" fill="#1b0c36" stroke="#8b5cf6" strokeWidth="1.2" />
              <text x="0" y="19" fill="#7c6f96" fontSize="7" fontFamily="monospace" textAnchor="middle">AUDIT_LOG</text>
            </g>

            {/* Architecture Node 6: Incident Sentinel */}
            <g transform="translate(250, 65)">
              <circle cx="0" cy="0" r="10" fill="#1b0c36" stroke="#8b5cf6" strokeWidth="1.2" />
              <text x="0" y="19" fill="#7c6f96" fontSize="7" fontFamily="monospace" textAnchor="middle">SENTINEL</text>
            </g>
          </g>

          {/* System Telemetry Metrics */}
          <g transform="translate(18, 170)">
            <line x1="0" y1="0" x2="324" y2="0" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
            <text x="0" y="20" fill="#a78bfa" fontSize="9" fontFamily="monospace">AUTHENTICATION:</text>
            <text x="324" y="20" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="end">SHA-256 / JWT SECURE</text>

            <text x="0" y="40" fill="#a78bfa" fontSize="9" fontFamily="monospace">FIREWALL INTEGRITY:</text>
            <text x="324" y="40" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="end">100% OPERATIONAL</text>

            <text x="0" y="60" fill="#a78bfa" fontSize="9" fontFamily="monospace">DATASET RULES IN MEMORY:</text>
            <text x="324" y="60" fill="#c084fc" fontSize="9" fontFamily="monospace" textAnchor="end">REAL-TIME SYNCED</text>

            <text x="0" y="80" fill="#7c6f96" fontSize="8" fontFamily="monospace">
              CLEARANCE: ROOT_ADMINISTRATOR // ISOLATION: ACTIVE
            </text>
          </g>

          {/* Connection Line Leading Towards Center Core */}
          <path d="M 0 140 Q -60 140 -130 230" stroke="url(#scAdminVioletGrad)" strokeWidth="1.5" strokeDasharray="6 4" className="sc-admin-stream" />
        </g>

        {/* 8. Top & Bottom HUD Framing Legends */}
        <g opacity="0.7">
          <text x="60" y="70" fill="#a855f7" fontSize="11" fontFamily="monospace" letterSpacing="2">
            SAFECONNECT // ADMIN_CONTROL_CENTER // SEC_PROTOCOL_V4.2
          </text>
          <text x="1380" y="70" fill="#38bdf8" fontSize="11" fontFamily="monospace" letterSpacing="2" textAnchor="end">
            SECURITY_LEVEL: MAXIMUM // ACCESS_CONTROL_ON
          </text>

          <text x="60" y="850" fill="#7c6f96" fontSize="10" fontFamily="monospace" letterSpacing="1.5">
            MEMORY_HASH: 0x8F9A...B312 // REAL_TIME_ANOMALY_WATCHDOG: ENGAGED
          </text>
          <text x="1380" y="850" fill="#7c6f96" fontSize="10" fontFamily="monospace" letterSpacing="1.5" textAnchor="end">
            INCIDENT_RESPONSE_READY // ZERO_TOLERANCE_ABUSE_AI
          </text>
        </g>
      </svg>
    </div>
  );
}
