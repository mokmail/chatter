import React, { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Lightweight SVG force-directed graph viewer.
 * Renders nodes and edges with simple physics simulation.
 */

const NODE_COLORS = {
  Person: '#ef4444',
  Organization: '#3b82f6',
  Location: '#10b981',
  Event: '#f59e0b',
  Concept: '#8b5cf6',
  Technology: '#06b6d4',
  Product: '#ec4899',
  DEFAULT: '#6366f1',
}

const getNodeColor = (type) => NODE_COLORS[type] || NODE_COLORS.DEFAULT

function useForceGraph(nodes, edges, width, height) {
  const [positions, setPositions] = useState({})
  const velocities = useRef({})
  const dragging = useRef(null)
  const animationRef = useRef(null)

  // Initialize positions in a circle
  useEffect(() => {
    if (!nodes.length || !width || !height) return
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.35
    const init = {}
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      init[node.id] = {
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
      }
      if (!velocities.current[node.id]) {
        velocities.current[node.id] = { vx: 0, vy: 0 }
      }
    })
    setPositions(init)
  }, [nodes.length, width, height])

  // Physics simulation loop
  useEffect(() => {
    if (!nodes.length || !width || !height) return

    const step = () => {
      setPositions(prev => {
        const next = { ...prev }
        const kRepulse = 8000
        const kAttract = 0.003
        const damping = 0.85
        const centerForce = 0.01
        const cx = width / 2
        const cy = height / 2

        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i]
          const pa = next[a.id]
          if (!pa) continue
          if (dragging.current === a.id) continue

          let fx = 0, fy = 0

          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue
            const b = nodes[j]
            const pb = next[b.id]
            if (!pb) continue
            const dx = pa.x - pb.x
            const dy = pa.y - pb.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = kRepulse / (dist * dist)
            fx += (dx / dist) * force
            fy += (dy / dist) * force
          }

          // Attraction along edges
          edges.forEach(edge => {
            const src = edge.source
            const tgt = edge.target
            if (src === a.id || tgt === a.id) {
              const otherId = src === a.id ? tgt : src
              const po = next[otherId]
              if (!po) return
              const dx = po.x - pa.x
              const dy = po.y - pa.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              const force = kAttract * dist
              fx += (dx / dist) * force
              fy += (dy / dist) * force
            }
          })

          // Center gravity
          fx += (cx - pa.x) * centerForce
          fy += (cy - pa.y) * centerForce

          const v = velocities.current[a.id]
          v.vx = (v.vx + fx) * damping
          v.vy = (v.vy + fy) * damping

          // Limit max velocity
          const speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy)
          const maxSpeed = 15
          if (speed > maxSpeed) {
            v.vx = (v.vx / speed) * maxSpeed
            v.vy = (v.vy / speed) * maxSpeed
          }

          next[a.id] = { x: pa.x + v.vx, y: pa.y + v.vy }
        }
        return next
      })
      animationRef.current = requestAnimationFrame(step)
    }

    animationRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationRef.current)
  }, [nodes, edges, width, height])

  const startDrag = useCallback((nodeId, e) => {
    dragging.current = nodeId
    const handleMove = (ev) => {
      const rect = e.currentTarget.closest('svg').getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      setPositions(prev => ({ ...prev, [nodeId]: { x, y } }))
      velocities.current[nodeId] = { vx: 0, vy: 0 }
    }
    const handleUp = () => {
      dragging.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [])

  return { positions, startDrag }
}

export default function GraphViewer({ kbId, onClose }) {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 800, height: 500 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDims({ width, height })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!kbId) return
    setLoading(true)
    setError(null)
    fetch(`/api/knowledge/${kbId}/graph`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setGraphData(data)
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [kbId])

  const nodes = graphData?.nodes || []
  const edges = graphData?.edges || []
  const { positions, startDrag } = useForceGraph(nodes, edges, dims.width, dims.height)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin w-6 h-6" style={{ color: 'var(--accent)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading graph...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-sm font-medium text-red-500">{error}</div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Build the graph first to view it.</div>
      </div>
    )
  }

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-tertiary)' }}>
        No graph data available.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {nodes.length} entities · {edges.length} relationships
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
            {graphData?.communities?.length || 0} communities
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xs px-2 py-1 rounded hover:bg-[var(--surface)] transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            Close
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph Canvas */}
        <div ref={containerRef} className="flex-1 relative" style={{ minHeight: 300 }}>
          <svg width={dims.width} height={dims.height} className="absolute inset-0">
            {/* Edges */}
            {edges.map((edge, i) => {
              const src = positions[edge.source]
              const tgt = positions[edge.target]
              if (!src || !tgt) return null
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke="var(--border)"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                  {edge.relation && (
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 4}
                      textAnchor="middle"
                      className="text-[9px]"
                      fill="var(--text-tertiary)"
                      style={{ fontSize: 9, pointerEvents: 'none' }}
                    >
                      {edge.relation}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const pos = positions[node.id]
              if (!pos) return null
              const isSelected = selectedNode?.id === node.id
              const color = getNodeColor(node.type)
              const radius = isSelected ? 22 : 16
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => { e.stopPropagation(); startDrag(node.id, e); setSelectedNode(node) }}
                  style={{ cursor: 'grab' }}
                >
                  <circle
                    r={radius}
                    fill={color + '20'}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fill="var(--text)"
                    style={{ fontSize: 10, fontWeight: 600, pointerEvents: 'none' }}
                  >
                    {node.name || node.id}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="1.6em"
                    fill="var(--text-tertiary)"
                    style={{ fontSize: 8, pointerEvents: 'none' }}
                  >
                    {node.type}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Info Panel */}
        {selectedNode && (
          <div
            className="w-64 border-l overflow-y-auto p-4 shrink-0"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Entity Details</h4>
              <button onClick={() => setSelectedNode(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>×</button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Name</div>
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedNode.name || selectedNode.id}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Type</div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: getNodeColor(selectedNode.type) + '20', color: getNodeColor(selectedNode.type) }}
                >
                  {selectedNode.type || 'Unknown'}
                </span>
              </div>
              {selectedNode.description && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Description</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedNode.description}</div>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Relationships</div>
                <div className="space-y-1">
                  {edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, i) => {
                      const isSource = e.source === selectedNode.id
                      const otherId = isSource ? e.target : e.source
                      const other = nodes.find(n => n.id === otherId)
                      return (
                        <div key={i} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">{isSource ? '→' : '←'}</span>
                          <span>{e.relation || 'related_to'}</span>
                          <span className="font-medium" style={{ color: 'var(--text)' }}>{other?.name || otherId}</span>
                        </div>
                      )
                    })}
                  {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                    <div className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>No relationships</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {Object.entries(NODE_COLORS).filter(([k]) => k !== 'DEFAULT').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
