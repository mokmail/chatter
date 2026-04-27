import React, { useState } from 'react'
import IconButton from '../common/IconButton'
import Tooltip from '../common/Tooltip'
import ICONS from './icons'

const MessageActions = ({ message, index, totalMessages, onEdit, onDelete, onCopy, onEvaluate, onBranch, onFork, onContinue, onRegenerate, onShare, onSaveToKnowledge }) => {
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isLast = index === totalMessages - 1
  const isSystem = message.role === 'system'

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content)
    } else {
      navigator.clipboard.writeText(message.content || '')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isSystem) return null

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1">
      <Tooltip title={copied ? 'Copied!' : 'Copy message'}>
        <IconButton onClick={handleCopy} active={copied} activeColor="var(--success)">
          {copied ? ICONS.check : ICONS.copy}
        </IconButton>
      </Tooltip>

      {isUser && (
        <div className="flex items-center gap-1">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1 animate-fade-in bg-[var(--surface)] border border-[var(--border)] rounded-md px-1 py-0.5">
              <button 
                onClick={() => { onDelete(message.id); setShowDeleteConfirm(false) }}
                className="text-[10px] font-bold px-1.5 py-0.5 text-[var(--danger)] hover:bg-[var(--danger-subtle)] rounded transition-colors"
              >
                Delete
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[10px] font-medium px-1.5 py-0.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <Tooltip title="Delete message">
              <IconButton onClick={() => setShowDeleteConfirm(true)} danger>
                {ICONS.trash}
              </IconButton>
            </Tooltip>
          )}
        </div>
      )}

      {isUser && (
        <Tooltip title="Edit message">
          <IconButton onClick={() => onEdit(message.id, message.content)}>
            {ICONS.edit}
          </IconButton>
        </Tooltip>
      )}

      {isAssistant && (
        <Tooltip title={message.rating === 'good' ? 'Remove good rating' : 'Mark as good'}>
          <IconButton
            onClick={() => onEvaluate(message.id, message.rating === 'good' ? null : 'good')}
            active={message.rating === 'good'}
            activeColor="var(--success)">
            {ICONS.thumbsUp}
          </IconButton>
        </Tooltip>
      )}

      {isAssistant && (
        <Tooltip title={message.rating === 'bad' ? 'Remove bad rating' : 'Mark as bad'}>
          <IconButton
            onClick={() => onEvaluate(message.id, message.rating === 'bad' ? null : 'bad')}
            active={message.rating === 'bad'}
            activeColor="var(--danger)"
            danger>
            {ICONS.thumbsDown}
          </IconButton>
        </Tooltip>
      )}

      {isAssistant && (
        <Tooltip title="Branch from here">
          <IconButton onClick={() => onBranch(message.id)}>
            {ICONS.branch}
          </IconButton>
        </Tooltip>
      )}

      {isAssistant && (
        <Tooltip title="Fork as new conversation">
          <IconButton onClick={() => onFork(message.id)}>
            {ICONS.fork}
          </IconButton>
        </Tooltip>
      )}

      {isAssistant && onShare && (
        <Tooltip title="Share message">
          <IconButton onClick={() => onShare(message)}>
            {ICONS.share}
          </IconButton>
        </Tooltip>
      )}

      {isAssistant && onSaveToKnowledge && (
        <Tooltip title="Save to Knowledge Base">
          <IconButton onClick={() => onSaveToKnowledge(message)}>
            {ICONS.folderPlus}
          </IconButton>
        </Tooltip>
      )}

      {isLast && isAssistant && (
        <>
          <Tooltip title="Regenerate response">
            <IconButton onClick={onRegenerate}>
              {ICONS.refresh}
            </IconButton>
          </Tooltip>
          <Tooltip title="Continue response">
            <IconButton onClick={onContinue}>
              {ICONS.play}
            </IconButton>
          </Tooltip>
        </>
      )}
    </div>
  )
}

export default MessageActions
