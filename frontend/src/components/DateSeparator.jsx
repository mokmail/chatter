import React from 'react'

const formatDateLabel = (timestamp) => {
  if (!timestamp) return ''

  const messageDate = new Date(timestamp * 1000)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  if (isSameDay(messageDate, today)) {
    return 'Today'
  } else if (isSameDay(messageDate, yesterday)) {
    return 'Yesterday'
  } else {
    return messageDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }
}

const DateSeparator = ({ timestamp }) => {
  const label = formatDateLabel(timestamp)
  if (!label) return null

  return (
    <div className="flex items-center justify-center my-6">
      <div className="flex items-center gap-3">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--border)]" />
        <span
          className="text-[11px] font-medium uppercase tracking-wider px-3 py-1.5 rounded-full"
          style={{
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {label}
        </span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--border)]" />
      </div>
    </div>
  )
}

export default DateSeparator
