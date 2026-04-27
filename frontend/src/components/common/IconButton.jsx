import React, { useState } from 'react'

const IconButton = ({ onClick, title, active, activeColor, danger, children, className = '' }) => {
  const [hovered, setHovered] = useState(false)
  let color = 'var(--text-tertiary)'
  if (active) color = activeColor || 'var(--text)'
  else if (hovered) color = danger ? 'var(--danger)' : 'var(--text)'
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`p-1.5 rounded-md transition-all duration-150 ${className}`}
      style={{ color, background: hovered ? 'var(--surface-hover)' : 'transparent' }}>
      {children}
    </button>
  )
}

export default IconButton
