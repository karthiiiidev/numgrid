/**
 * useCountdown
 * ─────────────
 * Drives the visual timer from timeRemaining / timeLimit props.
 * Runs its own requestAnimationFrame loop for smooth SVG ring updates.
 * The authoritative time comes from the server; this hook only
 * interpolates locally between server polls to avoid choppy animation.
 */
import { useEffect, useRef, useState } from 'react'

/**
 * @param {number} serverRemaining  - seconds remaining as reported by the server
 * @param {number} timeLimit        - total seconds for this round
 * @param {boolean} active          - false when paused or game over
 * @returns {{ remaining: number, pct: number, phase: 'normal'|'warning'|'critical' }}
 */
export function useCountdown(serverRemaining, timeLimit, active) {
  const [remaining, setRemaining] = useState(serverRemaining ?? timeLimit)
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)   // timestamp of last rAF
  const localRef  = useRef(remaining) // local float for smooth interpolation

  // Sync local value whenever server sends a new reading
  useEffect(() => {
    if (serverRemaining != null) {
      localRef.current = serverRemaining
      setRemaining(serverRemaining)
    }
  }, [serverRemaining])

  // rAF loop — counts down locally until next server sync
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      lastRef.current = null
      return
    }

    const tick = (ts) => {
      if (lastRef.current != null) {
        const delta = (ts - lastRef.current) / 1000
        localRef.current = Math.max(0, localRef.current - delta)
        setRemaining(localRef.current)
      }
      lastRef.current = ts
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastRef.current = null
    }
  }, [active])

  const safe   = Math.max(0, remaining)
  const pct    = timeLimit > 0 ? safe / timeLimit : 0
  const phase  =
    pct <= 0.2  ? 'critical'
    : pct <= 0.5 ? 'warning'
    : 'normal'

  return { remaining: safe, pct, phase }
}
