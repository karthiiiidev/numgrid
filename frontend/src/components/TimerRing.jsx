/**
 * TimerRing — animated SVG countdown ring.
 * Colour transitions: cyan → amber → rose as time runs out.
 * Accepts the output of useCountdown directly.
 */
import React from 'react'
import { useCountdown } from '../hooks/useCountdown.js'

const R          = 30           // SVG circle radius
const STROKE     = 5            // stroke width
const SIZE       = (R + STROKE) * 2   // viewBox / element size = 70
const CIRC       = 2 * Math.PI * R    // full circumference ≈ 188.5

/** Map phase → colour tokens */
const PHASE_COLORS = {
  normal:   { stroke: '#22d3ee', glow: 'rgba(34,211,238,0.45)',  text: 'text-cyan' },
  warning:  { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.45)',  text: 'text-amber' },
  critical: { stroke: '#f43f5e', glow: 'rgba(244,63,94,0.45)',   text: 'text-rose' },
}

/**
 * @param {object}  props
 * @param {number}  props.serverRemaining  - seconds from server state
 * @param {number}  props.timeLimit        - total seconds for this round
 * @param {boolean} props.active           - whether the countdown is running
 * @param {string}  [props.className]      - extra wrapper classes
 */
export default function TimerRing({ serverRemaining, timeLimit, active, className = '' }) {
  const { remaining, pct, phase } = useCountdown(serverRemaining, timeLimit, active)
  const { stroke, glow, text }    = PHASE_COLORS[phase]

  // Dash offset: full circle when pct=1, empty when pct=0
  const dashOffset = CIRC * (1 - pct)

  const secs = Math.ceil(remaining)

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: SIZE, height: SIZE }}
      role="timer"
      aria-label={`${secs} second${secs !== 1 ? 's' : ''} remaining`}
      aria-live="polite"
    >
      {/* SVG ring */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track (background circle) */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE}
        />

        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.25s linear, stroke 0.4s ease',
            filter: `drop-shadow(0 0 6px ${glow})`,
          }}
        />
      </svg>

      {/* Digit overlay */}
      <span
        className={[
          'absolute font-mono font-bold tabular-nums leading-none',
          'text-lg transition-colors duration-300',
          text,
          phase === 'critical' ? 'animate-timer-tick' : '',
        ].join(' ')}
        aria-hidden="true"
      >
        {secs}
      </span>
    </div>
  )
}
