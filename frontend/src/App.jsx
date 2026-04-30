// Root application component. Manages page routing, global state, and coordinates
// between chat, notes, knowledge bases, search, documentation, and settings views.
// Uses a custom useChat hook for all backend communication and session management.
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'

import SearchPage from './components/SearchPage'
import SettingsPage from './components/SettingsPage'
import FollowUpPrompts from './components/FollowUpPrompts'
import ArtifactsPanel from './components/ArtifactsPanel'
import SearchModal from './components/SearchModal'
import Documentation from './components/documentation'
import KnowledgeBase from './components/KnowledgeBase'
import Notes from './components/Notes'
import NoteTypes from './components/NoteTypes'
import ShareModal from './components/ShareModal'
import SaveToKnowledgeModal from './components/SaveToKnowledgeModal'
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp'
import DateSeparator from './components/DateSeparator'
import { useChat } from './hooks/useChat'
import { ThemeProvider } from './hooks/useTheme'
import { extractArtifact } from './components/ArtifactsPanel'
import axios from 'axios'
import {
  SearchIcon,
  ChatIcon,
  KnowledgeIcon,
  NotesIcon,
  DocumentationIcon,
  SettingsIcon,
} from './components/common/Icons'

// Navigation pages shown in the sidebar. Each has an id (used for routing), label, icon, and component key.
const PAGES = [
  { id: 'search', label: 'Search Gate', icon: <SearchIcon size={18} />, component: 'search' },
  { id: 'chat', label: 'Chat', icon: <ChatIcon size={18} />, component: 'chat' },
  { id: 'knowledge', label: 'Knowledge Bases', icon: <KnowledgeIcon size={18} />, component: 'knowledge' },
  { id: 'notes', label: 'Notes', icon: <NotesIcon size={18} />, component: 'notes' },
  { id: 'documentation', label: 'Docs', icon: <DocumentationIcon size={18} />, component: 'documentation' },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} />, component: 'settings' },
]

// Inner app component wrapped by ThemeProvider. Contains all page routing, state management,
// and action handlers for chat messages, sessions, follow-ups, and modals.
function AppInner() {
  // Chat state and actions from custom hook - handles all backend communication
  const {
    messages,
    models,
    currentModel,
    setCurrentModel,
    config,
    isStreaming,
    error,
    sendMessage,
    sendAgentMessage,
    stopGeneration,
    clearHistory,
    setMessages,
    saveConfig,
    refreshModels,
    updateActiveSelection,
    currentProviderId,
    sessionKnowledgeBases,
    sessionKnowledgeBaseId,
    editMessage,
    deleteMessage,
    evaluateMessage,
    branchFromMessage,
    forkFromMessage,
    continueMessage,
    regenerateMessage,
    copyToClipboard,
    sessions,
    currentSessionId,
    switchSession,
    deleteSession,
    archiveSession,
    archiveAllSessions,
    deleteAllSessions,
    loadSessions,
    followups,
    setFollowups,
    generateFollowups,
    regenerateFollowups,
    clearFollowups,
    artifacts,
    setArtifacts,
    activeArtifact,
    setActiveArtifact,
  } = useChat()

  // Local UI state
  const [showShare, setShowShare] = useState(false)
  const [shareTarget, setShareTarget] = useState(null)
  const [showSaveToKnowledge, setShowSaveToKnowledge] = useState(false)
  const [saveToKnowledgeTarget, setSaveToKnowledgeTarget] = useState(null)
  const [activePage, setActivePage] = useState('search')
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [editingMessage, setEditingMessage] = useState(null)
  const [editText, setEditText] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [copiedTimeout, setCopiedTimeout] = useState(null)
  const [sessionActionTarget, setSessionActionTarget] = useState(null)
  const [toast, setToast] = useState(null)
  // Persist sidebar collapsed state in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    try {
      return saved !== null ? JSON.parse(saved) : false
    } catch (e) {
      console.error('Error parsing sidebar-collapsed from localStorage', e)
      return false
    }
  })
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [highlightMessage, setHighlightMessage] = useState(null)
  const [followupLoading, setFollowupLoading] = useState({})
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const messagesEndRef = useRef(null)
  const chatInputRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // Follow-up prompt behavior flags, read from config with safe defaults
  const followupSettings = {
    autoGenerate: config?.followup_auto_generate ?? true,
    keepInChat: config?.followup_keep_in_chat ?? false,
    insertToInput: config?.followup_insert_to_input ?? false,
  }

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Fetch all knowledge bases from the backend
  const loadKnowledgeBases = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge')
      if (!res.ok) {
        const text = await res.text()
        console.error(`Backend error (${res.status}):`, text)
        return
      }
      const data = await res.json()
      setKnowledgeBases(data.knowledge_bases || [])
    } catch (err) {
      console.error('Failed to load knowledge bases:', err)
    }
  }, [])

  useEffect(() => { loadKnowledgeBases() }, [loadKnowledgeBases])

  // Handle /notes/new?title=...&content=... URL - fires create-note-from-url event
  useEffect(() => {
    const path = window.location.pathname
    const notesMatch = path.match(/^\/notes\/new(?:\?.*)?$/i)
    if (notesMatch) {
      const params = new URLSearchParams(window.location.search)
      const title = params.get('title') || ''
      const content = params.get('content') || ''
      const note_type = params.get('type') || 'rich'
      setActivePage('notes')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('create-note-from-url', {
          detail: { title, content, note_type }
        }))
      }, 100)
      window.history.replaceState({}, '', '/notes')
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path === '/' || path === '/search') {
      setActivePage('search')
      window.history.replaceState({}, '', '/search')
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    const noteIdMatch = path.match(/^\/notes\/([^\/?]+)/i)
    if (noteIdMatch) {
      const noteId = noteIdMatch[1]
      setActivePage('notes')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-note-from-url', {
          detail: { noteId }
        }))
      }, 100)
      window.history.replaceState({}, '', '/notes')
    }
  }, [])

  // Auto-scroll when new messages arrive, but only if user is near the bottom.
  // If scrolled up reading history, show a "new messages" indicator instead.
  useEffect(() => {
    if (!messagesContainerRef.current || !messagesEndRef.current) return
    const container = messagesContainerRef.current
    const scrollThreshold = 150 // pixels from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setHasNewMessages(false)
    } else {
      setHasNewMessages(true)
    }
  }, [messages])

  // Scroll detection for scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollThreshold = 200
      const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > scrollThreshold
      setShowScrollButton(isScrolledUp)
      if (!isScrolledUp) setHasNewMessages(false)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setActivePage('search')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowKeyboardHelp(prev => !prev)
      }
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = async (query, type = 'all') => {
    try {
      const params = { q: query }
      if (type && type !== 'all') {
        params.type = type
      }
      const res = await axios.get('/api/search', { params })
      setSearchResults(res.data.results || [])
      return res.data.results || []
    } catch (err) {
      console.error('Search failed:', err)
      return []
    }
  }

  const handleSearchSelect = (result) => {
    setHighlightMessage(result.message_index !== null ? {
      index: result.message_index,
      query: result.query,
    } : null)
    handleSwitchSession(result.session_id)
  }

  const handleExportSession = async (sessionId) => {
    try {
      const res = await axios.get(`/api/sessions/${sessionId}/export`)
      const data = JSON.stringify(res.data, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-${sessionId.slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleUpdateSession = async (sessionId, updates) => {
    try {
      await axios.patch(`/api/sessions/${sessionId}`, updates)
      await loadSessions()
    } catch (err) {
      console.error('Update session failed:', err)
    }
  }

  useEffect(() => {
    if (!sessionActionTarget) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSessionActionTarget(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sessionActionTarget])

  const handleClearHistory = () => {
    clearHistory()
  }

  const handlePageSelect = (pageId) => {
    setActivePage(pageId)
    const pathMap = { search: '/search', chat: '/chat', knowledge: '/knowledge', notes: '/notes', documentation: '/docs', settings: '/settings' }
    window.history.replaceState({}, '', pathMap[pageId] || '/')
  }

  // ---- Message Action Handlers (edit, copy, evaluate, branch, fork, delete, regenerate) ----

  // Start editing a message - stores the message ID and current content
  const handleEdit = (msgId, content) => {
    setEditingMessage(msgId)
    setEditText(content)
  }

  // Save an edited message: calls the edit API to truncate history, then re-sends the prompt.
  // Uses parentId to maintain the conversation tree, and skipAddUser=true to avoid duplicating.
  const handleEditSave = async () => {
    if (!editingMessage || !editText.trim()) return
    const originalMsg = messages.find(m => m.id === editingMessage)
    if (!originalMsg) return

    const parentId = originalMsg.parentId || null
    const editedContent = editText

    setEditingMessage(null)
    setEditText('')

    await editMessage(editingMessage, editedContent)

    // Re-send without adding a duplicate user message
    await sendMessage(editedContent, [], [], [], parentId, true)
  }

  // Cancel editing - reset state without saving
  const handleEditCancel = () => {
    setEditingMessage(null)
    setEditText('')
  }

  // Copy message content to clipboard with a 2s visual confirmation
  const handleCopy = async (content) => {
    const ok = await copyToClipboard(content)
    if (ok) {
      if (copiedTimeout) clearTimeout(copiedTimeout)
      setCopiedId(Date.now())
      const t = setTimeout(() => setCopiedId(null), 2000)
      setCopiedTimeout(t)
    }
  }

  const handleEvaluate = async (msgId, rating) => { await evaluateMessage(msgId, rating) }
  const handleBranch = async (msgId) => { await branchFromMessage(msgId) }
  const handleFork = async (msgId) => { await forkFromMessage(msgId) }

  // Request the assistant to continue a truncated response
  const handleContinue = async () => {
    await sendMessage('Continue the response from where you left off.', [], [], [])
  }

  // Remove the last assistant message and re-send the user's prompt for a fresh response
  const handleRegenerate = async () => {
    const removed = await regenerateMessage()
    if (!removed) return
    await sendMessage(removed.content || 'Please regenerate the previous response.', [], [], [], removed.parentId || null)
    await loadSessions()
  }

  const handleDelete = async (msgId) => { await deleteMessage(msgId) }

  // Switch to a different chat session, clearing follow-up state to prevent stale data
  const handleSwitchSession = async (sessionId) => {
    await switchSession(sessionId)
    setFollowups({})
    setFollowupLoading({})
  }

  const openSessionAction = (type, sessionId = null) => {
    const target = sessionId ? sessions.find((session) => session.id === sessionId) : null
    setSessionActionTarget({
      type,
      sessionId,
      session: target || null,
    })
  }

  const handleDeleteSession = async (sessionId) => {
    openSessionAction('delete', sessionId)
  }

  const handleArchiveSession = async (sessionId) => {
    openSessionAction('archive', sessionId)
  }

  const handleDeleteAllSessions = async () => {
    openSessionAction('delete-all')
  }

  const handleArchiveAllSessions = async () => {
    openSessionAction('archive-all')
  }

  const handleConfirmSessionAction = async () => {
    if (!sessionActionTarget) return

    try {
      if (sessionActionTarget.type === 'delete') {
        await deleteSession(sessionActionTarget.sessionId)
        await loadSessions()
        setToast({ type: 'success', message: 'Session deleted' })
      } else if (sessionActionTarget.type === 'archive') {
        await archiveSession(sessionActionTarget.sessionId)
        await loadSessions()
        setToast({ type: 'success', message: 'Session archived' })
      } else if (sessionActionTarget.type === 'delete-all') {
        await deleteAllSessions()
        await loadSessions()
        setToast({ type: 'success', message: 'All sessions deleted' })
      } else if (sessionActionTarget.type === 'archive-all') {
        await archiveAllSessions()
        await loadSessions()
        setToast({ type: 'success', message: 'All sessions archived' })
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        await loadSessions()
        setToast({ type: 'error', message: 'Session no longer exists' })
      } else {
        setToast({ type: 'error', message: 'Action failed' })
      }
    } finally {
      setSessionActionTarget(null)
    }
  }

  const handleCancelSessionAction = () => {
    setSessionActionTarget(null)
  }

  // ---- Follow-up Prompt Handlers ----
  // If insertToInput mode: fills the input field. Otherwise: sends immediately.
  const handleFollowupSelect = (text) => {
    if (followupSettings.insertToInput) {
      chatInputRef.current?.setValue(text)
    } else {
      sendMessage(text, [], [], [])
    }
  }

  const handleRegenerateFollowups = async (messageId, messageText) => {
    setFollowupLoading(prev => ({ ...prev, [messageId]: true }))
    await regenerateFollowups(messageId, messageText)
    setFollowupLoading(prev => ({ ...prev, [messageId]: false }))
  }

  // Auto-generate follow-up prompts when the assistant finishes streaming.
  // Debounced 300ms to ensure content is fully written. Skips if already generated.
  useEffect(() => {
    if (!followupSettings.autoGenerate || isStreaming) return
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'assistant') return
    if (!lastMsg.content) return
    if (followups[lastMsg.id]) return // Already generated
    // Debounce slightly to ensure content is final
    const timer = setTimeout(() => {
      setFollowupLoading(prev => ({ ...prev, [lastMsg.id]: true }))
      generateFollowups(lastMsg.id, lastMsg.content).then(() => {
        setFollowupLoading(prev => ({ ...prev, [lastMsg.id]: false }))
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [isStreaming, messages, followupSettings.autoGenerate])

  useEffect(() => {
    if (!highlightMessage) return
    const timer = setTimeout(() => setHighlightMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [highlightMessage])

  // Returns UI metadata (title, description, button labels/styles) for session action confirmation modals
  const getSessionActionMeta = (action) => {
    switch (action?.type) {
      case 'archive':
        return {
          title: 'Archive session?',
          description: 'This moves the session into the archived history section and keeps it available for later.',
          confirmLabel: 'Archive session',
          confirmStyle: { background: 'var(--surface)', color: 'var(--text)' },
          accentStyle: { background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)' },
        }
      case 'delete-all':
        return {
          title: 'Delete all sessions?',
          description: 'This permanently removes every saved session and starts a fresh empty session.',
          confirmLabel: 'Delete all sessions',
          confirmStyle: { background: 'var(--danger)', color: '#fff' },
          accentStyle: { background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' },
        }
      case 'archive-all':
        return {
          title: 'Archive all sessions?',
          description: 'This moves every session into the archived history section and creates a new active session.',
          confirmLabel: 'Archive all sessions',
          confirmStyle: { background: 'var(--surface)', color: 'var(--text)' },
          accentStyle: { background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)' },
        }
      case 'delete':
      default:
        return {
          title: 'Delete session?',
          description: 'This will permanently remove the session and its message history.',
          confirmLabel: 'Delete session',
          confirmStyle: { background: 'var(--danger)', color: '#fff' },
          accentStyle: { background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' },
        }
    }
  }

  return (
    <div className="flex h-full" style={{ background: 'var(--bg)' }}>
      {toast && (
        <div
          className="fixed top-4 right-4 z-[70] max-w-sm rounded-xl border px-4 py-3 shadow-lg animate-fade-in"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'var(--text)',
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{
                background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 10-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 7a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{toast.message}</div>
            </div>
          </div>
        </div>
      )}

      {sessionActionTarget && (
        (() => {
          const actionMeta = getSessionActionMeta(sessionActionTarget)
          const session = sessionActionTarget.session
          const isBulk = sessionActionTarget.type === 'delete-all' || sessionActionTarget.type === 'archive-all'
          const countLabel = sessionActionTarget.type === 'delete-all' || sessionActionTarget.type === 'archive-all'
            ? `${sessions.length} sessions`
            : `${session?.message_count || 0} messages`

          return (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'var(--modal-backdrop)' }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCancelSessionAction()
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
            <div className="flex items-start gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--border)' }}>
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={actionMeta.accentStyle}>
                {sessionActionTarget.type.startsWith('archive') ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M2.5 4.75A1.75 1.75 0 0 1 4.25 3h11.5A1.75 1.75 0 0 1 17.5 4.75v2A1.75 1.75 0 0 1 15.75 8.5H4.25A1.75 1.75 0 0 1 2.5 6.75v-2Zm2 3.25h11v6.5A1.75 1.75 0 0 1 13.75 16.25h-7.5A1.75 1.75 0 0 1 4.5 14.5V8Zm3 1.25a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M8.485 2.1c.38-.77 1.47-.77 1.85 0l6.28 12.73A1.04 1.04 0 0115.69 16H4.31a1.04 1.04 0 01-.925-1.17L9.665 2.1zM10 7.5a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 7.5zm0 7.25a.875.875 0 100-1.75.875.875 0 000 1.75z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{actionMeta.title}</h3>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  {actionMeta.description}
                </p>
                <div className="mt-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  {isBulk ? (
                    <>
                      <div className="truncate font-medium" style={{ color: 'var(--text)' }}>{countLabel}</div>
                      <div className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>This action applies to the full session list.</div>
                    </>
                  ) : (
                    <>
                      <div className="truncate font-medium" style={{ color: 'var(--text)' }}>
                        {session?.preview || 'Empty session'}
                      </div>
                      <div className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {countLabel}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button
                onClick={handleCancelSessionAction}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSessionAction}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={actionMeta.confirmStyle}
              >
                {actionMeta.confirmLabel}
              </button>
            </div>
          </div>
        </div>
          )
        })()
      )}

      <Sidebar
        items={PAGES}
        activeItem={activePage}
        onItemSelect={handlePageSelect}
        onSettingsClick={() => setActivePage('settings')}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
        onArchiveSession={handleArchiveSession}
        onArchiveAllSessions={handleArchiveAllSessions}
        onDeleteAllSessions={handleDeleteAllSessions}
        onExportSession={handleExportSession}
        onUpdateSession={handleUpdateSession}
        onSearchClick={() => setActivePage('search')}
        onClearHistory={handleClearHistory}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          title={currentModel || 'CIO Intelligence Hub'}
          models={models}
          currentModel={currentModel}
          currentProviderId={currentProviderId}
          onModelSelect={updateActiveSelection}
        />

        {activePage === 'search' ? (
          <SearchPage
            onNavigateToChat={(sessionId, messageIndex) => {
              handleSwitchSession(sessionId)
              setActivePage('chat')
              if (messageIndex !== null && messageIndex !== undefined) {
                setHighlightMessage({ index: messageIndex, query: '' })
              }
            }}
            onNavigateToNote={(noteId) => {
              setActivePage('notes')
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-note-from-url', { detail: { noteId } }))
              }, 100)
            }}
            onNavigateToKnowledge={() => {
              setActivePage('knowledge')
            }}
          />
        ) : activePage === 'documentation' ? (
          <Documentation />
        ) : activePage === 'knowledge' ? (
          <KnowledgeBase onRefresh={loadKnowledgeBases} models={models} />
        ) : activePage === 'notes' ? (
          <Notes />
        ) : activePage === 'settings' ? (
          <SettingsPage
            config={config}
            onSave={saveConfig}
            models={models}
            onRefreshModels={refreshModels}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <main ref={messagesContainerRef} className="flex-1 overflow-y-auto relative">
              <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
                {copiedId && (
                  <div className="flex items-center gap-2 text-xs animate-fade-in px-3 py-2 rounded-lg"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--success)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Copied to clipboard
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-lg text-sm animate-fade-in"
                    style={{ background: 'var(--danger-subtle)', color: 'var(--danger-text)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--danger-icon)" className="w-4 h-4 shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in relative z-10">
                    {/* Animated Logo/Icon */}
                    <div className="relative mb-10">
                      <div className="absolute inset-0 blur-3xl opacity-40 animate-pulse" 
                        style={{ background: 'var(--gradient-primary)', borderRadius: '50%', transform: 'scale(0.8)' }} />
                      <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center glass-card-strong glow-accent-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 gradient-text">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00-.978-.2 4.48 4.48 0 00-.978-.2H3a1.125 1.125 0 00-1.125 1.125v1.5a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25v-1.5a1.125 1.125 0 00-1.125-1.125h-.75a3 3 0 01-3-3v-3.75a1.125 1.125 0 00-1.125-1.125h-.75a1.125 1.125 0 00-1.125 1.125v1.125a4.5 4.5 0 01-3 4.344V12zm-9 3h.008v.008H12v-.008z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Welcome Title with Gradient */}
                    <h2 className="text-4xl font-bold mb-4 tracking-tight gradient-text">
                      What can I help you with?
                    </h2>
                    <p className="text-lg mb-12 max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      Start a conversation with {currentModel || 'your AI assistant'}. 
                      Ask questions, write code, or explore ideas together.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-4 mb-8">
                      <button onClick={() => setActivePage('settings')}
                        className="flex items-center gap-2 text-sm px-7 py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 group"
                        style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:rotate-45">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Set up Assistant
                      </button>
                      <button onClick={() => setActivePage('search')}
                        className="flex items-center gap-2 text-sm px-7 py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 glass-button group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.35-4.35"/>
                        </svg>
                        Search Gate
                      </button>
                    </div>

                    {/* Quick Action Chips */}
                    <div className="w-full max-w-2xl">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3 text-center">
                        Try asking
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          'Explain a complex topic',
                          'Help me write code',
                          'Summarize a document',
                          'Brainstorm ideas',
                          'Debug an error',
                          'Create a plan',
                        ].map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(suggestion, [], [], [])}
                            className="px-4 py-2 rounded-full text-sm transition-all duration-200 hover:scale-105"
                            style={{
                              background: 'var(--surface)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--accent-primary)'
                              e.currentTarget.style.color = 'var(--text)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border)'
                              e.currentTarget.style.color = 'var(--text-secondary)'
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const isLastAssistant = i === messages.length - 1 && msg.role === 'assistant'
                      const shouldShowFollowups = msg.role === 'assistant' && (
                        followupSettings.keepInChat
                          ? followups[msg.id] && !isStreaming
                          : isLastAssistant && !isStreaming
                      )
                      const artifact = extractArtifact(msg.content)

                      // Check if we should show a date separator
                      const showDateSeparator = (() => {
                        if (i === 0) return true
                        const prevMsg = messages[i - 1]
                        if (!prevMsg?.timestamp || !msg?.timestamp) return false
                        const prevDate = new Date(prevMsg.timestamp * 1000).toDateString()
                        const currDate = new Date(msg.timestamp * 1000).toDateString()
                        return prevDate !== currDate
                      })()

                      return (
                        <div key={`${msg.id}-${i}`}>
                          {showDateSeparator && <DateSeparator timestamp={msg.timestamp} />}
                          <ChatMessage
                            message={msg}
                            isStreaming={i === messages.length - 1 && isStreaming && msg.role === 'assistant'}
                            knowledgeBases={knowledgeBases}
                            index={i}
                            totalMessages={messages.length}
                            highlight={highlightMessage?.index === i}
                            highlightQuery={highlightMessage?.index === i ? highlightMessage.query : null}
                            onEdit={handleEdit}
                            onCopy={handleCopy}
                            onEvaluate={handleEvaluate}
                            onDelete={handleDelete}
                            onBranch={handleBranch}
                            onFork={handleFork}
                            onContinue={handleContinue}
                            onRegenerate={handleRegenerate}
                            editingMessage={editingMessage}
                            editText={editText}
                            setEditText={setEditText}
                            onSaveEdit={handleEditSave}
                            onCancelEdit={handleEditCancel}
                            onShare={(msg) => { setShareTarget({ type: 'message', data: msg }); setShowShare(true) }}
                            onSaveToKnowledge={(msg) => { setSaveToKnowledgeTarget({ type: 'message', data: msg }); setShowSaveToKnowledge(true) }}
                            currentModel={currentModel}
                          />
                          {shouldShowFollowups && (
                            <div className="max-w-[85%]">
                              <FollowUpPrompts
                                messageId={msg.id}
                                messageText={msg.content}
                                suggestions={followups[msg.id] || []}
                                loading={followupLoading[msg.id]}
                                onSelect={handleFollowupSelect}
                                onRegenerate={handleRegenerateFollowups}
                              />
                            </div>
                          )}
                          {artifact && msg.role === 'assistant' && !isStreaming && (
                            <div className="flex max-w-[85%] mt-2">
                              <button
                                onClick={() => {
                                  const existing = artifacts[msg.id]
                                  if (existing) {
                                    const next = {
                                      ...artifacts,
                                      [msg.id]: {
                                        ...existing,
                                        versions: [...existing.versions, artifact.code]
                                      }
                                    }
                                    setArtifacts(next)
                                    setActiveArtifact(next[msg.id])
                                  } else {
                                    const newArtifact = {
                                      id: msg.id,
                                      title: 'Artifact',
                                      type: artifact.type,
                                      content: artifact.code,
                                      versions: [artifact.code],
                                    }
                                    const next = { ...artifacts, [msg.id]: newArtifact }
                                    setArtifacts(next)
                                    setActiveArtifact(newArtifact)
                                  }
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all"
                                style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3v13.5a3 3 0 01-3 3H5.25a3 3 0 01-3-3V5.25zm3-1.5A1.5 1.5 0 003.75 5.25v13.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H5.25z" clipRule="evenodd"/>
                                </svg>
                                Open as Artifact
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {messages.length > 0 && !isStreaming && (
                  <div className="flex justify-center pt-4 pb-2 animate-fade-in" />
                )}

                {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                  <div className="flex items-center gap-3 py-2 animate-fade-in">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }}>
                        <path fillRule="evenodd" d="M16.5 7.5h-9v9h9v-9z" />
                        <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21a.75.75 0 010 1.5h-.75V12h.75a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V18a.75.75 0 01-1.5 0v-.75h-2.25V18a.75.75 0 01-1.5 0v-.75H9V18a.75.75 0 01-1.5 0v-.75H6V18a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3a.75.75 0 010-1.5h.75V12H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 7.5v9a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-9A1.5 1.5 0 006 7.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to Bottom Button */}
              {showScrollButton && (
                <button
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                    setHasNewMessages(false)
                  }}
                  className="absolute bottom-4 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-105 z-20"
                  style={{
                    background: hasNewMessages ? 'var(--accent-primary)' : 'var(--surface)',
                    color: hasNewMessages ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${hasNewMessages ? 'var(--accent-primary)' : 'var(--border)'}`,
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  {hasNewMessages && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-semibold">New</span>
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </main>

            {/* Input Area */}
            <div className="shrink-0 border-t px-4 py-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="max-w-3xl mx-auto">
                  <ChatInput
                    ref={chatInputRef}
                    onSend={(text, kbs, files, notes, agents) => {
                      if (agents?.includes('web-search')) {
                        sendAgentMessage(text, false, true)
                      } else if (agents?.includes('notes-agent') || agents?.includes('coder')) {
                        sendAgentMessage(text, true, false)
                      } else {
                        sendMessage(text, kbs, files, notes)
                      }
                    }}
                   onStop={stopGeneration}
                  currentModel={currentModel}
                  disabled={isStreaming}
                  knowledgeBases={knowledgeBases}
                  sessionKnowledgeBases={sessionKnowledgeBases}
                  sessionKnowledgeBaseId={sessionKnowledgeBaseId}
                  onShare={() => setShowShare(true)}
                  hasMessages={messages.length > 0}
                />

              </div>
            </div>
          </div>
        )}
      </div>

      {activeArtifact && activePage === 'chat' && config?.artifacts_enabled !== false && (
        <ArtifactsPanel
          artifact={activeArtifact}
          onClose={() => setActiveArtifact(null)}
          allowSameOrigin={config?.iframe_same_origin ?? false}
        />
      )}

      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={handleSearch}
        onSelectResult={handleSearchSelect}
      />

      <ShareModal
        isOpen={showShare}
        onClose={() => { setShowShare(false); setShareTarget(null) }}
        session={sessions.find(s => s.id === currentSessionId)}
        messages={messages}
        shareTarget={shareTarget}
      />

      <SaveToKnowledgeModal
        isOpen={showSaveToKnowledge}
        onClose={() => { setShowSaveToKnowledge(false); setSaveToKnowledgeTarget(null) }}
        target={saveToKnowledgeTarget}
        knowledgeBases={knowledgeBases}
        onCreateKB={() => { setShowSaveToKnowledge(false); setSaveToKnowledgeTarget(null); setActivePage('knowledge') }}
      />

      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  )
}

// Root component - wraps the app in ThemeProvider so the theme is available everywhere
function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}

export default App
