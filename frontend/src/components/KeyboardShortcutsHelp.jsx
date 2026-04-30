import React from 'react'

const shortcuts = [
  { key: 'Enter', description: 'Send message' },
  { key: 'Shift + Enter', description: 'New line in message' },
  { key: 'Ctrl/Cmd + K', description: 'Open search' },
  { key: 'Esc', description: 'Close modal / Cancel editing' },
  { key: 'Ctrl/Cmd + /', description: 'Show keyboard shortcuts' },
]

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'var(--modal-backdrop)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border animate-fade-in"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--modal-shadow)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'var(--surface)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{shortcut.description}</span>
                <kbd
                  className="px-2 py-1 rounded text-xs font-mono font-medium"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Press <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>Esc</kbd> to close this dialog
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsHelp
