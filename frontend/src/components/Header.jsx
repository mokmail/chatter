import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'

const Header = ({ title, models = [], currentModel, currentProviderId, onModelSelect, isRoleplayActive, roleplayCharacter, onRoleplayClick }) => {
  const { theme, toggleTheme } = useTheme()
  const [showModels, setShowModels] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowModels(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider_name]) acc[model.provider_name] = []
    acc[model.provider_name].push(model)
    return acc
  }, {})

  return (
    <header className="relative flex items-center justify-between px-6 py-3.5 border-b overflow-visible z-30 bg-[var(--surface)]"
      style={{ 
        borderColor: 'var(--border)'
      }}
    >
      {/* Model Selector */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModels(!showModels)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl glass-button transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-ping opacity-40" />
            </div>
            <span className="text-sm font-semibold tracking-tight">{title}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
              className={`w-4 h-4 transition-transform duration-300 ${showModels ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-tertiary)' }}>
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {showModels && (
            <div className="absolute top-full left-0 mt-3 w-80 rounded-2xl overflow-hidden animate-fade-in-scale glass-card-strong z-50"
              style={{ boxShadow: 'var(--dropdown-shadow)' }}>
              <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {Object.keys(groupedModels).length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--surface)] flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    No models found. Check your connections.
                  </div>
                ) : (
                  Object.entries(groupedModels).map(([providerName, providerModels]) => (
                    <div key={providerName} className="mb-3 last:mb-0">
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2"
                        style={{ color: 'var(--text-tertiary)' }}>
                        <div className="w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
                        {providerName}
                      </div>
                      <div className="space-y-1">
                        {providerModels.map((m) => (
                          <button key={`${m.provider_id}-${m.id}`}
                            onClick={() => { onModelSelect(m.id, m.provider_id); setShowModels(false) }}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group/item"
                            style={{
                              background: currentModel === m.id && currentProviderId === m.provider_id ? 'var(--accent-subtle)' : 'transparent',
                              color: currentModel === m.id && currentProviderId === m.provider_id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              border: currentModel === m.id && currentProviderId === m.provider_id ? '1px solid var(--border-glow)' : '1px solid transparent',
                            }}>
                            <span className="truncate font-medium">{m.name}</span>
                            {currentModel === m.id && currentProviderId === m.provider_id && (
                              <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }}>
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="p-2.5 rounded-xl glass-button transition-all duration-300"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--accent-cyan)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--accent-primary)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>
    </header>
  )
}

export default Header
