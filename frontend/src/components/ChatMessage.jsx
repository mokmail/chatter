import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import MermaidDiagram from './chat/MermaidDiagram'
import CodeBlock from './chat/CodeBlock'
import StreamingCursor from './chat/StreamingCursor'
import ThinkingBlock from './chat/ThinkingBlock'
import MessageActions from './chat/MessageActions'

const codeComponent = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '')
  const code = String(children).replace(/\n$/, '')
  if (!inline && match && match[1] === 'mermaid') return <MermaidDiagram code={code} />
  if (!inline && match) return <CodeBlock language={match[1]} value={code} />
  return <code className={className} style={{ 
    backgroundColor: 'var(--surface-active)', 
    padding: '0.25em 0.5em', 
    borderRadius: '6px', 
    fontSize: '0.875em',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    border: '1px solid var(--border)'
  }} {...props}>{children}</code>
}

export default function ChatMessage({ message, isStreaming, knowledgeBases = [], index = 0, totalMessages = 1, highlight = false, highlightQuery = null, onEdit, onCopy, onEvaluate, onBranch, onFork, onContinue, onRegenerate, onDelete, onShare, onSaveToKnowledge, editingMessage, editText, setEditText, onSaveEdit, onCancelEdit }) {
  const isUser = message.role === 'user'
  const isAssistantStreaming = !isUser && isStreaming && message.content

  const activeKBs = (message.knowledgeBases || []).map(id => {
    const kb = knowledgeBases.find(k => k.id === id)
    return kb ? kb.name : id
  })

  const thoughtContent = message.reasoning || null
  const displayContent = message.content ? message.content.trim() : ''

  const isEditing = editingMessage === message.id

  const highlightText = (text, query) => {
    if (!query || !text) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <span key={i} className="bg-yellow-500/50 text-yellow-200 rounded px-0.5 animate-pulse">{part}</span> : part
    )
  }

  return (
    <div
      className={`group w-full mb-8 animate-slide-up stagger-${Math.min(index % 5 + 1, 5)} ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {highlight && (
        <div className="w-full mb-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          Search match: <span className="font-semibold">{highlightQuery}</span>
        </div>
      )}
      <div className={`flex gap-4 max-w-[92%] md:max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Premium Avatar */}
        <div className="shrink-0 mt-0.5">
          <div className={`
            w-11 h-11 rounded-2xl flex items-center justify-center 
            transition-all duration-500 ease-out
            ${isUser 
              ? 'user-avatar text-white scale-100 hover:scale-110' 
              : 'ai-avatar text-[var(--text-secondary)]'
            }
          `}>
            {isUser ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
              </svg>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className={`flex flex-col gap-2.5 min-w-0 flex-1 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Header with enhanced styling */}
          <div className="flex items-center gap-2.5 px-1">
            <span className={`
              text-[11px] font-semibold uppercase tracking-wider
              ${isUser ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}
            `}>
              {isUser ? 'You' : 'Assistant'}
            </span>
            {activeKBs.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-button text-[10px] text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-breathe" />
                {activeKBs.join(', ')}
              </div>
            )}
          </div>

          {/* Enhanced Message Bubble */}
          <div className={`
            w-full px-5 py-4 rounded-[var(--radius)] transition-all duration-300 relative overflow-hidden
            ${isUser 
              ? 'user-bubble' 
              : 'glass-card border border-[var(--glass-border)]'
            }
          `}>
            {/* Subtle shine effect for user bubbles */}
            {isUser && (
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            )}
            
            <ThinkingBlock 
              thought={thoughtContent} 
              isStreaming={isAssistantStreaming}
              defaultOpen={isAssistantStreaming && thoughtContent && !thoughtContent.endsWith('<tool_call>')} 
            />

            {isEditing && isUser ? (
              <div className="min-w-[320px]">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit && onSaveEdit() }
                    if (e.key === 'Escape') onCancelEdit && onCancelEdit()
                  }}
                  rows={3}
                  className="premium-input w-full resize-none focus:ring-2 ring-[var(--accent-primary)]/30"
                  autoFocus
                />
                <div className="flex items-center gap-2.5 mt-3">
                  <button 
                    onClick={() => onSaveEdit && onSaveEdit()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 glow-accent-sm"
                    style={{ background: 'var(--gradient-primary)', color: 'white' }}
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => onCancelEdit && onCancelEdit()}
                    className="px-4 py-2 rounded-xl text-xs font-medium glass-button text-[var(--text-secondary)] hover:text-[var(--text)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none relative z-10">
                {highlight && highlightQuery ? (
                  <div className="whitespace-pre-wrap">{highlightText(displayContent, highlightQuery)}</div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{ code: codeComponent }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                )}
                {isAssistantStreaming && <StreamingCursor />}
              </div>
            )}
          </div>

          {/* Enhanced Action Footer */}
          {!isEditing && (
            <div className={`
              opacity-0 group-hover:opacity-100 
              transition-all duration-300 ease-out
              transform translate-y-2 group-hover:translate-y-0
            `}>
              <MessageActions
                message={message}
                index={index}
                totalMessages={totalMessages}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopy={onCopy}
                onEvaluate={onEvaluate}
                onBranch={onBranch}
                onFork={onFork}
                onContinue={onContinue}
                onRegenerate={onRegenerate}
                onShare={onShare}
                onSaveToKnowledge={onSaveToKnowledge}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
