/**
 * PauseScreen — modal overlay shown when the player pauses.
 * Options: Resume, Restart, Quit to Menu.
 */
import React, { useEffect } from 'react'

/**
 * @param {function} props.onResume
 * @param {function} props.onRestart
 * @param {function} props.onQuit
 * @param {number}   props.score
 * @param {number}   props.streak
 */
export default function PauseScreen({ onResume, onRestart, onQuit, score, streak }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onResume() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onResume])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Game paused"
    >
      <div className="glass-strong rounded-3xl p-8 w-full max-w-sm shadow-glass animate-slide-down">

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-violet/15 border border-violet/30 flex items-center justify-center text-2xl shadow-glass-violet">
            ⏸
          </div>
        </div>

        <h2 className="text-2xl font-black text-center text-white mb-1">Paused</h2>
        <p className="text-center text-white/35 text-sm mb-6">Game is waiting for you.</p>

        {/* Quick stats */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <p className="stat-label">Score</p>
            <p className="stat-value text-xl text-violet-light">{(score ?? 0).toLocaleString()}</p>
          </div>
          <div className="w-px bg-white/10" aria-hidden="true" />
          <div className="text-center">
            <p className="stat-label">Streak</p>
            <p className="stat-value text-xl text-cyan">{streak ?? 0}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onResume} className="btn-primary py-3.5 w-full" autoFocus>
            ▶ Resume
          </button>
          <button onClick={onRestart} className="btn-ghost py-3.5 w-full">
            ↺ Restart
          </button>
          <button onClick={onQuit} className="btn-danger py-3.5 w-full">
            ✕ Quit to Menu
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-4">Press Esc to resume</p>
      </div>
    </div>
  )
}
