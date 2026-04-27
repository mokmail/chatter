import React, { useState } from 'react'

const MenuItem = ({ onClick, icon, label, danger, shortcut }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left transition-colors"
      style={{ 
        color: danger ? (hovered ? 'var(--danger)' : 'var(--text-tertiary)') : (hovered ? 'var(--text)' : 'var(--text-secondary)'), 
        background: hovered ? 'var(--surface-hover)' : 'transparent' 
      }}>
      <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[10px] opacity-50">{shortcut}</span>}
    </button>
  )
}

export default MenuItem
