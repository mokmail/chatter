import React, { useState } from 'react'
import Overview from './Overview'
import Features from './Features'
import Planned from './Planned'
import Architecture from './Architecture'
import Api from './Api'
import Providers from './Providers'

import DeepDive from './DeepDive'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'deep-dive', label: 'Deep Dive' },
  { id: 'planned', label: 'Planned' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'api', label: 'API' },
  { id: 'providers', label: 'Providers' },
]

const Documentation = () => {
  const [activeTab, setActiveTab] = useState('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <Overview />
      case 'features': return <Features />
      case 'deep-dive': return <DeepDive />
      case 'planned': return <Planned />
      case 'architecture': return <Architecture />
      case 'api': return <Api />
      case 'providers': return <Providers />
      default: return <Overview />
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 shrink-0 whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text-tertiary)',
                boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
        {renderTab()}
      </div>
    </div>
  )
}

export default Documentation
