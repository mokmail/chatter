import React from 'react'
import {
  EditIcon,
  FileTextIcon,
  MicIcon,
  UsersIcon,
  SearchIcon,
  LayersIcon,
  CalendarIcon,
  BugIcon,
  SparklesIcon,
  FileIcon,
  BookIcon,
} from './common/Icons'
import { NOTE_TYPE_INFO } from '../utils/noteTemplates'

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
  FileIcon,
  BookIcon,
}

const NoteTypeSelector = ({ selectedType, onTypeSelect, onConfirm, onCancel }) => {
  const noteTypes = Object.entries(NOTE_TYPE_INFO).map(([id, info]) => ({
    id,
    ...info,
    icon: ICON_MAP[info.icon] || FileTextIcon,
  }))

  const selected = noteTypes.find(t => t.id === selectedType)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-3xl shadow-2xl max-w-3xl w-full glass-card-strong border-[var(--glass-border)] overflow-hidden animate-fade-in-scale max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[var(--glass-border)]" style={{ background: 'linear-gradient(135deg, var(--accent-primary)/10 0%, transparent 100%)' }}>
          <h2 className="text-2xl font-black" style={{ color: 'var(--accent-primary)' }}>Create New Note</h2>
          <p className="text-xs mt-1 text-[var(--text-secondary)]">Choose a format that fits your needs</p>
        </div>

        <div className="p-8">
          {/* Grid of Note Types */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {noteTypes.map(type => {
              const Icon = type.icon
              const isSelected = selectedType === type.id
              return (
                <button
                  key={type.id}
                  onClick={() => onTypeSelect(type.id)}
                  className={`p-5 rounded-2xl border-2 transition-all text-left group ${
                    isSelected
                      ? 'border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20'
                      : 'border-[var(--glass-border)] hover:border-[var(--accent-primary)]/50'
                  }`}
                  style={{
                    background: isSelected ? `${type.color}12` : 'transparent',
                  }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all ${
                    isSelected ? 'scale-110' : 'group-hover:scale-105'
                  }`} style={{ background: `${type.color}20`, color: type.color }}>
                    <Icon size={20} />
                  </div>
                  <div className="font-bold text-sm" style={{ color: type.color }}>
                    {type.label}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                    {type.description}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Details for Selected Type */}
          {selected && (
            <div
              className="p-6 rounded-2xl border border-[var(--glass-border)] mb-8"
              style={{ background: `${selected.color}08` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: `${selected.color}20`, color: selected.color }}
                >
                  <selected.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm mb-2" style={{ color: selected.color }}>
                    {selected.label}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    {selected.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.examples?.map(example => (
                      <span
                        key={example}
                        className="text-[10px] px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: `${selected.color}20`, color: selected.color }}
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-[var(--surface)] active:scale-95"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: `${selected?.color || 'var(--accent-primary)'}` }}
            >
              Create {selected?.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteTypeSelector
