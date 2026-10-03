/**
 * useSound — tiny Web Audio API synthesiser.
 * Generates all sounds procedurally (no audio files needed).
 * Respects a global mute state stored in localStorage.
 */
import { useCallback, useRef, useState } from 'react'

/** Shared AudioContext — created lazily on first interaction. */
let _ctx = null
function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  // Resume if suspended (browser autoplay policy)
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

/**
 * Low-level tone helper.
 * @param {AudioContext} ctx
 * @param {number} freq      - frequency in Hz
 * @param {number} duration  - seconds
 * @param {string} type      - OscillatorType
 * @param {number} gain      - 0..1
 * @param {number} [delay=0] - start offset in seconds
 */
function tone(ctx, freq, duration, type = 'sine', gain = 0.18, delay = 0) {
  const osc = ctx.createOscillator()
  const vol = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)

  vol.gain.setValueAtTime(0, ctx.currentTime + delay)
  vol.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
  vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration)

  osc.connect(vol)
  vol.connect(ctx.destination)

  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + duration + 0.05)
}

/** Pre-built sound recipes. */
const SOUNDS = {
  correct() {
    const ctx = getCtx()
    tone(ctx, 523, 0.12, 'sine', 0.2)       // C5
    tone(ctx, 659, 0.12, 'sine', 0.2, 0.12) // E5
    tone(ctx, 784, 0.18, 'sine', 0.2, 0.24) // G5
  },
  wrong() {
    const ctx = getCtx()
    tone(ctx, 220, 0.08, 'sawtooth', 0.15)
    tone(ctx, 180, 0.14, 'sawtooth', 0.12, 0.08)
  },
  streak() {
    const ctx = getCtx()
    // Ascending arpeggio
    ;[523, 659, 784, 1047].forEach((f, i) =>
      tone(ctx, f, 0.1, 'sine', 0.18, i * 0.07)
    )
  },
  tick() {
    const ctx = getCtx()
    tone(ctx, 880, 0.04, 'square', 0.06)
  },
  timeout() {
    const ctx = getCtx()
    tone(ctx, 300, 0.08, 'sawtooth', 0.2)
    tone(ctx, 220, 0.16, 'sawtooth', 0.2, 0.08)
    tone(ctx, 150, 0.24, 'sawtooth', 0.18, 0.2)
  },
  gameOver() {
    const ctx = getCtx()
    ;[440, 392, 349, 294].forEach((f, i) =>
      tone(ctx, f, 0.22, 'sine', 0.2, i * 0.18)
    )
  },
  highScore() {
    const ctx = getCtx()
    ;[523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(ctx, f, 0.14, 'sine', 0.2, i * 0.08)
    )
  },
  click() {
    const ctx = getCtx()
    tone(ctx, 660, 0.05, 'sine', 0.1)
  },
}

export function useSound() {
  const [muted, setMuted] = useState(
    () => localStorage.getItem('numgrid_muted') === 'true'
  )

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      localStorage.setItem('numgrid_muted', String(next))
      return next
    })
  }, [])

  const play = useCallback(
    (name) => {
      if (muted) return
      try {
        SOUNDS[name]?.()
      } catch {
        // Web Audio can fail in certain browser/OS combos — fail silently
      }
    },
    [muted]
  )

  return { muted, toggleMute, play }
}
