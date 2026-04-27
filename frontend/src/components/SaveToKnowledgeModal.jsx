import React, { useState, useMemo } from 'react'

const SaveToKnowledgeModal = ({ isOpen, onClose, target, knowledgeBases, onSave }) => {
  const [selectedKBs, setSelectedKBs] = useState([])
  const [urlSelections, setUrlSelections] = useState({})
  const [urlInput, setUrlInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const targetMessage = target?.type === 'message' ? target.data : null
  const messageContent = targetMessage?.content || ''

  const extractedUrls = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi
    const matches = messageContent.match(urlRegex) || []
    return [...new Set(matches)]
  }, [messageContent])

  const urls = useMemo(() =>
    extractedUrls.map((url, i) => ({ id: i + 1, url, selected: urlSelections[i] !== false })),
    [extractedUrls, urlSelections]
  )

  if (!isOpen || !target) return null

  const handleToggleUrl = (id) => {
    setUrlSelections(prev => ({ ...prev, [id - 1]: !prev[id - 1] }))
  }

  const handleSelectAll = () => {
    const allSelected = {}
    extractedUrls.forEach((_, i) => { allSelected[i] = true })
    setUrlSelections(allSelected)
  }

  const handleSelectNone = () => {
    const noneSelected = {}
    extractedUrls.forEach((_, i) => { noneSelected[i] = false })
    setUrlSelections(noneSelected)
  }

  const handleAddUrl = () => {
    if (!urlInput.trim()) return
    let url = urlInput.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    setUrlInput('')
  }

  const handleToggleKB = (kbId) => {
    setSelectedKBs(prev =>
      prev.includes(kbId) ? prev.filter(id => id !== kbId) : [...prev, kbId]
    )
  }

  const handleSave = async () => {
    if (selectedKBs.length === 0) return
    setIsLoading(true)

    const selectedUrls = urls.filter(u => u.selected).map(u => u.url)
    if (urlInput.trim()) {
      let url = urlInput.trim()
      if (!url.startsWith('http')) url = 'https://' + url
      selectedUrls.push(url)
    }

    try {
      for (const kbId of selectedKBs) {
        for (const url of selectedUrls) {
          await fetch(`/api/knowledge/${kbId}/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          })
        }
      }
      onClose()
    } catch (err) {
      console.error('Failed to save to knowledge base:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedUrls = urls.filter(u => u.selected).map(u => u.url)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'var(--modal-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-md overflow-hidden rounded-2xl border animate-fade-in"
        style={{ 
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--modal-shadow)',
        }}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Save to Knowledge Base</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {extractedUrls.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Detected URLs ({urls.filter(u => u.selected).length}/{urls.length})
                </span>
                <div className="flex gap-2">
                  <button onClick={handleSelectAll} className="text-[10px] font-medium text-accent hover:text-accent-hover">Select All</button>
                  <button onClick={handleSelectNone} className="text-[10px] font-medium text-accent hover:text-accent-hover">Select None</button>
                </div>
              </div>
              {extractedUrls.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-xl mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {urls.map(url => (
                    <label key={url.id} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={url.selected}
                        onChange={() => handleToggleUrl(url.id)}
                        className="mt-0.5 rounded"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span className="text-xs truncate flex-1 group-hover:text-accent transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        [{url.id}] {url.url.length > 60 ? url.url.substring(0, 60) + '...' : url.url}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                  placeholder="Add URL manually..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-surface border border-border text-text focus:border-accent transition-colors"
                />
                <button
                  onClick={handleAddUrl}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
              <div className="text-3xl mb-2">🔗</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No URLs detected in this message</div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Add URLs manually or from web search citations</p>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Save to Knowledge Base
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {knowledgeBases.length === 0 ? (
                <div className="text-center py-6 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No knowledge bases yet</div>
                  <a href="#" className="text-[10px] text-accent hover:underline mt-1 block">Create one</a>
                </div>
              ) : (
                knowledgeBases.map(kb => (
                  <label key={kb.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-surface" style={{ background: selectedKBs.includes(kb.id) ? 'var(--accent-subtle)' : 'var(--surface)', border: '1px solid var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={selectedKBs.includes(kb.id)}
                      onChange={() => handleToggleKB(kb.id)}
                      className="rounded"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{kb.name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {kb.file_count || 0} files
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-surface border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all hover:bg-surface-hover"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedKBs.length === 0 || isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {isLoading ? 'Saving...' : `Save ${urls.filter(u => u.selected).length + (urlInput.trim() ? 1 : 0)} URL${urls.filter(u => u.selected).length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SaveToKnowledgeModal