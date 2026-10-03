/**
 * Grid — 4×4 tile layout.
 * Re-renders with a staggered pop-in animation whenever the grid array changes.
 * On desktop (≥ 640 px) tiles are larger; on mobile they fill the card.
 */
import React, { useEffect, useRef, useState } from 'react'
import Tile from './Tile.jsx'

/**
 * @param {object}    props
 * @param {number[]}  props.grid          - array of 16 numbers
 * @param {number|null} props.wrongTile   - position of last wrong guess
 * @param {number|null} props.correctTile - position of last correct guess
 * @param {boolean}   props.disabled
 * @param {function}  props.onTileClick   - (position) => void
 * @param {boolean}   props.shake         - triggers screen-shake CSS class
 */
export default function Grid({ grid, wrongTile, correctTile, disabled, onTileClick, shake }) {
  // Track grid key to force re-mount of tiles on reshuffle
  const [gridKey, setGridKey] = useState(0)
  const prevGrid = useRef(grid)

  useEffect(() => {
    // Detect reshuffle: grid changed (different set of numbers)
    if (grid && prevGrid.current && !arraysEqual(grid, prevGrid.current)) {
      setGridKey(k => k + 1)
    }
    prevGrid.current = grid
  }, [grid])

  if (!grid || grid.length === 0) return null

  return (
    <div
      className={[
        'w-full',
        shake ? 'animate-screen-shake' : '',
      ].join(' ')}
      role="grid"
      aria-label="4 by 4 number grid"
    >
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        {grid.map((value, i) => (
          <div key={`${gridKey}-${i}`} role="gridcell">
            <Tile
              position={i}
              value={value}
              isCorrect={correctTile === i}
              isWrong={wrongTile === i}
              disabled={disabled}
              onClick={onTileClick}
              mountDelay={i * 25}   // stagger: 25 ms per tile = 375 ms total
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
