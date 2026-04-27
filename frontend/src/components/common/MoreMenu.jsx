import React, { useEffect } from 'react'

const MoreMenu = ({ isOpen, onClose, menuRef, children }) => {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose, menuRef])
  if (!isOpen) return null
  return (
    <div ref={menuRef}
      className="absolute bottom-full right-0 mb-1.5 animate-fade-in-scale rounded-lg py-1 z-50 min-w-[200px]"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'var(--dropdown-shadow)' }}>
      {children}
    </div>
  )
}

export default MoreMenu
