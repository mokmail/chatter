import React, { useState, useEffect, useCallback, useRef } from 'react'

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
)

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
)

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const SearchModal = ({ isOpen, onClose, onSearch, onSelectResult }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSearch = useCallback((searchQuery) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await onSearch(searchQuery, activeFilter)
        setResults(Array.isArray(res) ? res : [])
        setSelectedIndex(0)
      } catch (err) {
        console.error('Search failed:', err)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }, [onSearch, activeFilter])

  useEffect(() => {
    handleSearch(query)
  }, [query, activeFilter, handleSearch])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      onSelectResult(results[selectedIndex])
      onClose()
    }
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ""
    const now = Date.now() / 1000
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60)
    const hours = Math.floor(diff / 3600)
    const days = Math.floor(diff / 86400)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days}d ago`
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const highlightMatch = (text, query) => {
    if (!query) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-500/30 text-yellow-600 dark:text-yellow-400 rounded px-0.5">{part}</mark> : part
    )
  }

  if (!isOpen) return null

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'title', label: 'Titles' },
    { id: 'content', label: 'Content' },
    { id: 'tag', label: 'Tags' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[var(--text-tertiary)]"><SearchIcon /></span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-[var(--text)] placeholder-[var(--text-tertiary)] outline-none text-sm"
          />
          <span className="text-[10px] hidden sm:inline px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-tertiary)] border border-[var(--border)]">
            ⌘K
          </span>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-[var(--surface)] rounded text-[var(--text-tertiary)]"
            >
              <CloseIcon />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[10px] px-2 py-1 rounded bg-[var(--surface)] text-[var(--text-tertiary)] border border-[var(--border)]"
          >
            ESC
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/50">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeFilter === filter.id
                  ? 'bg-[var(--accent)] text-[var(--text)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
          {isLoading && (
            <span className="ml-auto text-xs text-[var(--text-tertiary)] animate-pulse">Searching...</span>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.session_id}
                  onClick={() => {
                    onSelectResult(result)
                    onClose()
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    index === selectedIndex ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface)]/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-[var(--text-tertiary)]"><ChatIcon /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text)] truncate">
                        {highlightMatch(result.title || 'Untitled', query)}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-2">
                        {highlightMatch(result.snippet || '', query)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          result.match_type === 'title' ? 'bg-blue-500/20 text-blue-500' :
                          result.match_type === 'tag' ? 'bg-purple-500/20 text-purple-500' :
                          'bg-[var(--surface)] text-[var(--text-tertiary)]'
                        }`}>
                          {result.match_type}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {formatTimeAgo(result.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query && !isLoading ? (
            <div className="py-12 text-center">
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm text-[var(--text-secondary)]">No results found</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">Try different keywords</div>
            </div>
          ) : !query ? (
            <div className="py-8 text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="text-sm text-[var(--text-secondary)]">Search your conversations</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">Find chats by title, content, or tags</div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-tertiary)]/50 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↵</kbd>
                to select
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              {results.length} results
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchModal