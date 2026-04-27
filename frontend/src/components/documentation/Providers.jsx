import React from 'react'

const ProviderCard = ({ name, icon, description, badge }) => (
  <div className="p-5 rounded-2xl transition-all duration-200 hover:translate-y-[-2px]"
    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>{icon}</div>
      {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text)', border: '1px solid var(--border)' }}>{badge}</span>}
    </div>
    <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text)' }}>{name}</h3>
    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
  </div>
)

const Providers = () => (
  <div className="space-y-5 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProviderCard
        name="Ollama"
        icon="🦙"
        badge="Local"
        description="Run LLMs locally. Supports llama3.2, mistral, qwen, gemma, and thousands more. No API keys, fully private."
      />
      <ProviderCard
        name="OpenAI-Compatible"
        icon="🤖"
        badge="Cloud / Self-hosted"
        description="Connect to OpenAI API or any compatible provider like LM Studio, Groq, Fireworks AI, or self-hosted vLLM."
      />
      <ProviderCard
        name="Anthropic"
        icon="🐜"
        badge="Cloud"
        description="Access Claude models via Anthropic's API. Supports claude-3-5-sonnet, claude-3-opus with streaming."
      />
    </div>

    <div className="p-5 rounded-2xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <div className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)' }} />
        Connection Requirements
      </h3>
      <div className="space-y-3">
        {[
          { provider: 'Ollama', req: 'Ollama server running locally (default: localhost:11434)', badge: 'No API key' },
          { provider: 'OpenAI', req: 'API key + base URL. Key is masked on save.', badge: 'API Key required' },
          { provider: 'Anthropic', req: 'API key. Messages use Anthropic format.', badge: 'API Key required' },
        ].map(p => (
          <div key={p.provider} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-sm font-semibold w-24 shrink-0" style={{ color: 'var(--text)' }}>{p.provider}</span>
            <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{p.req}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>{p.badge}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default Providers
