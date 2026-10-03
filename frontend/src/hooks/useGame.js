/**
 * useGame — central game-state hook
 * ───────────────────────────────────
 * Owns the full lifecycle: start → playing → paused → game-over.
 * Communicates with the FastAPI backend exclusively through src/api/game.js.
 *
 * Returned API
 * ────────────
 * state      — current server game state object
 * screen     — 'start' | 'playing' | 'paused' | 'gameover' | 'leaderboard'
 * difficulty — currently selected difficulty string
 * outcome    — last guess result ('correct' | 'wrong' | 'timeout' | null)
 * lastPoints — points earned on last correct guess
 * shakeGrid  — boolean — triggers CSS screen-shake on wrong
 * wrongTile  — position index of last wrong tile (for local shake anim)
 * correctTile— position index of last correct tile (for pop anim)
 * bestScore  — from localStorage
 * isNewBest  — true if current game score beats stored best
 * isLoading  — network in-flight
 * error      — string | null
 * actions: { setDifficulty, setScreen, startGame, guess, pause, resume, restart, quit }
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  startGame as apiStart,
  getGame,
  makeGuess as apiGuess,
  pauseGame as apiPause,
  resumeGame as apiResume,
} from '../api/game.js'

const POLL_MS = 600  // server poll interval while playing

export function useGame({ onSound } = {}) {
  // ── Screen router ───────────────────────────────────────────────────
  const [screen, setScreen]       = useState('start')   // see JSDoc above
  const [difficulty, setDifficulty] = useState('medium')

  // ── Server state ────────────────────────────────────────────────────
  const [state, setState]         = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState(null)

  // ── Interaction feedback ────────────────────────────────────────────
  const [outcome, setOutcome]     = useState(null)   // 'correct'|'wrong'|'timeout'
  const [lastPoints, setLastPoints] = useState(0)
  const [shakeGrid, setShakeGrid] = useState(false)
  const [wrongTile, setWrongTile] = useState(null)   // position int | null
  const [correctTile, setCorrectTile] = useState(null)

  // ── Score tracking ───────────────────────────────────────────────────
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem('numgrid_best') ?? '0', 10)
  )
  const [isNewBest, setIsNewBest] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────
  const pollRef    = useRef(null)
  const gameIdRef  = useRef(null)
  const pausedRef  = useRef(false)

  // ── Poll helpers ─────────────────────────────────────────────────────
  const stopPoll = () => {
    clearInterval(pollRef.current)
    pollRef.current = null
  }

  const startPoll = useCallback((id) => {
    stopPoll()
    pollRef.current = setInterval(async () => {
      if (pausedRef.current || !id) return
      try {
        const s = await getGame(id)
        setState(s)
        if (s.game_over) {
          stopPoll()
          _handleGameOver(s)
        }
      } catch {
        // Silent — let user-triggered actions surface errors
      }
    }, POLL_MS)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopPoll(), [])

  // ── Game over handler ─────────────────────────────────────────────────
  const _handleGameOver = (s) => {
    const score = s.score ?? 0
    if (score > bestScore) {
      setBestScore(score)
      setIsNewBest(true)
      localStorage.setItem('numgrid_best', String(score))
      onSound?.('highScore')
    } else {
      onSound?.('gameOver')
    }
    setScreen('gameover')
  }

  // ── startGame ─────────────────────────────────────────────────────────
  const startGame = useCallback(async (diff = difficulty) => {
    setIsLoading(true)
    setError(null)
    setOutcome(null)
    setWrongTile(null)
    setCorrectTile(null)
    setShakeGrid(false)
    setIsNewBest(false)
    pausedRef.current = false

    try {
      const s = await apiStart(diff)
      gameIdRef.current = s.id
      setState(s)
      setScreen('playing')
      startPoll(s.id)
    } catch (err) {
      setError(
        err.response?.data?.detail ??
          'Cannot reach the server. Make sure the backend is running on port 8000.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [difficulty, startPoll])

  // ── guess ─────────────────────────────────────────────────────────────
  const guess = useCallback(async (position) => {
    if (!gameIdRef.current || !state || state.game_over) return

    // Optimistic: mark the tile immediately so UI feels instant
    setCorrectTile(null)
    setWrongTile(null)
    setOutcome(null)

    try {
      const result = await apiGuess(gameIdRef.current, position)
      const { outcome: out, points_earned, state: newState } = result

      setState(newState)
      setOutcome(out)
      setLastPoints(points_earned ?? 0)

      if (out === 'correct') {
        setCorrectTile(position)
        onSound?.(newState.streak >= 5 ? 'streak' : 'correct')
        // Clear after animation
        setTimeout(() => { setCorrectTile(null); setOutcome(null) }, 500)
      } else if (out === 'wrong') {
        setWrongTile(position)
        setShakeGrid(true)
        onSound?.('wrong')
        setTimeout(() => { setWrongTile(null); setShakeGrid(false); setOutcome(null) }, 600)
      } else if (out === 'timeout') {
        onSound?.('timeout')
        setTimeout(() => setOutcome(null), 800)
      }

      if (newState.game_over) {
        stopPoll()
        _handleGameOver(newState)
      }
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Guess failed.')
    }
  }, [state, onSound])

  // ── pause ─────────────────────────────────────────────────────────────
  const pause = useCallback(async () => {
    if (!gameIdRef.current) return
    pausedRef.current = true
    try {
      const s = await apiPause(gameIdRef.current)
      setState(s)
    } catch { /* ignore */ }
    setScreen('paused')
  }, [])

  // ── resume ────────────────────────────────────────────────────────────
  const resume = useCallback(async () => {
    if (!gameIdRef.current) return
    pausedRef.current = false
    try {
      const s = await apiResume(gameIdRef.current)
      setState(s)
    } catch { /* ignore */ }
    setScreen('playing')
    startPoll(gameIdRef.current)
  }, [startPoll])

  // ── restart ───────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    stopPoll()
    gameIdRef.current = null
    setState(null)
    startGame(difficulty)
  }, [difficulty, startGame])

  // ── quit ──────────────────────────────────────────────────────────────
  const quit = useCallback(() => {
    stopPoll()
    gameIdRef.current = null
    pausedRef.current = false
    setState(null)
    setOutcome(null)
    setIsNewBest(false)
    setScreen('start')
  }, [])

  return {
    // State
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
    // Actions
    setDifficulty,
    setScreen,
    startGame,
    guess,
    pause,
    resume,
    restart,
    quit,
    clearError: () => setError(null),
  }
}
