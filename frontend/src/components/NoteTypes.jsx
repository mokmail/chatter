import React, { useState, useRef, useCallback } from 'react'
import {
  NotesIcon,
  FileTextIcon,
  MicIcon,
  LayersIcon,
  UsersIcon,
  PlusIcon,
  CheckIcon,
  CloseIcon,
  SparklesIcon,
  MessageSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoreIcon,
  TrashIcon,
  EditIcon,
  SaveIcon,
  ClockIcon,
  TagIcon,
  DownloadIcon,
} from './common/Icons'

// Note Type Definitions
const NOTE_TYPES = [
  {
    id: 'simple',
    label: 'Simple',
    description: 'Quick plain text notes',
    icon: <NotesIcon size={18} />,
    color: '#8b5cf6',
  },
  {
    id: 'rich',
    label: 'Rich',
    description: 'Markdown with formatting',
    icon: <FileTextIcon size={18} />,
    color: '#6366f1',
  },
  {
    id: 'voice',
    label: 'Voice',
    description: 'Audio with transcription',
    icon: <MicIcon size={18} />,
    color: '#10b981',
  },
  {
    id: 'complex',
    label: 'Complex',
    description: 'Multi-section structured',
    icon: <LayersIcon size={18} />,
    color: '#f59e0b',
  },
  {
    id: 'meeting',
    label: 'Meeting',
    description: 'Key points & protocol',
    icon: <UsersIcon size={18} />,
    color: '#ec4899',
  },
]

// Sample note data structure
const SAMPLE_NOTES = [
  {
    id: '1',
    type: 'simple',
    title: 'Quick Idea',
    content: 'Remember to check the API documentation for rate limits before deployment.',
    createdAt: new Date().toISOString(),
    tags: ['dev', 'api'],
  },
  {
    id: '2',
    type: 'meeting',
    title: 'Sprint Planning - April 26',
    content: '',
    meetingData: {
      keyPoints: [
        { id: 'kp1', text: 'Review Q2 roadmap priorities', comments: [{ id: 'c1', text: 'Need to align with marketing team first', author: 'John', timestamp: Date.now() }], resolved: false },
        { id: 'kp2', text: 'Discuss new AI integration features', comments: [{ id: 'c2', text: 'Budget approved for OpenAI API', author: 'Sarah', timestamp: Date.now() }], resolved: true },
        { id: 'kp3', text: 'Update deployment pipeline', comments: [], resolved: false },
      ],
      transcript: 'Full meeting transcript would appear here...',
      protocol: {
        generated: true,
        content: '## Meeting Protocol - April 26\n\n### Key Decisions:\n- AI integration approved with $500/month budget\n- Marketing alignment required before roadmap finalization\n\n### Action Items:\n- [ ] Sarah: Set up OpenAI account\n- [ ] John: Schedule marketing sync\n- [ ] Team: Review deployment docs',
      },
    },
    createdAt: new Date().toISOString(),
    tags: ['meeting', 'sprint'],
  },
]

// Simple Note Editor - Minimal, fast, distraction-free
const SimpleNoteEditor = ({ note, onChange }) => {
  const [wordCount, setWordCount] = useState(0)
  const [lastSaved, setLastSaved] = useState(null)
  const [showQuickActions, setShowQuickActions] = useState(false)

  const handleContentChange = (content) => {
    onChange({ ...note, content })
    setWordCount(content.trim() ? content.trim().split(/\s+/).length : 0)
    setLastSaved(new Date())
  }

  const quickActions = [
    { label: 'Copy', icon: '📋', action: () => navigator.clipboard.writeText(note.content) },
    { label: 'Clear', icon: '🗑️', action: () => handleContentChange('') },
    { label: 'Timestamp', icon: '⏰', action: () => handleContentChange(note.content + `\n[${new Date().toLocaleTimeString()}] `) },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Quick Note
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)]" style={{ color: 'var(--text-secondary)' }}>
            {wordCount} words
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="p-1.5 rounded-lg glass-button hover:bg-[var(--surface)]/60 transition-all"
          >
            <MoreIcon size={14} />
          </button>
        </div>
      </div>

      {/* Quick Actions Dropdown */}
      {showQuickActions && (
        <div className="absolute right-4 top-14 z-10 glass-card-strong rounded-xl p-1 animate-fade-in-scale shadow-xl">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => { action.action(); setShowQuickActions(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs hover:bg-[var(--surface)]/60 transition-all"
              style={{ color: 'var(--text)' }}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Clean Text Area */}
      <textarea
        value={note.content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Type your quick note here...\n\nPress Enter for new lines. Just write and go."
        className="flex-1 w-full resize-none bg-transparent border-none outline-none text-[16px] leading-relaxed p-4 font-sans"
        style={{ color: 'var(--text)' }}
        autoFocus
      />
    </div>
  )
}

// Rich Note Editor (Markdown with full formatting capabilities)
const RichNoteEditor = ({ note, onChange }) => {
  const [viewMode, setViewMode] = useState('edit') // edit | preview | split
  const textareaRef = useRef(null)

  const insertMarkdown = (before, after = '') => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = note.content
    const selected = text.substring(start, end)
    
    const newText = text.substring(0, start) + before + selected + after + text.substring(end)
    onChange({ ...note, content: newText })
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  const toolbarButtons = [
    { label: 'Bold', action: () => insertMarkdown('**', '**'), icon: 'B', shortcut: 'Ctrl+B' },
    { label: 'Italic', action: () => insertMarkdown('*', '*'), icon: 'I', shortcut: 'Ctrl+I' },
    { label: 'Heading', action: () => insertMarkdown('## ', ''), icon: 'H', shortcut: 'Ctrl+H' },
    { label: 'List', action: () => insertMarkdown('- ', ''), icon: '•', shortcut: 'Ctrl+L' },
    { label: 'Numbered', action: () => insertMarkdown('1. ', ''), icon: '1.', shortcut: 'Ctrl+O' },
    { label: 'Link', action: () => insertMarkdown('[', '](url)'), icon: '🔗', shortcut: 'Ctrl+K' },
    { label: 'Code', action: () => insertMarkdown('`', '`'), icon: '</>', shortcut: 'Ctrl+`' },
    { label: 'Code Block', action: () => insertMarkdown('\n```\n', '\n```\n'), icon: '{ }', shortcut: 'Ctrl+Shift+C' },
    { label: 'Quote', action: () => insertMarkdown('> ', ''), icon: '❝', shortcut: 'Ctrl+Q' },
    { label: 'Divider', action: () => insertMarkdown('\n---\n', ''), icon: '—', shortcut: 'Ctrl+R' },
  ]

  const renderMarkdown = (text) => {
    if (!text) return '<p class="text-gray-400 italic">Nothing to preview</p>'
    
    // Simple markdown rendering (in production, use a proper markdown library)
    let html = text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-[var(--surface)] px-1 rounded text-sm">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-[var(--surface)] p-3 rounded-lg my-2 overflow-x-auto"><code>$1</code></pre>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-[var(--accent-primary)] pl-3 italic my-2">$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-[var(--accent-primary)] hover:underline">$1</a>')
      .replace(/---/g, '<hr class="my-4 border-[var(--glass-border)]" />')
      .replace(/\n/g, '<br />')
    
    return html
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--glass-border)] flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="px-2 py-1.5 rounded-lg text-xs font-medium glass-button hover:bg-[var(--surface)]/60 transition-all"
              style={{ color: 'var(--text-secondary)' }}
              title={`${btn.label} (${btn.shortcut})`}
            >
              {btn.icon}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'edit' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'split' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'preview' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
            }`}
          >
            Preview
          </button>
        </div>
      </div>
      
      {/* Editor/Preview */}
      {viewMode === 'edit' && (
        <textarea
          ref={textareaRef}
          value={note.content}
          onChange={(e) => onChange({ ...note, content: e.target.value })}
          placeholder="Type markdown content here...\n\n# Heading\n**Bold** and *italic*\n- List item\n- Another item\n\nUse the toolbar above for quick formatting"
          className="flex-1 w-full resize-none bg-transparent border-none outline-none text-[14px] leading-relaxed p-4 font-mono"
          style={{ color: 'var(--text)' }}
          autoFocus
        />
      )}

      {viewMode === 'preview' && (
        <div className="flex-1 p-4 overflow-auto prose prose-sm max-w-none" style={{ color: 'var(--text)' }}>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }} />
        </div>
      )}

      {viewMode === 'split' && (
        <div className="flex-1 flex overflow-hidden">
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={(e) => onChange({ ...note, content: e.target.value })}
            placeholder="Type markdown content here..."
            className="flex-1 w-full resize-none bg-transparent border-none outline-none text-[14px] leading-relaxed p-4 font-mono border-r border-[var(--glass-border)]"
            style={{ color: 'var(--text)' }}
          />
          <div className="flex-1 p-4 overflow-auto prose prose-sm max-w-none" style={{ color: 'var(--text)' }}>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }} />
          </div>
        </div>
      )}
    </div>
  )
}

// Voice Note Recorder - Audio recording, playback, and transcription
const VoiceNoteEditor = ({ note, onChange }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [waveform, setWaveform] = useState([])
  const timerRef = useRef(null)
  const playbackRef = useRef(null)

  const startRecording = () => {
    setIsRecording(true)
    setWaveform([])
    timerRef.current = setInterval(() => {
      setRecordingTime((t) => t + 1)
      // Simulate waveform data
      setWaveform(prev => [...prev, Math.random() * 100])
    }, 1000)
  }

  const stopRecording = () => {
    setIsRecording(false)
    clearInterval(timerRef.current)
    setHasRecording(true)
    setRecordingTime(0)
  }

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false)
      clearInterval(playbackRef.current)
    } else {
      setIsPlaying(true)
      playbackRef.current = setInterval(() => {
        setPlaybackTime(t => {
          if (t >= 30) {
            setIsPlaying(false)
            clearInterval(playbackRef.current)
            return 0
          }
          return t + 1
        })
      }, 1000)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const deleteRecording = () => {
    setHasRecording(false)
    setWaveform([])
    setPlaybackTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <MicIcon size={16} className="text-[var(--accent-primary)]" />
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Voice Note
          </span>
        </div>
        {hasRecording && (
          <button
            onClick={deleteRecording}
            className="text-[10px] text-[var(--danger)] hover:underline"
          >
            Delete Recording
          </button>
        )}
      </div>

      {/* Recording/Playback Interface */}
      <div className="flex flex-col items-center justify-center py-8 px-4">
        {!hasRecording ? (
          <>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ? 'bg-[var(--danger)] animate-pulse scale-110'
                  : 'bg-[var(--accent-primary)] hover:scale-105 glow-accent-sm'
              }`}
            >
              <MicIcon size={28} color="white" />
            </button>
            <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Tap to record'}
            </p>
            {isRecording && (
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-[var(--accent-primary)] rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 10}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full max-w-md">
            {/* Waveform Visualization */}
            <div className="flex items-center justify-center gap-0.5 h-16 mb-4">
              {waveform.length > 0 ? waveform.map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-[var(--accent-primary)] rounded-full transition-all"
                  style={{
                    height: `${height}%`,
                    opacity: isPlaying ? 0.8 : 0.4,
                  }}
                />
              )) : Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-[var(--accent-primary)] rounded-full"
                  style={{
                    height: `${Math.random() * 60 + 20}%`,
                    opacity: isPlaying ? 0.8 : 0.4,
                  }}
                />
              ))}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePlayback}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-[var(--accent-primary)] glow-accent-sm'
                    : 'bg-[var(--surface)] border border-[var(--glass-border)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {isPlaying ? (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-4 bg-white rounded" />
                    <div className="w-1 h-4 bg-white rounded" />
                  </div>
                ) : (
                  <div className="w-0 h-0 border-t-8 border-b-8 border-l-12 border-transparent border-l-white" style={{ marginLeft: '4px' }} />
                )}
              </button>
            </div>

            <div className="text-center mt-3">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {formatTime(playbackTime)} / 0:30
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Section */}
      <div className="flex-1 px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SparklesIcon size={14} className="text-[var(--accent-primary)]" />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Transcription
            </span>
          </div>
          {hasRecording && (
            <button
              onClick={() => {
                // Simulate AI transcription
                onChange({ ...note, content: 'This is a simulated transcription of your voice recording. In production, this would be generated by a speech-to-text service.' })
              }}
              className="text-[10px] text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              <SparklesIcon size={10} />
              Auto-transcribe
            </button>
          )}
        </div>
        <textarea
          value={note.content}
          onChange={(e) => onChange({ ...note, content: e.target.value })}
          placeholder="Transcribed text will appear here...\n\nYou can also type manually to add notes."
          className="w-full h-full min-h-[150px] resize-none glass-card rounded-xl p-3 text-sm"
          style={{ color: 'var(--text)' }}
        />
      </div>
    </div>
  )
}

// Complex Note Editor - Multi-section with varied content types
const ComplexNoteEditor = ({ note, onChange }) => {
  const [sections, setSections] = useState(note.sections || [
    { id: '1', type: 'text', title: 'Overview', content: '' },
    { id: '2', type: 'checklist', title: 'Action Items', items: [] },
    { id: '3', type: 'text', title: 'Notes', content: '' },
  ])
  const [draggedSection, setDraggedSection] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const sectionTypes = [
    { type: 'text', label: 'Text', icon: '📝', description: 'Plain text content' },
    { type: 'checklist', label: 'Checklist', icon: '✅', description: 'Task list with checkboxes' },
    { type: 'code', label: 'Code', icon: '💻', description: 'Code block with syntax' },
    { type: 'table', label: 'Table', icon: '📊', description: 'Structured data table' },
    { type: 'divider', label: 'Divider', icon: '➖', description: 'Visual separator' },
  ]

  const addSection = (type) => {
    const newSection = {
      id: Date.now().toString(),
      type,
      title: type === 'checklist' ? 'Checklist' : type === 'code' ? 'Code' : type === 'table' ? 'Table' : 'New Section',
      content: '',
      items: type === 'checklist' ? [] : undefined,
      code: type === 'code' ? '' : undefined,
      table: type === 'table' ? { headers: [], rows: [] } : undefined,
    }
    setSections([...sections, newSection])
    setShowAddMenu(false)
  }

  const updateSection = (id, updates) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const deleteSection = (id) => {
    setSections(sections.filter((s) => s.id !== id))
  }

  const moveSection = (fromIndex, toIndex) => {
    const newSections = [...sections]
    const [moved] = newSections.splice(fromIndex, 1)
    newSections.splice(toIndex, 0, moved)
    setSections(newSections)
  }

  const handleDragStart = (e, index) => {
    setDraggedSection(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedSection !== null && draggedSection !== index) {
      moveSection(draggedSection, index)
      setDraggedSection(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedSection(null)
  }

  const renderSectionContent = (section) => {
    switch (section.type) {
      case 'checklist':
        return (
          <div className="space-y-2">
            {(section.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={item.checked || false}
                  onChange={(e) => {
                    const newItems = [...(section.items || [])]
                    newItems[idx] = { ...item, checked: e.target.checked }
                    updateSection(section.id, { items: newItems })
                  }}
                  className="rounded w-4 h-4"
                />
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => {
                    const newItems = [...(section.items || [])]
                    newItems[idx] = { ...item, text: e.target.value }
                    updateSection(section.id, { items: newItems })
                  }}
                  className={`flex-1 bg-transparent border-none outline-none text-sm ${item.checked ? 'line-through opacity-50' : ''}`}
                  style={{ color: 'var(--text-secondary)' }}
                />
                <button
                  onClick={() => {
                    const newItems = section.items.filter((_, i) => i !== idx)
                    updateSection(section.id, { items: newItems })
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--danger)]/10 text-[var(--danger)] transition-all"
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newItems = [...(section.items || []), { text: '', checked: false }]
                updateSection(section.id, { items: newItems })
              }}
              className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              <PlusIcon size={12} /> Add item
            </button>
          </div>
        )
      case 'code':
        return (
          <div>
            <textarea
              value={section.code || ''}
              onChange={(e) => updateSection(section.id, { code: e.target.value })}
              placeholder="// Write your code here..."
              className="w-full h-32 resize-none bg-[var(--bg)] rounded-lg p-3 text-sm font-mono"
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>
        )
      case 'table':
        return (
          <div className="text-center py-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Table editor coming soon</p>
          </div>
        )
      case 'divider':
        return <hr className="my-4 border-[var(--glass-border)]" />
      default:
        return (
          <textarea
            value={section.content}
            onChange={(e) => updateSection(section.id, { content: e.target.value })}
            className="w-full h-24 resize-none bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--text-secondary)' }}
            placeholder="Enter content..."
          />
        )
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 space-y-4">
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`glass-card rounded-xl p-4 transition-all ${draggedSection === index ? 'opacity-50 scale-95' : 'hover:scale-[1.01]'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="cursor-grab text-[var(--text-muted)] hover:text-[var(--text)]">
                <ChevronRightIcon size={14} />
              </div>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                className="flex-1 bg-transparent border-none outline-none font-semibold text-sm"
                style={{ color: 'var(--text)' }}
              />
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface)]" style={{ color: 'var(--text-muted)' }}>
                {section.type}
              </span>
              <button
                onClick={() => deleteSection(section.id)}
                className="p-1.5 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
              >
                <TrashIcon size={14} />
              </button>
            </div>
            
            {renderSectionContent(section)}
          </div>
        ))}
        
        {/* Add Section Menu */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full py-3 rounded-xl glass-button text-sm font-medium hover:bg-[var(--surface)]/60 transition-all flex items-center justify-center gap-2"
          >
            <PlusIcon size={16} />
            Add Section
          </button>
          
          {showAddMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 glass-card-strong rounded-xl p-2 animate-fade-in-scale shadow-xl">
              <div className="grid grid-cols-2 gap-1">
                {sectionTypes.map((stype) => (
                  <button
                    key={stype.type}
                    onClick={() => addSection(stype.type)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[var(--surface)]/60 transition-all text-center"
                  >
                    <span className="text-xl">{stype.icon}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{stype.label}</span>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{stype.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Meeting Notes Editor - Key points, participants, action items, protocol
const MeetingNoteEditor = ({ note, onChange }) => {
  const [activeTab, setActiveTab] = useState('points') // points | participants | transcript | protocol
  const [meetingData, setMeetingData] = useState(note.meetingData || {
    keyPoints: [],
    participants: [],
    actionItems: [],
    transcript: '',
    protocol: { generated: false, content: '' },
    metadata: { date: new Date().toISOString(), location: '', duration: '' },
  })
  const [newPoint, setNewPoint] = useState('')
  const [commentingPoint, setCommentingPoint] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [newParticipant, setNewParticipant] = useState('')
  const [newAction, setNewAction] = useState({ text: '', assignee: '', dueDate: '' })

  const addKeyPoint = () => {
    if (!newPoint.trim()) return
    const point = {
      id: Date.now().toString(),
      text: newPoint,
      comments: [],
      resolved: false,
      category: 'general',
    }
    setMeetingData({
      ...meetingData,
      keyPoints: [...meetingData.keyPoints, point],
    })
    setNewPoint('')
  }

  const addComment = (pointId) => {
    if (!newComment.trim()) return
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      author: 'You',
      timestamp: Date.now(),
    }
    setMeetingData({
      ...meetingData,
      keyPoints: meetingData.keyPoints.map((p) =>
        p.id === pointId ? { ...p, comments: [...p.comments, comment] } : p
      ),
    })
    setNewComment('')
    setCommentingPoint(null)
  }

  const toggleResolved = (pointId) => {
    setMeetingData({
      ...meetingData,
      keyPoints: meetingData.keyPoints.map((p) =>
        p.id === pointId ? { ...p, resolved: !p.resolved } : p
      ),
    })
  }

  const addParticipant = () => {
    if (!newParticipant.trim()) return
    setMeetingData({
      ...meetingData,
      participants: [...meetingData.participants, { id: Date.now().toString(), name: newParticipant, role: 'Attendee' }],
    })
    setNewParticipant('')
  }

  const removeParticipant = (id) => {
    setMeetingData({
      ...meetingData,
      participants: meetingData.participants.filter((p) => p.id !== id),
    })
  }

  const addActionItem = () => {
    if (!newAction.text.trim()) return
    setMeetingData({
      ...meetingData,
      actionItems: [...meetingData.actionItems, { id: Date.now().toString(), ...newAction, completed: false }],
    })
    setNewAction({ text: '', assignee: '', dueDate: '' })
  }

  const toggleActionComplete = (id) => {
    setMeetingData({
      ...meetingData,
      actionItems: meetingData.actionItems.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a)),
    })
  }

  const generateProtocol = () => {
    const unresolved = meetingData.keyPoints.filter((p) => !p.resolved)
    const resolved = meetingData.keyPoints.filter((p) => p.resolved)
    const pendingActions = meetingData.actionItems.filter((a) => !a.completed)
    const completedActions = meetingData.actionItems.filter((a) => a.completed)
    
    const protocol = `# Meeting Protocol - ${note.title}

**Date:** ${new Date(meetingData.metadata.date).toLocaleDateString()}
**Participants:** ${meetingData.participants.map((p) => p.name).join(', ') || 'Not specified'}
**Duration:** ${meetingData.metadata.duration || 'Not specified'}

---

## Executive Summary
${unresolved.length} discussion items pending, ${resolved.length} items resolved.
${pendingActions.length} action items pending, ${completedActions.length} completed.

---

## Key Decisions
${resolved.length > 0 ? resolved.map((p) => `- ✅ ${p.text}`).join('\n') : 'No decisions recorded yet.'}

---

## Discussion Points (Pending)
${unresolved.length > 0 ? unresolved.map((p) => `- ⏳ ${p.text}`).join('\n') : 'All discussion points resolved.'}

---

## Action Items
### Completed
${completedActions.length > 0 ? completedActions.map((a) => `- [x] ${a.text} (${a.assignee || 'Unassigned'})`).join('\n') : 'No completed actions.'}

### Pending
${pendingActions.length > 0 ? pendingActions.map((a) => `- [ ] ${a.text} (${a.assignee || 'Unassigned'}) - Due: ${a.dueDate || 'No due date'}`).join('\n') : 'No pending actions.'}

---

*Generated by AI on ${new Date().toLocaleString()}*`

    setMeetingData({
      ...meetingData,
      protocol: { generated: true, content: protocol },
    })
    setActiveTab('protocol')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--glass-border)] flex-wrap">
        <button
          onClick={() => setActiveTab('points')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'points' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
          }`}
        >
          Key Points
          {meetingData.keyPoints.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--surface)] text-[10px]">
              {meetingData.keyPoints.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'participants' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
          }`}
        >
          Participants
          {meetingData.participants.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--surface)] text-[10px]">
              {meetingData.participants.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'actions' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
          }`}
        >
          Action Items
          {meetingData.actionItems.filter(a => !a.completed).length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--danger)]/20 text-[var(--danger)] text-[10px]">
              {meetingData.actionItems.filter(a => !a.completed).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'transcript' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
          }`}
        >
          Transcript
        </button>
        <button
          onClick={() => setActiveTab('protocol')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeTab === 'protocol' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'glass-button'
          }`}
        >
          Protocol
          {meetingData.protocol?.generated && <CheckIcon size={12} />}
        </button>
        <div className="flex-1" />
        <button
          onClick={generateProtocol}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:scale-105 transition-all glow-accent-sm"
        >
          <SparklesIcon size={12} className="inline mr-1" />
          Generate
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'points' && (
          <div className="p-4 space-y-3">
            {/* Add Point Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPoint}
                onChange={(e) => setNewPoint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyPoint()}
                placeholder="Add key discussion point..."
                className="flex-1 px-3 py-2 glass-card rounded-lg text-sm"
                style={{ color: 'var(--text)' }}
              />
              <button
                onClick={addKeyPoint}
                className="px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white hover:scale-105 transition-all"
              >
                <PlusIcon size={16} />
              </button>
            </div>

            {/* Points List */}
            {meetingData.keyPoints.map((point) => (
              <div
                key={point.id}
                className={`glass-card rounded-xl p-4 transition-all ${
                  point.resolved ? 'opacity-60 border-l-4 border-l-[var(--success)]' : 'border-l-4 border-l-[var(--accent-primary)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleResolved(point.id)}
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      point.resolved ? 'bg-[var(--success)] text-white' : 'border border-[var(--glass-border)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    {point.resolved && <CheckIcon size={12} />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${point.resolved ? 'line-through' : ''}`} style={{ color: 'var(--text)' }}>
                      {point.text}
                    </p>
                    
                    {/* Comments */}
                    {point.comments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {point.comments.map((comment) => (
                          <div key={comment.id} className="pl-3 border-l-2 border-[var(--glass-border)] text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-medium" style={{ color: 'var(--accent-primary)' }}>{comment.author}</span>
                            <span className="mx-1">•</span>
                            <span>{comment.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Comment */}
                    {commentingPoint === point.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addComment(point.id)}
                          placeholder="Add a comment..."
                          className="flex-1 px-2 py-1.5 rounded-lg glass-card text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => addComment(point.id)}
                          className="px-2 py-1.5 rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-xs"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCommentingPoint(point.id)}
                        className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1"
                      >
                        <MessageSquareIcon size={12} />
                        Comment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="p-4 space-y-3">
            {/* Add Participant Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                placeholder="Add participant name..."
                className="flex-1 px-3 py-2 glass-card rounded-lg text-sm"
                style={{ color: 'var(--text)' }}
              />
              <button
                onClick={addParticipant}
                className="px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white hover:scale-105 transition-all"
              >
                <PlusIcon size={16} />
              </button>
            </div>

            {/* Participants List */}
            {meetingData.participants.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon size={32} className="mx-auto mb-2 text-[var(--text-muted)] opacity-50" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No participants added</p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetingData.participants.map((participant) => (
                  <div key={participant.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/10 flex items-center justify-center text-[var(--accent-primary)] font-semibold text-xs">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{participant.name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{participant.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="p-4 space-y-3">
            {/* Add Action Input */}
            <div className="glass-card rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={newAction.text}
                onChange={(e) => setNewAction({ ...newAction, text: e.target.value })}
                placeholder="Action item description..."
                className="w-full px-3 py-2 bg-[var(--bg)] rounded-lg text-sm"
                style={{ color: 'var(--text)' }}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAction.assignee}
                  onChange={(e) => setNewAction({ ...newAction, assignee: e.target.value })}
                  placeholder="Assignee"
                  className="flex-1 px-3 py-2 bg-[var(--bg)] rounded-lg text-sm"
                  style={{ color: 'var(--text)' }}
                />
                <input
                  type="text"
                  value={newAction.dueDate}
                  onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
                  placeholder="Due date"
                  className="flex-1 px-3 py-2 bg-[var(--bg)] rounded-lg text-sm"
                  style={{ color: 'var(--text)' }}
                />
                <button
                  onClick={addActionItem}
                  className="px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white hover:scale-105 transition-all"
                >
                  <PlusIcon size={16} />
                </button>
              </div>
            </div>

            {/* Action Items List */}
            {meetingData.actionItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckIcon size={32} className="mx-auto mb-2 text-[var(--text-muted)] opacity-50" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No action items</p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetingData.actionItems.map((action) => (
                  <div
                    key={action.id}
                    className={`glass-card rounded-xl p-3 transition-all ${
                      action.completed ? 'opacity-60 border-l-4 border-l-[var(--success)]' : 'border-l-4 border-l-[var(--accent-primary)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleActionComplete(action.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          action.completed ? 'bg-[var(--success)] text-white' : 'border border-[var(--glass-border)] hover:border-[var(--accent-primary)]'
                        }`}
                      >
                        {action.completed && <CheckIcon size={12} />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${action.completed ? 'line-through' : ''}`} style={{ color: 'var(--text)' }}>
                          {action.text}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {action.assignee && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface)]" style={{ color: 'var(--text-muted)' }}>
                              👤 {action.assignee}
                            </span>
                          )}
                          {action.dueDate && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface)]" style={{ color: 'var(--text-muted)' }}>
                              📅 {action.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="p-4">
            <textarea
              value={meetingData.transcript}
              onChange={(e) => setMeetingData({ ...meetingData, transcript: e.target.value })}
              placeholder="Paste meeting transcript here or record audio..."
              className="w-full h-96 resize-none glass-card rounded-xl p-4 text-sm font-mono"
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>
        )}

        {activeTab === 'protocol' && (
          <div className="p-4">
            {meetingData.protocol?.generated ? (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <SparklesIcon size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Generated Protocol</span>
                  </div>
                  <button className="p-1.5 rounded-lg glass-button hover:bg-[var(--surface)]/60">
                    <DownloadIcon size={14} />
                  </button>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: 'var(--text-secondary)' }}>
                  {meetingData.protocol.content}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[var(--surface)]/40">
                  <SparklesIcon size={28} className="text-[var(--text-muted)] opacity-50" />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No protocol generated yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click "Generate" to create from key points</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Main NoteTypes Component
export default function NoteTypes() {
  const [activeType, setActiveType] = useState('simple')
  const [notes, setNotes] = useState(SAMPLE_NOTES)
  const [selectedNoteId, setSelectedNoteId] = useState('2') // Select meeting note by default
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')

  const selectedNote = notes.find((n) => n.id === selectedNoteId)
  const activeTypeInfo = NOTE_TYPES.find((t) => t.id === activeType)

  const filteredNotes = notes.filter((note) => {
    const matchesType = note.type === activeType
    const matchesSearch = searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesType && matchesSearch
  })

  const createNote = () => {
    if (!newNoteTitle.trim()) return
    const newNote = {
      id: Date.now().toString(),
      type: activeType,
      title: newNoteTitle,
      content: '',
      createdAt: new Date().toISOString(),
      tags: [],
      ...(activeType === 'meeting' && {
        meetingData: {
          keyPoints: [],
          participants: [],
          actionItems: [],
          transcript: '',
          protocol: { generated: false, content: '' },
          metadata: { date: new Date().toISOString(), location: '', duration: '' },
        },
      }),
      ...(activeType === 'complex' && {
        sections: [{ id: '1', type: 'text', title: 'Overview', content: '' }],
      }),
    }
    setNotes([newNote, ...notes])
    setSelectedNoteId(newNote.id)
    setNewNoteTitle('')
    setShowCreateModal(false)
  }

  const updateNote = (updatedNote) => {
    setNotes(notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)))
  }

  const deleteNote = (id) => {
    setNotes(notes.filter((n) => n.id !== id))
    if (selectedNoteId === id) setSelectedNoteId(null)
  }

  // Render appropriate editor based on note type
  const renderEditor = () => {
    if (!selectedNote) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/5 border border-[var(--glass-border)]">
            {activeTypeInfo?.icon}
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
            {activeTypeInfo?.label} Notes
          </h3>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            {activeTypeInfo?.description}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:scale-105 transition-all glow-accent-sm"
          >
            Create {activeTypeInfo?.label} Note
          </button>
        </div>
      )
    }

    switch (selectedNote.type) {
      case 'simple':
        return <SimpleNoteEditor note={selectedNote} onChange={updateNote} />
      case 'rich':
        return <RichNoteEditor note={selectedNote} onChange={updateNote} />
      case 'voice':
        return <VoiceNoteEditor note={selectedNote} onChange={updateNote} />
      case 'complex':
        return <ComplexNoteEditor note={selectedNote} onChange={updateNote} />
      case 'meeting':
        return <MeetingNoteEditor note={selectedNote} onChange={updateNote} />
      default:
        return <SimpleNoteEditor note={selectedNote} onChange={updateNote} />
    }
  }

  return (
    <div className="flex h-full bg-[var(--bg)]">
      {/* Left Sidebar */}
      <div className="w-72 border-r border-[var(--glass-border)] flex flex-col glass-card-strong">
        {/* Header */}
        <div className="p-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <NotesIcon size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Notes</h2>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Multi-Type</p>
              </div>
            </div>
          </div>
          
          {/* Type Selector */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {NOTE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setActiveType(type.id)
                  setSelectedNoteId(null)
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                  activeType === type.id
                    ? 'text-white'
                    : 'glass-button text-[var(--text-muted)]'
                }`}
                style={{
                  background: activeType === type.id ? type.color : undefined,
                }}
              >
                {type.icon}
                <span>{type.label}</span>
              </button>
            ))}
          </div>
          
          {/* Search */}
          <div className="mt-3 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTypeInfo?.label.toLowerCase()} notes...`}
              className="w-full pl-8 pr-3 py-2 glass-card rounded-lg text-xs"
              style={{ color: 'var(--text)' }}
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <TagIcon size={12} />
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No {activeTypeInfo?.label.toLowerCase()} notes</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                  selectedNoteId === note.id
                    ? 'glass-card-strong border-[var(--accent-primary)]/30 glow-accent-sm'
                    : 'hover:bg-[var(--surface)]/40 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: NOTE_TYPES.find((t) => t.id === note.type)?.color + '20',
                      color: NOTE_TYPES.find((t) => t.id === note.type)?.color,
                    }}
                  >
                    {NOTE_TYPES.find((t) => t.id === note.type)?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {note.title}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {note.content?.slice(0, 50) || 'No content'}
                    </p>
                  </div>
                </div>
                {note.tags?.length > 0 && (
                  <div className="flex gap-1 mt-2 ml-8">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--surface)]/60"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Create Button */}
        <div className="p-3 border-t border-[var(--glass-border)]">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:scale-[1.02] transition-all glow-accent-sm"
          >
            <PlusIcon size={16} />
            New {activeTypeInfo?.label} Note
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        {selectedNote && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => updateNote({ ...selectedNote, title: e.target.value })}
                className="bg-transparent border-none outline-none text-lg font-semibold"
                style={{ color: 'var(--text)' }}
              />
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  background: activeTypeInfo?.color + '20',
                  color: activeTypeInfo?.color,
                }}
              >
                {activeTypeInfo?.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <ClockIcon size={12} className="inline mr-1" />
                {new Date(selectedNote.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => deleteNote(selectedNote.id)}
                className="p-2 rounded-lg glass-button text-[var(--danger)]/70 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {renderEditor()}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'var(--modal-backdrop)' }}
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="w-full max-w-md glass-card-strong rounded-2xl p-6 animate-fade-in-scale">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Create {activeTypeInfo?.label} Note
            </h3>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createNote()}
              placeholder="Note title..."
              className="w-full px-4 py-3 glass-card rounded-xl text-sm mb-4"
              style={{ color: 'var(--text)' }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium glass-button"
              >
                Cancel
              </button>
              <button
                onClick={createNote}
                disabled={!newNoteTitle.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// No additional local icons needed - all imported from Icons.jsx
