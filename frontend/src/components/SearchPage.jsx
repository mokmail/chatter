import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import bevLogo from '../assets/BEV_Logo-01.svg'
import {
  SearchIcon,
  ChatIcon,
  NotesIcon,
  KnowledgeIcon,
  ClockIcon,
  TagIcon,
  FileTextIcon,
  ExternalLinkIcon,
} from './common/Icons'

const NOTE_TYPE_LABELS = {
  rich: 'Rich Text',
  simple: 'Simple',
  voice: 'Voice',
  meeting: 'Meeting',
  research: 'Research',
  project: 'Project',
  daily: 'Daily',
  documentation: 'Docs',
  bug: 'Bug',
  feature: 'Feature',
  recipe: 'Recipe',
  book: 'Book',
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return ''
  const now = Date.now() / 1000
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60)
  const hours = Math.floor(diff / 3600)
  const days = Math.floor(diff / 86400)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

const highlightMatch = (text, query) => {
  if (!query || !text) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-500/30 text-yellow-600 dark:text-yellow-400 rounded px-0.5">{part}</mark> : part
  )
}

const ResultLinkIndicator = ({ type }) => {
  const styles = {
    chat: { bg: 'var(--accent-subtle)', color: 'var(--accent-primary)', label: 'Open Chat' },
    note: { bg: 'rgba(34,197,94,0.12)', color: 'var(--success)', label: 'Open Note' },
    knowledge: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Open KB' },
    file: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Open File' },
  }
  const s = styles[type] || styles.chat
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: s.bg, color: s.color }}
    >
      <ExternalLinkIcon size={10} />
      {s.label}
    </span>
  )
}

const ChatResult = ({ result, query, onSelect }) => (
  <button
    onClick={() => onSelect('chat', result)}
    className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>
        <ChatIcon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold truncate pr-2" style={{ color: 'var(--text)' }}>
            {highlightMatch(result.title || 'Untitled', query)}
          </div>
          <ResultLinkIndicator type="chat" />
        </div>
        <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
          {highlightMatch(result.snippet || '', query)}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            result.match_type === 'title' ? 'bg-blue-500/20 text-blue-500' :
            result.match_type === 'tag' ? 'bg-purple-500/20 text-purple-500' :
            'bg-[var(--surface)] text-[var(--text-tertiary)]'
          }`}>
            {result.match_type}
          </span>
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <ClockIcon size={12} />
            {formatTimeAgo(result.timestamp)}
          </span>
        </div>
      </div>
    </div>
  </button>
)

const NoteResult = ({ result, query, onSelect }) => (
  <button
    onClick={() => onSelect('note', result)}
    className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)' }}>
        <FileTextIcon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold truncate pr-2" style={{ color: 'var(--text)' }}>
            {highlightMatch(result.title || 'Untitled', query)}
          </div>
          <ResultLinkIndicator type="note" />
        </div>
        {result.snippet && (
          <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
            {highlightMatch(result.snippet, query)}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-500/20 text-green-500">
            {NOTE_TYPE_LABELS[result.note_type] || result.note_type}
          </span>
          {result.tags?.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-500/15 text-purple-400 flex items-center gap-0.5">
              <TagIcon size={10} />
              {tag}
            </span>
          ))}
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <ClockIcon size={12} />
            {formatTimeAgo(result.updated_at)}
          </span>
        </div>
      </div>
    </div>
  </button>
)

const KnowledgeResult = ({ result, query, onSelect }) => (
  <button
    onClick={() => onSelect('knowledge', result)}
    className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
        <KnowledgeIcon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold truncate pr-2" style={{ color: 'var(--text)' }}>
            {highlightMatch(result.name || 'Untitled', query)}
          </div>
          <ResultLinkIndicator type={result.target?.file_id ? 'file' : 'knowledge'} />
        </div>
        {(result.description || result.snippet) && (
          <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
            {highlightMatch(result.snippet || result.description || '', query)}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-500/15 text-blue-400">
            {result.kb_type}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {result.file_count} file{result.file_count !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] flex items-center gap-1 ml-auto" style={{ color: 'var(--text-muted)' }}>
            <ClockIcon size={12} />
            {formatTimeAgo(result.updated_at)}
          </span>
        </div>
      </div>
    </div>
  </button>
)

const SearchPage = ({ onNavigateToChat, onNavigateToNote, onNavigateToKnowledge }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ chats: [], notes: [], knowledge: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const performSearch = useCallback(async (searchQuery) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setResults({ chats: [], notes: [], knowledge: [] })
      setIsLoading(false)
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get('/api/search/all', { params: { q: searchQuery, limit: 30 } })
        setResults(res.data || { chats: [], notes: [], knowledge: [] })
        setHasSearched(true)
      } catch (err) {
        console.error('Search failed:', err)
        setResults({ chats: [], notes: [], knowledge: [] })
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    performSearch(query)
  }, [query, performSearch])

  const handleResultSelect = (type, result) => {
    // Prefer embedded target links when available
    const target = result.target
    if (type === 'chat') {
      onNavigateToChat?.(result.session_id, result.message_index)
    } else if (type === 'note') {
      onNavigateToNote?.(target?.note_id || result.id)
    } else if (type === 'knowledge') {
      onNavigateToKnowledge?.(target?.kb_id || result.id, target?.file_id)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setQuery('')
      inputRef.current?.focus()
    }
  }

  const chatCount = results.chats?.length || 0
  const noteCount = results.notes?.length || 0
  const knowledgeCount = results.knowledge?.length || 0
  const totalCount = chatCount + noteCount + knowledgeCount

  const tabs = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'chats', label: 'Chats', count: chatCount },
    { id: 'notes', label: 'Notes', count: noteCount },
    { id: 'knowledge', label: 'Knowledge Bases', count: knowledgeCount },
  ]

  const isEmpty = !isLoading && hasSearched && totalCount === 0

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-10">

          {/* Search Header */}
          <div className="text-center mb-10">
            {/* Logo */}
            <div className="mb-6">
              <img
                src={bevLogo}
                alt="BEV Logo"
                className="h-28 mx-auto object-contain"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(225, 50, 15, 0.2))' }}
              />
            </div>
            <h1 className="text-7xl font-thin tracking-tight mb-2 gradient-text" style={{ fontFamily: "'Inter', sans-serif" }}>Search</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Find anything across your chats, notes, and knowledge bases
            </p>
          </div>

          {/* Search Input */}
          <div className="relative mb-8 shadow-lg rounded-2xl">
            <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
              <SearchIcon size={24} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search chats, notes, knowledge bases..."
              className="w-full pl-14 pr-14 py-4 rounded-2xl text-lg outline-none transition-all duration-200"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-subtle)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl hover:bg-[var(--border)] transition-all"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            )}
            {isLoading && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2" style={{ color: 'var(--accent-primary)' }}>
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          {hasSearched && (
            <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
              <div className="flex items-center gap-1 px-1 py-1 rounded-xl" style={{ background: 'var(--surface)' }}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-[var(--text)] shadow-sm'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                    style={{
                      background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                    }}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === tab.id ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="space-y-3">
            {/* Chat Results */}
            {(activeTab === 'all' || activeTab === 'chats') && results.chats?.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 mb-3 mt-2">
                    <ChatIcon size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Chats
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                      {chatCount}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {results.chats.map(r => (
                    <ChatResult key={r.session_id} result={r} query={query} onSelect={handleResultSelect} />
                  ))}
                </div>
              </div>
            )}

            {/* Note Results */}
            {(activeTab === 'all' || activeTab === 'notes') && results.notes?.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 mb-3 mt-4">
                    <NotesIcon size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Notes
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                      {noteCount}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {results.notes.map(r => (
                    <NoteResult key={r.id} result={r} query={query} onSelect={handleResultSelect} />
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Base Results */}
            {(activeTab === 'all' || activeTab === 'knowledge') && results.knowledge?.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 mb-3 mt-4">
                    <KnowledgeIcon size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Knowledge Bases
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                      {knowledgeCount}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {results.knowledge.map(r => (
                    <KnowledgeResult key={r.id} result={r} query={query} onSelect={handleResultSelect} />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {isEmpty && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <SearchIcon size={24} />
                </div>
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  No results found
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Try different keywords or check your spelling
                </div>
              </div>
            )}

            {/* Initial State (no search yet) */}
            {!hasSearched && (
              <div className="py-16 text-center">
                <div className="flex justify-center gap-8 mb-10">
                  <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <ChatIcon size={20} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Chats</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <NotesIcon size={20} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Notes</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <KnowledgeIcon size={20} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Knowledge Bases</span>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Search across all your conversations, notes, and knowledge bases
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchPage
