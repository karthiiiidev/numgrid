/**
 * StartScreen — landing page with difficulty picker, best score, and rules.
 */
import React from 'react'

const DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Easy',
    icon: '🌱',
    time: '10s',
    numbers: '1 – 16',
    penalty: '−1 life / miss',
    desc: 'Generous timer, standard grid.',
    accent: 'border-emerald/40 hover:border-emerald/70',
    active: 'border-emerald/70 bg-emerald/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    dot: 'bg-emerald',
  },
  {
    id: 'medium',
    label: 'Medium',
    icon: '⚡',
    time: '6s',
    numbers: '1 – 16',
    penalty: '−1 life / miss',
    desc: 'Tighter timer. Think fast.',
    accent: 'border-violet/40 hover:border-violet/70',
    active: 'border-violet/70 bg-violet/10 shadow-[0_0_20px_rgba(124,58,237,0.25)]',
    dot: 'bg-violet',
  },
  {
    id: 'hard',
    label: 'Hard',
    icon: '🔥',
    time: '3s',
    numbers: '1 – 99',
    penalty: '−1 life / miss',
    desc: 'Tiny timer, 99 numbers on 16 tiles.',
    accent: 'border-rose/40 hover:border-rose/70',
    active: 'border-rose/70 bg-rose/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    dot: 'bg-rose',
  },
]

const RULES = [
  { icon: '🎯', title: 'Find the target', body: 'A number is shown — tap the matching tile before time runs out.' },
  { icon: '🔥', title: 'Build a streak', body: 'Consecutive correct answers multiply your score: ×1 → ×1.5 → ×2 → ×3.' },
  { icon: '⏱', title: 'Speed bonus', body: 'Finding the tile quickly earns a time bonus on top of the base 100 pts.' },
  { icon: '❤️', title: 'Three lives', body: 'Wrong guess or timeout costs one life. Lose all three and it\'s game over.' },
]

/**
 * @param {object}   props
 * @param {string}   props.difficulty
 * @param {function} props.setDifficulty
 * @param {function} props.onStart        - (difficulty) => void
 * @param {boolean}  props.isLoading
 * @param {string|null} props.error
 * @param {number}   props.bestScore
 * @param {function} props.onLeaderboard  - open leaderboard screen
 */
export default function StartScreen({
  difficulty,
  setDifficulty,
  onStart,
  isLoading,
  error,
  bestScore,
  onLeaderboard,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md animate-fade-up">

        {/* ── Brand ──────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet/15 border border-violet/30 mb-4 text-3xl shadow-glass-violet">
            ⬡
          </div>
          <h1 className="text-5xl font-black tracking-tight text-gradient-violet mb-1">
            NumGrid
          </h1>
          <p className="text-white/35 text-sm font-medium tracking-widest uppercase">
            4 × 4 · Number Guessing
          </p>

          {/* Best score badge */}
          {bestScore > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/10 border border-amber/25 text-xs text-amber/90">
              <span>🏆</span>
              Personal best: <strong>{bestScore.toLocaleString()}</strong>
            </div>
          )}
        </div>

        {/* ── Difficulty ──────────────────────────── */}
        <div className="mb-5">
          <p className="stat-label mb-3">Select difficulty</p>
          <div className="grid grid-cols-3 gap-2.5">
            {DIFFICULTIES.map((d) => {
              const isActive = difficulty === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  aria-pressed={isActive}
                  className={[
                    'relative flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl',
                    'border text-center transition-all duration-200 no-tap',
                    'bg-surface-700/50',
                    isActive ? d.active : `border-white/8 ${d.accent}`,
                  ].join(' ')}
                >
                  {/* Active dot */}
                  {isActive && (
                    <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${d.dot}`} />
                  )}
                  <span className="text-2xl" role="img" aria-hidden="true">{d.icon}</span>
                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-white/60'}`}>
                    {d.label}
                  </span>
                  <span className="text-[10px] text-white/35 font-mono leading-tight">
                    {d.time} · {d.numbers}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Selected difficulty description */}
          <p className="text-xs text-white/35 mt-2.5 text-center min-h-[1rem]">
            {DIFFICULTIES.find(d => d.id === difficulty)?.desc}
          </p>
        </div>

        {/* ── How to play ──────────────────────────── */}
        <div className="glass rounded-2xl p-4 mb-5 space-y-3">
          {RULES.map((r) => (
            <div key={r.title} className="flex items-start gap-3">
              <span className="text-base mt-0.5 shrink-0" aria-hidden="true">{r.icon}</span>
              <div>
                <p className="text-xs font-semibold text-white/80">{r.title}</p>
                <p className="text-[11px] text-white/35 leading-relaxed mt-0.5">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Error ─────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 rounded-xl bg-rose/10 border border-rose/30 text-sm text-rose flex items-start gap-2"
          >
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Actions ───────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onStart(difficulty)}
            disabled={isLoading}
            className="btn-primary py-4 text-base w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Connecting…
              </>
            ) : (
              <>
                Start Game
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          <button onClick={onLeaderboard} className="btn-ghost w-full">
            🏆 Leaderboard
          </button>
        </div>

      </div>
    </div>
  )
}
