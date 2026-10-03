/**
 * TargetCard — shows the number the player must find.
 * Displays the target, current round timer, and a streak badge.
 */
import React, { useEffect, useRef } from 'react'
import TimerRing from './TimerRing.jsx'

/** Streak thresholds → badge label & colour */
function streakBadge(streak) {
  if (streak >= 10) return { label: `×3 🔥`, cls: 'bg-amber/20 text-amber border-amber/40' }
  if (streak >= 5)  return { label: `×2 ⚡`, cls: 'bg-violet/20 text-violet-light border-violet/40' }
  if (streak >= 3)  return { label: `×1.5`,  cls: 'bg-cyan/10 text-cyan border-cyan/30' }
  if (streak >= 1)  return { label: `×1`,    cls: 'bg-white/5 text-white/40 border-white/10' }
  return null
}

/**
 * @param {object}  props
 * @param {number}  props.target
 * @param {number}  props.streak
 * @param {number}  props.timeRemaining
 * @param {number}  props.timeLimit
 * @param {boolean} props.active
 * @param {string|null} props.outcome   - 'correct' | 'wrong' | 'timeout' | null
 * @param {number}  props.lastPoints
 */
export default function TargetCard({
  target,
  streak,
  timeRemaining,
  timeLimit,
  active,
  outcome,
  lastPoints,
}) {
  const numRef = useRef(null)

  // Trigger a CSS animation class on the number when outcome changes
  useEffect(() => {
    if (!numRef.current || !outcome) return
    const el = numRef.current
    const cls = outcome === 'correct' ? 'animate-tile-correct' : 'animate-tile-shake'
    el.classList.remove('animate-tile-correct', 'animate-tile-shake')
    void el.offsetWidth // force reflow to restart animation
    el.classList.add(cls)
    const tid = setTimeout(() => el.classList.remove(cls), 500)
    return () => clearTimeout(tid)
  }, [outcome])

  const badge = streakBadge(streak ?? 0)

  return (
    <div className="glass rounded-3xl p-5 flex items-center gap-5" aria-label="Target card">

      {/* Left — target number */}
      <div className="flex-1 min-w-0">
        <p className="stat-label mb-1">Find this number</p>

        <div className="flex items-baseline gap-3 flex-wrap">
          {/* Target number */}
          <span
            ref={numRef}
            className={[
              'font-mono font-black tabular-nums leading-none select-none',
              'text-5xl text-gradient-violet',
              'transition-colors duration-200',
            ].join(' ')}
            aria-label={`Target: ${target}`}
          >
            {target ?? '—'}
          </span>

          {/* Points flash */}
          {outcome === 'correct' && lastPoints > 0 && (
            <span
              key={lastPoints}           // re-mount to restart animation
              className="text-sm font-bold text-emerald animate-score-bump"
              aria-live="polite"
            >
              +{lastPoints.toLocaleString()}
            </span>
          )}

          {/* Timeout flash */}
          {outcome === 'timeout' && (
            <span className="text-sm font-bold text-rose animate-fade-in">
              Time's up!
            </span>
          )}
        </div>

        {/* Streak badge */}
        {badge && (
          <span
            className={[
              'inline-flex items-center mt-2 px-2 py-0.5 rounded-lg',
              'text-xs font-bold border animate-streak-pulse',
              badge.cls,
            ].join(' ')}
            aria-label={`Streak multiplier ${badge.label}`}
          >
            {badge.label} Streak {streak}
          </span>
        )}
      </div>

      {/* Right — timer ring */}
      <TimerRing
        serverRemaining={timeRemaining}
        timeLimit={timeLimit}
        active={active}
      />
    </div>
  )
}
