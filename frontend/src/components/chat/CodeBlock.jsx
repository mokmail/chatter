import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import HTMLPreview from './HTMLPreview'
import CodeExecutionPanel from '../CodeExecution'

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const isHTML = language === 'html' || (language === 'xml' && value.trim().startsWith('<'))
  return (
    <div className="relative group my-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-tertiary)' }}>{language || 'code'}</span>
          {isHTML && <button onClick={() => setShowPreview(!showPreview)} className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded transition-colors" style={{ color: showPreview ? 'var(--text)' : 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{showPreview ? 'Code' : 'Preview'}</button>}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="text-[10px] font-medium transition-colors flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          {copied ? <span style={{ color: 'var(--success)' }}>Copied</span> : <span>Copy</span>}
        </button>
      </div>
      <div className="relative" style={{ background: 'var(--code-bg)' }}>
        {showPreview && isHTML ? (
          <div className="p-4 bg-white min-h-[100px]"><HTMLPreview html={value} /></div>
        ) : (
          <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, background: 'transparent', padding: '1rem', fontSize: '0.85rem' }} codeTagProps={{ style: { fontFamily: 'inherit' } }}>{value}</SyntaxHighlighter>
        )}
      </div>
      <CodeExecutionPanel code={value} language={language} />
    </div>
  )
}

export default CodeBlock
