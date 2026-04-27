import React, { useState, useRef, useEffect } from 'react'

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
)

const FullscreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
  </svg>
)

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
)

const ArtifactIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3v13.5a3 3 0 01-3 3H5.25a3 3 0 01-3-3V5.25zm3-1.5A1.5 1.5 0 003.75 5.25v13.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H5.25z" clipRule="evenodd"/>
    <path fillRule="evenodd" d="M7.5 8.25a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75z" clipRule="evenodd"/>
  </svg>
)

export const extractArtifact = (content) => {
  if (!content) return null
  // Look for fenced code blocks
  const htmlMatch = content.match(/```(?:html)?\s*([\s\S]*?)```/)
  if (!htmlMatch) return null

  const code = htmlMatch[1].trim()

  // Detect artifact types
  const isSVG = code.startsWith('<svg') || code.includes('xmlns="http://www.w3.org/2000/svg"')
  const isFullHTML = code.includes('<!DOCTYPE') || code.includes('<html') || (code.includes('<head') && code.includes('<body'))
  const hasThreeJS = code.includes('three.js') || code.includes('threejs') || code.includes('THREE.')
  const hasD3 = code.includes('d3.js') || code.includes('d3.')

  // Only treat as artifact if it's a complete renderable page
  if (!isSVG && !isFullHTML && !hasThreeJS && !hasD3) return null

  const type = isSVG ? 'svg' : hasThreeJS ? 'threejs' : hasD3 ? 'd3' : 'html'

  return { code, type, matched: htmlMatch[0] }
}

export const wrapForArtifact = (code, type) => {
  if (type === 'svg') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}</style></head><body>${code}</body></html>`
  }
  if (!code.includes('<!DOCTYPE') && !code.includes('<html')) {
    // Wrap bare HTML/JS into a full page
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script src="https://d3js.org/d3.v7.min.js"></script><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:#fff}</style></head><body>${code}</body></html>`
  }
  return code
}

const ArtifactsPanel = ({ artifact, onClose, onVersionChange, allowSameOrigin = false }) => {
  const [currentVersion, setCurrentVersion] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (artifact) setCurrentVersion((artifact.versions?.length || 1) - 1)
  }, [artifact?.id])

  if (!artifact) return null

  const versions = artifact.versions || [artifact.content]
  const activeContent = versions[currentVersion] || artifact.content
  const wrappedContent = wrapForArtifact(activeContent, artifact.type)

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const sandbox = allowSameOrigin ? 'allow-scripts allow-same-origin' : 'allow-scripts'

  const panel = (
    <div
      className={`flex flex-col h-full overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}
      style={{ 
        background: 'var(--bg-secondary)',
        borderLeft: isFullscreen ? 'none' : '1px solid var(--border)',
        width: isFullscreen ? '100%' : '420px',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: 'var(--text-tertiary)' }}><ArtifactIcon /></span>
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
            {artifact.title || 'Artifact'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ background: 'var(--surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {artifact.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: copied ? 'var(--success)' : 'var(--text-tertiary)' }}
            title="Copy content"
          >
            {copied ? 'Copied!' : <CopyIcon />}
          </button>
          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <FullscreenIcon />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="Close artifact"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative" style={{ background: '#fff' }}>
        <iframe
          ref={iframeRef}
          key={`artifact-${artifact.id}-${sandbox}-${currentVersion}`}
          title="Artifact Preview"
          sandbox={sandbox}
          srcDoc={wrappedContent}
          className="w-full h-full border-none"
          style={{ background: '#fff' }}
        />
      </div>

      {/* Footer: version + info */}
      {versions.length > 1 && (
        <div className="px-4 py-2 border-t flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Version</span>
          <div className="flex items-center gap-1">
            {versions.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentVersion(i); onVersionChange?.(i) }}
                className="w-6 h-6 rounded text-[10px] font-medium transition-colors"
                style={{ 
                  background: i === currentVersion ? 'var(--surface)' : 'transparent',
                  color: i === currentVersion ? 'var(--text)' : 'var(--text-tertiary)',
                  border: '1px solid',
                  borderColor: i === currentVersion ? 'var(--border-hover)' : 'var(--border)',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (isFullscreen) {
    return panel
  }

  return panel
}

export default ArtifactsPanel