import React, { useMemo, useState, useEffect, useCallback } from 'react'
import logo from '../assets/Bundesamt-Eich-und-Vermessungswesen_Logo_srgb.png'
import {
  ChatIcon,
  KnowledgeIcon,
  NotesIcon,
  SettingsIcon,
  DocumentationIcon,
  SearchIcon,
  PlusIcon,
  MoreIcon,
  CloseIcon,
  ChevronDownIcon,
  MenuIcon,
  TrashIcon,
  ArchiveIcon,
  EditIcon,
  BrainIcon,
} from './common/Icons'

const IconWrapper = ({ children, className = '' }) => (
  <span className={`flex items-center justify-center ${className}`}>
    {children}
  </span>
)

const Sidebar = ({
  items,
  activeItem,
  onItemSelect,
  onSettingsClick,
  sessions = [],
  currentSessionId,
  onSwitchSession,
  onDeleteSession,
  onArchiveSession,
  onArchiveAllSessions,
  onDeleteAllSessions,
  onExportSession,
  onUpdateSession,
  onSearchClick,
  collapsed,
  onToggleCollapse,
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [hoveredNavItem, setHoveredNavItem] = useState(null)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('bev-sidebar-width')
    return saved ? parseInt(saved, 10) : 260
  })
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setIsOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Sidebar resize handlers
  const startResizing = useCallback((e) => {
    if (collapsed || isMobile) return
    setIsResizing(true)
    e.preventDefault()
  }, [collapsed, isMobile])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
    localStorage.setItem('bev-sidebar-width', sidebarWidth.toString())
  }, [sidebarWidth])

  const resize = useCallback((e) => {
    if (!isResizing) return
    const newWidth = Math.max(200, Math.min(500, e.clientX))
    setSidebarWidth(newWidth)
  }, [isResizing])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, resize, stopResizing])

  const activeSessions = useMemo(() => sessions.filter(s => !s.archived), [sessions])
  const archivedSessions = useMemo(() => sessions.filter(s => s.archived), [sessions])

  const filteredActiveSessions = useMemo(() => {
    if (!searchTerm.trim()) return activeSessions
    const term = searchTerm.toLowerCase()
    return activeSessions.filter(s => 
      (s.title || "").toLowerCase().includes(term) || 
      (s.preview || "").toLowerCase().includes(term)
    )
  }, [activeSessions, searchTerm])

  const groupSessionsByTime = (sessionsList) => {
    const now = Date.now() / 1000
    const day = 86400
    const groups = { today: [], yesterday: [], prev7days: [], prev30days: [], older: [], archived: [] }

    sessionsList.forEach(s => {
      if (s.archived) {
        groups.archived.push(s)
      } else {
        const age = now - (s.updated_at || s.created_at)
        if (age < day) {
          groups.today.push(s)
        } else if (age < 2 * day) {
          groups.yesterday.push(s)
        } else if (age < 7 * day) {
          groups.prev7days.push(s)
        } else if (age < 30 * day) {
          groups.prev30days.push(s)
        } else {
          groups.older.push(s)
        }
      }
    })

    return groups
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

  const groupedSessions = useMemo(() => groupSessionsByTime(filteredActiveSessions), [filteredActiveSessions])

  const handleTitleEdit = (session) => {
    setEditingSessionId(session.id)
    setEditingTitle(session.title || session.preview || "")
  }

  const handleTitleSave = () => {
    if (editingSessionId && editingTitle.trim()) {
      onUpdateSession?.(editingSessionId, { title: editingTitle.trim() })
    }
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditingSessionId(null)
      setEditingTitle("")
    }
  }

  const NavItem = ({ item }) => {
    const isActive = activeItem === item.id
    const isHovered = hoveredNavItem === item.id

    return (
      <div className="relative group/nav px-1">
        <button
          onClick={() => { onItemSelect(item.id); if (isMobile) setIsOpen(false) }}
          onMouseEnter={() => setHoveredNavItem(item.id)}
          onMouseLeave={() => setHoveredNavItem(null)}
          className={`
            flex items-center transition-all duration-300 w-full relative z-10 overflow-hidden
            ${collapsed && !isMobile ? 'justify-center py-3.5' : 'px-3 py-2.5 gap-3'}
            ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'}
            rounded-xl
          `}
        >
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/10 to-transparent border border-[var(--accent-primary)]/20 rounded-xl glow-accent-sm" />
          )}
          {!isActive && isHovered && (
            <div className="absolute inset-0 bg-[var(--surface)]/60 border border-[var(--glass-border)] rounded-xl" />
          )}
          
          <span className={`shrink-0 relative z-10 ${isHovered ? 'scale-110' : ''} ${isActive ? 'text-[var(--accent-primary)]' : ''} transition-all duration-300`}>
            <IconWrapper className={isHovered ? 'animate-pulse' : ''}>
              {item.icon}
            </IconWrapper>
          </span>
          {(!collapsed || isMobile) && (
            <span className={`text-sm font-semibold relative z-10 tracking-tight ${isActive ? 'opacity-100' : 'opacity-80 group-hover/nav:opacity-100'} transition-opacity`}>
              {item.label}
            </span>
          )}
        </button>

        {collapsed && !isMobile && isHovered && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 glass-card-strong text-[var(--text)] text-xs font-bold rounded-xl z-50 whitespace-nowrap animate-fade-in-scale">
            {item.label}
          </div>
        )}
      </div>
    )
  }

  const SessionItem = ({ session, isEditing, editingTitle, onTitleEdit, onTitleSave, onTitleKeyDown, onTitleChange }) => {
    const isActive = session.id === currentSessionId

    return (
      <div className="relative group/session px-1">
        <div
          role="button"
          tabIndex={0}
          onClick={() => { onSwitchSession(session.id); if (isMobile) setIsOpen(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSwitchSession(session.id); if (isMobile) setIsOpen(false) } }}
          className={`
            w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between cursor-pointer gap-2
            ${isActive ? 'glass-card-strong border-[var(--accent-primary)]/30 text-[var(--text)] glow-accent-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]/40 hover:border-[var(--glass-border)] border border-transparent'}
          `}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
            {session.is_unread && (
              <span className="w-2 h-2 rounded-full shrink-0 bg-[var(--accent-primary)] animate-breathe shadow-sm shadow-[var(--accent-primary)]/50" title="Unread" />
            )}
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={onTitleKeyDown}
                onBlur={onTitleSave}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="flex-1 min-w-0 px-2 py-1 text-sm glass-card text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)]/50 focus:glow-accent-sm"
              />
            ) : (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--surface)]/60 border border-[var(--glass-border)] text-[var(--accent-primary)] shrink-0 font-mono font-medium">
                  {session.message_count || 0}
                </span>
                <span className={`text-sm truncate flex-1 ${isActive ? 'font-medium text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
                  {session.title || session.preview || 'New Chat'}
                </span>
              </>
            )}
            <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-medium">
              {formatTimeAgo(session.updated_at || session.created_at)}
            </span>
          </div>

          <div className="flex gap-0.5 opacity-0 group-hover/session:opacity-100 transition-all duration-200">
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); handleTitleEdit(session) }}
              className="p-1.5 rounded-lg glass-button text-[var(--text-muted)] hover:text-[var(--accent-primary)] cursor-pointer hover:scale-110 transition-transform"
              title="Rename"
            >
              <EditIcon size={14} />
            </div>
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onArchiveSession(session.id) }}
              className="p-1.5 rounded-lg glass-button text-[var(--text-muted)] hover:text-[var(--success)] cursor-pointer hover:scale-110 transition-transform"
              title="Archive"
            >
              <ArchiveIcon size={14} />
            </div>
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id) }}
              className="p-1.5 rounded-lg glass-button text-[var(--danger)]/70 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 cursor-pointer hover:scale-110 transition-transform"
              title="Delete"
            >
              <TrashIcon size={14} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSessionGroup = (title, sessionsList) => {
    if (!sessionsList || sessionsList.length === 0) return null
    return (
      <div className="space-y-1">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
          {title}
        </div>
        {sessionsList.map(session => (
          <SessionItem
            key={session.id}
            session={session}
            isEditing={editingSessionId === session.id}
            editingTitle={editingTitle}
            onTitleEdit={handleTitleEdit}
            onTitleSave={handleTitleSave}
            onTitleKeyDown={handleTitleKeyDown}
            onTitleChange={setEditingTitle}
          />
        ))}
      </div>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Section */}
      <div className={`px-4 pt-5 pb-4 shrink-0 border-b border-[var(--glass-border)] ${collapsed && !isMobile ? 'items-center' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/10 border border-[var(--glass-border)] transition-all duration-300 ${collapsed && !isMobile ? 'h-10 w-10' : 'h-12 w-12'}`}>
              <img 
                src={logo} 
                alt="Logo" 
                className={`object-contain transition-all duration-300 ${collapsed && !isMobile ? 'h-7 w-7' : 'h-8 w-8'}`} 
              />
            </div>
            {!collapsed && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--accent-primary)] animate-breathe shadow-lg shadow-[var(--accent-primary)]/50" />
            )}
          </div>
          {!collapsed && !isMobile && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold tracking-tight text-[var(--text)] truncate">BEV Intelligence</div>
              <div className="text-[10px] text-[var(--text-muted)] font-medium">AI Assistant</div>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className="ml-auto p-2 rounded-xl glass-button text-[var(--text-secondary)] hover:text-[var(--text)] transition-all duration-200"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {collapsed ? (
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
                ) : (
                  <path d="M11 17l-7-7 7-7M19 17l-7-7 7-7"/>
                )}
              </svg>
            </button>
          )}
          {isMobile && (
            <button 
              onClick={() => setIsOpen(false)} 
              className="ml-auto p-2 rounded-xl glass-button text-[var(--text-secondary)] hover:text-[var(--text)]"
            >
              <CloseIcon size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation & History Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 px-2 space-y-6">
        {/* Main Nav Items */}
        <div className="space-y-1">
          {items.filter(item => !['documentation', 'settings'].includes(item.id)).map(item => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        {/* Sessions Section */}
        {(!collapsed || isMobile) && (
          <div className="space-y-4">
            {/* Active History */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 mb-2 group/header">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                >
                  <span className={`transition-transform duration-200 ${showHistory ? '' : '-rotate-90'}`}>
                    <ChevronDownIcon size={14} />
                  </span>
                  <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">History</span>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                  <button onClick={onArchiveAllSessions} className="p-1.5 rounded-lg glass-button text-[var(--text-muted)] hover:text-[var(--accent-primary)]" title="Archive all active">
                    <ArchiveIcon size={16} />
                  </button>
                  <button onClick={onDeleteAllSessions} className="p-1.5 rounded-lg glass-button text-[var(--danger)]/70 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10" title="Delete all">
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
              
              {showHistory && (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {/* Search History */}
                  <div className="relative group/search px-1 pb-1">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within/search:text-[var(--accent-primary)] transition-colors">
                      <SearchIcon size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search history..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 glass-card text-xs focus:outline-none focus:border-[var(--accent-primary)]/50 focus:glow-accent-sm transition-all placeholder:text-[var(--text-muted)]"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all"
                      >
                        <CloseIcon size={12} />
                      </button>
                    )}
                  </div>
                  {renderSessionGroup("Today", groupedSessions.today)}
                  {renderSessionGroup("Yesterday", groupedSessions.yesterday)}
                  {renderSessionGroup("Previous 7 Days", groupedSessions.prev7days)}
                  {renderSessionGroup("Previous 30 Days", groupedSessions.prev30days)}
                  {renderSessionGroup("Older", groupedSessions.older)}
                  {filteredActiveSessions.length === 0 && (
                    <div className="px-4 py-6 text-center glass-card border-dashed border-[var(--glass-border)] mx-1">
                      <div className="text-2xl mb-2 opacity-50">💬</div>
                      <div className="text-xs text-[var(--text-muted)] font-medium">
                        {searchTerm ? 'No results found' : 'Start a new conversation'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Archived Section */}
            {(archivedSessions.length > 0 || showArchived) && (
              <div className="space-y-1">
                <div className="px-3 mb-2">
                  <button 
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <span className={`transition-transform duration-200 ${showArchived ? '' : '-rotate-90'}`}>
                      <ChevronDownIcon size={14} />
                    </span>
                    <span>Archived</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface)]/60 text-[var(--text-muted)] text-[10px]">
                      {archivedSessions.length}
                    </span>
                  </button>
                </div>
                {showArchived && (
                  <div className="space-y-0.5 max-h-[30vh] overflow-y-auto opacity-70">
                    {archivedSessions.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isEditing={editingSessionId === session.id}
                        editingTitle={editingTitle}
                        onTitleEdit={handleTitleEdit}
                        onTitleSave={handleTitleSave}
                        onTitleKeyDown={handleTitleKeyDown}
                        onTitleChange={setEditingTitle}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className={`p-3 shrink-0 border-t border-[var(--glass-border)] ${collapsed && !isMobile ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`${collapsed && !isMobile ? 'contents' : 'space-y-1'}`}>
          {items.find(item => item.id === 'documentation') && (
            <NavItem item={items.find(item => item.id === 'documentation')} />
          )}
          
          <div className="relative group/nav">
            <button
              onClick={() => { onSettingsClick(); if (isMobile) setIsOpen(false) }}
              onMouseEnter={() => setHoveredNavItem('settings-btn')}
              onMouseLeave={() => setHoveredNavItem(null)}
              className={`
                flex items-center transition-all duration-200 w-full relative z-10 overflow-hidden
                ${collapsed && !isMobile ? 'justify-center py-3' : 'px-3 py-2.5 gap-3'}
                text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
                rounded-xl
              `}
            >
              {hoveredNavItem === 'settings-btn' && (
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/10 to-transparent border border-[var(--accent-primary)]/20 rounded-xl" />
              )}
              <span className={`shrink-0 relative z-10 ${hoveredNavItem === 'settings-btn' ? 'rotate-90 scale-110' : ''} transition-all duration-300`}>
                <SettingsIcon size={20} />
              </span>
              {(!collapsed || isMobile) && (
                <span className="text-sm font-semibold relative z-10">Settings</span>
              )}
            </button>
            {collapsed && !isMobile && hoveredNavItem === 'settings-btn' && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 glass-card-strong text-[var(--text)] text-xs font-bold rounded-xl z-50 whitespace-nowrap animate-fade-in-scale">
                Settings
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header Toggle */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 p-2.5 rounded-xl glass-card-strong glow-accent-sm text-[var(--accent-primary)] hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <MenuIcon size={20} />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:relative z-50 h-full glass-card-strong border-r border-[var(--glass-border)] transition-all ease-out flex flex-col ${isResizing ? '' : 'duration-300'}`}
        style={{
          width: isMobile ? '280px' : (collapsed ? '72px' : `${sidebarWidth}px`),
          left: isMobile && !isOpen ? '-280px' : '0',
          boxShadow: isMobile && isOpen ? 'var(--shadow-glow)' : 'none',
          background: 'var(--glass)',
        }}
      >
        {sidebarContent}
        
        {/* Resize Handle */}
        {!isMobile && !collapsed && (
          <div
            onMouseDown={startResizing}
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-all duration-200 group/resize ${isResizing ? 'bg-[var(--accent-primary)] w-1.5' : 'hover:bg-[var(--accent-primary)]/30'}`}
            title="Drag to resize sidebar"
          >
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full transition-all duration-200 ${isResizing ? 'bg-white' : 'bg-[var(--text-muted)]/30 group-hover/resize:bg-[var(--accent-primary)]'}`} />
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
