/**
 * App.jsx — root component and screen router for NumGrid.
 *
 * Layout
 * ──────
 * Mobile  (< 640 px): single column, max-w-md centred card
 * Desktop (≥ 640 px): two-column split — stats panel left, grid right
 *
 * Keyboard support
 * ────────────────
 * 1–9         → guess tile at position 0–8
 * Shift+1–7   → guess tile at position 9–15  (mapped via shift key)
 * Arrow keys  → navigate a highlighted tile (focus ring)
 * Enter/Space → confirm the focused tile
 * Escape      → pause / close overlay
 * M           → toggle mute
 * P           → pause / resume
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useGame }        from './hooks/useGame.js'
import { useSound }       from './hooks/useSound.js'
import StartScreen        from './components/StartScreen.jsx'
import TargetCard         from './components/TargetCard.jsx'
import ScorePanel         from './components/ScorePanel.jsx'
import Grid               from './components/Grid.jsx'
import PauseScreen        from './components/PauseScreen.jsx'
import GameOverScreen     from './components/GameOverScreen.jsx'
import Leaderboard        from './components/Leaderboard.jsx'

// ---------------------------------------------------------------------------
// Keyboard → tile position mapping
// Keys 1-9 map to positions 0-8; Q,W,E,R,A,S,D map to positions 9-15
// ---------------------------------------------------------------------------
const KEY_MAP = {
  '1': 0,  '2': 1,  '3': 2,  '4': 3,
  '5': 4,  '6': 5,  '7': 6,  '8': 7,
  '9': 8,  'q': 9,  'w': 10, 'e': 11,
  'r': 12, 'a': 13, 's': 14, 'd': 15,
}

export default function App() {
  // ── Sound ──────────────────────────────────────────────────────────
  const { muted, toggleMute, play } = useSound()

  // ── Game state ─────────────────────────────────────────────────────
  const {
    state,
    screen,
    difficulty,
    outcome,
    lastPoints,
    shakeGrid,
    wrongTile,
    correctTile,
    bestScore,
    isNewBest,
    isLoading,
    error,
    setDifficulty,
    setScreen,
    startGame,
    guess,
    pause,
    resume,
    restart,
    quit,
    clearError,
  } = useGame({ onSound: play })

  // ── Leaderboard overlay ────────────────────────────────────────────
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // pendingEntry is set when game over so the leaderboard can offer submission
  const [pendingEntry, setPendingEntry] = useState(null)

  // Expose pending entry when transitioning to gameover
  useEffect(() => {
    if (screen === 'gameover' && state) {
      setPendingEntry({
        score:       state.score,
        difficulty:  state.difficulty,
        accuracy:    state.total_guesses > 0
                       ? parseFloat(((state.correct_total / state.total_guesses) * 100).toFixed(1))
                       : 0,
        best_streak: state.best_streak,
      })
    }
  }, [screen, state])

  // ── Keyboard handler ───────────────────────────────────────────────
  const focusedTile = useRef(0)  // for arrow-key navigation

  const handleKey = useCallback((e) => {
    // Never intercept when typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    const key = e.key.toLowerCase()

    // Global shortcuts
    if (key === 'm') { play('click'); toggleMute(); return }
    if (key === 'escape') {
      if (showLeaderboard) { setShowLeaderboard(false); return }
      if (screen === 'playing') { pause(); return }
      if (screen === 'paused')  { resume(); return }
      return
    }
    if (key === 'p' && screen === 'playing') { pause(); return }
    if (key === 'p' && screen === 'paused')  { resume(); return }

    // Tile guessing (only while playing, no overlay)
    if (screen !== 'playing' || showLeaderboard) return

    const position = KEY_MAP[key]
    if (position !== undefined) {
      e.preventDefault()
      guess(position)
      focusedTile.current = position
      return
    }

    // Arrow key navigation
    if (['arrowleft','arrowright','arrowup','arrowdown'].includes(key)) {
      e.preventDefault()
      const col  = focusedTile.current % 4
      const row  = Math.floor(focusedTile.current / 4)
      let nRow = row, nCol = col
      if (key === 'arrowleft')  nCol = Math.max(0, col - 1)
      if (key === 'arrowright') nCol = Math.min(3, col + 1)
      if (key === 'arrowup')    nRow = Math.max(0, row - 1)
      if (key === 'arrowdown')  nRow = Math.min(3, row + 1)
      focusedTile.current = nRow * 4 + nCol
      // Focus the corresponding button in the DOM
      const btn = document.querySelector(`[data-tile="${focusedTile.current}"]`)
      btn?.focus()
      return
    }

    // Enter / Space = guess the focused tile
    if ((key === 'enter' || key === ' ') && screen === 'playing') {
      e.preventDefault()
      guess(focusedTile.current)
    }
  }, [screen, showLeaderboard, guess, pause, resume, toggleMute, play])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // ── Derived game values ────────────────────────────────────────────
  const round    = state?.current_round ?? state   // API returns flat state
  const target   = state?.target
  const grid     = state?.grid ?? []
  const lives    = state?.lives    ?? 3
  const score    = state?.score    ?? 0
  const streak   = state?.streak   ?? 0
  const timeRem  = state?.time_remaining ?? state?.time_limit ?? 45
  const timeLim  = state?.time_limit     ?? 45
  const isActive = screen === 'playing' && !state?.game_over

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen">

      {/* ── START SCREEN ─────────────────────────────────────────── */}
      {screen === 'start' && (
        <StartScreen
          difficulty={difficulty}
          setDifficulty={(d) => { setDifficulty(d); clearError() }}
          onStart={startGame}
          isLoading={isLoading}
          error={error}
          bestScore={bestScore}
          onLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {/* ── GAME SCREEN ──────────────────────────────────────────── */}
      {(screen === 'playing' || screen === 'paused') && state && (
        <div className="min-h-screen flex flex-col items-center px-4 py-4 sm:py-8">

          {/* ── Top nav bar ───────────────────────────── */}
          <div className="w-full max-w-2xl flex items-center justify-between mb-4 gap-3">

            {/* Back to menu */}
            <button
              onClick={pause}
              className="flex items-center gap-1.5 text-white/35 hover:text-white/70 text-xs font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5 no-tap"
              aria-label="Pause and go to menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
              </svg>
              Menu
            </button>

            {/* Difficulty badge */}
            <span className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">
              {state.difficulty} mode
            </span>

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
              {/* Mute */}
              <button
                onClick={toggleMute}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white/40 hover:text-white/80 flex items-center justify-center transition-all text-sm no-tap"
                aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                title={muted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {muted ? '🔇' : '🔊'}
              </button>

              {/* Pause */}
              <button
                onClick={pause}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white/40 hover:text-white/80 flex items-center justify-center transition-all text-sm no-tap"
                aria-label="Pause game (P)"
                title="Pause (P)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Desktop: two-column / Mobile: single-column ──── */}
          <div className="w-full max-w-2xl flex flex-col sm:flex-row sm:items-start gap-4">

            {/* ── Left / top: stats + target ─────────────── */}
            <div className="flex flex-col gap-3 sm:w-56 shrink-0">
              <ScorePanel
                lives={lives}
                score={score}
                streak={streak}
                bestScore={bestScore}
                difficulty={state.difficulty}
              />
              <TargetCard
                target={target}
                streak={streak}
                timeRemaining={timeRem}
                timeLimit={timeLim}
                active={isActive}
                outcome={outcome}
                lastPoints={lastPoints}
              />

              {/* Keyboard hint (desktop only) */}
              <div className="hidden sm:block glass rounded-2xl p-3">
                <p className="stat-label mb-2">Keyboard shortcuts</p>
                <div className="space-y-1 text-[11px] text-white/30 font-mono">
                  <p><kbd className="bg-white/8 px-1 rounded">1–9</kbd> Tiles 1–9</p>
                  <p><kbd className="bg-white/8 px-1 rounded">Q W E R</kbd> Tiles 10–13</p>
                  <p><kbd className="bg-white/8 px-1 rounded">A S D</kbd> Tiles 14–16</p>
                  <p><kbd className="bg-white/8 px-1 rounded">↑↓←→</kbd> Navigate</p>
                  <p><kbd className="bg-white/8 px-1 rounded">Enter</kbd> Guess focused</p>
                  <p><kbd className="bg-white/8 px-1 rounded">P</kbd> Pause  <kbd className="bg-white/8 px-1 rounded ml-2">M</kbd> Mute</p>
                </div>
              </div>
            </div>

            {/* ── Right / bottom: grid ───────────────────── */}
            <div className="flex-1">
              <Grid
                grid={grid}
                wrongTile={wrongTile}
                correctTile={correctTile}
                disabled={screen === 'paused' || state.game_over}
                onTileClick={guess}
                shake={shakeGrid}
              />

              {/* Mobile keyboard hint */}
              <p className="sm:hidden text-center text-white/15 text-[10px] mt-3 font-mono">
                Tap a tile · Keys 1–9 Q W E R A S D
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── PAUSE OVERLAY ─────────────────────────────────────────── */}
      {screen === 'paused' && (
        <PauseScreen
          onResume={resume}
          onRestart={restart}
          onQuit={quit}
          score={score}
          streak={streak}
        />
      )}

      {/* ── GAME OVER OVERLAY ─────────────────────────────────────── */}
      {screen === 'gameover' && (
        <GameOverScreen
          stats={state ? {
            score:          state.score,
            accuracy:       state.total_guesses > 0
                              ? parseFloat(((state.correct_total / state.total_guesses) * 100).toFixed(1))
                              : 0,
            best_streak:    state.best_streak,
            correct_total:  state.correct_total,
            total_guesses:  state.total_guesses,
            difficulty:     state.difficulty,
          } : null}
          isNewBest={isNewBest}
          bestScore={bestScore}
          onPlayAgain={() => { setPendingEntry(null); restart() }}
          onMenu={() => { setPendingEntry(null); quit() }}
          onLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {/* ── LEADERBOARD OVERLAY ───────────────────────────────────── */}
      {showLeaderboard && (
        <Leaderboard
          onClose={() => setShowLeaderboard(false)}
          pendingEntry={screen === 'gameover' ? pendingEntry : null}
          onSubmitted={() => setPendingEntry(null)}
        />
      )}

    </div>
  )
}
