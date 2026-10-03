/**
 * ScorePanel — lives (hearts), score counter, and streak display.
 * Score animates upward when it increases (CSS scoreBump).
 */
import React, { useEffect, useRef, useState } from 'react'

const MAX_LIVES = 3

/** Animated score counter — counts from previous value to next. */
function AnimatedScore({ value }) {
  const [display, setDisplay] = useState(value)
  const prevRef  = useRef(value)
  const rafRef   = useRef(null)

  useEffect(() => {
    const from = prevRef.current
    const to   = value
    prevRef.current = to
    if (from === to) return

    const duration = 400  // ms
    const start    = performance.now()

    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return <>{display.toLocaleString()}</>
}

/**
 * @param {object} props
 * @param {number} props.lives
 * @param {number} props.score
 * @param {number} props.streak
 * @param {number} props.bestScore
 * @param {string} props.difficulty
 */
export default function ScorePanel({ lives, score, streak, bestScore, difficulty }) {
  // Trigger bump animation on score change
  const scoreRef  = useRef(null)
  const prevScore = useRef(score)

  useEffect(() => {
    if (!scoreRef.current || score === prevScore.current) return
    prevScore.current = score
    const el = scoreRef.current
    el.classList.remove('animate-score-bump')
    void el.offsetWidth
    el.classList.add('animate-score-bump')
    const t = setTimeout(() => el.classList.remove('animate-score-bump'), 500)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div className="glass rounded-3xl px-5 py-3 flex items-center justify-between gap-4">

      {/* Lives */}
      <div className="flex flex-col items-center gap-1">
        <span className="stat-label">Lives</span>
        <div className="flex gap-1" role="img" aria-label={`${lives} of ${MAX_LIVES} lives remaining`}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span
              key={i}
              className={[
                'text-xl transition-all duration-300',
                i < lives
                  ? 'opacity-100'
                  : 'opacity-20 grayscale',
              ].join(' ')}
              aria-hidden="true"
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/10" aria-hidden="true" />

      {/* Score */}
      <div className="flex flex-col items-center gap-1">
        <span className="stat-label">Score</span>
        <span
          ref={scoreRef}
          className="stat-value text-xl text-violet-light"
          aria-label={`Score: ${score}`}
        >
          <AnimatedScore value={score} />
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/10" aria-hidden="true" />

      {/* Best */}
      <div className="flex flex-col items-center gap-1">
        <span className="stat-label">Best</span>
        <span className="stat-value text-sm text-amber/90">
          {(bestScore ?? 0).toLocaleString()}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/10" aria-hidden="true" />

      {/* Streak */}
      <div className="flex flex-col items-center gap-1">
        <span className="stat-label">Streak</span>
        <span className="stat-value text-sm text-cyan">
          {streak ?? 0}
        </span>
      </div>

    </div>
  )
}
