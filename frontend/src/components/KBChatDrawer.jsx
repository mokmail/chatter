import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'
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
} from './common/Icons'
import MermaidDiagram from './chat/MermaidDiagram'

function KBChatDrawer({ isOpen, kb, sessions = [], activeSessionId, onClose, onSwitchSession, onCreateSession, onDeleteSession, onSaveChatToKB }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Load messages when session changes
  useEffect(() => {
    if (activeSessionId) {
      loadChatHistory()
    }
  }, [activeSessionId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle drawer visibility
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimatingOut(false)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClose = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsAnimatingOut(false)
      onClose()
    }, 300)
  }

  const loadChatHistory = async () => {
    try {
      const res = await fetch('/api/history')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
      setMessages([])
    }
  }

  const handleClearHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' })
      setMessages([])
    } catch (err) {
      console.error('Failed to clear chat history:', err)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !kb?.id) return

    const userInput = input
    setMessages((prev) => [...prev, { role: 'user', content: input }])
    setInput('')
    setIsStreaming(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          knowledge_base_ids: [kb.id],
          model: kb.config?.chat_model !== 'default' ? kb.config?.chat_model : undefined,
        }),
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

  const handleNewSession = async () => {
    if (!onCreateSession) return
    await onCreateSession()
  }

  const handleSwitchToSession = (sessionId) => {
    if (onSwitchSession) {
      onSwitchSession(sessionId)
    }
  }

  const handleDeleteCurrentSession = async () => {
    if (activeSessionId && onDeleteSession) {
      await onDeleteSession(activeSessionId)
    }
  }

  // Custom markdown components for rich rendering
  const markdownComponents = {
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : 'text'
      
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--accent-primary)] font-mono text-xs">
            {children}
          </code>
        )
      }
      
      return (
        <div className="my-3 rounded-lg overflow-hidden border border-[var(--glass-border)]">
          <div className="bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--text-muted)] border-b border-[var(--glass-border)]">
            {language}
          </div>
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            className="!bg-[var(--surface)] !p-3 !m-0 !text-xs"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      )
    },
    pre: ({ children }) => <>{children}</>,
    p: ({ children }) => <p className="mb-2">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="ml-2">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 py-1 my-2 text-[var(--text-secondary)] italic">
        {children}
      </blockquote>
    ),
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
    h4: ({ children }) => <h4 className="text-sm font-bold mb-1">{children}</h4>,
    h5: ({ children }) => <h5 className="text-sm font-bold mb-1">{children}</h5>,
    h6: ({ children }) => <h6 className="text-sm font-bold mb-1">{children}</h6>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="w-full border-collapse border border-[var(--border)]">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-[var(--border)] px-3 py-2 bg-[var(--surface)] font-bold text-left">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-[var(--border)] px-3 py-2">{children}</td>
    ),
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
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--glass-border)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-inner">
                  <BrainIcon size={22} />
                </div>
                <div>
                  <h2 className="font-black text-sm uppercase tracking-widest bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
                    Knowledge Chat
                  </h2>
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">RAG-powered conversations</p>
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

            {/* KB context banner */}
            {kb && (
              <div className="px-6 py-2.5 text-[10px] border-b border-[var(--glass-border)] flex items-center gap-2 bg-[var(--accent-primary)]/5">
                <span className="font-black uppercase tracking-widest text-[var(--accent-primary)] opacity-60">
                  Context:
                </span>
                <span className="font-bold truncate flex-1 text-[var(--text)]">
                  {kb.name || 'Untitled Knowledge Base'}
                </span>
              </div>
            )}

            {/* Sessions List */}
            {sessions && sessions.length > 0 && (
              <div className="px-4 py-3 border-b border-[var(--glass-border)] bg-[var(--surface)]/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Sessions
                  </p>
                  <button
                    onClick={handleNewSession}
                    className="p-1 rounded-lg glass-button text-[var(--accent-primary)] hover:scale-110 transition-all"
                    title="New session"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[10px] transition-all ${
                        session.id === activeSessionId
                          ? 'glass-card-strong border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5'
                          : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]'
                      }`}
                      onClick={() => handleSwitchToSession(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">
                          {session.title || session.preview || 'Chat Session'}
                        </div>
                      </div>
                      {session.id === activeSessionId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCurrentSession()
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition-all"
                          title="Delete session"
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-mesh">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-10 animate-fade-in">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 glass-card border-[var(--accent-primary)]/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/20 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
                    <SparklesIcon size={32} className="text-[var(--accent-primary)] relative z-10 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text)] mb-2 tracking-tight">
                    Ask the Knowledge Base
                  </h3>
                  <p className="text-xs font-bold leading-relaxed text-[var(--text-muted)]">
                    Ask questions about your documents and get AI-powered answers grounded in your knowledge base.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="animate-fade-in-up">
                  <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          components={markdownComponents}
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[[rehypeKatex, { output: 'mathml' }]]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {msg.role === 'assistant' && !isStreaming && (
                    <div className="flex justify-start mt-2 ml-12 gap-2">
                      <button
                        onClick={() => onSaveChatToKB?.(msg)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg glass-button text-[var(--accent-primary)] hover:scale-105 transition-all"
                        title="Save to knowledge base"
                      >
                        <span className="flex items-center gap-1">
                          <CheckIcon size={12} />
                          Save
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 glass-card border-[var(--glass-border)] shadow-lg">
                    <BrainIcon size={18} className="text-[var(--accent-primary)]" />
                  </div>
                  <div className="max-w-[85%] px-5 py-4 rounded-2xl text-sm glass-card-strong border-[var(--glass-border)] rounded-tl-none flex items-center gap-3">
                    <LoadingSpinner size={16} className="text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--accent-primary)] text-xs uppercase tracking-widest">
                      Processing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-[var(--glass-border)] shrink-0 glass-card">
              <div className="flex gap-2 relative group">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Ask about your knowledge base..."
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
                CIO Intelligence Hub v4.0
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default KBChatDrawer
