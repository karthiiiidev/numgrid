"""
NumGrid — 4-Digit Number Guessing Game
=======================================
Single-file FastAPI application.
Backend: game logic, session management, scoring.
Frontend: served as inline HTML/CSS/JS from GET /.

Run:  python numgrid.py
Open: http://localhost:8000
"""

from __future__ import annotations

import random
import time
import uuid

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────

app = FastAPI(title="NumGrid", version="5.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────

DIFFICULTY_SETTINGS: dict[str, dict] = {
    "easy":   {"max_attempts": 10, "allow_repeats": False},
    "medium": {"max_attempts": 8,  "allow_repeats": False},
    "hard":   {"max_attempts": 6,  "allow_repeats": True},
}

_sessions: dict[str, "GameSession"] = {}

# ─────────────────────────────────────────────────────────────────
# Game logic
# ─────────────────────────────────────────────────────────────────

def _generate_secret(allow_repeats: bool) -> str:
    """Generate a 4-digit secret. No leading zero. Optionally unique digits."""
    if allow_repeats:
        first = str(random.randint(1, 9))
        rest  = "".join(str(random.randint(0, 9)) for _ in range(3))
        return first + rest
    digits = random.sample(range(0, 10), 4)
    while digits[0] == 0:
        digits = random.sample(range(0, 10), 4)
    return "".join(str(d) for d in digits)


def _evaluate(secret: str, guess: str) -> dict:
    """
    Bulls = correct digit, correct position.
    Cows  = correct digit, wrong position.
    Returns per-digit result list: "bull" | "cow" | "miss"
    """
    result           = ["miss"] * 4
    secret_remaining = []
    guess_remaining  = []

    for i in range(4):
        if guess[i] == secret[i]:
            result[i] = "bull"
        else:
            secret_remaining.append(secret[i])
            guess_remaining.append((i, guess[i]))

    for (i, ch) in guess_remaining:
        if ch in secret_remaining:
            result[i] = "cow"
            secret_remaining.remove(ch)

    bulls = result.count("bull")
    cows  = result.count("cow")
    return {"bulls": bulls, "cows": cows, "result": result}


class GameSession:
    def __init__(self, difficulty: str):
        cfg = DIFFICULTY_SETTINGS[difficulty]
        self.id            = str(uuid.uuid4())
        self.difficulty    = difficulty
        self.max_attempts  = cfg["max_attempts"]
        self.allow_repeats = cfg["allow_repeats"]
        self.secret        = _generate_secret(cfg["allow_repeats"])
        self.guesses: list[dict] = []
        self.won           = False
        self.game_over     = False
        self.started_at    = time.time()
        self.ended_at: float | None = None

    @property
    def attempts_used(self) -> int:
        return len(self.guesses)

    @property
    def attempts_left(self) -> int:
        return self.max_attempts - self.attempts_used

    def score(self) -> int:
        if not self.won:
            return 0
        elapsed    = (self.ended_at or time.time()) - self.started_at
        time_bonus = max(0, 300 - int(elapsed * 2))
        return 1000 + self.attempts_left * 100 + time_bonus

    def public_state(self) -> dict:
        return {
            "id":            self.id,
            "difficulty":    self.difficulty,
            "max_attempts":  self.max_attempts,
            "attempts_used": self.attempts_used,
            "attempts_left": self.attempts_left,
            "guesses":       self.guesses,
            "won":           self.won,
            "game_over":     self.game_over,
            "score":         self.score(),
            "secret":        self.secret if self.game_over else None,
        }

    def guess(self, guess_str: str) -> dict:
        if self.game_over:
            raise HTTPException(400, "Game is already over.")
        guess_str = guess_str.strip()
        if len(guess_str) != 4 or not guess_str.isdigit():
            raise HTTPException(422, "Guess must be exactly 4 digits.")
        if not self.allow_repeats and len(set(guess_str)) != 4:
            raise HTTPException(422, "All four digits must be unique on this difficulty.")

        ev  = _evaluate(self.secret, guess_str)
        row = {"guess": guess_str, "bulls": ev["bulls"],
               "cows": ev["cows"], "result": ev["result"]}
        self.guesses.append(row)

        if ev["bulls"] == 4:
            self.won = self.game_over = True
            self.ended_at = time.time()
        elif self.attempts_used >= self.max_attempts:
            self.game_over = True
            self.ended_at  = time.time()

        return {"row": row, "state": self.public_state()}


# ─────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")

class GuessRequest(BaseModel):
    guess: str = Field(..., min_length=4, max_length=4)


# ─────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────

def _sess(gid: str) -> GameSession:
    s = _sessions.get(gid)
    if not s:
        raise HTTPException(404, f"Session '{gid}' not found.")
    return s

@app.get("/health")
def health():
    return {"status": "ok", "version": "5.0.0"}

@app.post("/api/game/start")
def start_game(req: StartRequest):
    s = GameSession(difficulty=req.difficulty)
    _sessions[s.id] = s
    return s.public_state()

@app.get("/api/game/{gid}")
def get_game(gid: str):
    return _sess(gid).public_state()

@app.post("/api/game/{gid}/guess")
def make_guess(gid: str, req: GuessRequest):
    return _sess(gid).guess(req.guess)


# ─────────────────────────────────────────────────────────────────
# Frontend
# ─────────────────────────────────────────────────────────────────

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>NumGrid</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
<style>
/* ── Reset ───────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:    #080808;
  --bg2:   #0f0f0f;
  --bg3:   #141414;
  --bg4:   #1c1c1c;
  --bg5:   #252525;
  --or:    #e85d04;
  --or2:   #ff6b1a;
  --wh:    #f0ece7;
  --wh2:   #c8c3be;
  --wh3:   #8a8580;
  --wh4:   #4e4a46;
  --bull:  #e85d04;
  --cow:   #d4a017;
  --line:  rgba(255,255,255,0.05);
  --bdr:   rgba(255,255,255,0.07);
  --sans:  'Space Grotesk',system-ui,sans-serif;
  --mono:  'Space Mono','Courier New',monospace;
}
html{-webkit-font-smoothing:antialiased;font-size:16px}
body{
  background:var(--bg);
  background-image:
    linear-gradient(var(--line) 1px,transparent 1px),
    linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:72px 72px;
  background-attachment:fixed;
  color:var(--wh);
  font-family:var(--sans);
  min-height:100dvh;
  display:flex;flex-direction:column;
  overflow-x:hidden;
}
::selection{background:var(--or);color:#000}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--bg5)}
:focus-visible{outline:1px solid var(--or);outline-offset:2px}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input{font-family:inherit}

/* ── Shell ───────────────────────────────────────── */
#app{flex:1;display:flex;flex-direction:column}
.screen{display:none;flex:1;flex-direction:column}
.screen.active{display:flex}

/* ── Header ───────────────────────────────────────── */
.hdr{
  height:52px;display:flex;align-items:stretch;flex-shrink:0;
  border-bottom:1px solid var(--line);
  background:rgba(8,8,8,.95);
  backdrop-filter:blur(12px);
  position:sticky;top:0;z-index:100;
}
.hdr__brand{
  display:flex;align-items:center;gap:10px;
  padding:0 22px;border-right:1px solid var(--line);
  cursor:pointer;flex-shrink:0;
}
.hdr__mark{
  width:26px;height:26px;background:var(--or);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-size:.5rem;font-weight:700;color:#000;
  flex-shrink:0;
}
.hdr__name{font-size:.875rem;font-weight:700;letter-spacing:.04em}
.hdr__nav{display:flex;flex:1}
.hdr__nav-btn{
  display:flex;align-items:center;padding:0 20px;
  border-right:1px solid var(--line);
  font-size:.5625rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:var(--wh4);cursor:pointer;
  transition:color .12s,background .12s;
  position:relative;white-space:nowrap;
}
.hdr__nav-btn::before{
  content:'▪';font-size:.3rem;
  position:absolute;top:9px;left:8px;color:inherit;
}
.hdr__nav-btn:hover{color:var(--wh2);background:var(--bg3)}
.hdr__nav-btn.on{background:var(--or);color:#000}
.hdr__nav-btn.on::before{color:#000}
.hdr__right{
  display:flex;align-items:center;padding:0 16px;
  margin-left:auto;gap:8px;
}
.icon-btn{
  width:30px;height:30px;
  display:flex;align-items:center;justify-content:center;
  border:1px solid var(--bdr);color:var(--wh4);
  font-size:.75rem;font-family:var(--mono);font-weight:700;
  letter-spacing:0;
  transition:border-color .12s,color .12s;cursor:pointer;
}
.icon-btn:hover,.icon-btn.on{border-color:var(--or);color:var(--or)}

/* ── Buttons ─────────────────────────────────────── */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:0 20px;height:42px;
  font-size:.625rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  font-family:var(--sans);cursor:pointer;border:none;white-space:nowrap;
  transition:background .1s,border-color .1s,color .1s,transform .08s;
}
.btn:active{transform:scale(.96)}
.btn:disabled{opacity:.35;cursor:not-allowed;pointer-events:none}
.btn-primary{background:var(--or);color:#000}
.btn-primary:hover{background:var(--or2)}
.btn-ghost{background:transparent;color:var(--wh3);border:1px solid var(--bdr)}
.btn-ghost:hover{border-color:var(--wh4);color:var(--wh)}
.btn-lg{height:50px;padding:0 30px;font-size:.6875rem}
.btn-sm{height:34px;padding:0 14px;font-size:.5625rem}
.spinner{
  width:12px;height:12px;
  border:2px solid rgba(0,0,0,.2);border-top-color:#000;
  border-radius:50%;animation:spin .6s linear infinite;
  display:inline-block;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Eyebrow label ───────────────────────────────── */
.eyebrow{
  font-size:.5rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;
  color:var(--wh4);font-family:var(--mono);
  border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:14px;
}

/* ── Inline error ────────────────────────────────── */
.err{
  display:none;padding:9px 13px;
  background:rgba(210,80,80,.08);border:1px solid rgba(210,80,80,.28);
  font-size:.6875rem;color:#d46060;
}
.err.show{display:block}

/* ══════════════════════════════════════════════════
   START SCREEN
   Two-column: left = hero, right = config
══════════════════════════════════════════════════ */
.start{flex:1;display:grid;grid-template-columns:1fr 1fr}

.start__hero{
  padding:64px 52px;
  border-right:1px solid var(--line);
  display:flex;flex-direction:column;
  justify-content:space-between;
}
.kicker{
  display:inline-block;padding:3px 9px;
  background:var(--or);
  font-size:.5rem;font-weight:900;letter-spacing:.2em;text-transform:uppercase;
  color:#000;font-family:var(--mono);
  margin-bottom:24px;
}
.headline{
  font-size:clamp(2rem,4vw,3.5rem);font-weight:300;
  line-height:1.07;letter-spacing:-.015em;
  margin-bottom:18px;
}
.headline strong{
  font-weight:900;font-style:italic;
  font-size:1.06em;letter-spacing:-.025em;
}
.sub{
  font-size:.9375rem;color:var(--wh3);line-height:1.65;
  max-width:340px;margin-bottom:32px;
}
.cta-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.err-start{margin-top:16px}

.best-strip{
  margin-top:32px;padding:13px 16px;
  background:var(--bg3);border:1px solid var(--bdr);
  display:flex;align-items:center;justify-content:space-between;
}
.best-strip__lbl{
  font-size:.5rem;font-weight:700;letter-spacing:.2em;
  text-transform:uppercase;color:var(--wh4);font-family:var(--mono);
}
.best-strip__val{
  font-family:var(--mono);font-size:1rem;font-weight:700;color:var(--or);
}

/* Config panel */
.start__config{
  padding:64px 52px;
  display:flex;flex-direction:column;gap:36px;
}

/* Difficulty selector */
.diff-grid{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--line);
}
.diff-btn{
  background:var(--bg2);padding:16px 14px;
  display:flex;flex-direction:column;gap:4px;
  cursor:pointer;transition:background .12s;
  text-align:left;border:none;position:relative;
}
.diff-btn::after{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:transparent;transition:background .12s;
}
.diff-btn:hover{background:var(--bg4)}
.diff-btn.on{background:var(--bg3)}
.diff-btn.on::after{background:var(--or)}
.diff-btn__name{
  font-size:.5625rem;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;color:var(--wh2);
}
.diff-btn__att{
  font-family:var(--mono);font-size:1.75rem;font-weight:700;
  color:var(--wh);line-height:1;
}
.diff-btn.on .diff-btn__att{color:var(--or)}
.diff-btn__sub{
  font-size:.45rem;letter-spacing:.1em;text-transform:uppercase;color:var(--wh4);
}

/* Rules list */
.rules{display:flex;flex-direction:column}
.rule{
  display:flex;align-items:flex-start;gap:12px;
  padding:11px 0;border-bottom:1px solid var(--line);
}
.rule:last-child{border-bottom:none}
.rule__n{
  font-family:var(--mono);font-size:.5rem;font-weight:700;
  color:var(--or);width:16px;flex-shrink:0;padding-top:1px;
}
.rule__title{font-size:.8125rem;font-weight:600;color:var(--wh);margin-bottom:2px}
.rule__body{font-size:.75rem;color:var(--wh4);line-height:1.55}

/* Colour legend on start screen */
.legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:8px}
.legend-item{display:flex;align-items:center;gap:7px;font-size:.6875rem;color:var(--wh3)}
.legend-dot{
  width:12px;height:12px;border-radius:1px;flex-shrink:0;
}
.legend-dot.bull{background:var(--bull)}
.legend-dot.cow{background:var(--cow)}
.legend-dot.miss{background:var(--bg5);border:1px solid var(--bdr)}

/* ══════════════════════════════════════════════════
   GAME SCREEN
   Left sidebar 200px | Right main area
══════════════════════════════════════════════════ */
.game{flex:1;display:grid;grid-template-columns:200px 1fr;min-height:0}

/* Sidebar */
.sidebar{
  border-right:1px solid var(--line);
  display:flex;flex-direction:column;overflow:hidden;
}
.sb{padding:16px 18px;border-bottom:1px solid var(--line)}
.sb:last-child{flex:1;border-bottom:none}

.srow{
  display:flex;flex-direction:column;gap:3px;
  padding:10px 0;border-bottom:1px solid var(--line);
}
.srow:last-child{border-bottom:none}
.srow__lbl{
  font-size:.45rem;font-weight:700;letter-spacing:.22em;
  text-transform:uppercase;color:var(--wh4);font-family:var(--mono);
}
.srow__val{
  font-family:var(--mono);font-size:1.25rem;font-weight:700;
  color:var(--wh);line-height:1;
}

/* Attempt pips */
.pips{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.pip{
  width:9px;height:9px;background:var(--or);
  transition:background .25s,opacity .25s;
}
.pip.used{background:var(--bg5);opacity:.4}

/* Sidebar legend */
.sb-legend{margin-top:12px;display:flex;flex-direction:column;gap:7px}
.sb-item{display:flex;align-items:center;gap:8px;font-size:.5625rem;color:var(--wh4)}
.sb-dot{width:10px;height:10px;border-radius:1px;flex-shrink:0}
.sb-dot.bull{background:var(--bull)}
.sb-dot.cow{background:var(--cow)}
.sb-dot.miss{background:var(--bg5);border:1px solid var(--bdr)}

/* Main area */
.gmain{display:flex;flex-direction:column;overflow:hidden}

/* Input bar */
.input-bar{
  padding:20px 24px;border-bottom:1px solid var(--line);
  background:var(--bg2);flex-shrink:0;
  display:flex;flex-direction:column;gap:10px;
}
.input-bar__lbl{
  font-size:.45rem;font-weight:700;letter-spacing:.22em;
  text-transform:uppercase;color:var(--wh4);font-family:var(--mono);
}
.input-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

/* 4 individual digit boxes */
.dboxes{display:flex;gap:5px}
.dbox{
  width:52px;height:62px;
  background:var(--bg3);border:1px solid var(--bdr);
  font-family:var(--mono);font-size:1.75rem;font-weight:700;
  color:var(--wh);text-align:center;outline:none;
  transition:border-color .12s,box-shadow .12s;
  /* hide number spinners */
  -moz-appearance:textfield;
}
.dbox::-webkit-inner-spin-button,
.dbox::-webkit-outer-spin-button{-webkit-appearance:none}
.dbox:focus{border-color:var(--or);box-shadow:0 0 0 1px var(--or)}
.dbox.has-val{border-color:var(--wh4)}
.guess-err{
  font-size:.625rem;color:#d46060;
  font-family:var(--mono);min-height:1em;
}

/* Guess history */
.history{flex:1;overflow-y:auto}
.history:empty::after{
  content:'No guesses yet.';
  display:block;padding:28px 24px;
  font-size:.8125rem;color:var(--wh4);
  font-family:var(--mono);
}

/* One history row */
.hrow{
  display:flex;align-items:center;
  border-bottom:1px solid var(--line);
  animation:rowIn .25s ease both;
}
@keyframes rowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}

.hrow__n{
  width:44px;flex-shrink:0;height:58px;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-size:.5rem;font-weight:700;color:var(--wh4);
  border-right:1px solid var(--line);
}
.hrow__cells{
  display:flex;gap:3px;padding:0 16px;flex:1;align-items:center;height:58px;
}
.dcell{
  width:46px;height:46px;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-size:1.25rem;font-weight:700;
  background:var(--bg3);border:1px solid var(--bdr);
  position:relative;
  animation:cellIn .3s cubic-bezier(.34,1.56,.64,1) both;
}
.dcell::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:transparent;
}
/* Stagger */
.dcell:nth-child(1){animation-delay:.00s}
.dcell:nth-child(2){animation-delay:.06s}
.dcell:nth-child(3){animation-delay:.12s}
.dcell:nth-child(4){animation-delay:.18s}
@keyframes cellIn{from{opacity:0;transform:scale(.65)}to{opacity:1;transform:scale(1)}}

.dcell.bull{background:rgba(232,93,4,.12);border-color:var(--bull);color:var(--bull)}
.dcell.bull::before{background:var(--bull)}
.dcell.cow{background:rgba(212,160,23,.1);border-color:var(--cow);color:var(--cow)}
.dcell.cow::before{background:var(--cow)}
.dcell.miss{background:var(--bg3);border-color:var(--bg5);color:var(--wh4)}

.hrow__summary{
  display:flex;flex-direction:column;gap:3px;
  padding:0 16px;min-width:88px;height:58px;
  justify-content:center;border-left:1px solid var(--line);
}
.bull-txt{
  font-family:var(--mono);font-size:.5625rem;font-weight:700;color:var(--bull);
  display:flex;align-items:center;gap:5px;
}
.cow-txt{
  font-family:var(--mono);font-size:.5625rem;font-weight:700;color:var(--cow);
  display:flex;align-items:center;gap:5px;
}
.bull-txt em,.cow-txt em{
  font-style:normal;font-size:.45rem;letter-spacing:.1em;
  text-transform:uppercase;color:var(--wh4);
}

/* ══════════════════════════════════════════════════
   RESULT OVERLAY
══════════════════════════════════════════════════ */
.overlay{
  position:fixed;inset:0;z-index:200;
  background:rgba(8,8,8,.92);backdrop-filter:blur(10px);
  display:none;align-items:center;justify-content:center;padding:20px;
}
.overlay.open{display:flex;animation:fadeOv .18s ease}
@keyframes fadeOv{from{opacity:0}to{opacity:1}}

.modal{
  background:var(--bg2);border:1px solid var(--bdr);
  width:100%;max-width:400px;
  animation:modalIn .22s cubic-bezier(.34,1.56,.64,1);
}
@keyframes modalIn{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:none}}

.modal__hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid var(--line);
}
.modal__title{
  font-size:.625rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
}
.modal__tag{
  padding:2px 8px;background:var(--or);color:#000;
  font-size:.45rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase;
  font-family:var(--mono);
}
.modal__body{padding:20px}
.modal__foot{
  padding:14px 20px;border-top:1px solid var(--line);
  display:flex;flex-direction:column;gap:6px;
}

/* Secret reveal */
.secret-reveal{
  background:var(--bg3);border:1px solid var(--bdr);
  padding:20px;text-align:center;margin-bottom:14px;
}
.secret-reveal__lbl{
  font-size:.45rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
  color:var(--wh4);font-family:var(--mono);margin-bottom:8px;
}
.secret-reveal__num{
  font-family:var(--mono);font-size:2.5rem;font-weight:700;
  letter-spacing:.14em;color:var(--wh);
}
.secret-reveal__num.won{color:var(--or)}

/* Stats row */
.stat-row{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--line);margin-bottom:14px;
}
.stat-cell{background:var(--bg3);padding:12px 10px;text-align:center}
.stat-cell__lbl{
  font-size:.4rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:var(--wh4);margin-bottom:4px;
}
.stat-cell__val{
  font-family:var(--mono);font-size:.9375rem;font-weight:700;color:var(--wh);
}
.stat-cell__val.hi{color:var(--or)}

/* ══════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════ */
.footer{
  border-top:1px solid var(--line);padding:12px 24px;
  display:flex;align-items:center;justify-content:center;
  gap:6px;flex-shrink:0;background:rgba(8,8,8,.5);
}
.footer__txt{
  font-size:.5625rem;color:var(--wh4);font-family:var(--mono);letter-spacing:.06em;
}
.footer__link{
  font-size:.5625rem;font-weight:700;color:var(--or);
  font-family:var(--mono);letter-spacing:.06em;
  text-decoration:none;transition:color .12s;
}
.footer__link:hover{color:var(--or2)}

/* ── Responsive ─────────────────────────────────── */
@media(max-width:860px){
  .start{grid-template-columns:1fr}
  .start__hero{
    border-right:none;border-bottom:1px solid var(--line);
    padding:40px 28px;
  }
  .start__config{padding:40px 28px}
  .game{grid-template-columns:1fr;grid-template-rows:auto 1fr}
  .sidebar{
    flex-direction:row;flex-wrap:wrap;
    border-right:none;border-bottom:1px solid var(--line);
    overflow:visible;
  }
  .sb{border-right:1px solid var(--line);border-bottom:none;flex:1;min-width:110px}
  .sb:last-child{flex:9999}
}
@media(max-width:520px){
  .hdr__name{display:none}
  .hdr__nav{display:none}
  .headline{font-size:1.875rem}
  .sidebar{display:none}
  .input-bar{padding:12px 14px}
  .dbox{width:44px;height:54px;font-size:1.5rem}
  .dcell{width:40px;height:40px;font-size:1.1rem}
  .hrow__n{width:36px}
  .hrow__summary{min-width:72px;padding:0 10px}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms!important;
    transition-duration:.01ms!important;
  }
}
</style>
</head>
<body>
<canvas id="confetti" aria-hidden="true"
  style="position:fixed;inset:0;pointer-events:none;z-index:300;width:100%;height:100%">
</canvas>

<div id="app">

<!-- HEADER -->
<header class="hdr" role="banner">
  <button class="hdr__brand" onclick="goStart()" aria-label="NumGrid home">
    <div class="hdr__mark" aria-hidden="true">NG</div>
    <span class="hdr__name">NumGrid</span>
  </button>
  <nav class="hdr__nav" role="navigation" aria-label="Main navigation">
    <button class="hdr__nav-btn on" id="nav-play" onclick="goStart()">
      Play
    </button>
    <button class="hdr__nav-btn" id="nav-how" onclick="scrollRules()">
      How to Play
    </button>
  </nav>
  <div class="hdr__right">
    <!-- Sound toggle — text label instead of emoji -->
    <button class="icon-btn on" id="btn-snd"
            onclick="toggleMute()" title="Toggle sound (M)"
            aria-label="Toggle sound">SFX</button>
  </div>
</header>

<!-- START SCREEN -->
<section class="screen active" id="scr-start" aria-label="Start screen">
  <div class="start">

    <!-- Hero -->
    <div class="start__hero">
      <div>
        <div class="kicker">4-Digit Number Game</div>
        <h1 class="headline">
          Crack the<br><strong>Code.</strong><br>Guess Smart.
        </h1>
        <p class="sub">
          The server picks a secret 4-digit number.
          Use the bull and cow feedback each round
          to narrow it down before your attempts run out.
        </p>
        <div class="err err-start" id="start-err" role="alert"></div>
        <div class="cta-row">
          <button class="btn btn-primary btn-lg" id="btn-start" onclick="handleStart()">
            <span id="btn-lbl">Start Game</span>
            <span id="btn-spin" class="spinner" style="display:none" aria-label="Loading"></span>
          </button>
        </div>
      </div>
      <div id="best-strip" class="best-strip" style="display:none"
           aria-label="Personal best score">
        <span class="best-strip__lbl">Personal Best</span>
        <span class="best-strip__val" id="best-val">0</span>
      </div>
    </div>

    <!-- Config -->
    <div class="start__config" id="rules-section">

      <div>
        <div class="eyebrow">Difficulty</div>
        <div class="diff-grid" role="group" aria-label="Select difficulty">
          <button class="diff-btn" data-d="easy"
                  onclick="selDiff('easy')" aria-pressed="false">
            <span class="diff-btn__name">Easy</span>
            <span class="diff-btn__att">10</span>
            <span class="diff-btn__sub">Attempts &middot; Unique digits</span>
          </button>
          <button class="diff-btn on" data-d="medium"
                  onclick="selDiff('medium')" aria-pressed="true">
            <span class="diff-btn__name">Medium</span>
            <span class="diff-btn__att">8</span>
            <span class="diff-btn__sub">Attempts &middot; Unique digits</span>
          </button>
          <button class="diff-btn" data-d="hard"
                  onclick="selDiff('hard')" aria-pressed="false">
            <span class="diff-btn__name">Hard</span>
            <span class="diff-btn__att">6</span>
            <span class="diff-btn__sub">Attempts &middot; Repeats allowed</span>
          </button>
        </div>
      </div>

      <div>
        <div class="eyebrow">How it Works</div>
        <div class="rules" role="list">
          <div class="rule" role="listitem">
            <span class="rule__n">01</span>
            <div>
              <div class="rule__title">Enter a 4-digit guess</div>
              <div class="rule__body">
                Type one digit per box. Press Enter or click Guess to submit.
              </div>
            </div>
          </div>
          <div class="rule" role="listitem">
            <span class="rule__n">02</span>
            <div>
              <div class="rule__title">Read the feedback</div>
              <div class="rule__body">
                Each digit is highlighted after your guess.
                <div class="legend">
                  <div class="legend-item">
                    <div class="legend-dot bull"></div>
                    <span>Bull &mdash; right digit, right position</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-dot cow"></div>
                    <span>Cow &mdash; right digit, wrong position</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-dot miss"></div>
                    <span>Miss &mdash; digit not in the number</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="rule" role="listitem">
            <span class="rule__n">03</span>
            <div>
              <div class="rule__title">Four bulls wins</div>
              <div class="rule__body">
                Get all four digits right in one guess. Run out of attempts and the
                secret is revealed.
              </div>
            </div>
          </div>
          <div class="rule" role="listitem">
            <span class="rule__n">04</span>
            <div>
              <div class="rule__title">Scoring</div>
              <div class="rule__body">
                Base 1000 + (remaining attempts &times; 100) + speed bonus.
                Wins only.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- GAME SCREEN -->
<section class="screen" id="scr-game" aria-label="Game screen">
  <div class="game">

    <!-- Sidebar -->
    <aside class="sidebar" aria-label="Game statistics">

      <div class="sb">
        <div class="srow">
          <span class="srow__lbl">Score</span>
          <span class="srow__val" id="g-score">—</span>
        </div>
        <div class="srow">
          <span class="srow__lbl">Best</span>
          <span class="srow__val" id="g-best"
                style="font-size:1rem;color:var(--wh4)">—</span>
        </div>
      </div>

      <div class="sb">
        <div class="srow">
          <span class="srow__lbl">Attempts Left</span>
          <span class="srow__val" id="g-left">—</span>
          <div class="pips" id="g-pips" aria-label="Attempts remaining"></div>
        </div>
        <div class="srow">
          <span class="srow__lbl">Difficulty</span>
          <span class="srow__val" id="g-diff"
                style="font-size:.875rem;text-transform:uppercase;
                       letter-spacing:.06em">—</span>
        </div>
      </div>

      <div class="sb" style="flex:1">
        <div class="eyebrow" style="margin-bottom:10px">Legend</div>
        <div class="sb-legend">
          <div class="sb-item">
            <div class="sb-dot bull"></div>
            Right digit, right position
          </div>
          <div class="sb-item">
            <div class="sb-dot cow"></div>
            Right digit, wrong position
          </div>
          <div class="sb-item">
            <div class="sb-dot miss"></div>
            Not in the number
          </div>
        </div>
      </div>

    </aside>

    <!-- Main -->
    <main class="gmain">

      <!-- Input bar -->
      <div class="input-bar">
        <div class="input-bar__lbl">Enter your 4-digit guess</div>
        <div class="input-row">
          <div class="dboxes" id="dboxes"
               role="group" aria-label="4-digit guess">
            <input class="dbox" id="d0" type="number"
                   min="0" max="9" maxlength="1" inputmode="numeric"
                   aria-label="Digit 1" autocomplete="off"/>
            <input class="dbox" id="d1" type="number"
                   min="0" max="9" maxlength="1" inputmode="numeric"
                   aria-label="Digit 2" autocomplete="off"/>
            <input class="dbox" id="d2" type="number"
                   min="0" max="9" maxlength="1" inputmode="numeric"
                   aria-label="Digit 3" autocomplete="off"/>
            <input class="dbox" id="d3" type="number"
                   min="0" max="9" maxlength="1" inputmode="numeric"
                   aria-label="Digit 4" autocomplete="off"/>
          </div>
          <button class="btn btn-primary" id="btn-guess"
                  onclick="submitGuess()">Guess</button>
          <button class="btn btn-ghost btn-sm"
                  onclick="clearBoxes()" aria-label="Clear input">Clear</button>
        </div>
        <div class="guess-err" id="guess-err" role="alert"></div>
      </div>

      <!-- History -->
      <div class="history" id="history"
           aria-label="Guess history" aria-live="polite"></div>

    </main>
  </div>
</section>

</div><!-- /app -->

<!-- RESULT OVERLAY -->
<div class="overlay" id="ov-result"
     role="dialog" aria-modal="true" aria-label="Game result">
  <div class="modal">
    <div class="modal__hdr">
      <span class="modal__title" id="res-title">Result</span>
      <span class="modal__tag"   id="res-tag">—</span>
    </div>
    <div class="modal__body">

      <div class="secret-reveal">
        <div class="secret-reveal__lbl">The secret number was</div>
        <div class="secret-reveal__num" id="res-secret">????</div>
      </div>

      <div class="stat-row">
        <div class="stat-cell">
          <div class="stat-cell__lbl">Score</div>
          <div class="stat-cell__val hi" id="res-score">—</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__lbl">Attempts</div>
          <div class="stat-cell__val" id="res-attempts">—</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__lbl">Mode</div>
          <div class="stat-cell__val" id="res-diff">—</div>
        </div>
      </div>

      <div id="res-msg"
           style="font-size:.75rem;color:var(--wh3);text-align:center;
                  margin-bottom:4px;min-height:1.2em"></div>

    </div>
    <div class="modal__foot">
      <button class="btn btn-primary" onclick="restartGame()">
        Play Again
      </button>
      <button class="btn btn-ghost" onclick="goStart()">
        Back to Menu
      </button>
    </div>
  </div>
</div>

<!-- FOOTER -->
<footer class="footer" role="contentinfo">
  <span class="footer__txt">Built by</span>
  <a class="footer__link"
     href="https://karthiiiidev.vercel.app/"
     target="_blank" rel="noopener noreferrer"
     aria-label="karthiiii.dev — opens in new tab">karthiiii.dev</a>
</footer>

<script>
'use strict';

/* ── State ─────────────────────────────────────── */
let gameId    = null;
let gameState = null;
let diff      = 'medium';
let muted     = localStorage.getItem('ng_muted') === 'true';
let bestScore = parseInt(localStorage.getItem('ng_best') || '0', 10);

/* ── Audio (Web Audio API, procedural) ────────── */
let _ac = null;
function ac() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}
function tone(f, dur, type, vol, delay) {
  type  = type  || 'sine';
  vol   = vol   || 0.15;
  delay = delay || 0;
  if (muted) return;
  try {
    var c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, c.currentTime + delay);
    g.gain.setValueAtTime(0,   c.currentTime + delay);
    g.gain.linearRampToValueAtTime(vol,    c.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime  + delay + dur + 0.05);
  } catch(_) {}
}
var SFX = {
  bull:    function() { tone(784,.08); tone(1047,.12,null,null,.08); },
  cow:     function() { tone(440,.08); tone(554,.1,null,null,.08); },
  miss:    function() { tone(220,.06,'square',.07); },
  win:     function() { [523,659,784,1047,1319].forEach(function(f,i){tone(f,.14,null,.2,i*.08);}); },
  lose:    function() { [440,392,349,294].forEach(function(f,i){tone(f,.2,null,.18,i*.16);}); },
  click:   function() { tone(660,.04,null,.08); },
  keytype: function() { tone(880,.025,null,.05); },
};

/* ── DOM ─────────────────────────────────────── */
var $ = function(id){ return document.getElementById(id); };
var scrStart = $('scr-start');
var scrGame  = $('scr-game');

function showScr(id) {
  [scrStart, scrGame].forEach(function(s){ s.classList.remove('active'); });
  $(id).classList.add('active');
}
function openOv(id)  { $(id).classList.add('open'); }
function closeOv(id) { $(id).classList.remove('open'); }

function setNav(activeId) {
  document.querySelectorAll('.hdr__nav-btn').forEach(function(b){
    b.classList.toggle('on', b.id === activeId);
  });
}

/* ── Difficulty ──────────────────────────────── */
function selDiff(d) {
  diff = d;
  document.querySelectorAll('.diff-btn').forEach(function(b){
    var on = b.dataset.d === d;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

/* ── Best score ──────────────────────────────── */
function updateBest() {
  var strip = $('best-strip');
  if (bestScore > 0) {
    strip.style.display = 'flex';
    $('best-val').textContent = bestScore.toLocaleString();
  }
  $('g-best').textContent = bestScore > 0 ? bestScore.toLocaleString() : '—';
}

/* ── Start game ──────────────────────────────── */
function handleStart() {
  SFX.click();
  var btn  = $('btn-start');
  var lbl  = $('btn-lbl');
  var spin = $('btn-spin');
  var err  = $('start-err');
  btn.disabled = true;
  lbl.style.display  = 'none';
  spin.style.display = '';
  err.classList.remove('show');

  api('/api/game/start', 'POST', { difficulty: diff })
    .then(function(data) {
      gameId    = data.id;
      gameState = data;
      $('history').innerHTML = '';
      showScr('scr-game');
      setNav('nav-play');
      renderHUD(data);
      focusFirst();
    })
    .catch(function(e) {
      err.textContent = e.message || 'Cannot reach server.';
      err.classList.add('show');
    })
    .finally(function() {
      btn.disabled      = false;
      lbl.style.display = '';
      spin.style.display = 'none';
    });
}

function goStart() {
  SFX.click();
  closeOv('ov-result');
  gameId = null; gameState = null;
  showScr('scr-start');
  setNav('nav-play');
  updateBest();
}

function scrollRules() {
  $('rules-section').scrollIntoView({ behavior: 'smooth' });
}

/* ── HUD ─────────────────────────────────────── */
function renderHUD(s) {
  $('g-score').textContent = s.won ? s.score.toLocaleString() : '—';
  $('g-best').textContent  = bestScore > 0 ? bestScore.toLocaleString() : '—';
  $('g-left').textContent  = s.attempts_left;
  $('g-diff').textContent  = s.difficulty;

  var pips = $('g-pips');
  pips.innerHTML = '';
  for (var i = 0; i < s.max_attempts; i++) {
    var p = document.createElement('div');
    p.className = 'pip' + (i >= s.attempts_left ? ' used' : '');
    pips.appendChild(p);
  }
}

/* ── Digit input wiring ──────────────────────── */
function focusFirst() {
  setTimeout(function(){ var el = $('d0'); if(el) el.focus(); }, 50);
}

function getDigits() {
  return [$('d0').value, $('d1').value, $('d2').value, $('d3').value];
}

function clearBoxes() {
  ['d0','d1','d2','d3'].forEach(function(id){
    $(id).value = '';
    $(id).classList.remove('has-val');
  });
  $('guess-err').textContent = '';
  $('d0').focus();
}

function wireInputs() {
  var ids = ['d0','d1','d2','d3'];
  ids.forEach(function(id, idx) {
    var el = $(id);

    el.addEventListener('input', function() {
      SFX.keytype();
      var v = el.value.replace(/[^0-9]/g, '');
      if (v.length > 1) v = v.slice(-1);
      el.value = v;
      el.classList.toggle('has-val', v !== '');
      if (v !== '' && idx < 3) $(ids[idx + 1]).focus();
    });

    el.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && el.value === '' && idx > 0) {
        $(ids[idx - 1]).focus();
      }
      if (e.key === 'Enter') submitGuess();
      if (e.key === 'ArrowRight' && idx < 3) {
        e.preventDefault(); $(ids[idx + 1]).focus();
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault(); $(ids[idx - 1]).focus();
      }
    });

    el.addEventListener('paste', function(e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/[^0-9]/g, '').slice(0, 4);
      pasted.split('').forEach(function(ch, i) {
        var tid = ids[idx + i];
        if (tid) {
          $(tid).value = ch;
          $(tid).classList.add('has-val');
        }
      });
      var next = idx + pasted.length;
      if (next < 4) $(ids[next]).focus();
    });
  });
}

/* ── Submit guess ────────────────────────────── */
function submitGuess() {
  if (!gameId || (gameState && gameState.game_over)) return;
  var digits = getDigits();
  var guess  = digits.join('');
  var errEl  = $('guess-err');
  errEl.textContent = '';

  if (digits.some(function(d){ return d === ''; })) {
    errEl.textContent = 'Enter all 4 digits.';
    return;
  }
  if (diff !== 'hard' && new Set(guess).size !== 4) {
    errEl.textContent = 'All digits must be unique on this difficulty.';
    return;
  }

  $('btn-guess').disabled = true;

  api('/api/game/' + gameId + '/guess', 'POST', { guess: guess })
    .then(function(res) {
      gameState = res.state;
      appendRow(res.row, res.state.attempts_used);
      renderHUD(res.state);

      /* play sound based on result */
      var bulls = res.row.bulls;
      var cows  = res.row.cows;
      if (bulls === 4)     SFX.win();
      else if (bulls >= 2) SFX.bull();
      else if (cows  >= 1) SFX.cow();
      else                 SFX.miss();

      clearBoxes();
      if (res.state.game_over) {
        setTimeout(function(){ showResult(res.state); }, 480);
      }
    })
    .catch(function(e) {
      errEl.textContent = e.message || 'Guess failed.';
    })
    .finally(function() {
      $('btn-guess').disabled = false;
    });
}

/* ── History row ─────────────────────────────── */
function appendRow(row, attemptNum) {
  var hist = $('history');
  var div  = document.createElement('div');
  div.className = 'hrow';
  div.setAttribute('role', 'row');

  var cells = row.result.map(function(r, i) {
    return '<div class="dcell ' + r + '" aria-label="Digit ' +
           row.guess[i] + ' ' + r + '">' + row.guess[i] + '</div>';
  }).join('');

  var bullPips = repeat('|', row.bulls) + repeat('·', 4 - row.bulls);
  var cowPips  = repeat('|', row.cows)  + repeat('·', 4 - row.cows - row.bulls);

  div.innerHTML =
    '<div class="hrow__n">' + pad2(attemptNum) + '</div>' +
    '<div class="hrow__cells">' + cells + '</div>' +
    '<div class="hrow__summary">' +
      '<div class="bull-txt">' + row.bulls +
        ' Bull' + (row.bulls !== 1 ? 's' : '') +
        '</div>' +
      '<div class="cow-txt">' + row.cows +
        ' Cow' + (row.cows !== 1 ? 's' : '') +
        '</div>' +
    '</div>';

  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function repeat(ch, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ch;
  return s;
}

/* ── Result overlay ──────────────────────────── */
function showResult(s) {
  var won = s.won;

  $('res-title').textContent  = won ? 'Solved' : 'Game Over';
  $('res-tag').textContent    = won ? 'Win' : 'Loss';
  $('res-secret').textContent = s.secret || '????';
  $('res-secret').classList.toggle('won', won);

  var score = s.score || 0;
  $('res-score').textContent    = won ? score.toLocaleString() : '—';
  $('res-attempts').textContent = s.attempts_used;
  $('res-diff').textContent     = s.difficulty;

  if (won) {
    $('res-msg').textContent = 'Well done — ' + s.attempts_used +
      ' attempt' + (s.attempts_used !== 1 ? 's' : '') + ' used.';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('ng_best', String(bestScore));
      updateBest();
      launchConfetti();
    }
  } else {
    $('res-msg').textContent = 'Out of attempts. The number was above.';
  }

  openOv('ov-result');
}

/* ── Restart ─────────────────────────────────── */
function restartGame() {
  SFX.click();
  closeOv('ov-result');
  gameId = null; gameState = null;
  showScr('scr-start');
  setNav('nav-play');
  setTimeout(handleStart, 60);
}

/* ── Confetti (canvas, orange/white) ─────────── */
function launchConfetti() {
  var canvas = $('confetti');
  var ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  var COLS  = ['#e85d04','#ff8c42','#f0ece7','#ffffff','#c43a00'];
  var parts = [];
  for (var i = 0; i < 100; i++) {
    parts.push({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height * 0.3 - canvas.height * 0.1,
      vx: (Math.random() - 0.5) * 7,
      vy: Math.random() * -9 - 3,
      r:  Math.random() * 5 + 2,
      color: COLS[Math.floor(Math.random() * COLS.length)],
      alpha: 1,
      rot: Math.random() * Math.PI * 2,
      rv:  (Math.random() - 0.5) * 0.3,
    });
  }

  var raf;
  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var alive = false;
    parts.forEach(function(p) {
      p.x  += p.vx; p.y += p.vy; p.vy += 0.28;
      p.rot += p.rv; p.alpha = Math.max(0, p.alpha - 0.012);
      if (p.alpha > 0) alive = true;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    });
    if (alive) raf = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

/* ── Sound toggle ────────────────────────────── */
function toggleMute() {
  muted = !muted;
  localStorage.setItem('ng_muted', String(muted));
  var btn = $('btn-snd');
  btn.classList.toggle('on', !muted);
  btn.style.opacity = muted ? '.4' : '1';
}

/* ── Keyboard ────────────────────────────────── */
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  var k = e.key.toLowerCase();
  if (k === 'm') { toggleMute(); return; }
  if (k === 'escape') {
    if ($('ov-result').classList.contains('open')) {
      closeOv('ov-result'); return;
    }
  }
  if (k === 'enter' && scrGame.classList.contains('active') &&
      !$('ov-result').classList.contains('open')) {
    e.preventDefault(); submitGuess();
  }
});

/* ── Fetch wrapper ───────────────────────────── */
function api(path, method, body) {
  method = method || 'GET';
  var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(path, opts).then(function(res) {
    if (!res.ok) {
      return res.json().catch(function(){ return { detail: 'Request failed' }; })
        .then(function(err) { throw new Error(err.detail || 'HTTP ' + res.status); });
    }
    return res.json();
  });
}

/* ── Init ────────────────────────────────────── */
(function init() {
  if (muted) {
    var btn = $('btn-snd');
    btn.classList.remove('on');
    btn.style.opacity = '.4';
  }
  updateBest();
  selDiff('medium');
  wireInputs();
})();
</script>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────
# Serve frontend
# ─────────────────────────────────────────────────────────────────

@app.get("/", response_class=Response)
def serve_frontend() -> Response:
    return Response(content=HTML, media_type="text/html; charset=utf-8")


# ─────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 42)
    print("  NumGrid   ->  http://localhost:8000")
    print("  API docs  ->  http://localhost:8000/docs")
    print("=" * 42 + "\n")
    uvicorn.run("numgrid:app", host="0.0.0.0", port=8000, reload=True)
