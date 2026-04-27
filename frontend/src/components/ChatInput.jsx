import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import AttachmentPill from './common/AttachmentPill'
import DropdownPanel from './common/DropdownPanel'
import TypingDots from './common/TypingDots'

const ChatInput = forwardRef(({ onSend, onStop, currentModel, disabled, knowledgeBases = [], sessionKnowledgeBases = [], onShare, hasMessages }, ref) => {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState({ files: [], notes: [], knowledgeBases: [], agents: [] })

  useImperativeHandle(ref, () => ({
    setValue: (text) => {
      setMessage(text)
      textareaRef.current?.focus()
    },
    getValue: () => message,
    clear: () => setMessage(''),
  }))

  // Sync selected knowledge bases with available ones (remove deleted ones)
  useEffect(() => {
    setAttachments(prev => {
      const validKBs = prev.knowledgeBases.filter(kb =>
        knowledgeBases.some(k => k.id === kb.id)
      )
      if (validKBs.length !== prev.knowledgeBases.length) {
        return { ...prev, knowledgeBases: validKBs }
      }
      return prev
    })
  }, [knowledgeBases])

  // Initialize KBs from session (persist across page reloads)
  useEffect(() => {
    if (sessionKnowledgeBases.length > 0) {
      const sessionKBObjects = sessionKnowledgeBases
        .map(id => knowledgeBases.find(k => k.id === id))
        .filter(Boolean)
      if (sessionKBObjects.length > 0 && attachments.knowledgeBases.length === 0) {
        setAttachments(prev => ({ ...prev, knowledgeBases: sessionKBObjects }))
      }
    }
  }, [sessionKnowledgeBases, knowledgeBases])

  const [activeDropdown, setActiveDropdown] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [sendAnimating, setSendAnimating] = useState(false)
  const [textareaFocused, setTextareaFocused] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const sendRef = useRef(null)

  const allAttachments = [
    ...attachments.files.map(f => ({ type: 'file', id: `file-${f.name}`, label: f.name, data: f })),
    ...attachments.notes.map((n, i) => ({ type: 'note', id: `note-${i}`, label: n.length > 30 ? n.slice(0, 30) + '...' : n, data: n })),
    ...attachments.knowledgeBases.map(kb => ({ type: 'knowledge', id: `kb-${kb.id}`, label: kb.name, data: kb })),
    ...attachments.agents.map(a => ({ type: 'agent', id: `agent-${a}`, label: a, data: a })),
  ]

  const removeAttachment = (id) => {
    setAttachments(prev => ({
      files: prev.files.filter(f => `file-${f.name}` !== id),
      notes: prev.notes.filter((_, i) => `note-${i}` !== id),
      knowledgeBases: prev.knowledgeBases.filter(kb => `kb-${kb.id}` !== id),
      agents: prev.agents.filter(a => `agent-${a}` !== id),
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim() && allAttachments.length === 0) return
    if (disabled) return

    setSendAnimating(true)
    setTimeout(() => setSendAnimating(false), 400)

    const selectedKBs = attachments.knowledgeBases.map(kb => kb.id)
    const selectedAgents = attachments.agents
    const fullMessage = message.trim()

    if (fullMessage || allAttachments.length > 0) {
      onSend(fullMessage, selectedKBs, attachments.files, attachments.notes, selectedAgents)
    }
    setMessage('')
    setAttachments({ files: [], notes: [], knowledgeBases: [], agents: [] })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileUpload = (files) => {
    const newFiles = Array.from(files).map(f => ({ name: f.name, file: f }))
    setAttachments(prev => ({ ...prev, files: [...prev.files, ...newFiles] }))
    setActiveDropdown(null)
  }

  const handleAddNote = () => {
    if (noteText.trim()) {
      setAttachments(prev => ({ ...prev, notes: [...prev.notes, noteText.trim()] }))
      setNoteText('')
      setShowNoteInput(false)
      setActiveDropdown(null)
    }
  }

  const toggleKB = (kb) => {
    setAttachments(prev => {
      const exists = prev.knowledgeBases.find(k => k.id === kb.id)
      if (exists) {
        return { ...prev, knowledgeBases: prev.knowledgeBases.filter(k => k.id !== kb.id) }
      }
      return { ...prev, knowledgeBases: [...prev.knowledgeBases, kb] }
    })
  }

  const toggleAgent = (agentName) => {
    setAttachments(prev => {
      const exists = prev.agents.includes(agentName)
      if (exists) {
        return { ...prev, agents: prev.agents.filter(a => a !== agentName) }
      }
      return { ...prev, agents: [...prev.agents, agentName] }
    })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const availableAgents = [
    { id: 'coder', name: 'Coder', description: 'Specialized in writing and reviewing code' },
    { id: 'researcher', name: 'Researcher', description: 'Deep research and analysis' },
    { id: 'writer', name: 'Writer', description: 'Creative and professional writing' },
    { id: 'analyst', name: 'Analyst', description: 'Data analysis and insights' },
    { id: 'notes-agent', name: 'Notes Agent', description: 'Autonomously manages your notes (search, create, update)' },
  ]

  const hasContent = message.trim() || allAttachments.length > 0

  return (
    <div className="w-full">
      {allAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 px-1 animate-fade-in">
          {allAttachments.map((item, idx) => (
            <div 
              key={`${item.type}-${idx}`}
              className="group flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl text-[11px] font-semibold transition-all duration-300 hover:scale-[1.02] bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:shadow-md"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div className="w-5 h-5 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                {item.type === 'file' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>
                )}
              </div>
              <span className="truncate max-w-[120px]">{item.name}</span>
              <button
                type="button"
                onClick={() => {
                  if (item.type === 'file') setAttachments(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== item.index) }))
                  if (item.type === 'note') setAttachments(prev => ({ ...prev, notes: prev.notes.filter((_, i) => i !== item.index) }))
                }}
                className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAttachments({ files: [], notes: [], knowledgeBases: [], agents: [] })}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Clear all
          </button>
        </div>
      )}

      <div
        className={`relative rounded-[var(--radius-lg)] transition-all duration-500 ${isDragging ? 'ring-2 ring-[var(--accent-primary)] scale-[1.01]' : ''} ${textareaFocused ? 'shadow-xl shadow-black/20 scale-[1.002] glass-card-strong' : 'glass-card'} border border-[var(--glass-border)] overflow-visible group/input`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {textareaFocused && (
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-primary)]/5 via-transparent to-[var(--accent-secondary)]/5 pointer-events-none transition-opacity duration-500" />
        )}

        {isDragging && (
          <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md bg-[var(--surface)]/90">
            <div className="flex flex-col items-center gap-4 animate-pop-in">
              <div className="p-4 rounded-2xl bg-[var(--gradient-primary)] text-white shadow-xl glow-accent">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l-4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>Drop to Upload</span>
            </div>
          </div>
        )}

        <div className="flex items-end gap-1 relative z-10 p-2 sm:p-3">
          {!disabled && (
            <div className="flex items-center gap-1 shrink-0 px-1 pb-1">
              <div className="relative z-30">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'attach' ? null : 'attach')}
                  className={`p-3 rounded-2xl transition-all duration-300 ${activeDropdown === 'attach' ? 'bg-[var(--accent-primary)] text-white scale-95 glow-accent-sm' : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:scale-110'}`}
                  title="Attach Context"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
                
                <DropdownPanel show={activeDropdown === 'attach'} onClose={() => setActiveDropdown(null)} title="Add to Context">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); setActiveDropdown(null) }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-xl transition-all hover:bg-[var(--surface-hover)] group/dropitem"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover/dropitem:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[var(--text-secondary)]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l-4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[var(--text)]">Upload File</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">PDF, Image, Text...</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowNoteInput(true); setActiveDropdown(null) }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-xl transition-all hover:bg-[var(--surface-hover)] group/dropitem"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover/dropitem:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[var(--text-secondary)]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[var(--text)]">Quick Note</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">Paste text context</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveDropdown('knowledge'); setActiveDropdown(null) }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-xl transition-all hover:bg-[var(--surface-hover)] group/dropitem"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover/dropitem:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[var(--text-secondary)]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.022 0 2.012.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[var(--text)]">Knowledge Base</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">Search your documents</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveDropdown('agent'); setActiveDropdown(null) }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-xl transition-all hover:bg-[var(--surface-hover)] group/dropitem"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover/dropitem:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[var(--text-secondary)]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[var(--text)]">Select Agent</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">Assign a specific role</div>
                      </div>
                    </button>
                  </div>
                </DropdownPanel>
              </div>

              <button
                onClick={() => setActiveDropdown(activeDropdown === 'knowledge' ? null : 'knowledge')}
                className={`p-2.5 rounded-xl transition-all duration-200 hover:bg-[var(--surface-hover)] ${attachments.knowledgeBases.length > 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}
                title="Knowledge Base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.022 0 2.012.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </button>

              <div className="relative z-30">
                <DropdownPanel show={activeDropdown === 'knowledge'} onClose={() => setActiveDropdown(null)} title="Knowledge Bases">
                  {knowledgeBases.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No knowledge bases available</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Create one in the Knowledge tab</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {knowledgeBases.map(kb => {
                        const isSelected = attachments.knowledgeBases.some(k => k.id === kb.id)
                        return (
                          <button
                            key={kb.id}
                            onClick={() => toggleKB(kb)}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors text-left"
                            style={{ 
                              background: isSelected ? 'var(--surface)' : 'transparent',
                              color: 'var(--text)',
                            }}
                          >
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors"
                              style={{ 
                                borderColor: isSelected ? 'var(--text)' : 'var(--border)',
                                background: isSelected ? 'var(--text)' : 'transparent',
                              }}>
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="var(--bg)" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.06l-5 7.5a.75.75 0 01-1.168.048l-3-3.25a.75.75 0 011.088-1.004l2.378 2.577 4.254-6.38a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{kb.name}</div>
                              {kb.description && <div className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{kb.description}</div>}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{kb.file_count} files</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </DropdownPanel>
              </div>

              <div className="relative">
                <DropdownPanel show={activeDropdown === 'agent'} onClose={() => setActiveDropdown(null)} title="Agents">
                  <div className="space-y-0.5">
                    {availableAgents.map(agent => {
                      const isSelected = attachments.agents.includes(agent.id)
                      return (
                        <button
                          key={agent.id}
                          onClick={() => toggleAgent(agent.id)}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors text-left"
                          style={{ 
                            background: isSelected ? 'var(--surface)' : 'transparent',
                            color: 'var(--text)',
                          }}
                        >
                          <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors"
                            style={{ 
                              borderColor: isSelected ? 'var(--text)' : 'var(--border)',
                              background: isSelected ? 'var(--text)' : 'transparent',
                            }}>
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="var(--bg)" className="w-3 h-3">
                                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.06l-5 7.5a.75.75 0 01-1.168.048l-3-3.25a.75.75 0 011.088-1.004l2.378 2.577 4.254-6.38a.75.75 0 011.04-.208z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{agent.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </DropdownPanel>
              </div>
            </div>
          )}

          {disabled && (
            <div className="shrink-0 px-1 pb-1">
              <TypingDots />
            </div>
          )}

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              placeholder={disabled ? 'AI is thinking...' : `Message ${currentModel || 'BEV Intelligence'}...`}
              disabled={disabled}
              rows={1}
              className="w-full rounded-xl px-3 py-3.5 resize-none disabled:opacity-50 transition-all duration-200 text-[15px] leading-relaxed placeholder:text-[var(--text-muted)]"
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--text)',
                border: 'none',
                outline: 'none',
                minHeight: '52px',
                maxHeight: '200px',
                boxShadow: 'none',
              }}
            />
          </div>

          <div className="relative shrink-0 pb-1 pr-1">
            {disabled ? (
              <button
                type="button"
                onClick={onStop}
                className="rounded-xl p-3 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 glow-success"
                title="Stop generating"
                style={{ 
                  background: 'var(--danger-subtle)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <div className="w-3.5 h-3.5 rounded-sm animate-pulse" style={{ background: 'currentColor' }} />
              </button>
            ) : (
              <button
                ref={sendRef}
                type="submit"
                disabled={(!message.trim() && allAttachments.length === 0) || disabled}
                className={`rounded-xl p-3.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center ${sendAnimating ? 'animate-send-fly' : ''} ${hasContent ? 'hover:scale-105 active:scale-95 glow-accent-sm' : ''}`}
                style={{ 
                  background: hasContent ? 'var(--gradient-primary)' : 'transparent',
                  color: hasContent ? 'white' : 'var(--text-tertiary)',
                  border: hasContent ? 'none' : '1px solid var(--glass-border)',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.818a.75.75 0 00.46.5l5.092 1.637c.3.096.3.508 0 .604l-5.094 1.636a.75.75 0 00-.46.501l-2.43 7.819a.75.75 0 00.926.94 60.462 60.462 0 0018.044-8.55.75.75 0 000-1.218A60.462 60.462 0 003.478 2.405z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {showNoteInput && (
        <div className="mt-2 animate-fade-in-scale">
          <div className="flex items-start gap-2 rounded-lg"
            style={{ 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              padding: '0.75rem',
            }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Quick Note</div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddNote()
                  }
                  if (e.key === 'Escape') {
                    setShowNoteInput(false)
                    setNoteText('')
                  }
                }}
                placeholder="Add context for this message..."
                rows={2}
                className="w-full px-3 py-2 rounded-md text-sm resize-none transition-all duration-200"
                style={{ 
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 disabled:opacity-30"
                  style={{ 
                    background: 'var(--text)',
                    color: 'var(--bg)',
                  }}
                >
                  Add Note
                </button>
                <button
                  onClick={() => { setShowNoteInput(false); setNoteText('') }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFileUpload(e.target.files); e.target.value = '' }}
      />

      <div className="text-center mt-2.5">
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {disabled ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-breathe" />
              AI is thinking...
            </span>
          ) : (
            'Press Enter to send · Shift+Enter for new line · Drag & drop files'
          )}
        </span>
      </div>
    </div>
  )
})

export default ChatInput