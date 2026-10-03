# NumGrid

## Single-file mode (recommended)

Run everything with one command � no Node, no npm, no build step:

```powershell
.\run.ps1
```

Then open **http://localhost:8000**

The entire app (backend API + frontend UI) is served from `numgrid.py`.

---
# NumGrid

A professional, full-stack 4×4 number guessing game.

**Stack:** FastAPI (Python) · React 18 · Vite · Tailwind CSS 3 · Web Audio API

---

## Quick start

You need **two terminals** running simultaneously.

### Terminal 1 — Backend

```powershell
.\start-backend.ps1
```

> Requires Python 3.10+. The script creates a venv and installs packages automatically.
> API available at **http://127.0.0.1:8000** · Swagger UI at **/docs**

### Terminal 2 — Frontend

```powershell
.\start-frontend.ps1
```

> Requires Node 18+. Run `npm install` inside `frontend/` first if it's a fresh clone.
> App available at **http://localhost:5173**

---

## Gameplay

| Action | Result |
|--------|--------|
| Tap a tile | Guess that number |
| Correct | +100 pts + time bonus × streak multiplier |
| Wrong | −1 life, streak reset, tile shakes red |
| Time out | −1 life, streak reset |
| 0 lives | Game over |

### Streak multipliers

| Streak | Multiplier |
|--------|-----------|
| 1–2    | ×1        |
| 3–4    | ×1.5      |
| 5–9    | ×2        |
| 10+    | ×3        |

Every 5 correct answers the round timer shrinks by 0.5 s (floor: 1 s).

### Difficulty

| Mode   | Timer | Numbers | Notes |
|--------|-------|---------|-------|
| Easy   | 10 s  | 1–16    | Relaxed pace |
| Medium | 6 s   | 1–16    | Default |
| Hard   | 3 s   | 1–99    | 99 numbers on 16 tiles |

---

## Keyboard shortcuts (during a game)

| Key(s) | Action |
|--------|--------|
| `1`–`9` | Guess tiles 1–9 (positions 0–8) |
| `Q W E R` | Guess tiles 10–13 |
| `A S D` | Guess tiles 14–16 |
| `↑ ↓ ← →` | Move focus between tiles |
| `Enter` / `Space` | Guess the focused tile |
| `P` | Pause / Resume |
| `Esc` | Pause / Close overlay |
| `M` | Toggle mute |

---

## Project structure

```
buildersvibe/
├── backend/
│   ├── main.py           ← FastAPI app — all game logic
│   ├── requirements.txt
│   └── leaderboard.json  ← auto-created on first submission
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── game.js          ← Axios API client
│   │   ├── hooks/
│   │   │   ├── useGame.js        ← game lifecycle & state
│   │   │   ├── useCountdown.js   ← rAF timer with server sync
│   │   │   └── useSound.js       ← Web Audio synth (no files)
│   │   ├── components/
│   │   │   ├── TimerRing.jsx     ← animated SVG countdown
│   │   │   ├── TargetCard.jsx    ← target number + streak badge
│   │   │   ├── ScorePanel.jsx    ← lives / score / streak / best
│   │   │   ├── Tile.jsx          ← single grid tile
│   │   │   ├── Grid.jsx          ← 4×4 tile grid
│   │   │   ├── StartScreen.jsx
│   │   │   ├── PauseScreen.jsx
│   │   │   ├── GameOverScreen.jsx ← canvas confetti on new best
│   │   │   └── Leaderboard.jsx
│   │   ├── App.jsx               ← router + keyboard handler
│   │   ├── main.jsx
│   │   └── index.css             ← Tailwind + global utilities
│   ├── tailwind.config.js
│   └── vite.config.js            ← /api proxy → :8000
│
├── start-backend.ps1
├── start-frontend.ps1
└── README.md
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/game/start` | Create session (body: `{difficulty}`) |
| `GET`  | `/api/game/{id}` | Poll current state |
| `POST` | `/api/game/{id}/guess` | Submit guess (body: `{position}`) |
| `POST` | `/api/game/{id}/pause` | Pause session |
| `POST` | `/api/game/{id}/resume` | Resume + reset round timer |
| `GET`  | `/api/game/{id}/stats` | Final stats |
| `GET`  | `/api/leaderboard` | Top-10 scores |
| `POST` | `/api/leaderboard` | Submit score |
| `GET`  | `/api/config` | Difficulty config |

---

## Design

- **Palette:** deep navy `#0b1020`, electric violet `#7c3aed`, cyan `#22d3ee`, emerald success, rose error
- **Typography:** Inter (UI) · JetBrains Mono (numbers)
- **Glassmorphism** cards with `backdrop-blur` and translucent 1 px borders
- **Animations:** staggered tile pop-in, shake on wrong, SVG timer ring, canvas confetti on new best, score counter counts up
- **Responsive:** stacked on mobile, two-column (stats | grid) on ≥640 px
- **Accessibility:** ARIA labels, focus-visible ring, `prefers-reduced-motion` kills all animations
- **Sound:** Web Audio API synthesised tones — no audio files, mutable, persisted in `localStorage`
