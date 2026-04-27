import React from 'react'

const TypingDots = () => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-1.5 h-1.5 rounded-full animate-typing-bounce"
        style={{ 
          backgroundColor: 'var(--text-tertiary)',
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
  </div>
)

export default TypingDots
