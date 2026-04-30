import React, { useState } from 'react'
import html2pdf from 'html2pdf.js'

const ShareModal = ({ isOpen, onClose, session, messages, shareTarget }) => {
  const [copyStatus, setCopyStatus] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const isSingleMessage = shareTarget?.type === 'message' && shareTarget?.data
  const targetMessage = isSingleMessage ? shareTarget.data : null
  const targetMessages = targetMessage ? [targetMessage] : messages

  const chatTitle = session?.title || targetMessages[0]?.content?.slice(0, 40) || (isSingleMessage ? 'Shared Message' : 'Untitled Chat')

  const handleCopyLink = () => {
    if (isSingleMessage) {
      const text = targetMessage.content.slice(0, 200) + (targetMessage.content.length > 200 ? '...' : '')
      navigator.clipboard.writeText(`"${text}" - Shared from CIO Intelligence Hub`)
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
    setCopyStatus('link')
    setTimeout(() => setCopyStatus(null), 2000)
  }

  const handleCopyText = () => {
    const text = targetMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    setCopyStatus('text')
    setTimeout(() => setCopyStatus(null), 2000)
  }

  const handleDownloadMarkdown = () => {
    const content = targetMessages
      .map(m => `### ${m.role === 'user' ? 'User' : 'Assistant'}\n\n${m.content}`)
      .join('\n\n---\n\n')

    const blob = new Blob([`# ${chatTitle}\n\n${content}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = async () => {
    setIsExporting(true)
    const element = document.createElement('div')
    element.style.padding = '40px'
    element.style.color = '#18181b'
    element.style.backgroundColor = '#ffffff'
    element.style.fontFamily = 'Inter, sans-serif'

    let html = `<h1 style="margin-bottom: 30px; font-size: 24px; border-bottom: 2px solid #e4e4e7; padding-bottom: 10px;">${chatTitle}</h1>`

    targetMessages.forEach(m => {
      const roleName = m.role === 'user' ? 'User' : 'Assistant'
      const roleColor = m.role === 'user' ? '#f4f4f5' : '#ffffff'
      html += `
        <div style="margin-bottom: 25px; padding: 15px; border-radius: 10px; background-color: ${roleColor}; border: 1px solid #e4e4e7;">
          <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">${roleName}</div>
          <div style="line-height: 1.6; font-size: 14px;">${m.content.replace(/\n/g, '<br/>')}</div>
        </div>
      `
    })

    element.innerHTML = html

    const opt = {
      margin: 10,
      filename: `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    try {
      await html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const shareToTwitter = () => {
    const text = isSingleMessage
      ? encodeURIComponent(`"${targetMessage.content.slice(0, 150)}..."`)
      : encodeURIComponent(`${chatTitle} - Shared from CIO Intelligence Hub`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const shareToReddit = () => {
    const url = window.location.href
    const title = isSingleMessage
      ? targetMessage.content.slice(0, 300)
      : chatTitle
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'var(--modal-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-sm overflow-hidden rounded-2xl border animate-fade-in"
        style={{ 
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--modal-shadow)',
        }}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Share{isSingleMessage ? ' Message' : ' Chat'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-surface" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{copyStatus === 'link' ? 'Link copied!' : 'Copy Link'}</span>
          </button>

          <button onClick={handleCopyText} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-surface" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
             <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{copyStatus === 'text' ? 'Text copied!' : 'Copy as Text'}</span>
          </button>

          <button onClick={handleDownloadMarkdown} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-surface" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
             <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Export as Markdown</span>
          </button>

          <button onClick={handleDownloadPDF} disabled={isExporting} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-surface" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
             <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{isExporting ? 'Exporting PDF...' : 'Export as PDF'}</span>
          </button>

          <div className="flex gap-2">
            <button onClick={shareToTwitter} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90" style={{ background: '#1DA1F2', color: '#fff' }}>
              Share on Twitter
            </button>
            <button onClick={shareToReddit} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90" style={{ background: '#FF4500', color: '#fff' }}>
              Share on Reddit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareModal
