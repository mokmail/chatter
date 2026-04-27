import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = '/api'

export const useNotes = () => {
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)

  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_BASE}/notes`)
      setNotes(res.data.notes || [])
    } catch (err) {
      console.error('Failed to load notes:', err)
      setError(err.message || 'Failed to load notes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const createNote = async (title, content = '', tags = [], note_type = 'rich') => {
    try {
      const res = await axios.post(`${API_BASE}/notes`, { title, content, tags, note_type })
      setNotes((prev) => [res.data, ...prev])
      return res.data
    } catch (err) {
      console.error('Failed to create note:', err)
      setError(err.message || 'Failed to create note')
      throw err
    }
  }

  const updateNote = async (noteId, updates) => {
    try {
      const res = await axios.put(`${API_BASE}/notes/${noteId}`, updates)
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, ...res.data } : n))
      )
      return res.data
    } catch (err) {
      console.error('Failed to update note:', err)
      setError(err.message || 'Failed to update note')
      throw err
    }
  }

  const pinNote = async (noteId, pinned) => {
    return updateNote(noteId, { pinned })
  }

  const deleteNote = async (noteId) => {
    try {
      await axios.delete(`${API_BASE}/notes/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      console.error('Failed to delete note:', err)
      setError(err.message || 'Failed to delete note')
      throw err
    }
  }

  const archiveNote = async (noteId) => {
    try {
      const res = await axios.post(`${API_BASE}/notes/${noteId}/archive`)
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, archived: res.data.archived } : n))
      )
      return res.data
    } catch (err) {
      console.error('Failed to archive note:', err)
      setError(err.message || 'Failed to archive note')
      throw err
    }
  }

  const searchNotes = async (query) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    try {
      const res = await axios.get(`${API_BASE}/notes/search`, { params: { query } })
      setSearchResults(res.data)
    } catch (err) {
      console.error('Failed to search notes:', err)
      setError(err.message || 'Failed to search notes')
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults(null)
  }

  const enhanceNote = async (noteId, selectedText, instruction) => {
    const response = await fetch(`${API_BASE}/notes/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_id: noteId, selected_text: selectedText, instruction }),
    })
    if (!response.ok) {
      throw new Error('Enhance failed')
    }
    return response.body
  }

  const exportNote = async (noteId, format) => {
    const response = await fetch(`${API_BASE}/notes/export/${noteId}?format=${format}`)
    if (!response.ok) {
      throw new Error('Export failed')
    }
    const blob = await response.blob()
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `note.${format}`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/)
      if (match) filename = match[1]
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getEnhanceConfig = async () => {
    const res = await axios.get(`${API_BASE}/notes/enhance-config`)
    return res.data
  }

  const updateEnhanceConfig = async (config) => {
    const res = await axios.put(`${API_BASE}/notes/enhance-config`, config)
    return res.data
  }

  return {
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
    getEnhanceConfig,
    updateEnhanceConfig,
  }
}
