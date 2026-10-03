"""
NumGrid — FastAPI Backend
=========================
All game logic lives here. The client never receives the answer before guessing.

Endpoints
---------
POST  /api/game/start           — create session
POST  /api/game/{id}/guess      — submit a tile guess
GET   /api/game/{id}            — poll current state
GET   /api/leaderboard          — top-10 scores
POST  /api/leaderboard          — submit a score
"""

from __future__ import annotations

import json
import math
import os
import random
import time
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="NumGrid API", version="2.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GRID_SIZE = 16  # 4 × 4 tiles

DIFFICULTY_SETTINGS: dict[str, dict] = {
    "easy":   {"time_limit": 10, "max_number": 16, "label": "Easy"},
    "medium": {"time_limit": 6,  "max_number": 16, "label": "Medium"},
    "hard":   {"time_limit": 3,  "max_number": 99, "label": "Hard"},
}

MAX_LIVES = 3
STREAK_MILESTONES = {1: 1.0, 3: 1.5, 5: 2.0, 10: 3.0}  # streak → multiplier
SPEED_INCREASE_EVERY = 5   # every N correct answers shave off 0.5 s (floor 1 s)
BASE_CORRECT_SCORE = 100
LEADERBOARD_SIZE = 10
LEADERBOARD_FILE = Path(__file__).parent / "leaderboard.json"

# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

_sessions: dict[str, "GameSession"] = {}

# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------


def _streak_multiplier(streak: int) -> float:
    """Return the score multiplier for the current streak."""
    best = 1.0
    for threshold, mult in STREAK_MILESTONES.items():
        if streak >= threshold:
            best = mult
    return best


def _adjusted_time_limit(base: float, correct_total: int) -> float:
    """Shave 0.5 s per SPEED_INCREASE_EVERY correct answers, floor 1 s."""
    reductions = correct_total // SPEED_INCREASE_EVERY
    return max(1.0, base - reductions * 0.5)


def _build_grid(max_number: int) -> list[int]:
    """Return a shuffled list of 16 unique numbers drawn from 1…max_number."""
    pool = list(range(1, max_number + 1))
    if len(pool) < GRID_SIZE:
        pool = list(range(1, GRID_SIZE + 1))  # safety fallback
    return random.sample(pool, GRID_SIZE)


# ---------------------------------------------------------------------------
# Game session
# ---------------------------------------------------------------------------


class GameSession:
    """Holds all mutable state for one game."""

    def __init__(self, difficulty: str):
        cfg = DIFFICULTY_SETTINGS[difficulty]

        self.id: str = str(uuid.uuid4())
        self.difficulty: str = difficulty
        self.base_time: float = float(cfg["time_limit"])
        self.max_number: int = cfg["max_number"]

        self.lives: int = MAX_LIVES
        self.score: int = 0
        self.streak: int = 0
        self.best_streak: int = 0
        self.correct_total: int = 0   # total correct guesses (drives speed)
        self.total_guesses: int = 0   # total attempts (for accuracy)
        self.game_over: bool = False
        self.paused: bool = False

        # Grid state — target is stored server-side only
        self._grid: list[int] = []
        self._target: int = 0
        self._round_started_at: float = 0.0

        self._new_round()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _new_round(self) -> None:
        """Shuffle the grid, pick a target, start the clock."""
        self._grid = _build_grid(self.max_number)
        self._target = random.choice(self._grid)
        self._round_started_at = time.time()

    def _time_limit(self) -> float:
        return _adjusted_time_limit(self.base_time, self.correct_total)

    def _time_remaining(self) -> float:
        elapsed = time.time() - self._round_started_at
        return max(0.0, self._time_limit() - elapsed)

    def _is_expired(self) -> bool:
        return self._time_remaining() <= 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def public_state(self) -> dict:
        """
        State returned to the client.
        The target is NOT included — only sent after a correct guess.
        """
        return {
            "id": self.id,
            "difficulty": self.difficulty,
            "grid": list(self._grid),          # 16 numbers, order = position
            "lives": self.lives,
            "score": self.score,
            "streak": self.streak,
            "best_streak": self.best_streak,
            "multiplier": _streak_multiplier(self.streak),
            "correct_total": self.correct_total,
            "total_guesses": self.total_guesses,
            "time_limit": round(self._time_limit(), 2),
            "time_remaining": round(self._time_remaining(), 2),
            "game_over": self.game_over,
            "paused": self.paused,
            # Target is revealed here so the UI can display the card.
            # It is always the CURRENT round target; guessing sends the
            # tile *position*, not the number, so the order stays hidden.
            "target": self._target,
        }

    def guess(self, position: int) -> dict:
        """
        Validate a guess by tile position (0-based, 0–15).
        Returns a result dict with outcome details.
        """
        if self.game_over:
            raise HTTPException(400, "Game is already over.")
        if self.paused:
            raise HTTPException(400, "Game is paused.")
        if not (0 <= position < GRID_SIZE):
            raise HTTPException(422, f"Position must be 0–{GRID_SIZE - 1}.")

        # Check timeout first
        if self._is_expired():
            self.lives -= 1
            self.streak = 0
            if self.lives <= 0:
                self.game_over = True
            else:
                self._new_round()
            return {
                "outcome": "timeout",
                "correct_value": None,
                "points_earned": 0,
                "state": self.public_state(),
            }

        self.total_guesses += 1
        guessed_value = self._grid[position]
        correct = guessed_value == self._target

        if correct:
            # Score = base + time bonus, scaled by multiplier
            time_bonus = math.floor(self._time_remaining() * 10)
            multiplier = _streak_multiplier(self.streak)
            points = math.floor((BASE_CORRECT_SCORE + time_bonus) * multiplier)

            self.score += points
            self.streak += 1
            self.correct_total += 1
            self.best_streak = max(self.best_streak, self.streak)

            prev_target = self._target
            self._new_round()

            return {
                "outcome": "correct",
                "correct_value": prev_target,
                "points_earned": points,
                "multiplier": multiplier,
                "state": self.public_state(),
            }
        else:
            self.streak = 0
            self.lives -= 1
            if self.lives <= 0:
                self.game_over = True

            return {
                "outcome": "wrong",
                "correct_value": None,
                "points_earned": 0,
                "guessed_value": guessed_value,
                "state": self.public_state(),
            }

    def final_stats(self) -> dict:
        """Stats for the Game Over screen."""
        accuracy = (
            round(self.correct_total / self.total_guesses * 100, 1)
            if self.total_guesses > 0
            else 0.0
        )
        return {
            "score": self.score,
            "correct_total": self.correct_total,
            "total_guesses": self.total_guesses,
            "accuracy": accuracy,
            "best_streak": self.best_streak,
            "difficulty": self.difficulty,
        }


# ---------------------------------------------------------------------------
# Leaderboard (persisted to JSON, 10 entries max)
# ---------------------------------------------------------------------------


def _load_leaderboard() -> list[dict]:
    if LEADERBOARD_FILE.exists():
        try:
            return json.loads(LEADERBOARD_FILE.read_text())
        except Exception:
            pass
    return []


def _save_leaderboard(entries: list[dict]) -> None:
    try:
        LEADERBOARD_FILE.write_text(json.dumps(entries, indent=2))
    except Exception:
        pass  # graceful degradation if filesystem is unavailable


_leaderboard: list[dict] = _load_leaderboard()


# ---------------------------------------------------------------------------
# Pydantic request / response schemas
# ---------------------------------------------------------------------------


class StartRequest(BaseModel):
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")


class GuessRequest(BaseModel):
    position: int = Field(..., ge=0, lt=GRID_SIZE)


class LeaderboardEntry(BaseModel):
    name: str = Field(..., min_length=1, max_length=20)
    score: int = Field(..., ge=0)
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    accuracy: float = Field(..., ge=0, le=100)
    best_streak: int = Field(..., ge=0)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": "2.0.0"}


@app.post("/api/game/start")
def start_game(req: StartRequest) -> dict:
    """Create a new game session and return the initial state."""
    session = GameSession(difficulty=req.difficulty)
    _sessions[session.id] = session
    return session.public_state()


@app.get("/api/game/{game_id}")
def get_game(game_id: str) -> dict:
    """Return current game state (used for polling / timer sync)."""
    return _get_session(game_id).public_state()


@app.post("/api/game/{game_id}/guess")
def make_guess(game_id: str, req: GuessRequest) -> dict:
    """
    Submit a tile guess by zero-based position index.
    The server validates against the hidden target and returns the outcome.
    """
    return _get_session(game_id).guess(req.position)


@app.post("/api/game/{game_id}/pause")
def pause_game(game_id: str) -> dict:
    session = _get_session(game_id)
    session.paused = True
    return session.public_state()


@app.post("/api/game/{game_id}/resume")
def resume_game(game_id: str) -> dict:
    session = _get_session(game_id)
    session.paused = False
    # Reset round timer so the player doesn't get penalised for pause time
    session._round_started_at = time.time()
    return session.public_state()


@app.get("/api/game/{game_id}/stats")
def game_stats(game_id: str) -> dict:
    """Final statistics for the Game Over screen."""
    return _get_session(game_id).final_stats()


@app.get("/api/leaderboard")
def get_leaderboard() -> list[dict]:
    """Return the top-10 leaderboard entries."""
    return _leaderboard[:LEADERBOARD_SIZE]


@app.post("/api/leaderboard", status_code=201)
def post_leaderboard(entry: LeaderboardEntry) -> dict:
    """Submit a score. Keeps only the top-10 entries sorted by score."""
    global _leaderboard
    new_entry = entry.model_dump()
    new_entry["submitted_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _leaderboard.append(new_entry)
    _leaderboard.sort(key=lambda x: x["score"], reverse=True)
    _leaderboard = _leaderboard[:LEADERBOARD_SIZE]
    _save_leaderboard(_leaderboard)
    rank = next(
        (i + 1 for i, e in enumerate(_leaderboard) if e is new_entry),
        None,
    )
    return {"rank": rank, "leaderboard": _leaderboard}


@app.get("/api/config")
def get_config() -> dict:
    """Expose difficulty config so the frontend can show accurate rules."""
    return {
        "difficulties": DIFFICULTY_SETTINGS,
        "max_lives": MAX_LIVES,
        "grid_size": GRID_SIZE,
        "base_score": BASE_CORRECT_SCORE,
        "streak_milestones": STREAK_MILESTONES,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_session(game_id: str) -> GameSession:
    session = _sessions.get(game_id)
    if not session:
        raise HTTPException(404, f"Game session '{game_id}' not found.")
    return session
