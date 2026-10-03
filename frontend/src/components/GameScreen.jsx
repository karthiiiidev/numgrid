import React from 'react'
import HUD from './HUD'
import TargetCard from './TargetCard'
import Grid from './Grid'

export default function GameScreen({ gameState, animatingTile, lastOutcome, lastRoundScore, bestScore, onGuess, onPause, onMenu }) {
  if (!gameState) return null

  const round  = gameState.current_round
  const tiles  = gameState.tiles ?? []

  return (
    <div className="min-h-screen flex flex-col max-w-sm mx-auto">

      {/* Top nav */}
      <HUD
        round={gameState.rounds_completed + 1}
        score={gameState.total_score}
        bestScore={bestScore}
        onPause={onPause}
        onMenu={onMenu}
      />

      {/* Target + timer */}
      <div className="glass-light border-b border-white/5">
        <TargetCard
          target={round?.target}
          attempts={round?.attempts ?? 0}
          wrongGuesses={round?.wrong_guesses ?? []}
          timeRemaining={round?.time_remaining ?? 0}
          timeLimit={round?.time_limit ?? 45}
          lastOutcome={lastOutcome}
          lastRoundScore={lastRoundScore}
        />
      </div>

      {/* Round badge */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-white/20">
          Round {gameState.rounds_completed + 1}
        </span>
        <span className="text-[10px] font-mono text-white/20">
          {tiles.filter(t => t.revealed).length} / 16 revealed
        </span>
      </div>

      {/* 4×4 grid */}
      <Grid
        tiles={tiles}
        animatingTile={animatingTile}
        onTileClick={onGuess}
        disabled={gameState.game_over}
      />

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}
