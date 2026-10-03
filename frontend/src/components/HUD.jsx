import React from 'react'

export default function HUD({ round, score, bestScore, onPause, onMenu }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 glass border-b border-white/5">

      {/* Left — menu */}
      <button
        onClick={onMenu}
        aria-label="Return to menu"
        className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        Menu
      </button>

      {/* Center — stats */}
      <div className="flex items-center gap-5">
        <Stat label="Round" value={round} />
        <div className="w-px h-6 bg-white/10" aria-hidden="true" />
        <Stat label="Score" value={score?.toLocaleString()} highlight />
        <div className="w-px h-6 bg-white/10" aria-hidden="true" />
        <Stat label="Best" value={bestScore !== null ? bestScore.toLocaleString() : '—'} />
      </div>

      {/* Right — pause */}
      <button
        onClick={onPause}
        aria-label="Pause game"
        className="text-white/40 hover:text-white/80 transition-colors p-1.5 rounded-lg hover:bg-white/5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="currentColor" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      </button>
    </header>
  )
}

function Stat({ label, value, highlight = false }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] uppercase tracking-widest font-semibold text-white/25">{label}</span>
      <span className={`text-sm font-bold font-mono leading-tight tabular-nums ${highlight ? 'text-brand-400' : 'text-white/80'}`}>
        {value}
      </span>
    </div>
  )
}
