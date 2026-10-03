/**
 * NumGrid API client
 * All requests go to /api which Vite proxies to http://127.0.0.1:8000.
 */
import axios from 'axios'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 6000,
})

// ── Game ─────────────────────────────────────────────────────────────────────

/** Start a new game. Returns initial game state. */
export const startGame = (difficulty = 'medium') =>
  http.post('/game/start', { difficulty }).then(r => r.data)

/** Poll current state (for timer sync). */
export const getGame = (id) =>
  http.get(`/game/${id}`).then(r => r.data)

/**
 * Submit a tile guess by zero-based position (0–15).
 * Returns { outcome, correct_value, points_earned, multiplier, state }.
 */
export const makeGuess = (id, position) =>
  http.post(`/game/${id}/guess`, { position }).then(r => r.data)

/** Pause the game session. */
export const pauseGame = (id) =>
  http.post(`/game/${id}/pause`).then(r => r.data)

/** Resume a paused session (resets the round timer). */
export const resumeGame = (id) =>
  http.post(`/game/${id}/resume`).then(r => r.data)

/** Final stats for the Game Over screen. */
export const getStats = (id) =>
  http.get(`/game/${id}/stats`).then(r => r.data)

// ── Leaderboard ──────────────────────────────────────────────────────────────

/** Fetch top-10 leaderboard entries. */
export const getLeaderboard = () =>
  http.get('/leaderboard').then(r => r.data)

/**
 * Submit a leaderboard entry.
 * @param {{ name, score, difficulty, accuracy, best_streak }} entry
 */
export const submitScore = (entry) =>
  http.post('/leaderboard', entry).then(r => r.data)

// ── Config ───────────────────────────────────────────────────────────────────

/** Fetch server-side config (difficulty settings, scoring rules). */
export const getConfig = () =>
  http.get('/config').then(r => r.data)
