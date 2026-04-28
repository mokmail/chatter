import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNotes } from '../hooks/useNotes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import NoteChatDrawer from './NoteChatDrawer'
import NoteTypeSelector from './NoteTypeSelector'
import { getTemplateForType, getTypeInfo } from '../utils/noteTemplates'

import {
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ArchiveIcon,
  CloseIcon,
  FileTextIcon,
  SaveIcon,
  TagIcon,
  KnowledgeIcon,
  ClockIcon,
  PinIcon,
  SparklesIcon,
  MessageSquareIcon,
  DownloadIcon,
  BoldIcon,
  ItalicIcon,
  MaximizeIcon,
  CodeIcon,
  ListIcon,
  QuoteIcon,
  MinusIcon,
  TableIcon,
  CheckboxIcon,
  UndoIcon,
  MicIcon,
  UsersIcon,
  BrainIcon,
  ChevronDownIcon,
  SendIcon,
  LayersIcon,
  CalendarIcon,
  BugIcon,
  BookIcon,
  FolderIcon,
  ChevronRightIcon,
  FilterIcon,
} from './common/Icons'

const ICON_MAP = {
  EditIcon,
  FileTextIcon,
  MicIcon,
  UsersIcon,
  SearchIcon,
  LayersIcon,
  CalendarIcon,
  BugIcon,
  SparklesIcon,
  BookIcon,
}

const getNoteIcon = (type, size = 20) => {
  const info = getTypeInfo(type)
  const Icon = ICON_MAP[info.icon] || FileTextIcon
  return <Icon size={size} />
}


const ENHANCE_PRESETS = [
  {
    label: 'Concise',
    instruction: 'Enhance this text to be more concise and clear',
    icon: <MinusIcon size={12} />,
  },
  {
    label: 'Expand',
    instruction: 'Enhance this text with more detail and depth',
    icon: <MaximizeIcon size={12} />,
  },
  {
    label: 'Polish',
    instruction: 'Enhance this text to improve writing quality and flow',
    icon: <SparklesIcon size={12} />,
  },
  {
    label: 'Fix Grammar',
    instruction: 'Enhance this text by fixing any grammar or spelling errors',
    icon: <CheckboxIcon size={12} />,
  },
]


function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function countWords(text) {
  if (!text || !text.trim()) return 0
  return text.trim().split(/\s+/).length
}

const NoteListItem = ({ note, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(note.id)}
      className={`group w-full text-left p-3 rounded-xl transition-all duration-300 border relative overflow-hidden mb-1 ${
        isSelected
          ? 'glass-card-strong border-[var(--accent-primary)]/40 shadow-lg glow-accent-sm'
          : 'border-transparent hover:glass-card hover:border-[var(--glass-border)]'
      }`}
    >
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent pointer-events-none" />
      )}
      <div className="flex items-start justify-between gap-2 mb-1.5 relative z-10">
        <h3 className={`font-bold text-xs truncate flex-1 ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text)]'}`}>
          {note.title || 'Untitled'}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {note.note_type && (
            <span
              className="text-[7px] px-1 py-0.5 rounded-md font-bold uppercase tracking-wider"
              style={{
                background: `${getTypeInfo(note.note_type).color}20`,
                color: getTypeInfo(note.note_type).color,
                borderColor: 'currentColor',
                borderWidth: '1px'
              }}
            >
              {note.note_type}
            </span>
          )}
          {note.pinned && <PinIcon size={10} className="text-[var(--accent-primary)]" />}
        </div>
      </div>
      <p className={`text-[10px] line-clamp-1 opacity-70 leading-relaxed relative z-10 ${isSelected ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
        {note.preview || note.content || 'No content'}
      </p>
      <div className="flex items-center gap-2 mt-2 relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center gap-1 text-[9px] font-medium">
          <ClockIcon size={10} />
          {formatDate(note.updated_at)}
        </span>
        {note.knowledge_bases?.length > 0 && (
          <div className="flex items-center gap-1">
            <KnowledgeIcon size={10} className="text-[var(--accent-primary)]" />
            <span className="text-[9px] font-bold">{note.knowledge_bases.length}</span>
          </div>
        )}
        {note.tags?.length > 0 && (
          <div className="flex items-center gap-1">
            <TagIcon size={10} className="text-[var(--accent-primary)]" />
            <span className="text-[9px] font-bold">{note.tags.length}</span>
          </div>
        )}
      </div>
    </button>
  )
}


function debounce(fn, ms) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
}


export default function Notes() {
  const {
    notes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    searchResults,
    loadNotes,
    createNote,
    updateNote,
    pinNote,
    deleteNote,
    archiveNote,
    searchNotes,
    clearSearch,
    enhanceNote,
    exportNote,
  } = useNotes()

  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const selectedNote = notes.find((n) => n.id === selectedNoteId)
  const [noteType, setNoteType] = useState('rich') // simple, rich, voice, meeting
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [showChatDrawer, setShowChatDrawer] = useState(false)
  const [showEnhancePopover, setShowEnhancePopover] = useState(false)
  const [customInstruction, setCustomInstruction] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [undoStack, setUndoStack] = useState([])
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showKbModal, setShowKbModal] = useState(false)
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [isSavingToKb, setIsSavingToKb] = useState(false)
  const [loadingKbs, setLoadingKbs] = useState(false)
  const [groupBy, setGroupBy] = useState('none') // none, type, topic, date
  const [expandedFolders, setExpandedFolders] = useState({})
  const [notesSidebarWidth, setNotesSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('chatter-notes-sidebar-width')
    return saved ? parseInt(saved, 10) : 320
  })
  const [isNotesSidebarResizing, setIsNotesSidebarResizing] = useState(false)
  const [floatingToolbar, setFloatingToolbar] = useState(null)
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 })
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [selectionPosition, setSelectionPosition] = useState(null)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const searchTimeoutRef = useRef(null)
  const textareaRef = useRef(null)
  const floatingToolbarRef = useRef(null)
  const enhancePopoverRef = useRef(null)
  const exportMenuRef = useRef(null)

  const preprocessContent = (content) => {
    let result = content
    result = result.replace(/==([^=]+)==/g, '<mark class="hl-yellow">$1</mark>')
    result = result.replace(/\^\^([^^]+)\^\^/g, '<mark class="hl-blue">$1</mark>')
    result = result.replace(/@@([^@]+)@@/g, '<mark class="hl-green">$1</mark>')
    result = result.replace(/##([^#]+)##/g, '<mark class="hl-red">$1</mark>')
    result = result.replace(/%%([^%]+)%%/g, '<mark class="hl-purple">$1</mark>')
    result = result.replace(/\+\+([^+]+)\+\+/g, '<mark class="hl-orange">$1</mark>')
    result = result.replace(/~([^~]+)~/g, '<sub>$1</sub>')
    result = result.replace(/\^([^^]+)\^/g, '<sup>$1</sup>')
    result = result.replace(/<!--yellow:([^>]+)-->/g, '<span class="annotation ann-yellow" title="Yellow Annotation"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ann-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> $1</span>')
    result = result.replace(/<!--blue:([^>]+)-->/g, '<span class="annotation ann-blue" title="Blue Annotation"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ann-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> $1</span>')
    result = result.replace(/<!--green:([^>]+)-->/g, '<span class="annotation ann-green" title="Green Annotation"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ann-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> $1</span>')
    result = result.replace(/<!--red:([^>]+)-->/g, '<span class="annotation ann-red" title="Red Annotation"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ann-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> $1</span>')
    result = result.replace(/<!--purple:([^>]+)-->/g, '<span class="annotation ann-purple" title="Purple Annotation"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ann-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> $1</span>')
    result = result.replace(/<!--([^:]+):([^>]+)-->/g, '<span class="annotation" title="Annotation"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ann-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> $2</span>')
    return result
  }

  const renderedContent = selectedNote?.content ? preprocessContent(selectedNote.content) : ''

  const undoStackRef = useRef([])

  const updateWordCount = useCallback(
    debounce((text) => {
      setWordCount({ words: countWords(text), chars: text.length })
    }, 150),
    []
  )

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => searchNotes(searchQuery), 300)
    } else {
      clearSearch()
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery, searchNotes, clearSearch])

  useEffect(() => {
    if (isEditing) {
      updateWordCount(editContent)
    }
  }, [editContent, isEditing, updateWordCount])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (enhancePopoverRef.current && !enhancePopoverRef.current.contains(e.target)) {
        setShowEnhancePopover(false)
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

const handleSelectNote = useCallback((noteId) => {
    const note = notes.find((n) => n.id === noteId)
    setSelectedNoteId(noteId)
    if (note?.note_type) {
      setNoteType(note.note_type)
    }
    setIsEditing(false)
    setShowChatDrawer(false)
    setSelectionPosition(null)
    setUndoStack([])
    if (note) {
      setEditTitle(note.title)
      setEditContent(note.content)
      setEditTags(note.tags?.join(', ') || '')
    }
  }, [notes])

  const handleCreateNote = () => {
    setShowTypeSelector(true)
  }

  const performCreateNote = async (type) => {
    try {
      const template = getTemplateForType(type)
      const note = await createNote(template.title, template.content, template.tags, type)
      setSelectedNoteId(note.id)
      setIsEditing(true)
      setEditTitle(note.title)
      setEditContent(note.content)
      setEditTags(template.tags.join(', '))
      setSelectionPosition(null)
      setShowTypeSelector(false)
      setToast({ type: 'success', message: `${type.charAt(0).toUpperCase() + type.slice(1)} note created` })
      setTimeout(() => textareaRef.current?.focus(), 100)
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to create note' })
    }
  }

  const handleSaveNote = async () => {
    if (!selectedNoteId) return
    try {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
      await updateNote(selectedNoteId, {
        title: editTitle.trim() || 'Untitled',
        content: editContent,
        tags,
      })
      setIsEditing(false)
      setFloatingToolbar(null)
      setUndoStack([])
      setToast({ type: 'success', message: 'Note saved' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to save note' })
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId)
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null)
        setIsEditing(false)
      }
      setConfirmDelete(null)
      setToast({ type: 'success', message: 'Note deleted' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete note' })
    }
  }

  const handleArchiveNote = async (noteId) => {
    try {
      await archiveNote(noteId)
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null)
        setIsEditing(false)
        setFloatingToolbar(null)
      }
      setToast({ type: 'success', message: 'Note archived' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to archive note' })
    }
  }

  const handlePinNote = async (noteId) => {
    const note = notes.find((n) => n.id === noteId)
    if (!note) return
    try {
      await pinNote(noteId, !note.pinned)
      setToast({ type: 'success', message: note.pinned ? 'Note unpinned' : 'Note pinned' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update pin' })
    }
  }

  const handleChatResponseAction = async ({ action, content, note }) => {
    if (!note?.id || !content) return

    const isMeeting = note.note_type === 'meeting'

    const actionHandlers = {
      append: async () => {
        const newContent = note.content
          ? `${note.content}\n\n---\n\n## AI Analysis\n\n${content}`
          : content
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Response appended to note' })
      },
      comment: async () => {
        const newComment = `[AI Comment ${new Date().toLocaleString()}]\n${content}`
        const newContent = note.content
          ? `${note.content}\n\n<!-- ${newComment} -->`
          : newComment
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Comment added to note' })
      },
      todo: async () => {
        const todoItems = extractTodos(content)
        const todoMd = todoItems.length > 0
          ? `\n\n## Action Items\n${todoItems.map(t => `- [ ] ${t}`).join('\n')}`
          : `\n\n## Action Items\n- [ ] ${content.substring(0, 100)}...`
        const newContent = note.content ? note.content + todoMd : todoMd
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Todo created from response' })
      },
      summarize: async () => {
        if (isMeeting) {
          const summary = generateMeetingSummary(content)
          const newContent = note.content + `\n\n## Meeting Summary\n\n${summary}`
          await updateNote(note.id, { content: newContent })
        } else {
          const summaryMd = `\n\n## Summary\n${content}`
          const newContent = note.content ? note.content + summaryMd : content
          await updateNote(note.id, { content: newContent })
        }
        setToast({ type: 'success', message: isMeeting ? 'Meeting summary generated' : 'Summary added' })
      },
      extract: async () => {
        const extractMd = `\n\n## Key Points\n${content}`
        const newContent = note.content ? note.content + extractMd : content
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Key points extracted' })
      },
      tag: async () => {
        const tags = extractTags(content)
        const existingTags = note.tags || []
        const allTags = [...new Set([...existingTags, ...tags])]
        await updateNote(note.id, { tags: allTags })
        setToast({ type: 'success', message: `Tags added: ${tags.join(', ')}` })
      },
      replace: async () => {
        if (selectedNoteId) {
          setEditContent(content)
          setIsEditing(true)
        }
        setToast({ type: 'info', message: 'Content loaded for replacement' })
      },
      question: async () => {
        setInput(`Based on the note: ${content.substring(0, 100)}...`)
      },
      decisions: async () => {
        if (!isMeeting) {
          setToast({ type: 'error', message: 'This action is only for meeting notes' })
          return
        }
        const decisions = extractDecisions(content)
          const decisionsMd = decisions.length > 0
            ? `\n\n## Decisions & Motions\n\n| Motion | Proposed By | Seconded | Result | Notes |\n|--------|-------------|----------|--------|-------|\n${decisions.map(d => `| ${d} |             |          |        |        |`).join('\n')}`
            : `\n\n## Decisions & Motions\n\n${content}`
        const newContent = note.content + decisionsMd
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Decisions extracted to table' })
      },
      action_plan: async () => {
        if (!isMeeting) {
          setToast({ type: 'error', message: 'This action is only for meeting notes' })
          return
        }
        const actions = extractActionItems(content)
          const actionsMd = actions.length > 0
            ? `\n\n## Action Plan Table\n\n| # | Action Item | Owner | Due Date | Priority | Status |\n|---|-------------|-------|----------|----------|--------|\n${actions.map((a, i) => `| ${i + 1} | ${a.item} | ${a.owner || ''} | ${a.due || ''} | Medium | Pending |`).join('\n')}`
            : `\n\n## Action Plan Table\n\n${content}`
        const newContent = note.content + actionsMd
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Action items extracted to table' })
      },
      fill_attendance: async () => {
        if (!isMeeting) {
          setToast({ type: 'error', message: 'This action is only for meeting notes' })
          return
        }
        const attendees = extractAttendees(content)
        const attendanceMd = `\n\n### Attendance Log\n\n| Name | Role | Present |\n|------|------|---------|\n${attendees.map(a => `| ${a} |      |        |`).join('\n')}`
        const newContent = note.content + attendanceMd
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Attendance list generated' })
      },
      generate_motion: async () => {
        if (!isMeeting) {
          setToast({ type: 'error', message: 'This action is only for meeting notes' })
          return
        }
        const motionsMd = `\n\n## Decisions & Motions\n\n| Motion | Proposed By | Seconded | Result | Notes |\n|--------|-------------|----------|--------|-------|\n| ${content.split('\n')[0] || 'Motion'} |       |          |        |        |`
        const newContent = note.content + motionsMd
        await updateNote(note.id, { content: newContent })
        setToast({ type: 'success', message: 'Motion added to decisions table' })
      },
    }

    const handler = actionHandlers[action]
    if (handler) {
      try {
        await handler()
      } catch (err) {
        setToast({ type: 'error', message: `Action failed: ${err.message}` })
      }
    }
  }

  const extractTodos = (text) => {
    const patterns = [
      /(?:todo|task|action|need to|should|must|important)[:\s]+(.+)/gi,
      /[-*]\s*(.+)/g,
      /\d+\.\s*(.+)/g,
    ]
    const items = []
    patterns.forEach(p => {
      let match
      while ((match = p.exec(text)) !== null) {
        const item = match[1] || match[0]
        if (item && item.length > 3 && item.length < 200) {
          items.push(item.trim())
        }
      }
    })
    return items.slice(0, 10)
  }

  const extractTags = (text) => {
    const tagPattern = /#(\w+)/g
    const matches = text.match(tagPattern) || []
    const upperWords = text.match(/\b[A-Z][a-z]{2,}\b/g) || []
    const allTags = [...matches.map(t => t.slice(1)), ...upperWords]
    return [...new Set(allTags)].filter(t => t.length > 2 && t.length < 20).slice(0, 5)
  }

  const generateMeetingSummary = (text) => {
    const keyPoints = extractKeyPoints(text)
    const decisions = extractDecisions(text)
    const actions = extractActionItems(text)

    return `
### Key Takeaways
${keyPoints.map(p => `- ${p}`).join('\n') || '- (No key points identified)'}

### Decisions Reached
${decisions.length > 0 ? decisions.map(d => `- ${d}`).join('\n') : '- (No formal decisions recorded)'}

### Immediate Next Steps
${actions.length > 0 ? actions.map((a, i) => `- ${i + 1}. ${a.item}${a.owner ? ` (Owner: ${a.owner})` : ''}`).join('\n') : '- (No immediate actions identified)'}
`
  }

  const extractKeyPoints = (text) => {
    const patterns = [
      /(?:key point|important|notable|significant|main takeaway|highlight)[:\s]+(.+)/gi,
      /[-*]\s*(.+)/g,
    ]
    const items = []
    patterns.forEach(p => {
      let match
      while ((match = p.exec(text)) !== null) {
        const item = match[1] || match[0]
        if (item && item.length > 5 && item.length < 200) {
          items.push(item.trim())
        }
      }
    })
    return [...new Set(items)].slice(0, 5)
  }

  const extractDecisions = (text) => {
    const patterns = [
      /(?:decided|agreed|approved|confirmed|concluded|resolved|motion|voted)[:\s]+"?(.+?)"?/gi,
      /(?:we (?:will|shall|should|would)|the team (?:will|agrees)|it was (?:decided|agreed))[:\s]+(.+)/gi,
      /"(^[A-Z][^.!?]+[.!?])"/gm,
    ]
    const items = []
    patterns.forEach(p => {
      let match
      while ((match = p.exec(text)) !== null) {
        const item = (match[1] || match[0]).trim()
        if (item && item.length > 3 && item.length < 300) {
          items.push(item)
        }
      }
    })
    return [...new Set(items)].slice(0, 10)
  }

  const extractActionItems = (text) => {
    const patterns = [
      /(?:action|task|todo|responsible|owner|assign)[:\s]+(?:to )?(.+?)(?:by|before|until|@|\|)|(@\w+)[:\s]+(.+)/gi,
      /[-*]\s*(.+?)(?:\s*-\s*(?:owner|by|priority)[:\s]*(\w+))?/g,
      /(\d+)\.\s*(.+?)(?:\s*\((\w+)\))?\s*$/gm,
    ]
    const actions = []
    const seen = new Set()
    patterns.forEach(p => {
      let match
      while ((match = p.exec(text)) !== null) {
        const item = (match[1] || match[2] || match[0]).trim()
        const owner = match[2] || match[3] || ''
        if (item && item.length > 3 && item.length < 200 && !seen.has(item)) {
          seen.add(item)
          const dueMatch = item.match(/(?:by|before|due)[:\s]+(.+?)(?:\s*$|\s*\|)/i)
          actions.push({
            item: item.replace(/(?:by|before|due)[:\s]+.+$/i, '').trim(),
            owner: owner || '',
            due: dueMatch ? dueMatch[1].trim() : '',
          })
        }
      }
    })
    return actions.slice(0, 15)
  }

  const extractAttendees = (text) => {
    const patterns = [
      /(?:attendees?|participants?|present|attending)[:\s]+(.+)/gi,
      /([A-Z][a-z]+ [A-Z][a-z]+)/g,
    ]
    const names = []
    const seen = new Set()
    patterns.forEach(p => {
      let match
      while ((match = p.exec(text)) !== null) {
        const name = (match[1] || match[0]).trim()
        if (name && name.length > 2 && name.length < 50 && /^[A-Z]/.test(name) && !seen.has(name)) {
          const cleanName = name.replace(/[^A-Za-z\s'-]/g, '').trim()
          if (cleanName.split(' ').length >= 2 && cleanName.split(' ').length <= 4) {
            seen.add(cleanName)
            names.push(cleanName)
          }
        }
      }
    })
    return [...new Set(names)].slice(0, 20)
  }

  const startNotesSidebarResize = useCallback((e) => {
    setIsNotesSidebarResizing(true)
    e.preventDefault()
  }, [])

  const stopNotesSidebarResize = useCallback(() => {
    setIsNotesSidebarResizing(false)
    localStorage.setItem('chatter-notes-sidebar-width', notesSidebarWidth.toString())
  }, [notesSidebarWidth])

  const resizeNotesSidebar = useCallback((e) => {
    if (!isNotesSidebarResizing) return
    const newWidth = Math.max(240, Math.min(480, e.clientX))
    setNotesSidebarWidth(newWidth)
  }, [isNotesSidebarResizing])

  useEffect(() => {
    if (isNotesSidebarResizing) {
      window.addEventListener('mousemove', resizeNotesSidebar)
      window.addEventListener('mouseup', stopNotesSidebarResize)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      window.removeEventListener('mousemove', resizeNotesSidebar)
      window.removeEventListener('mouseup', stopNotesSidebarResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      window.removeEventListener('mousemove', resizeNotesSidebar)
      window.removeEventListener('mouseup', stopNotesSidebarResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isNotesSidebarResizing, resizeNotesSidebar, stopNotesSidebarResize])

  const handleTextSelection = useCallback((e) => {
    if (!isEditing) {
      setSelectionPosition(null)
      return
    }
    setTimeout(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start === end) {
        setSelectionPosition(null)
        return
      }
      const selected = editContent.substring(start, end)
      if (!selected.trim()) {
        setSelectionPosition(null)
        return
      }
      const textareaRect = textarea.getBoundingClientRect()
      const lineHeight = 20
      const linesBefore = editContent.substring(0, start).split('\n').length - 1
      const charOffset = start - editContent.lastIndexOf('\n', start - 1) - 1
      const approxX = Math.min(charOffset * 8, textareaRect.width - 100)
      const approxY = linesBefore * lineHeight
      const screenX = textareaRect.left + approxX
      const screenY = textareaRect.top + approxY
      setSelectionPosition({
        x: screenX,
        y: screenY,
        start,
        end,
        text: selected,
      })
    }, 50)
  }, [isEditing, editContent])

  const applyMarkdownFormat = useCallback((format) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = editContent
    const selected = text.substring(start, end)
    if (!selected && format !== 'hr') return

    const isMultiline = selected.includes('\n')
    const lines = selected.split('\n')

    const checkAndRemove = (pattern, newText) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`^${escaped}(.+)${escaped}$`)
      if (regex.test(selected.trim())) {
        return { action: 'remove', content: selected.trim().replace(regex, '$1'), cursorOffset: -pattern.length * 2 }
      }
      return null
    }

    const linePrefixTest = (prefix) => {
      return lines.every(l => l.trim().startsWith(prefix))
    }

    const removeLinePrefix = (prefix) => {
      return lines.map(l => l.startsWith(prefix) ? l.slice(prefix.length) : l).join('\n')
    }

    let newContent = text
    let cursorDelta = 0

    switch (format) {
      case 'bold': {
        if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `**${selected}**` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'italic': {
        if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && selected.length > 2) {
          newContent = text.substring(0, start) + selected.slice(1, -1) + text.substring(end)
          cursorDelta = -2
        } else {
          newContent = text.substring(0, start) + `*${selected}*` + text.substring(end)
          cursorDelta = 2
        }
        break
      }
      case 'strikethrough': {
        if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `~~${selected}~~` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'code': {
        if (isMultiline) {
          if (selected.startsWith('```\n') && selected.endsWith('\n```')) {
            newContent = text.substring(0, start) + selected.slice(5, -4) + text.substring(end)
            cursorDelta = -8
          } else {
            newContent = text.substring(0, start) + '```\n' + selected + '\n```' + text.substring(end)
            cursorDelta = 8
          }
        } else {
          if (selected.startsWith('`') && selected.endsWith('`') && selected.length > 2) {
            newContent = text.substring(0, start) + selected.slice(1, -1) + text.substring(end)
            cursorDelta = -2
          } else {
            newContent = text.substring(0, start) + '`' + selected + '`' + text.substring(end)
            cursorDelta = 2
          }
        }
        break
      }
      case 'h1': {
        if (linePrefixTest('# ')) {
          newContent = text.substring(0, start) + removeLinePrefix('# ') + text.substring(end)
          cursorDelta = -2
        } else if (linePrefixTest('## ')) {
          newContent = text.substring(0, start) + removeLinePrefix('## ').replace(/^(\S)/, '# $1') + text.substring(end)
          cursorDelta = -1
        } else if (linePrefixTest('### ')) {
          newContent = text.substring(0, start) + removeLinePrefix('### ').replace(/^(\S)/, '# $1') + text.substring(end)
          cursorDelta = -2
        } else {
          newContent = text.substring(0, start) + lines.map(l => '# ' + l).join('\n') + text.substring(end)
          cursorDelta = isMultiline ? 2 * lines.length : 2
        }
        break
      }
      case 'h2': {
        if (linePrefixTest('## ')) {
          newContent = text.substring(0, start) + removeLinePrefix('## ') + text.substring(end)
          cursorDelta = -3
        } else if (linePrefixTest('# ')) {
          newContent = text.substring(0, start) + removeLinePrefix('# ').replace(/^(\S)/, '## $1') + text.substring(end)
          cursorDelta = 1
        } else if (linePrefixTest('### ')) {
          newContent = text.substring(0, start) + removeLinePrefix('### ').replace(/^(\S)/, '## $1') + text.substring(end)
          cursorDelta = -1
        } else {
          newContent = text.substring(0, start) + lines.map(l => '## ' + l).join('\n') + text.substring(end)
          cursorDelta = isMultiline ? 3 * lines.length : 3
        }
        break
      }
      case 'h3': {
        if (linePrefixTest('### ')) {
          newContent = text.substring(0, start) + removeLinePrefix('### ') + text.substring(end)
          cursorDelta = -4
        } else if (linePrefixTest('## ')) {
          newContent = text.substring(0, start) + removeLinePrefix('## ').replace(/^(\S)/, '### $1') + text.substring(end)
          cursorDelta = 1
        } else if (linePrefixTest('# ')) {
          newContent = text.substring(0, start) + removeLinePrefix('# ').replace(/^(\S)/, '### $1') + text.substring(end)
          cursorDelta = 2
        } else {
          newContent = text.substring(0, start) + lines.map(l => '### ' + l).join('\n') + text.substring(end)
          cursorDelta = isMultiline ? 4 * lines.length : 4
        }
        break
      }
      case 'bullet': {
        if (linePrefixTest('- ')) {
          newContent = text.substring(0, start) + removeLinePrefix('- ') + text.substring(end)
          cursorDelta = -2
        } else {
          newContent = text.substring(0, start) + lines.map(l => '- ' + l).join('\n') + text.substring(end)
          cursorDelta = isMultiline ? 2 * lines.length : 2
        }
        break
      }
      case 'numbered': {
        const numberedMatch = lines.every((l, i) => {
          const trimmed = l.trim()
          return trimmed.match(/^\d+\.\s/)
        })
        if (numberedMatch) {
          newContent = text.substring(0, start) + lines.map(l => l.replace(/^\d+\.\s/, '')).join('\n') + text.substring(end)
          const totalRemoved = lines.reduce((sum, l) => {
            const match = l.match(/^\d+\.\s/)
            return sum + (match ? match[0].length : 0)
          }, 0)
          cursorDelta = -totalRemoved
        } else {
          newContent = text.substring(0, start) + lines.map((l, i) => `${i + 1}. ${l}`).join('\n') + text.substring(end)
          cursorDelta = isMultiline ? 3 * lines.length : 3
        }
        break
      }
      case 'quote': {
        if (linePrefixTest('> ')) {
          newContent = text.substring(0, start) + removeLinePrefix('> ') + text.substring(end)
          cursorDelta = -2
        } else {
          newContent = text.substring(0, start) + lines.map(l => '> ' + l).join('\n') + text.substring(end)
          cursorDelta = isMultiline ? 2 * lines.length : 2
        }
        break
      }
      case 'hr': {
        const before = text.substring(0, end)
        const after = text.substring(end)
        const hrExists = before.endsWith('\n---\n') || before.endsWith('\n---\n')
        if (hrExists) {
          newContent = before.slice(0, -5) + after
          cursorDelta = -6
        } else {
          newContent = before + '\n---\n' + after
          cursorDelta = 6
        }
        break
      }
      case 'link': {
        const linkMatch = selected.match(/^\[(.+)\]\((.+)\)$/)
        if (linkMatch) {
          newContent = text.substring(0, start) + linkMatch[1] + text.substring(end)
          cursorDelta = -linkMatch[0].length + linkMatch[1].length
        } else {
          newContent = text.substring(0, start) + `[${selected}](url)` + text.substring(end)
          cursorDelta = selected.length + 3
        }
        break
      }
      case 'highlight': {
        if (selected.startsWith('==') && selected.endsWith('==') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `==${selected}==` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'highlight-yellow': {
        if (selected.startsWith('==') && selected.endsWith('==') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `==${selected}==` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'highlight-blue': {
        if (selected.startsWith('^^') && selected.endsWith('^^') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `^^${selected}^^` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'highlight-green': {
        if (selected.startsWith('@@') && selected.endsWith('@@') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `@@${selected}@@` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'highlight-red': {
        if (selected.startsWith('##') && selected.endsWith('##') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `##${selected}##` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'highlight-purple': {
        if (selected.startsWith('%%') && selected.endsWith('%%') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `%%${selected}%%` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'highlight-orange': {
        if (selected.startsWith('++') && selected.endsWith('++') && selected.length > 4) {
          newContent = text.substring(0, start) + selected.slice(2, -2) + text.substring(end)
          cursorDelta = -4
        } else {
          newContent = text.substring(0, start) + `++${selected}++` + text.substring(end)
          cursorDelta = 4
        }
        break
      }
      case 'comment': {
        const commentMatch = selected.match(/^<!--(.+?)-->$/)
        if (commentMatch) {
          newContent = text.substring(0, start) + commentMatch[1] + text.substring(end)
          cursorDelta = -7
        } else {
          newContent = text.substring(0, start) + `<!--${selected}-->` + text.substring(end)
          cursorDelta = 7
        }
        break
      }
      case 'subscript': {
        if (selected.startsWith('~') && selected.endsWith('~') && selected.length > 2) {
          newContent = text.substring(0, start) + selected.slice(1, -1) + text.substring(end)
          cursorDelta = -2
        } else {
          newContent = text.substring(0, start) + `~${selected}~` + text.substring(end)
          cursorDelta = 2
        }
        break
      }
      case 'superscript': {
        if (selected.startsWith('^') && selected.endsWith('^') && selected.length > 2) {
          newContent = text.substring(0, start) + selected.slice(1, -1) + text.substring(end)
          cursorDelta = -2
        } else {
          newContent = text.substring(0, start) + `^${selected}^` + text.substring(end)
          cursorDelta = 2
        }
        break
      }
      case 'table': {
        const tableTemplate = `
| Header 1 | Header 2 | Header 3 |
|-----------|-----------|-----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`
        newContent = text.substring(0, start) + tableTemplate + text.substring(end)
        cursorDelta = tableTemplate.length
        break
      }
      case 'checkbox': {
        if (linePrefixTest('- [ ] ')) {
          newContent = text.substring(0, start) + removeLinePrefix('- [ ] ') + text.substring(end)
          cursorDelta = -6
        } else if (linePrefixTest('- [x] ')) {
          newContent = text.substring(0, start) + removeLinePrefix('- [x] ').replace(/^(\S)/, '- [ ] $1') + text.substring(end)
          cursorDelta = 0
        } else {
          newContent = text.substring(0, start) + lines.map(l => '- [ ] ' + l).join('\n') + text.substring(end)
          cursorDelta = isMultiline ? 6 * lines.length : 6
        }
        break
      }
      default:
        return
    }
    setEditContent(newContent)
    setSelectionPosition(null)
    setTimeout(() => {
      textarea.focus()
      const newPos = Math.max(start, end + cursorDelta)
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }, [editContent])

  const handleGenerateTitle = useCallback(async () => {
    if (!selectedNoteId || !editContent.trim()) return
    setIsGeneratingTitle(true)

    try {
      const stream = await enhanceNote(
        selectedNoteId,
        editContent,
        'Generate a short, descriptive title for this note content. Respond with ONLY the title text, no quotes or formatting.'
      )
      const reader = stream.getReader()
      let generatedTitle = ''
      let done = false
      while (!done) {
        const { value, done: d } = await reader.read()
        done = d
        if (value) {
          generatedTitle += new TextDecoder().decode(value)
        }
      }

      const cleanTitle = generatedTitle.trim().replace(/^["']|["']$/g, '')
      setEditTitle(cleanTitle)
      setToast({ type: 'success', message: 'Title generated' })
    } catch (err) {
      console.error('Generate title error:', err)
      setToast({ type: 'error', message: 'Failed to generate title' })
    } finally {
      setIsGeneratingTitle(false)
    }
  }, [selectedNoteId, enhanceNote, editContent])

  const handleEnhance = useCallback(async (instruction, forceStart, forceEnd) => {
    if (!selectedNoteId) return
    setIsEnhancing(true)
    setShowEnhancePopover(false)
    setSelectionPosition(null)

    const textarea = textareaRef.current
    const startPos = forceStart !== undefined ? forceStart : (textarea?.selectionStart || 0)
    const endPos = forceEnd !== undefined ? forceEnd : (textarea?.selectionEnd || 0)
    const hasSelection = startPos !== endPos && startPos < editContent.length

    const textToEnhance = hasSelection
      ? editContent.substring(startPos, endPos)
      : editContent

    setUndoStack((prev) => [...prev, editContent])

    try {
      const stream = await enhanceNote(selectedNoteId, textToEnhance, instruction || 'Enhance this text: improve clarity, grammar, and style')
      const reader = stream.getReader()
      let enhancedText = ''
      let done = false
      while (!done) {
        const { value, done: d } = await reader.read()
        done = d
        if (value) {
          const chunk = new TextDecoder().decode(value)
          enhancedText += chunk
          if (textarea) {
            textarea.value = hasSelection
              ? editContent.substring(0, startPos) + enhancedText + editContent.substring(endPos)
              : enhancedText
          }
        }
      }

      const newContent = hasSelection
        ? editContent.substring(0, startPos) + enhancedText + editContent.substring(endPos)
        : enhancedText

      setEditContent(newContent)
      setToast({ type: 'success', message: 'Enhancement complete' })
    } catch (err) {
      console.error('Enhance error:', err)
      setToast({ type: 'error', message: 'AI Enhance failed — check your provider connection' })
    } finally {
      setIsEnhancing(false)
      setCustomInstruction('')
    }
  }, [selectedNoteId, enhanceNote, editContent])

  const handleExport = useCallback(async (format) => {
    if (!selectedNoteId) return
    setShowExportMenu(false)
    try {
      if (format === 'pdf') {
        const { default: html2pdf } = await import('html2pdf.js')
        const content = document.createElement('div')
        content.innerHTML = `<div style="padding: 20px; font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.6;">${selectedNote.content}</div>`
        const opt = {
          margin: 1,
          filename: `${selectedNote.title || 'note'}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter' },
        }
        await html2pdf().set(opt).from(content).save()
        setToast({ type: 'success', message: 'PDF exported' })
      } else {
        await exportNote(selectedNoteId, format)
        setToast({ type: 'success', message: `Note exported as .${format}` })
      }
    } catch (err) {
      console.error('Export error:', err)
      setToast({ type: 'error', message: format === 'pdf' ? 'PDF export failed' : 'Export failed' })
    }
  }, [selectedNoteId, selectedNote, exportNote])

  const loadKnowledgeBases = useCallback(async () => {
    setLoadingKbs(true)
    try {
      const res = await fetch('/api/knowledge')
      const data = await res.json()
      setKnowledgeBases(data.knowledge_bases || [])
    } catch (err) {
      console.error('Failed to load knowledge bases:', err)
    } finally {
      setLoadingKbs(false)
    }
  }, [])

  const handleSaveToKb = async (kbId) => {
    setIsSavingToKb(true)
    try {
      const res = await fetch(`/api/notes/${selectedNoteId}/save-to-kb/${kbId}`, { method: 'POST' })
      const data = await res.json()
      if (data.status === 'ok') {
        setToast({ type: 'success', message: 'Note saved to knowledge base' })
        setShowKbModal(false)
        loadNotes() // Refresh notes to show updated KB indicators
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to save to knowledge base' })
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to save to knowledge base' })
    } finally {
      setIsSavingToKb(false)
    }
  }

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  const getGroupedNotes = useCallback(() => {
    const displayedNotes = searchResults ? searchResults.notes : notes
    const filteredNotes = showArchived
      ? displayedNotes
      : displayedNotes.filter((n) => !n.archived)
    
    if (groupBy === 'none') return { 'All Notes': filteredNotes }

    const groups = {}
    filteredNotes.forEach(note => {
      let key = 'Uncategorized'
      if (groupBy === 'type') {
        key = getTypeInfo(note.note_type).label || note.note_type || 'Simple Note'
      } else if (groupBy === 'topic') {
        if (note.tags && note.tags.length > 0) {
          note.tags.forEach(tag => {
            if (!groups[tag]) groups[tag] = []
            groups[tag].push(note)
          })
          return // Handled multiple tags
        } else {
          key = 'No Tags'
        }
      } else if (groupBy === 'date') {
        const date = new Date(note.updated_at * 1000)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        if (date.toDateString() === today.toDateString()) key = 'Today'
        else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday'
        else if (date > new Date(today.setDate(today.getDate() - 7))) key = 'Last 7 Days'
        else key = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(note)
    })
    return groups
  }, [notes, searchResults, showArchived, groupBy])

  const groupedNotes = getGroupedNotes()

  const displayedNotes = searchResults ? searchResults.notes : notes
  const filteredNotes = showArchived
    ? displayedNotes
    : displayedNotes.filter((n) => !n.archived)
  const pinnedNotes = filteredNotes.filter((n) => n.pinned)
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned)

  return (
    <div
        className="flex h-full overflow-hidden"
        style={{ background: 'var(--bg)' }}
      >
      <NoteChatDrawer
        isOpen={showChatDrawer}
        onClose={() => setShowChatDrawer(false)}
        note={selectedNote}
        onResponseAction={handleChatResponseAction}
      />

      {showTypeSelector && (
        <NoteTypeSelector
          selectedType={noteType}
          onTypeSelect={setNoteType}
          onConfirm={() => performCreateNote(noteType)}
          onCancel={() => setShowTypeSelector(false)}
        />
      )}

      {toast && (
        <div
          className="fixed top-4 right-4 z-[70] max-w-sm rounded-xl border px-4 py-3 shadow-lg animate-fade-in"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'var(--text)',
          }}
          role="status"
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

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'var(--modal-backdrop)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(null)
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
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Delete note?</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                This will permanently remove the note. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNote(confirmDelete)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showKbModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'var(--modal-backdrop)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowKbModal(false)
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
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Save to Knowledge Base</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Choose a knowledge base to save this note into as a reference.
              </p>
            </div>
            <div className="px-6 pb-2 max-h-64 overflow-y-auto">
              {loadingKbs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-5 w-5 border border-current rounded-full" style={{ borderRightColor: 'transparent', color: 'var(--text-tertiary)' }} />
                </div>
              ) : knowledgeBases.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
                  No knowledge bases found. Create one first.
                </p>
              ) : (
                <div className="space-y-1">
                  {knowledgeBases.map((kb) => (
                    <button
                      key={kb.id}
                      onClick={() => handleSaveToKb(kb.id)}
                      disabled={isSavingToKb}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
                      style={{ color: 'var(--text)' }}
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--surface)' }}>
                        <KnowledgeIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{kb.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{kb.kb_type} · {kb.file_count || 0} items</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setShowKbModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              {isSavingToKb && (
                <div className="animate-spin h-4 w-4 border border-current rounded-full" style={{ borderRightColor: 'transparent', color: 'var(--text-tertiary)' }} />
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="relative flex flex-col border-r shrink-0 overflow-hidden glass-card-strong"
        style={{
          borderColor: 'var(--glass-border)',
          width: notesSidebarWidth,
          transition: isNotesSidebarResizing ? 'none' : 'width 0.2s ease-out',
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startNotesSidebarResize}
          className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 transition-all duration-150 group/resize ${
            isNotesSidebarResizing
              ? 'bg-[var(--accent-primary)]'
              : 'hover:bg-[var(--accent-primary)]/40'
          }`}
          title="Drag to resize sidebar"
        >
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full transition-all duration-150 ${
            isNotesSidebarResizing
              ? 'bg-white h-12'
              : 'bg-[var(--text-muted)]/30 group-hover/resize:bg-[var(--accent-primary)]'
          }`} />
        </div>

        <div className="px-4 pt-4 pb-3 border-b border-[var(--glass-border)] shrink-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold bg-gradient-to-r from-[var(--text)] to-[var(--text-secondary)] bg-clip-text text-transparent">Notes</h2>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold glass-button glow-accent-sm text-[var(--accent-primary)] hover:scale-105 transition-all"
              title="Create new note"
            >
              <PlusIcon size={16} />
              New
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
            {[
              { id: 'simple', label: 'Simple', icon: <FileTextIcon size={11} />, color: '#a855f7' },
              { id: 'rich', label: 'Rich', icon: <EditIcon size={11} />, color: '#6366f1' },
              { id: 'meeting', label: 'Meeting', icon: <UsersIcon size={11} />, color: '#ec4899' },
              { id: 'voice', label: 'Voice', icon: <MicIcon size={11} />, color: '#10b981' },
              { id: 'research', label: 'Research', icon: <SearchIcon size={11} />, color: '#f59e0b' },
              { id: 'project', label: 'Project', icon: <LayersIcon size={11} />, color: '#8b5cf6' },
              { id: 'daily', label: 'Daily', icon: <CalendarIcon size={11} />, color: '#06b6d4' },
              { id: 'documentation', label: 'Docs', icon: <FileTextIcon size={11} />, color: '#64748b' },
              { id: 'bug', label: 'Bug', icon: <BugIcon size={11} />, color: '#ef4444' },
              { id: 'feature', label: 'Idea', icon: <SparklesIcon size={11} />, color: '#22c55e' },
              { id: 'recipe', label: 'Recipe', icon: <FileTextIcon size={11} />, color: '#f97316' },
              { id: 'book', label: 'Book', icon: <BookIcon size={11} />, color: '#3b82f6' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setNoteType(type.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  noteType === type.id
                    ? 'text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] glass-card border border-transparent hover:border-[var(--glass-border-hover)]'
                }`}
                style={{
                  background: noteType === type.id ? type.color : 'transparent',
                }}
              >
                {type.icon}
                {type.label}
              </button>
            ))}
          </div>

          <div className="relative group mb-2">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors">
              <SearchIcon size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-9 py-2 glass-card text-sm focus:outline-none focus:border-[var(--accent-primary)]/50 focus:glow-accent-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Group By:</span>
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value)}
                className="text-[10px] font-bold bg-transparent border-none outline-none text-[var(--accent-primary)] cursor-pointer hover:underline"
              >
                <option value="none">None</option>
                <option value="type">Type</option>
                <option value="topic">Topic</option>
                <option value="date">Date</option>
              </select>
            </div>
            {groupBy !== 'none' && (
              <button 
                onClick={() => setExpandedFolders({})}
                className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Collapse All
              </button>
            )}
          </div>

          {searchResults && (
            <div className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {searchResults.count} result{searchResults.count !== 1 ? 's' : ''} for "{searchResults.query}"
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading && notes.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-5 w-5 border-2 border-current rounded-full" style={{ color: 'var(--text-tertiary)', borderRightColor: 'transparent' }} />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
              <div className="mb-2 text-[var(--text-muted)]"><FileTextIcon size={24} /></div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'No notes match your search' : 'No notes yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateNote}
                  className="mt-2 text-sm font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {pinnedNotes.length > 0 && groupBy === 'none' && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    <PinIcon size={14} />
                    Pinned
                  </div>
                  {pinnedNotes.map((note) => (
                    <NoteListItem 
                      key={note.id} 
                      note={note} 
                      isSelected={selectedNoteId === note.id} 
                      onSelect={handleSelectNote} 
                    />
                  ))}
                  <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
                </>
              )}

              {Object.entries(groupedNotes).map(([groupName, groupNotes]) => {
                const isExpanded = groupBy === 'none' || expandedFolders[groupName]
                return (
                  <div key={groupName} className="mb-2">
                    {groupBy !== 'none' && (
                      <button 
                        onClick={() => toggleFolder(groupName)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--surface)] transition-all group/folder"
                      >
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRightIcon size={14} className="text-[var(--text-muted)]" />
                        </div>
                        <FolderIcon size={16} className={`${isExpanded ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                        <span className="text-xs font-bold truncate flex-1 text-left" style={{ color: isExpanded ? 'var(--text)' : 'var(--text-secondary)' }}>
                          {groupName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] group-hover/folder:bg-[var(--accent-primary)] group-hover/folder:text-white transition-all">
                          {groupNotes.length}
                        </span>
                      </button>
                    )}
                    
                    {isExpanded && (
                      <div className={`space-y-1 ${groupBy !== 'none' ? 'ml-4 mt-1 border-l-2 border-[var(--glass-border)] pl-2' : ''}`}>
                        {groupNotes.map((note) => (
                          <NoteListItem 
                            key={note.id} 
                            note={note} 
                            isSelected={selectedNoteId === note.id} 
                            onSelect={handleSelectNote} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>


        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs font-medium transition-colors hover:underline"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedNote ? (
          <>
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0 glass-card-strong"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                      {getNoteIcon(noteType, 20)}
                    </div>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-xl font-bold bg-transparent border-none outline-none min-w-0 flex-1 placeholder:text-[var(--text-muted)]"
                      style={{ color: 'var(--text)' }}
                      placeholder="Note title..."
                    />
                    <button
                      onClick={handleGenerateTitle}
                      disabled={isGeneratingTitle || !editContent.trim()}
                      className="shrink-0 p-2 rounded-xl glass-button text-[var(--accent-primary)] disabled:opacity-30 hover:scale-110 transition-all"
                      style={{ color: 'var(--accent-primary)' }}
                      title="Generate title with AI"
                    >
                      {isGeneratingTitle ? (
                        <div className="animate-spin h-5 w-5 border-2 border-current rounded-full" style={{ borderRightColor: 'transparent' }} />
                      ) : (
                        <SparklesIcon size={20} />
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-2 rounded-xl bg-[var(--surface)] text-[var(--text-secondary)]">
                      {getNoteIcon(selectedNote.note_type, 20)}
                    </div>
                    <h1 className="text-xl font-bold truncate tracking-tight" style={{ color: 'var(--text)' }}>
                      {selectedNote.title || 'Untitled'}
                    </h1>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditTitle(selectedNote.title)
                        setEditContent(selectedNote.content)
                        setEditTags(selectedNote.tags?.join(', ') || '')
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-bold glass-button text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNote}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <SaveIcon size={18} />
                      Save
                    </button>
                    <div className="w-px h-6 mx-1 bg-[var(--glass-border)]" />
                    <button
                      onClick={() => {
                        if (undoStack.length > 0) {
                          const prev = undoStack[undoStack.length - 1]
                          setUndoStack((s) => s.slice(0, -1))
                          setEditContent(prev)
                        }
                      }}
                      disabled={undoStack.length === 0}
                      className="p-2 rounded-xl glass-button text-[var(--text-secondary)] disabled:opacity-30 hover:text-[var(--accent-primary)] transition-all"
                      title="Undo (Ctrl+Z)"
                    >
                      <UndoIcon size={18} />
                    </button>
                    <div className="relative" ref={enhancePopoverRef}>
                      <button
                        onClick={() => setShowEnhancePopover(!showEnhancePopover)}
                        disabled={isEnhancing}
                        className={`p-2 rounded-xl glass-button transition-all ${showEnhancePopover ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'}`}
                        title="AI Enhance"
                      >
                        {isEnhancing ? (
                          <div className="animate-spin h-5 w-5 border-2 border-current rounded-full" style={{ borderRightColor: 'transparent' }} />
                        ) : (
                          <BrainIcon size={20} />
                        )}
                      </button>
                      {showEnhancePopover && (
                        <div
                          className="absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl z-50 p-4 animate-fade-in glass-card-strong"
                          style={{ borderColor: 'var(--glass-border)' }}
                        >
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 text-[var(--accent-primary)]">
                            <BrainIcon size={14} />
                            Enhance with AI
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {ENHANCE_PRESETS.map((preset) => (
                              <button
                                key={preset.label}
                                onClick={() => handleEnhance(preset.instruction)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl glass-button text-[var(--text)] hover:text-[var(--accent-primary)] transition-all"
                              >
                                {preset.icon}
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customInstruction}
                              onChange={(e) => setCustomInstruction(e.target.value)}
                              placeholder="Custom instruction..."
                              className="flex-1 px-3 py-2 text-xs glass-card outline-none focus:border-[var(--accent-primary)]/50 transition-all placeholder:text-[var(--text-muted)]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && customInstruction.trim()) {
                                  handleEnhance(customInstruction.trim())
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (customInstruction.trim()) {
                                  handleEnhance(customInstruction.trim())
                                }
                              }}
                              disabled={!customInstruction.trim()}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent-primary)] text-white disabled:opacity-50 transition-all shadow-md shadow-[var(--accent-primary)]/20"
                            >
                              Go
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <EditIcon size={18} />
                      Edit Note
                    </button>
                    <div className="w-px h-6 mx-1 bg-[var(--glass-border)]" />
                    <button
                      onClick={() => handlePinNote(selectedNote.id)}
                      className={`p-2 rounded-xl glass-button transition-all ${selectedNote.pinned ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-inner' : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'}`}
                      title={selectedNote.pinned ? 'Unpin note' : 'Pin note'}
                    >
                      <PinIcon size={20} />
                    </button>
                    <button
                      onClick={() => setShowChatDrawer(true)}
                      className="p-2 rounded-xl glass-button text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all"
                      title="AI Chat about note"
                    >
                      <MessageSquareIcon size={20} />
                    </button>
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className={`p-2 rounded-xl glass-button transition-all ${showExportMenu ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'}`}
                        title="Export note"
                      >
                        <DownloadIcon size={20} />
                      </button>
                      {showExportMenu && (
                        <div
                          className="absolute right-0 top-full mt-2 w-36 rounded-2xl border shadow-2xl z-50 p-2 animate-fade-in glass-card-strong"
                          style={{ borderColor: 'var(--glass-border)' }}
                        >
                          <button
                            onClick={() => handleExport('txt')}
                            className="w-full px-3 py-2 text-left text-xs font-bold rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all"
                          >
                            Text File (.txt)
                          </button>
                          <button
                            onClick={() => handleExport('md')}
                            className="w-full px-3 py-2 text-left text-xs font-bold rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all"
                          >
                            Markdown (.md)
                          </button>
                          <button
                            onClick={() => handleExport('pdf')}
                            className="w-full px-3 py-2 text-left text-xs font-bold rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all"
                          >
                            PDF Document
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { loadKnowledgeBases(); setShowKbModal(true) }}
                      className="p-2 rounded-xl glass-button text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all"
                      title="Save to knowledge base"
                    >
                      <KnowledgeIcon size={20} />
                    </button>
                    <button
                      onClick={() => handleArchiveNote(selectedNote.id)}
                      className="p-2 rounded-xl glass-button text-[var(--text-secondary)] hover:text-[var(--success)] transition-all"
                      title="Archive note"
                    >
                      <ArchiveIcon size={20} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(selectedNote.id)}
                      className="p-2 rounded-xl glass-button text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all"
                      title="Delete note"
                    >
                      <TrashIcon size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-b flex items-center gap-4 flex-wrap shrink-0 glass-card" style={{ borderColor: 'var(--glass-border)' }}>
              <span className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                <ClockIcon size={14} />
                Created {formatDate(selectedNote.created_at)}
              </span>
              {selectedNote.knowledge_bases?.length > 0 && (
                <div className="flex items-center gap-2 border-l border-[var(--glass-border)] pl-4">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Reference KB:</span>
                  {selectedNote.knowledge_bases.map((kb) => (
                    <span 
                      key={kb.id} 
                      className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20"
                    >
                      <KnowledgeIcon size={12} />
                      {kb.name}
                    </span>
                  ))}
                </div>
              )}
              {selectedNote.tags?.length > 0 && !isEditing && (
                <div className="flex items-center gap-1.5 flex-wrap border-l border-[var(--glass-border)] pl-4">
                  {selectedNote.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-xl glass-card text-[var(--text-muted)] border-[var(--glass-border)]"
                    >
                      <TagIcon size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isEditing ? (
                <div className="p-8 space-y-6 max-w-4xl mx-auto">
                  <div className="glass-card p-4 rounded-2xl border-[var(--glass-border)]">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-2 text-[var(--text-muted)]">
                      <TagIcon size={14} />
                      Tags & Metadata
                    </label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="e.g. work, ideas, todo"
                      className="w-full px-4 py-2.5 rounded-xl text-sm glass-card outline-none focus:border-[var(--accent-primary)]/50 transition-all placeholder:text-[var(--text-muted)] font-medium"
                    />
                  </div>
                  <div className="relative glass-card-strong p-1 rounded-3xl border-[var(--glass-border)] shadow-2xl">
                    <div className="flex flex-col h-[calc(100dvh-360px)]">
                      {/* Premium Toolbar */}
                      <div className="px-4 py-2 flex items-center gap-1 border-b border-[var(--glass-border)] flex-wrap">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => applyMarkdownFormat('bold')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all font-black text-xs" title="Bold">B</button>
                          <button onClick={() => applyMarkdownFormat('italic')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all italic text-xs" title="Italic">I</button>
                          <button onClick={() => applyMarkdownFormat('strikethrough')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all line-through text-xs" title="Strikethrough">S</button>
                        </div>
                        <div className="w-px h-6 mx-1 bg-[var(--glass-border)]" />
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => applyMarkdownFormat('h1')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all font-black text-[10px]" title="H1">H1</button>
                          <button onClick={() => applyMarkdownFormat('h2')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all font-black text-[10px]" title="H2">H2</button>
                          <button onClick={() => applyMarkdownFormat('h3')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all font-black text-[10px]" title="H3">H3</button>
                        </div>
                        <div className="w-px h-6 mx-1 bg-[var(--glass-border)]" />
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => applyMarkdownFormat('bullet')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all" title="List"><ListIcon size={16} /></button>
                          <button onClick={() => applyMarkdownFormat('quote')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all" title="Quote"><QuoteIcon size={16} /></button>
                          <button onClick={() => applyMarkdownFormat('checkbox')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all" title="Task"><CheckboxIcon size={16} /></button>
                        </div>
                        <div className="w-px h-6 mx-1 bg-[var(--glass-border)]" />
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => applyMarkdownFormat('code')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all" title="Code"><CodeIcon size={16} /></button>
                          <button onClick={() => applyMarkdownFormat('table')} className="p-2 rounded-xl hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all" title="Table"><TableIcon size={16} /></button>
                          <button onClick={() => setShowHighlightPicker(!showHighlightPicker)} className={`p-2 rounded-xl transition-all ${showHighlightPicker ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]'}`} title="Highlight">
                            <EditIcon size={16} />
                          </button>
                        </div>
                        
                        {showHighlightPicker && (
                          <div className="absolute top-12 left-4 z-50 flex items-center gap-1.5 p-2 rounded-2xl glass-card-strong border-[var(--accent-primary)]/30 shadow-2xl animate-fade-in-scale">
                            {[
                              { id: 'yellow', color: '#fef08a' },
                              { id: 'blue', color: '#93c5fd' },
                              { id: 'green', color: '#86efac' },
                              { id: 'red', color: '#fca5a5' },
                              { id: 'purple', color: '#d8b4fe' },
                              { id: 'orange', color: '#fdba74' }
                            ].map(h => (
                              <button 
                                key={h.id}
                                onClick={() => { applyMarkdownFormat(`highlight-${h.id}`); setShowHighlightPicker(false) }} 
                                className="w-6 h-6 rounded-lg transition-transform hover:scale-125 hover:rotate-12" 
                                style={{ background: h.color }} 
                                title={h.id} 
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="flex-1" />
                        
                        {/* Templates Button */}
                        <div className="relative group/templates">
                          <button 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-[var(--accent-primary)] font-bold text-xs"
                            onClick={() => {
                              if (noteType === 'meeting') {
                                setEditContent(prev => prev + '\n\n## Participants\n- [ ] \n\n## Agenda\n1. \n\n## Action Items\n- [ ] ')
                              } else if (noteType === 'voice') {
                                setEditContent(prev => prev + '\n\n> [!VOICE_NOTE]\n> Transcription: \n\n## Key Points\n- ')
                              }
                            }}
                          >
                            <FileTextIcon size={14} />
                            Template
                          </button>
                        </div>
                      </div>
                    {selectionPosition && (
                      <div
                        ref={floatingToolbarRef}
                        className="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg border shadow-lg"
                        style={{
                          left: selectionPosition.x,
                          top: selectionPosition.y - 50,
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--border)',
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {ENHANCE_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => handleEnhance(preset.instruction, selectionPosition.start, selectionPosition.end)}
                            className="relative px-2 py-1 text-xs rounded-md border transition-colors hover:bg-[var(--surface)]"
                            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                            title={preset.label}
                          >
                            {preset.icon}
                          </button>
                        ))}
                        <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
                        <input
                          type="text"
                          placeholder="..."
                          className="w-16 px-2 py-1 text-xs rounded border outline-none"
                          style={{
                            background: 'var(--bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)',
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              handleEnhance(e.target.value.trim(), selectionPosition.start, selectionPosition.end)
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling
                            if (input.value.trim()) {
                              handleEnhance(input.value.trim(), selectionPosition.start, selectionPosition.end)
                            }
                          }}
                          className="relative px-2 py-1 text-xs rounded-md transition-colors hover:bg-[var(--surface)]"
                          style={{ color: 'var(--text)' }}
                          title="Send"
                        >
                          <SendIcon />
                        </button>
                      </div>
                    )}
                      <textarea
                        ref={textareaRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onMouseUp={handleTextSelection}
                        onKeyUp={handleTextSelection}
                        onClick={handleTextSelection}
                        onSelect={handleTextSelection}
                        placeholder="Start writing your thoughts..."
                        className="flex-1 px-8 py-6 rounded-b-3xl text-sm border-none outline-none focus:ring-0 resize-none bg-transparent"
                        style={{
                          color: 'var(--text)',
                          lineHeight: '1.8',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest px-4" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                      {wordCount.words} Words
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-secondary)]" />
                      {wordCount.chars} Characters
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <style>{`
                    .note-paper {
                      color: var(--text);
                      min-height: 297mm;
                      max-width: 210mm;
                      padding: 30mm 35mm;
                      margin: 24px auto;
                      border-radius: 24px;
                      line-height: 1.8;
                      font-size: 15px;
                      background: var(--bg);
                      border: 1px solid var(--glass-border);
                      box-shadow: var(--shadow-xl), 0 0 0 1px rgba(255,255,255,0.05);
                      position: relative;
                      overflow: hidden;
                    }
                    .note-paper h1 { font-size: 32px; font-weight: 800; margin-bottom: 24px; color: var(--accent-primary); letter-spacing: -0.025em; }
                    .note-paper h2 { font-size: 24px; font-weight: 700; margin-top: 32px; margin-bottom: 16px; color: var(--text); }
                    .note-paper h3 { font-size: 20px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; color: var(--text-secondary); }
                    .note-paper p { margin-bottom: 16px; opacity: 0.9; }
                    .note-paper ul, .note-paper ol { margin-bottom: 16px; padding-left: 28px; }
                    .note-paper li { margin-bottom: 6px; }
                    .note-paper blockquote { border-left: 4px solid var(--accent-primary); padding: 12px 24px; margin: 24px 0; font-style: italic; background: var(--accent-primary)/5; border-radius: 0 12px 12px 0; }
                    .note-paper code { background: var(--surface); padding: 3px 8px; border-radius: 8px; font-size: 13px; font-family: 'Fira Code', monospace; border: 1px solid var(--glass-border); }
                    .note-paper pre { background: #0a0a0a; padding: 20px; border-radius: 16px; overflow-x: auto; margin: 24px 0; border: 1px solid var(--glass-border); box-shadow: inset 0 2px 10px rgba(0,0,0,0.5); }
                    .note-paper pre code { background: none; padding: 0; border: none; color: #e4e4e7; }
                    .note-paper a { color: var(--accent-primary); text-decoration: underline; text-underline-offset: 4px; }
                    .note-paper hr { border: none; border-top: 2px solid var(--glass-border); margin: 40px 0; }
                    .note-paper img { max-width: 100%; border-radius: 16px; shadow: var(--shadow-xl); }
                    .note-paper table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 24px 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border); }
                    .note-paper th, .note-paper td { border: 1px solid var(--glass-border); padding: 12px 16px; text-align: left; }
                    .note-paper th { background: var(--surface); font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
                    .note-paper mark.hl-yellow { background: rgba(254, 240, 138, 0.4); color: inherit; padding: 0 2px; border-radius: 2px; }
                    .note-paper mark.hl-blue { background: rgba(147, 197, 253, 0.4); color: inherit; padding: 0 2px; border-radius: 2px; }
                    .note-paper mark.hl-green { background: rgba(134, 239, 172, 0.4); color: inherit; padding: 0 2px; border-radius: 2px; }
                    .note-paper mark.hl-red { background: rgba(252, 165, 165, 0.4); color: inherit; padding: 0 2px; border-radius: 2px; }
                    .note-paper mark.hl-purple { background: rgba(216, 180, 254, 0.4); color: inherit; padding: 0 2px; border-radius: 2px; }
                    .note-paper mark.hl-orange { background: rgba(253, 186, 116, 0.4); color: inherit; padding: 0 2px; border-radius: 2px; }
                    .note-paper .annotation { display: inline-flex; items-center: center; gap: 6px; background: var(--accent-primary)/10; color: var(--accent-primary); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 10px; cursor: help; border: 1px solid var(--accent-primary)/20; margin: 0 4px; }
                  `}</style>
                  <div className="note-paper">
                    {renderedContent ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {renderedContent}
                      </ReactMarkdown>
                    ) : (
                      <p className="italic" style={{ color: 'var(--text-tertiary)' }}>
                        This note is empty. Click Edit to add content.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
              Select a note
            </h3>
            <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              Choose a note from the sidebar to view or edit it, or create a new one.
            </p>
            <button
              onClick={handleCreateNote}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              <PlusIcon size={16} />
              Create New Note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}