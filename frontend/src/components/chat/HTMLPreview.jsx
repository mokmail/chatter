import React, { useRef, useEffect } from 'react'

const HTMLPreview = ({ html }) => {
  const iframeRef = useRef(null)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !html) return
    const timer = setTimeout(() => {
      if (iframe.contentDocument) {
        const doc = iframe.contentDocument
        doc.open()
        doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;color:#1a1a1b}a{color:#0066cc}</style></head><body>${html}</body></html>`)
        doc.close()
        try { iframe.style.height = Math.max(iframe.contentDocument.documentElement.scrollHeight, 100) + 'px' }
        catch (e) { iframe.style.height = '200px' }
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [html])
  if (!html) return null
  return (
    <div className="w-full rounded-lg overflow-hidden my-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Live Preview</span>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-tertiary)' }} />
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
        </div>
      </div>
      <iframe ref={iframeRef} className="w-full border-none" title="HTML Preview" sandbox="allow-scripts" style={{ minHeight: '100px', background: '#fff', display: 'block' }} />
    </div>
  )
}

export default HTMLPreview
