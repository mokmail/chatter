import React, { useState } from 'react'

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

const LoadingDots = () => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-1 h-1 rounded-full animate-pulse"
        style={{ 
          background: 'var(--text-tertiary)',
          animationDelay: `${i * 0.15}s`
        }}
      />
    ))}
  </div>
)

const FollowUpPrompts = ({
  messageId,
  messageText,
  suggestions = [],
  loading = false,
  onSelect,
  onRegenerate,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  if (loading && suggestions.length === 0) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="px-3 py-1.5 rounded-full text-xs flex items-center gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
          <LoadingDots /><span>Thinking...</span>
        </div>
      </div>
    )
  }

  if (!suggestions.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.text)}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          className="px-3 py-1.5 rounded-full text-[13px] transition-all duration-150"
          style={{ 
            background: hoveredIndex === i ? 'var(--surface-hover)' : 'var(--surface)',
            color: 'var(--text-secondary)',
            border: '1px solid',
            borderColor: hoveredIndex === i ? 'var(--accent)' : 'var(--border)',
            boxShadow: hoveredIndex === i ? 'var(--shadow-sm)' : 'none',
          }}
        >
          {s.text}
        </button>
      ))}
      <button
        onClick={() => onRegenerate(messageId, messageText)}
        className="p-1.5 rounded-full transition-all duration-150"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
        title="Regenerate suggestions"
      >
        {loading ? <LoadingDots /> : <RefreshIcon />}
      </button>
    </div>
  )
}

export default FollowUpPrompts