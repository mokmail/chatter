import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  XIcon as CloseIcon,
  SendIcon,
  TrashIcon,
  UserIcon,
  SparklesIcon,
  StopIcon,
  BrainIcon,
  LoadingSpinner,
  PlusIcon,
  CheckIcon,
  EditIcon,
  TagIcon,
  MessageSquareIcon,
  CheckboxIcon,
  ChevronRightIcon,
} from './common/Icons'

const LightbulbIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
)

const BookmarkIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </svg>
)

const UsersIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const CalendarIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
)

const ACTION_TYPES = {
  APPEND: 'append',
  REPLACE: 'replace',
  COMMENT: 'comment',
  TODO: 'todo',
  TAG: 'tag',
  EXTRACT: 'extract',
  SUMMARIZE: 'summarize',
  QUESTION: 'question',
  DECISIONS: 'decisions',
  ACTION_PLAN: 'action_plan',
  FILL_ATTENDANCE: 'fill_attendance',
  GENERATE_MOTION: 'generate_motion',
}

const SmartActions = {
  [ACTION_TYPES.APPEND]: {
    label: 'Append to Note',
    icon: <PlusIcon size={14} />,
    description: 'Add this response at the end of your note',
    color: 'var(--accent-primary)',
    meeting: true,
  },
  [ACTION_TYPES.REPLACE]: {
    label: 'Replace Selection',
    icon: <EditIcon size={14} />,
    description: 'Replace the selected text with this response',
    color: 'var(--accent-secondary)',
    meeting: true,
  },
  [ACTION_TYPES.COMMENT]: {
    label: 'Add as Comment',
    icon: <MessageSquareIcon size={14} />,
    description: 'Attach this as a comment to the note',
    color: 'var(--text-secondary)',
    meeting: true,
  },
  [ACTION_TYPES.TODO]: {
    label: 'Create Todo',
    icon: <CheckboxIcon size={14} />,
    description: 'Extract action items as todos',
    color: 'var(--accent-cyan)',
    meeting: true,
  },
  [ACTION_TYPES.TAG]: {
    label: 'Add Tags',
    icon: <TagIcon size={14} />,
    description: 'Suggest and add relevant tags',
    color: 'var(--accent-tertiary)',
    meeting: true,
  },
  [ACTION_TYPES.EXTRACT]: {
    label: 'Extract Key Points',
    icon: <LightbulbIcon size={14} />,
    description: 'Pull out the main insights',
    color: '#f59e0b',
    meeting: true,
  },
  [ACTION_TYPES.SUMMARIZE]: {
    label: 'Add Summary',
    icon: <SparklesIcon size={14} />,
    description: 'Create a summary section',
    color: '#10b981',
    meeting: true,
  },
  [ACTION_TYPES.QUESTION]: {
    label: 'Ask Follow-up',
    icon: <ChevronRightIcon size={14} />,
    description: 'Continue the conversation',
    color: 'var(--accent-primary)',
    meeting: true,
  },
  [ACTION_TYPES.DECISIONS]: {
    label: 'Extract Decisions',
    icon: <CheckIcon size={14} />,
    description: 'Pull out decisions to the decisions table',
    color: '#22c55e',
    meeting: true,
  },
  [ACTION_TYPES.ACTION_PLAN]: {
    label: 'Build Action Plan',
    icon: <CheckboxIcon size={14} />,
    description: 'Create action items table with owners',
    color: '#6366f1',
    meeting: true,
  },
  [ACTION_TYPES.FILL_ATTENDANCE]: {
    label: 'Generate Attendees',
    icon: <UsersIcon size={14} />,
    description: 'Extract attendee names to attendance log',
    color: '#ec4899',
    meeting: true,
  },
  [ACTION_TYPES.GENERATE_MOTION]: {
    label: 'Add Motion',
    icon: <BookmarkIcon size={14} />,
    description: 'Add as a formal motion to vote on',
    color: '#f59e0b',
    meeting: true,
  },
}

function detectSmartActions(content, isMeeting = false) {
  const actions = []
  const lowerContent = content.toLowerCase()

  if (content.length > 100) {
    actions.push(ACTION_TYPES.SUMMARIZE)
  }

  if (lowerContent.includes('todo') || lowerContent.includes('task') ||
      lowerContent.includes('action') || lowerContent.includes('need to') ||
      lowerContent.includes('should') || lowerContent.includes('must') ||
      lowerContent.includes('important')) {
    actions.push(ACTION_TYPES.TODO)
  }

  if (lowerContent.includes('key point') || lowerContent.includes('main') ||
      lowerContent.includes('important') || lowerContent.includes('conclusion') ||
      lowerContent.includes('insight')) {
    actions.push(ACTION_TYPES.EXTRACT)
  }

  if (lowerContent.includes('tag') || lowerContent.includes('category') ||
      content.match(/\b[A-Z][a-z]+\b/g)?.length > 5) {
    actions.push(ACTION_TYPES.TAG)
  }

  if (content.length > 200) {
    actions.push(ACTION_TYPES.APPEND)
  }

  if (lowerContent.includes('decided') || lowerContent.includes('agreed') ||
      lowerContent.includes('approved') || lowerContent.includes('motion') ||
      lowerContent.includes('voted') || lowerContent.includes('resolved')) {
    actions.push(ACTION_TYPES.DECISIONS)
  }

  if (lowerContent.includes('action item') || lowerContent.includes('assign') ||
      lowerContent.includes('responsible') || lowerContent.includes('deadline') ||
      lowerContent.includes('owner') || lowerContent.includes('follow-up')) {
    actions.push(ACTION_TYPES.ACTION_PLAN)
  }

  if (lowerContent.includes('attendee') || lowerContent.includes('participant') ||
      lowerContent.includes('present') || lowerContent.includes('absent') ||
      lowerContent.includes('attending')) {
    actions.push(ACTION_TYPES.FILL_ATTENDANCE)
  }

  if (lowerContent.includes('motion') || lowerContent.includes('propose') ||
      lowerContent.includes('second')) {
    actions.push(ACTION_TYPES.GENERATE_MOTION)
  }

  actions.push(ACTION_TYPES.COMMENT)
  actions.push(ACTION_TYPES.QUESTION)

  if (isMeeting) {
    const meetingActions = [ACTION_TYPES.DECISIONS, ACTION_TYPES.ACTION_PLAN, ACTION_TYPES.FILL_ATTENDANCE, ACTION_TYPES.GENERATE_MOTION]
    actions.unshift(...meetingActions)
  }

  return [...new Set(actions)].slice(0, 8)
}

function ResponseActions({ messageIndex, content, onAction, isStreaming, noteType }) {
  const [showMenu, setShowMenu] = useState(false)
  const [selectedAction, setSelectedAction] = useState(null)

  const isMeeting = noteType === 'meeting'

  const suggestedActions = useMemo(() => {
    if (isStreaming) return []
    return detectSmartActions(content, isMeeting)
  }, [content, isStreaming, isMeeting])

  const handleAction = async (action) => {
    setSelectedAction(action)
    await onAction(action, content)
    setTimeout(() => {
      setShowMenu(false)
      setSelectedAction(null)
    }, 1500)
  }

  if (isStreaming || suggestedActions.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 animate-fade-in-up">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Quick Actions:
      </span>
      {suggestedActions.map((actionKey) => {
        const action = SmartActions[actionKey]
        if (!action) return null
        const isSelected = selectedAction === actionKey
        return (
          <button
            key={actionKey}
            onClick={() => handleAction(actionKey)}
            disabled={isSelected}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold
              transition-all duration-300 hover:scale-105 active:scale-95
              ${isSelected
                ? 'bg-[var(--accent-primary)] text-white'
                : 'glass-card border border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
              }
            `}
            style={!isSelected ? { '--hover-color': action.color } : {}}
            title={action.description}
          >
            {isSelected ? (
              <CheckIcon size={12} className="animate-pulse" />
            ) : (
              <span style={{ color: action.color }}>{action.icon}</span>
            )}
            <span className="whitespace-nowrap">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function NoteChatDrawer({ isOpen, note, onClose, onResponseAction }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimatingOut(false)
      setTimeout(() => inputRef.current?.focus(), 300)
      if (note?.id) loadChatHistory()
    }
  }, [isOpen, note?.id])

  const handleClose = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsAnimatingOut(false)
      onClose()
    }, 300)
  }

  const loadChatHistory = async () => {
    if (!note?.id) return
    try {
      const res = await fetch(`/api/notes/${note.id}/chat`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  }

  const handleClearHistory = async () => {
    if (!note?.id) return
    try {
      await fetch(`/api/notes/${note.id}/chat`, { method: 'DELETE' })
      setMessages([])
    } catch (err) {
      console.error('Failed to clear chat history:', err)
    }
  }

  const handleResponseAction = async (action, content) => {
    if (onResponseAction) {
      await onResponseAction({ action, content, note })
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !note?.id) return

    const userMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/notes/${note.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error('Chat failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      const assistantMessage = { role: 'assistant', content: '' }
      setMessages((prev) => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent }
          return updated
        })
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${err.message}` },
        ])
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }

  return (
    <>
      {isVisible && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
              isAnimatingOut ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={handleClose}
          />

          {/* Drawer */}
          <div
            className={`fixed right-0 top-0 h-[100dvh] w-[450px] z-50 flex flex-col shadow-2xl glass-card-strong border-l border-[var(--glass-border)] transition-transform duration-300 ease-out ${
              isAnimatingOut ? 'translate-x-full' : 'translate-x-0'
            }`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 border-b border-[var(--glass-border)] shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-inner">
                  <BrainIcon size={22} />
                </div>
                <div>
                  <h2 className="font-black text-sm uppercase tracking-widest bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
                    Note Intelligence
                  </h2>
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">AI Analysis & Context</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="p-2 rounded-xl glass-button text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                    title="Clear history"
                  >
                    <TrashIcon size={18} />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl glass-button text-[var(--text-muted)] hover:text-[var(--text)] transition-all"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </div>

            {/* Note context banner */}
            {note && (
              <div
                className="px-6 py-2.5 text-[10px] border-b border-[var(--glass-border)] flex items-center gap-2 bg-[var(--accent-primary)]/5"
              >
                <span className="font-black uppercase tracking-widest text-[var(--accent-primary)] opacity-60">Context:</span>
                <span className="font-bold truncate flex-1 text-[var(--text)]">
                  {note.title || 'Untitled Document'}
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-mesh">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-10 animate-fade-in">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 glass-card border-[var(--accent-primary)]/20 shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/20 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
                    <SparklesIcon size={32} className="text-[var(--accent-primary)] relative z-10 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text)] mb-2 tracking-tight">Ask your Note</h3>
                  <p className="text-xs font-bold leading-relaxed text-[var(--text-muted)]">
                    Ask questions, request summaries, or extract key action items from this document.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="animate-fade-in-up">
                  <div
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]'
                          : 'glass-card border-[var(--glass-border)]'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <UserIcon size={18} className="text-white" />
                      ) : (
                        <BrainIcon size={18} className="text-[var(--accent-primary)]" />
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-xl ${
                        msg.role === 'user'
                          ? 'bg-[var(--accent-primary)] text-white rounded-tr-none'
                          : 'glass-card-strong text-[var(--text)] border-[var(--glass-border)] rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>

                  {msg.role === 'assistant' && (
                    <ResponseActions
                      messageIndex={i}
                      content={msg.content}
                      onAction={handleResponseAction}
                      isStreaming={isStreaming && i === messages.length - 1}
                      noteType={note?.note_type}
                    />
                  )}
                </div>
              ))}

              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3 animate-pulse">
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 glass-card border-[var(--glass-border)] shadow-lg"
                  >
                    <BrainIcon size={18} className="text-[var(--accent-primary)]" />
                  </div>
                  <div
                    className="max-w-[85%] px-5 py-4 rounded-2xl text-sm glass-card-strong border-[var(--glass-border)] rounded-tl-none flex items-center gap-3"
                  >
                    <LoadingSpinner size={16} className="text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--accent-primary)] text-xs uppercase tracking-widest">Processing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="p-6 border-t border-[var(--glass-border)] shrink-0 glass-card"
            >
              <div className="flex gap-2 relative group">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Analyze this note..."
                  className="flex-1 pl-5 pr-12 py-3.5 rounded-2xl text-sm glass-card outline-none focus:border-[var(--accent-primary)]/50 focus:glow-accent-sm transition-all font-medium placeholder:text-[var(--text-muted)]"
                  disabled={isStreaming}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {isStreaming ? (
                    <button
                      onClick={handleStop}
                      className="p-2 rounded-xl bg-[var(--danger)] text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-[var(--danger)]/20"
                    >
                      <StopIcon size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="p-2 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white disabled:opacity-50 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-[var(--accent-primary)]/20"
                    >
                      <SendIcon size={18} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-[9px] text-center font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">
                Powered by CIO Intelligence Hub v4.0
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
