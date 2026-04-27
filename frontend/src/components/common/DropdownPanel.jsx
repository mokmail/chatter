import React, { useRef, useEffect } from 'react'

const DropdownPanel = ({ children, show, onClose, title, width = '280px' }) => {
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    if (show) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div ref={ref}
      className="absolute bottom-full left-0 mt-2 w-72 rounded-xl overflow-hidden animate-fade-in-scale z-50"
      style={{ 
        width,
        background: 'var(--glass-strong)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--dropdown-shadow)',
        overflow: 'hidden',
        backdropFilter: 'blur(12px) saturate(180%)',
      }}>
      {title && (
        <div className="p-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{title}</span>
        </div>
      )}
      <div className="p-1.5 max-h-64 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default DropdownPanel
