import React from 'react'

const ToggleSwitch = ({
  label,
  description,
  checked,
  onToggle,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onToggle(!checked)}
      className={`w-full flex items-center justify-between gap-4 rounded-3xl border px-4 py-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]'} ${className}`}
    >
      <div className="min-w-0">
        <div className="font-semibold text-sm text-[var(--text)]">{label}</div>
        {description ? (
          <div className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">{description}</div>
        ) : null}
      </div>

      <span className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-[var(--success)]' : 'bg-[var(--border-active)]'}`}>
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </span>
    </button>
  )
}

export default ToggleSwitch
