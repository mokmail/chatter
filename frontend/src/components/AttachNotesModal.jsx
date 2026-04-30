import React, { useState, useEffect, useMemo } from 'react'
import {
  CloseIcon,
  SearchIcon,
  FileTextIcon,
  PinIcon,
  ClockIcon,
  CheckIcon,
} from './common/Icons'

const AttachNotesModal = ({ isOpen, onClose, onAttach }) => {
  const [notes, setNotes] = useState([])
  const [selectedNotes, setSelectedNotes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadNotes()
    }
  }, [isOpen])

  const loadNotes = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notes')
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes.filter(n => !n.archived)
    const query = searchQuery.toLowerCase()
    return notes.filter(n =>
      !n.archived &&
      (n.title?.toLowerCase().includes(query) || n.content?.toLowerCase().includes(query))
    )
  }, [notes, searchQuery])

  const toggleNote = (note) => {
    setSelectedNotes(prev => {
      const exists = prev.find(n => n.id === note.id)
      if (exists) {
        return prev.filter(n => n.id !== note.id)
      }
      return [...prev, note]
    })
  }

  const isSelected = (noteId) => selectedNotes.some(n => n.id === noteId)

  const handleAttach = () => {
    if (selectedNotes.length > 0) {
      onAttach(selectedNotes)
      setSelectedNotes([])
      setSearchQuery('')
      onClose()
    }
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts * 1000)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'var(--modal-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border animate-fade-in flex flex-col"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--modal-shadow)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Attach Notes</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Select notes to inject into the chat context
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl glass-button text-[var(--text-tertiary)] hover:text-[var(--text)] transition-all"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors">
              <SearchIcon size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-card focus:outline-none focus:border-[var(--accent-primary)]/50 focus:glow-accent-sm transition-all placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-6 w-6 border-2 border-current rounded-full" style={{ color: 'var(--text-tertiary)', borderRightColor: 'transparent' }} />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <FileTextIcon size={32} className="text-[var(--text-muted)] mb-2" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'No notes match your search' : 'No notes available'}
              </p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => toggleNote(note)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected(note.id)
                    ? 'glass-card-strong border-[var(--accent-primary)]/40 glow-accent-sm'
                    : 'border-transparent hover:glass-card hover:border-[var(--glass-border)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    isSelected(note.id)
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--surface)] border border-[var(--border)]'
                  }`}>
                    {isSelected(note.id) && <CheckIcon size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-bold text-sm truncate ${isSelected(note.id) ? 'text-[var(--accent-primary)]' : 'text-[var(--text)]'}`}>
                        {note.title || 'Untitled'}
                      </h4>
                      {note.pinned && <PinIcon size={12} className="text-[var(--accent-primary)] shrink-0" />}
                    </div>
                    <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {note.content || 'No content'}
                    </p>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <ClockIcon size={12} />
                        {formatDate(note.updated_at)}
                      </span>
                      {note.tags?.length > 0 && (
                        <span className="flex items-center gap-1">
                          {note.tags.slice(0, 3).join(', ')}
                          {note.tags.length > 3 && ` +${note.tags.length - 3}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {selectedNotes.length > 0
              ? `${selectedNotes.length} note${selectedNotes.length !== 1 ? 's' : ''} selected`
              : 'Select notes to attach'
            }
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium glass-button text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleAttach}
              disabled={selectedNotes.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-[var(--accent-primary)] text-white disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--accent-primary)]/20"
            >
              Attach {selectedNotes.length > 0 ? `${selectedNotes.length} Note${selectedNotes.length !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttachNotesModal
