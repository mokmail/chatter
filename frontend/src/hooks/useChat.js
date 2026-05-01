// Core chat hook - manages all chat state and backend communication.
// Handles: messages, sessions, models, config, streaming, follow-ups, artifacts.
// Exposes action functions (send, edit, delete, branch, fork, etc.) for the UI.
import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const API_BASE = '/api'

export const useChat = () => {
  // Core chat state
  const [messages, setMessages] = useState([])
  const [models, setModels] = useState([])
  const [currentModel, setCurrentModel] = useState('')
  const [currentProviderId, setCurrentProviderId] = useState('')
  const [config, setConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [sessionKnowledgeBases, setSessionKnowledgeBases] = useState([])
  const [sessionKnowledgeBaseId, setSessionKnowledgeBaseId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [followups, setFollowups] = useState({})
  const [artifacts, setArtifacts] = useState({})
  const [activeArtifact, setActiveArtifact] = useState(null)
  // Ref for aborting in-progress fetch requests (stop generation)
  const abortControllerRef = useRef(null)

  // On mount: load config, chat history, available models, and sessions
  useEffect(() => {
    loadConfig()
    loadHistory()
    loadModels()
    loadSessions(null)
  }, [])

  const loadConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/config`)
      if (res.data) {
        setConfig(res.data)
        if (res.data.active_model) setCurrentModel(res.data.active_model)
        if (res.data.active_provider_id) setCurrentProviderId(res.data.active_provider_id)
      }
    } catch (err) {
      console.error('Failed to load config:', err)
      setError(`Backend error: ${err.message}`)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/history`)
      setMessages(res.data.messages)
      if (res.data.knowledge_base_ids) setSessionKnowledgeBases(res.data.knowledge_base_ids)
      if (res.data.knowledge_base_id) setSessionKnowledgeBaseId(res.data.knowledge_base_id)
      else setSessionKnowledgeBaseId(null)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const loadSessions = async (knowledgeBaseId = undefined) => {
    try {
      const params = {}
      if (knowledgeBaseId === null) {
        // Load only non-KB sessions (main chat)
        params.knowledge_base_id = '__none__'
      } else if (knowledgeBaseId) {
        params.knowledge_base_id = knowledgeBaseId
      }
      const res = await axios.get(`${API_BASE}/sessions`, { params })
      setSessions(res.data.sessions || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  // Helper: applies session mutations from API responses (session_id, messages, sessions list)
  const applySessionResponse = (data) => {
    if (!data) return
    if (data.session_id) setCurrentSessionId(data.session_id)
    if (Array.isArray(data.messages)) setMessages(data.messages)
    if (Array.isArray(data.sessions)) setSessions(data.sessions)
    if (data.knowledge_base_id !== undefined) setSessionKnowledgeBaseId(data.knowledge_base_id || null)
  }

  const loadModels = async (providerId = null) => {
    try {
      const params = providerId ? { provider_id: providerId } : {}
      const res = await axios.get(`${API_BASE}/models`, { params })
      setModels(res.data.models)
      if (!currentModel && res.data.active_model) setCurrentModel(res.data.active_model)
      if (!currentProviderId && res.data.active_provider_id) setCurrentProviderId(res.data.active_provider_id)
    } catch (err) {
      console.error('Failed to load models:', err)
    }
  }

  const refreshModels = useCallback(async (providerId = null) => {
    await loadModels(providerId)
  }, [])

  // Send a chat message and stream the response.
  // - parentId: used for branching (editing a prior message creates a new branch in the conversation tree)
  // - skipAddUser: when true, doesn't add a new user message (used when editing existing messages)
  const sendMessage = useCallback(async (text, knowledgeBaseIds = [], files = [], notes = [], parentId = null, skipAddUser = false) => {
    if (!text.trim() && files.length === 0 && notes.length === 0) return

    let messageContent = text
    if (files.length > 0) {
      const fileInfo = files.map(f => `[Attached: ${f.name}]`).join('\n')
      messageContent = messageContent ? `${fileInfo}\n\n${messageContent}` : fileInfo
    }

    const userMsg = { id: Date.now().toString(), role: 'user', content: messageContent, timestamp: Date.now() / 1000, knowledgeBases: knowledgeBaseIds.length > 0 ? knowledgeBaseIds : undefined }
    if (!skipAddUser) setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setError(null)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          model: currentModel,
          provider_id: currentProviderId,
          knowledge_base_ids: knowledgeBaseIds,
          notes: notes,
          parent_id: parentId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        let errMsg = 'Failed to get response'
        try {
          const errData = await response.json()
          errMsg = errData.detail || errMsg
        } catch {}
        throw new Error(errMsg)
      }

      // Stream the response body chunk by chunk, updating the assistant message in real time
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      const assistantMsgId = (Date.now() + 1).toString()
      setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() / 1000 }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullContent += chunk
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: fullContent } : msg
          )
        )
      }
      // Refresh from server to get properly saved state
      await loadHistory()
      await loadSessions()
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Generation stopped by user')
      } else {
        setError(err.message)
        console.error('Chat error:', err)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [currentModel, currentProviderId])

  // Agentic chat variant - the model has access to tool calling (notes CRUD, web search).
  // enableNotesTools: lets the agent create/update/delete notes autonomously.
  // enableWebSearch: lets the agent query the web.
  const sendAgentMessage = useCallback(async (text, enableNotesTools = true, enableWebSearch = false) => {
    if (!text.trim()) return

    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() / 1000 }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setError(null)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE}/chat/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: currentModel,
          provider_id: currentProviderId,
          enable_notes_tools: enableNotesTools,
          enable_web_search: enableWebSearch,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        let errMsg = 'Failed to get agent response'
        try {
          const errData = await response.json()
          errMsg = errData.detail || errMsg
        } catch {}
        throw new Error(errMsg)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      const assistantMsgId = (Date.now() + 1).toString()
      setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() / 1000 }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullContent += chunk
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: fullContent } : msg
          )
        )
      }
      await loadHistory()
      await loadSessions()
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Agent generation stopped by user')
      } else {
        setError(err.message)
        console.error('Agent chat error:', err)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [currentModel, currentProviderId])

  // Abort the current streaming response
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
  }, [])

  // Delete all messages in the current session and start fresh
  const clearHistory = async () => {
    try {
      await axios.delete(`${API_BASE}/history`)
      setMessages([])
      await loadSessions()
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }

  // Save provider/model configuration to the backend
  const saveConfig = async (newConfig) => {
    try {
      const res = await axios.post(`${API_BASE}/config`, newConfig)
      setConfig(res.data)
      if (res.data.active_model) setCurrentModel(res.data.active_model)
      if (res.data.active_provider_id) setCurrentProviderId(res.data.active_provider_id)
      await loadModels()
    } catch (err) {
      console.error('Failed to save config:', err)
      throw err
    }
  }

  // Persist the currently selected model/provider to the backend
  const updateActiveSelection = (modelId, providerId) => {
    setCurrentModel(modelId)
    setCurrentProviderId(providerId)
    axios.post(`${API_BASE}/config`, { active_model: modelId, active_provider_id: providerId }).catch(console.error)
  }

  // --- New Feature Functions ---

  const editMessage = async (msgId, newContent) => {
    try {
      const res = await axios.post(`${API_BASE}/messages/${msgId}/edit`, { content: newContent })
      setMessages((prev) => {
        const idx = prev.findIndex(m => m.id === msgId)
        if (idx === -1) return prev
        return prev.slice(0, idx + 1).map(m => m.id === msgId ? { ...m, content: newContent } : m)
      })
      return res.data
    } catch (err) {
      console.error('Failed to edit message:', err)
      throw err
    }
  }

  const evaluateMessage = async (msgId, rating) => {
    try {
      const res = await axios.post(`${API_BASE}/messages/${msgId}/evaluate`, { rating })
      setMessages((prev) =>
        prev.map(m => m.id === msgId ? { ...m, rating: res.data.rating } : m)
      )
      return res.data
    } catch (err) {
      console.error('Failed to evaluate message:', err)
      throw err
    }
  }

  const deleteMessage = async (msgId) => {
    try {
      await axios.delete(`${API_BASE}/messages/${msgId}`)
      setMessages((prev) => prev.filter(m => m.id !== msgId))
    } catch (err) {
      console.error('Failed to delete message:', err)
      throw err
    }
  }

  const branchFromMessage = async (msgId) => {
    try {
      const res = await axios.post(`${API_BASE}/messages/${msgId}/branch`)
      setMessages(res.data.messages)
      setCurrentSessionId(res.data.session_id)
      await loadSessions()
      return res.data
    } catch (err) {
      console.error('Failed to branch:', err)
      throw err
    }
  }

  const forkFromMessage = async (msgId) => {
    try {
      const res = await axios.post(`${API_BASE}/messages/${msgId}/fork`)
      setMessages(res.data.messages)
      setCurrentSessionId(res.data.session_id)
      await loadSessions()
      return res.data
    } catch (err) {
      console.error('Failed to fork:', err)
      throw err
    }
  }

  const continueMessage = async () => {
    try {
      const res = await axios.post(`${API_BASE}/messages/continue`)
      return res.data
    } catch (err) {
      console.error('Failed to continue:', err)
      return null
    }
  }

  // --- Follow-up Suggestions ---
  const generateFollowups = async (messageId, messageText) => {
    try {
      const context = messages.slice(-4).map(m => m.content)
      const res = await axios.post(`${API_BASE}/followups/generate`, {
        message: messageText,
        context,
        count: 3,
      })
      setFollowups(prev => ({ ...prev, [messageId]: res.data.suggestions || [] }))
      return res.data.suggestions || []
    } catch (err) {
      console.error('Failed to generate followups:', err)
      return []
    }
  }

  const regenerateFollowups = async (messageId, messageText) => {
    try {
      const context = messages.slice(-4).map(m => m.content)
      const res = await axios.post(`${API_BASE}/followups/regenerate`, {
        message: messageText,
        context,
        count: 3,
      })
      setFollowups(prev => ({ ...prev, [messageId]: res.data.suggestions || [] }))
      return res.data.suggestions || []
    } catch (err) {
      console.error('Failed to regenerate followups:', err)
      return []
    }
  }

  const clearFollowups = (messageId) => {
    setFollowups(prev => {
      const next = { ...prev }
      delete next[messageId]
      return next
    })
  }

  const regenerateMessage = async () => {
    try {
      const res = await axios.post(`${API_BASE}/messages/regenerate`)
      setMessages((prev) => prev.slice(0, -1))
      return res.data
    } catch (err) {
      console.error('Failed to regenerate:', err)
      return null
    }
  }

  const switchSession = async (sessionId) => {
    try {
      const res = await axios.post(`${API_BASE}/sessions/switch`, { session_id: sessionId })
      setMessages(res.data.messages)
      setCurrentSessionId(sessionId)
      if (res.data.knowledge_base_id !== undefined) setSessionKnowledgeBaseId(res.data.knowledge_base_id || null)
      else setSessionKnowledgeBaseId(null)
      if (res.data.knowledge_base_ids) setSessionKnowledgeBases(res.data.knowledge_base_ids)
      await loadSessions()
      return res.data
    } catch (err) {
      console.error('Failed to switch session:', err)
      throw err
    }
  }

  const deleteSession = async (sessionId) => {
    try {
      const res = await axios.delete(`${API_BASE}/sessions/${sessionId}`)
      applySessionResponse(res.data)
      return res.data
    } catch (err) {
      console.error('Failed to delete session:', err)
      throw err
    }
  }

  const archiveSession = async (sessionId) => {
    try {
      const res = await axios.post(`${API_BASE}/sessions/${sessionId}/archive`)
      applySessionResponse(res.data)
      return res.data
    } catch (err) {
      console.error('Failed to archive session:', err)
      throw err
    }
  }

  const archiveAllSessions = async () => {
    try {
      const res = await axios.post(`${API_BASE}/sessions/archive-all`)
      applySessionResponse(res.data)
      return res.data
    } catch (err) {
      console.error('Failed to archive all sessions:', err)
      throw err
    }
  }

  const deleteAllSessions = async () => {
    try {
      const res = await axios.delete(`${API_BASE}/sessions`)
      applySessionResponse(res.data)
      return res.data
    } catch (err) {
      console.error('Failed to delete all sessions:', err)
      throw err
    }
  }

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch {
      return false
    }
  }

  const createSession = async () => {
    try {
      const res = await axios.post(`${API_BASE}/sessions/create`, {})
      setMessages(res.data.messages || [])
      setCurrentSessionId(res.data.session_id)
      setSessionKnowledgeBaseId(null)
      setSessionKnowledgeBases([])
      await loadSessions()
      return res.data
    } catch (err) {
      console.error('Failed to create session:', err)
      throw err
    }
  }

  const createKBSsession = async (knowledgeBaseId) => {
    try {
      const res = await axios.post(`${API_BASE}/sessions/create`, { knowledge_base_id: knowledgeBaseId })
      setMessages(res.data.messages || [])
      setCurrentSessionId(res.data.session_id)
      setSessionKnowledgeBaseId(knowledgeBaseId)
      setSessionKnowledgeBases(knowledgeBaseId ? [knowledgeBaseId] : [])
      await loadSessions()
      return res.data
    } catch (err) {
      console.error('Failed to create KB session:', err)
      throw err
    }
  }

  return {
    messages,
    models,
    currentModel,
    setCurrentModel: (m) => setCurrentModel(m),
    currentProviderId,
    setCurrentProviderId: (p) => setCurrentProviderId(p),
    updateActiveSelection,
    config,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    sendAgentMessage,
    stopGeneration,
    clearHistory,
    setMessages,
    saveConfig,
    loadModels,
    refreshModels,
    sessionKnowledgeBases,
    setSessionKnowledgeBases,
    sessionKnowledgeBaseId,
    sessions,
    currentSessionId,
    editMessage,
    deleteMessage,
    evaluateMessage,
    branchFromMessage,
    forkFromMessage,
    continueMessage,
    regenerateMessage,
    switchSession,
    deleteSession,
    archiveSession,
    archiveAllSessions,
    deleteAllSessions,
    copyToClipboard,
    loadSessions,
    createSession,
    createKBSsession,
    followups,
    setFollowups,
    generateFollowups,
    regenerateFollowups,
    clearFollowups,
    artifacts,
    setArtifacts,
    activeArtifact,
    setActiveArtifact,
  }
}
