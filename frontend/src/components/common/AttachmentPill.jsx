import React from 'react'

const AttachmentPill = ({ label, onRemove }) => {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium animate-fade-in rounded-md"
      style={{ 
        background: 'var(--surface)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
      }}>
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 transition-colors hover:text-[var(--text)]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5">
          <path fillRule="evenodd" d="M4.22 4.22a.75.75 0 011.06 0L8 6.94l2.72-2.72a.75.75 0 1 11.06 1.06l-1.89 4.52a.75.75 0 01-1.396 0l-1.892-4.52a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

export default AttachmentPill
