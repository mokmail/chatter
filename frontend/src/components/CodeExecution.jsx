import React, { useState, useRef, useEffect } from 'react'

const TerminalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>
  </svg>
)

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
)

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const CodeExecutionPanel = ({ code, language }) => {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const canExecute = language === 'python'

  const handleExecute = async () => {
    if (!canExecute || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    setExpanded(true)

    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!canExecute) return null

  return (
    <div className="border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--surface)' }}>
        <button
          onClick={handleExecute}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded transition-all"
          style={{ 
            background: loading ? 'var(--surface-hover)' : 'rgba(34, 197, 94, 0.1)',
            color: loading ? 'var(--text-tertiary)' : 'var(--success)',
            border: '1px solid',
            borderColor: loading ? 'var(--border)' : 'rgba(34, 197, 94, 0.2)',
          }}
        >
          {loading ? <StopIcon /> : <PlayIcon />}
          {loading ? 'Running...' : 'Run'}
        </button>
        {result && !result.error && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--success)' }}>
            <CheckIcon /> Done
          </span>
        )}
        {result && result.error && (
          <span className="text-[10px]" style={{ color: 'var(--danger)' }}>Error</span>
        )}
        {result && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-[10px] font-medium"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      {expanded && (result || error) && (
        <div className="px-3 py-2 text-xs font-mono leading-relaxed max-h-96 overflow-auto" style={{ background: 'var(--code-bg)', color: 'var(--text-secondary)' }}>
          {result?.stdout && (
            <pre className="whitespace-pre-wrap mb-2" style={{ color: 'var(--text)' }}>{result.stdout}</pre>
          )}
          {result?.stderr && (
            <pre className="whitespace-pre-wrap mb-2" style={{ color: 'var(--danger-text)' }}>{result.stderr}</pre>
          )}
          {result?.error && (
            <pre className="whitespace-pre-wrap mb-2" style={{ color: 'var(--danger-text)' }}>{result.error}</pre>
          )}
          {result?.images?.map((b64, i) => (
            <div key={i} className="my-2 flex justify-center">
              <img
                src={`data:image/png;base64,${b64}`}
                alt={`Chart ${i + 1}`}
                className="max-w-full rounded-lg"
                style={{ maxHeight: '400px' }}
              />
            </div>
          ))}
          {result && !result.stdout && !result.stderr && !result.error && result.images?.length === 0 && (
            <span style={{ color: 'var(--text-tertiary)' }}>Code executed successfully (no output)</span>
          )}
        </div>
      )}
    </div>
  )
}

export default CodeExecutionPanel