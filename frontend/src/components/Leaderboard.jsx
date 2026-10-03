/**
 * Leaderboard — top-10 scores fetched from the backend.
 * Optional name submission after a game (submitEntry prop).
 */
import React, { useEffect, useState, useCallback } from 'react'
import { getLeaderboard, submitScore } from '../api/game.js'

const MEDAL = ['🥇', '🥈', '🥉']
const DIFF_COLORS = {
  easy:   'text-emerald bg-emerald/10 border-emerald/25',
  medium: 'text-violet-light bg-violet/10 border-violet/25',
  hard:   'text-rose bg-rose/10 border-rose/30',
}

/**
 * @param {function}  props.onClose
 * @param {object|null} props.pendingEntry  - { score, difficulty, accuracy, best_streak } — set after game over to prompt submission
 * @param {function}  [props.onSubmitted]   - called after a score is submitted
 */
export default function Leaderboard({ onClose, pendingEntry, onSubmitted }) {
  const [entries, setEntries]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [name, setName]             = useState('')
  const [nameError, setNameError]   = useState('')
  const [rank, setRank]             = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getLeaderboard()
      setEntries(data)
    } catch {
      setError('Could not load leaderboard — is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Enter your name.'); return }
    if (trimmed.length > 20) { setNameError('Max 20 characters.'); return }

    setSubmitting(true)
    setNameError('')
    try {
      const res = await submitScore({
        name: trimmed,
        score: pendingEntry.score,
        difficulty: pendingEntry.difficulty,
        accuracy: pendingEntry.accuracy,
        best_streak: pendingEntry.best_streak,
      })
      setEntries(res.leaderboard)
      setRank(res.rank)
      setSubmitted(true)
      onSubmitted?.()
    } catch {
      setNameError('Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Leaderboard"
    >
      <div className="glass-strong rounded-3xl w-full max-w-sm shadow-glass animate-slide-down overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/6">
          <div>
            <h2 className="text-xl font-black text-white">Leaderboard</h2>
            <p className="text-xs text-white/35 mt-0.5">Top 10 all-time scores</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/6 border border-white/8 hover:bg-white/12 text-white/50 hover:text-white flex items-center justify-center transition-all text-sm"
            aria-label="Close leaderboard"
          >
            ✕
          </button>
        </div>

        {/* Score submission form */}
        {pendingEntry && !submitted && (
          <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-white/6 bg-violet/5">
            <p className="text-sm font-semibold text-violet-light mb-3">
              🎉 Submit your score of {pendingEntry.score.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name…"
                maxLength={20}
                autoFocus
                className={[
                  'flex-1 bg-white/6 border rounded-xl px-3 py-2 text-sm text-white placeholder-white/25',
                  'focus:outline-none focus:ring-2 focus:ring-violet/60 transition-all',
                  nameError ? 'border-rose/50' : 'border-white/10',
                ].join(' ')}
                aria-label="Your name for the leaderboard"
              />
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-50"
              >
                {submitting ? '…' : 'Submit'}
              </button>
            </div>
            {nameError && (
              <p className="text-xs text-rose mt-1.5" role="alert">{nameError}</p>
            )}
          </form>
        )}

        {/* Rank feedback */}
        {submitted && rank && (
          <div className="px-6 py-3 border-b border-white/6 bg-emerald/5 text-sm text-emerald">
            ✓ Submitted! You ranked #{rank}.
          </div>
        )}

        {/* Table */}
        <div className="overflow-y-auto max-h-[50vh]">
          {loading && (
            <div className="flex items-center justify-center py-12 text-white/30 text-sm gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading…
            </div>
          )}

          {error && (
            <div className="px-6 py-10 text-center text-sm text-rose/80">{error}</div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-white/30">
              No scores yet. Be the first!
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <table className="w-full text-sm" role="table" aria-label="Top 10 scores">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="stat-label text-left py-2.5 px-6 w-10">#</th>
                  <th className="stat-label text-left py-2.5 px-2">Name</th>
                  <th className="stat-label text-right py-2.5 px-2">Score</th>
                  <th className="stat-label text-center py-2.5 px-4">Diff</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/4 hover:bg-white/3 transition-colors"
                    role="row"
                  >
                    <td className="py-3 px-6 font-bold text-center">
                      {MEDAL[i] ?? <span className="text-white/30 font-mono">{i + 1}</span>}
                    </td>
                    <td className="py-3 px-2 font-medium text-white/80 truncate max-w-[100px]">
                      {e.name}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-violet-light tabular-nums">
                      {e.score.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${DIFF_COLORS[e.difficulty] ?? 'text-white/40'}`}>
                        {e.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/6">
          <button onClick={onClose} className="btn-ghost w-full py-3">
            ← Back
          </button>
        </div>

      </div>
    </div>
  )
}
