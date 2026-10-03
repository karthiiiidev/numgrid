/**
 * GameOverScreen — end-of-game summary with score, accuracy, best streak,
 * optional confetti burst on new high score, and Play Again / Menu buttons.
 */
import React, { useEffect, useRef } from 'react'

/** Tiny canvas confetti burst — fires once on mount when isNewBest is true. */
function ConfettiBurst() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const COLORS = ['#7c3aed', '#22d3ee', '#10b981', '#f59e0b', '#f43f5e']
    const pieces  = Array.from({ length: 80 }, () => ({
      x:   Math.random() * canvas.width,
      y:   Math.random() * canvas.height * 0.4 - canvas.height * 0.2,
      vx:  (Math.random() - 0.5) * 6,
      vy:  Math.random() * -8 - 4,
      r:   Math.random() * 5 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.3,
    }))

    let raf
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of pieces) {
        p.x   += p.vx
        p.y   += p.vy
        p.vy  += 0.25    // gravity
        p.rot += p.rotV
        p.alpha = Math.max(0, p.alpha - 0.012)
        if (p.alpha > 0) alive = true
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl"
      aria-hidden="true"
    />
  )
}

/**
 * @param {object}   props
 * @param {object}   props.stats       - { score, correct_total, total_guesses, accuracy, best_streak, difficulty }
 * @param {boolean}  props.isNewBest
 * @param {number}   props.bestScore
 * @param {function} props.onPlayAgain
 * @param {function} props.onMenu
 * @param {function} props.onLeaderboard
 */
export default function GameOverScreen({
  stats,
  isNewBest,
  bestScore,
  onPlayAgain,
  onMenu,
  onLeaderboard,
}) {
  const score       = stats?.score        ?? 0
  const accuracy    = stats?.accuracy     ?? 0
  const bestStreak  = stats?.best_streak  ?? 0
  const correct     = stats?.correct_total ?? 0
  const total       = stats?.total_guesses ?? 0
  const difficulty  = stats?.difficulty   ?? 'medium'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
    >
      <div className="relative glass-strong rounded-3xl p-8 w-full max-w-sm shadow-glass animate-slide-down overflow-hidden">

        {/* Confetti overlay */}
        {isNewBest && <ConfettiBurst />}

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={[
            'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl',
            isNewBest
              ? 'bg-amber/15 border border-amber/40 shadow-[0_0_24px_rgba(245,158,11,0.3)] animate-confetti-pop'
              : 'bg-rose/10 border border-rose/30',
          ].join(' ')}>
            {isNewBest ? '🏆' : '💀'}
          </div>
        </div>

        <h2 className="text-2xl font-black text-center text-white mb-1">
          {isNewBest ? 'New Best!' : 'Game Over'}
        </h2>
        <p className="text-center text-white/35 text-sm mb-6 capitalize">
          {difficulty} · {isNewBest ? `You beat your record!` : 'Better luck next time.'}
        </p>

        {/* Score highlight */}
        <div className={[
          'rounded-2xl p-4 mb-4 text-center',
          isNewBest
            ? 'bg-amber/10 border border-amber/30'
            : 'bg-violet/10 border border-violet/25',
        ].join(' ')}>
          <p className="stat-label mb-1">Final Score</p>
          <p className={`text-4xl font-black font-mono tabular-nums ${isNewBest ? 'text-gradient-gold' : 'text-gradient-violet'}`}>
            {score.toLocaleString()}
          </p>
          {isNewBest && (
            <p className="text-xs text-amber/70 mt-1">Previous best: {bestScore.toLocaleString()}</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <StatBox label="Accuracy"    value={`${accuracy}%`}    />
          <StatBox label="Best Streak" value={bestStreak}          />
          <StatBox label="Correct"     value={`${correct}/${total}`} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onPlayAgain} className="btn-primary py-3.5 w-full" autoFocus>
            ↺ Play Again
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onLeaderboard} className="btn-ghost py-3">
              🏆 Board
            </button>
            <button onClick={onMenu} className="btn-ghost py-3">
              ← Menu
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="bg-white/4 rounded-xl p-3 text-center border border-white/6">
      <p className="stat-label">{label}</p>
      <p className="stat-value text-sm text-white/80 mt-0.5">{value}</p>
    </div>
  )
}
