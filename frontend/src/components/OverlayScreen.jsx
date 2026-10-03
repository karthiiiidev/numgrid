import React from 'react'

/**
 * Reusable full-screen overlay for Pause and Game Over.
 */
export default function OverlayScreen({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-sm glass rounded-3xl p-8 shadow-2xl border border-white/8">
        {children}
      </div>
    </div>
  )
}
