import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import StreamingCursor from './StreamingCursor'

const ThinkingBlock = ({ thought, isStreaming, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  if (!thought) return null
  return (
    <div className="mb-3">
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault()
          setIsOpen(!isOpen)
        }}
        className="flex items-center gap-1.5 text-[11px] font-medium transition-colors mb-1 hover:text-[var(--text-secondary)]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22a.75.75 0 10-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 001.06 1.06z" clipRule="evenodd" />
        </svg>
        <span>Thinking</span>
        {isStreaming && (
          <span className="flex gap-0.5 ml-0.5">{[0, 1, 2].map(i => <span key={i} className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'var(--text-tertiary)', animationDelay: `${i * 0.2}s` }} />)}</span>
        )}
      </button>
      {isOpen && (
        <div className="pl-3 text-xs leading-relaxed border-l-2 mb-4" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-xs max-w-none">
            {thought.trim()}
          </ReactMarkdown>
          {isStreaming && <StreamingCursor />}
        </div>
      )}
    </div>
  )
}

export default ThinkingBlock
