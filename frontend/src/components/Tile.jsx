/**
 * Tile — one cell of the 4×4 grid.
 *
 * States
 * ──────
 * idle      — hidden, clickable
 * correct   — just found the target (green glow, pop)
 * wrong     — wrong tile (red glow, shake)
 * revealed  — already used this round (non-interactive)
 *
 * The number is always visible (per spec: "each showing a unique number").
 * Interaction feedback comes from correctTile / wrongTile position props.
 */
import React, { useEffect, useRef, useState } from 'react'

/**
 * @param {object}   props
 * @param {number}   props.position     - 0-based index (0–15)
 * @param {number}   props.value        - number displayed on this tile
 * @param {boolean}  props.isCorrect    - this tile is the one just guessed correctly
 * @param {boolean}  props.isWrong      - this tile was just guessed wrong
 * @param {boolean}  props.disabled     - game over / paused
 * @param {function} props.onClick      - (position: number) => void
 * @param {number}   props.mountDelay   - stagger delay in ms for pop-in animation
 */
export default function Tile({
  position,
  value,
  isCorrect,
  isWrong,
  disabled,
  onClick,
  mountDelay = 0,
}) {
  const btnRef    = useRef(null)
  const [mounted, setMounted] = useState(false)

  // Staggered mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), mountDelay)
    return () => clearTimeout(t)
  }, [mountDelay])

  // Apply shake/correct animation reactively
  useEffect(() => {
    if (!btnRef.current) return
    const el = btnRef.current

    if (isCorrect) {
      el.classList.remove('animate-tile-shake')
      void el.offsetWidth
      el.classList.add('animate-tile-correct')
      const t = setTimeout(() => el.classList.remove('animate-tile-correct'), 450)
      return () => clearTimeout(t)
    }
    if (isWrong) {
      el.classList.remove('animate-tile-correct')
      void el.offsetWidth
      el.classList.add('animate-tile-shake')
      const t = setTimeout(() => el.classList.remove('animate-tile-shake'), 500)
      return () => clearTimeout(t)
    }
  }, [isCorrect, isWrong])

  // ── Style composition ──────────────────────────────────────────────
  const base = [
    'relative aspect-square rounded-2xl',
    'flex items-center justify-center',
    'font-mono font-bold text-xl select-none no-tap',
    'border transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet',
    // Mount animation
    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
    'transition-[opacity,transform] duration-300',
  ]

  let variant
  if (isCorrect) {
    variant = [
      'bg-emerald/15 border-emerald/60 text-emerald',
      'shadow-tile-correct scale-105',
    ]
  } else if (isWrong) {
    variant = [
      'bg-rose/15 border-rose/50 text-rose',
      'shadow-tile-wrong',
    ]
  } else if (disabled) {
    variant = [
      'bg-surface-700/40 border-white/5 text-white/30',
      'cursor-not-allowed',
    ]
  } else {
    variant = [
      'bg-surface-700/60 border-white/8 text-white/85',
      'shadow-tile-idle',
      'hover:-translate-y-1 hover:shadow-tile-hover hover:border-violet/50 hover:text-white',
      'active:translate-y-0 active:scale-95',
      'cursor-pointer',
    ]
  }

  return (
    <button
      ref={btnRef}
      onClick={() => !disabled && onClick?.(position)}
      disabled={disabled}
      data-tile={position}
      aria-label={`Tile showing ${value}`}
      className={[...base, ...variant].join(' ')}
      style={{ transitionDelay: `${mountDelay}ms` }}
    >
      {value}
    </button>
  )
}
