import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'

const NODE_COLORS = {
  Person: '#ef4444',
  Organization: '#3b82f6',
  Location: '#10b981',
  Event: '#f59e0b',
  Concept: '#8b5cf6',
  Technology: '#06b6d4',
  Product: '#ec4899',
  Country: '#e11d48',
  City: '#f97316',
  Company: '#6366f4',
  Industry: '#14b8a6',
  Market: '#d946ef',
  Trend: '#84cc16',
  Strategy: '#f43f5e',
  Risk: '#dc2626',
  Opportunity: '#16a34a',
  Challenge: '#ea580c',
  Solution: '#2563eb',
  Resource: '#0891b2',
  Process: '#7c3aed',
  Tool: '#db2777',
  Framework: '#059669',
  Metric: '#4f46e5',
  Goal: '#ca8a04',
  Task: '#9333ea',
  Role: '#c026d3',
  Team: '#0d9488',
  Project: '#b45309',
  Document: '#475569',
  Data: '#0284c7',
  DEFAULT: '#94a3b8',
}

const getNodeColor = (type) => NODE_COLORS[type] || NODE_COLORS.DEFAULT

function useForceGraph(nodes, edges, dimensions, transform) {
  const [positions, setPositions] = useState({})
  const velocities = useRef({})
  const dragging = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    if (!nodes.length || !dimensions.width || !dimensions.height) return
    const cx = dimensions.width / 2
    const cy = dimensions.height / 2
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3
    const init = {}
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      init[node.id] = {
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
      }
      if (!velocities.current[node.id]) {
        velocities.current[node.id] = { vx: 0, vy: 0 }
      }
    })
    setPositions(init)
  }, [nodes.length, dimensions.width, dimensions.height])

  useEffect(() => {
    if (!nodes.length || !dimensions.width || !dimensions.height) return

    const step = () => {
      setPositions(prev => {
        const next = { ...prev }
        const kRepulse = 5000
        const kAttract = 0.002
        const damping = 0.88
        const centerForce = 0.008
        const cx = dimensions.width / 2
        const cy = dimensions.height / 2

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

          fx += (cx - pa.x) * centerForce
          fy += (cy - pa.y) * centerForce

          const v = velocities.current[a.id]
          v.vx = (v.vx + fx) * damping
          v.vy = (v.vy + fy) * damping

          const speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy)
          const maxSpeed = 12
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
  }, [nodes, edges, dimensions.width, dimensions.height])

  const startDrag = useCallback((nodeId, e) => {
    e.stopPropagation()
    dragging.current = nodeId
    const svg = e.currentTarget.closest('svg')
    const rect = svg.getBoundingClientRect()

    const handleMove = (ev) => {
      const x = (ev.clientX - rect.left - transform.x) / transform.scale
      const y = (ev.clientY - rect.top - transform.y) / transform.scale
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
  }, [transform])

  return { positions, startDrag, dragging }
}

function ZoomControls({ onZoomIn, onZoomOut, onFit, onCenter, zoom }) {
  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
      <button onClick={onZoomIn} className="w-8 h-8 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center text-[var(--text)]" title="Zoom in">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button onClick={onZoomOut} className="w-8 h-8 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center text-[var(--text)]" title="Zoom out">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div className="w-8 h-px bg-[var(--border)]" />
      <button onClick={onFit} className="w-8 h-8 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center text-[var(--text)]" title="Fit to screen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>
      <button onClick={onCenter} className="w-8 h-8 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center text-[var(--text)]" title="Center graph">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
      <div className="text-[9px] text-center text-[var(--text-tertiary)] mt-1" style={{ fontSize: 9 }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  )
}

function Minimap({ nodes, positions, transform, dims, onMinimapClick }) {
  if (!nodes.length) return null

  const padding = 40
  const allX = nodes.map(n => positions[n.id]?.x || 0)
  const allY = nodes.map(n => positions[n.id]?.y || 0)
  const minX = Math.min(...allX) - padding
  const maxX = Math.max(...allX) + padding
  const minY = Math.min(...allY) - padding
  const maxY = Math.max(...allY) + padding

  const graphWidth = maxX - minX || 1
  const graphHeight = maxY - minY || 1
  const scale = Math.min(120 / graphWidth, 80 / graphHeight)

  const viewBoxX = -transform.x / transform.scale
  const viewBoxY = -transform.y / transform.scale
  const viewBoxW = dims.width / transform.scale
  const viewBoxH = dims.height / transform.scale

  return (
    <div className="absolute bottom-3 left-3 w-32 h-20 rounded border bg-[var(--bg)]/90 backdrop-blur border-[var(--border)] overflow-hidden z-10">
      <svg width="128" height="80" className="cursor-crosshair" onClick={onMinimapClick}>
        {nodes.map(node => {
          const pos = positions[node.id]
          if (!pos) return null
          const x = (pos.x - minX) * scale
          const y = (pos.y - minY) * scale
          return (
            <circle key={node.id} cx={x} cy={y} r={2} fill={getNodeColor(node.type)} opacity={0.8} />
          )
        })}
        <rect
          x={(viewBoxX - minX) * scale}
          y={(viewBoxY - minY) * scale}
          width={viewBoxW * scale}
          height={viewBoxH * scale}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1}
          opacity={0.6}
        />
      </svg>
    </div>
  )
}

export default function GraphViewer({ kbId, onClose }) {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 800, height: 500 })
  const [contextMenu, setContextMenu] = useState(null)

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
  const { positions, startDrag } = useForceGraph(nodes, edges, dims, transform)

  const handleZoom = useCallback((delta, centerX, centerY) => {
    setTransform(prev => {
      const factor = delta > 0 ? 1.1 : 0.9
      const newScale = Math.min(Math.max(prev.scale * factor, 0.1), 5)
      const scaleDiff = newScale - prev.scale

      const newX = centerX - (centerX - prev.x) * (newScale / prev.scale)
      const newY = centerY - (centerY - prev.y) * (newScale / prev.scale)

      return { x: prev.x, y: prev.y, scale: newScale }
    })
  }, [])

  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.8, 0.1) }))
  }, [])

  const handleFit = useCallback(() => {
    if (!nodes.length || !positions) return
    const allX = nodes.map(n => positions[n.id]?.x || 0)
    const allY = nodes.map(n => positions[n.id]?.y || 0)
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)

    const graphW = maxX - minX + 100
    const graphH = maxY - minY + 100
    const scaleX = dims.width / graphW
    const scaleY = dims.height / graphH
    const scale = Math.min(scaleX, scaleY, 2)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setTransform({
      scale,
      x: dims.width / 2 - centerX * scale,
      y: dims.height / 2 - centerY * scale
    })
  }, [nodes, positions, dims])

  const handleCenter = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    handleZoom(e.deltaY < 0 ? 1 : -1, e.clientX - rect.left, e.clientY - rect.top)
  }, [handleZoom])

  const handleMouseDown = useCallback((e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'line') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
      setSelectedNode(null)
    }
  }, [transform])

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }))
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleMinimapClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const allX = nodes.map(n => positions[n.id]?.x || 0)
    const allY = nodes.map(n => positions[n.id]?.y || 0)
    const minX = Math.min(...allX) - 40
    const minY = Math.min(...allY) - 40
    const maxX = Math.max(...allX) + 40
    const maxY = Math.max(...allY) + 40

    const graphWidth = maxX - minX || 1
    const graphHeight = maxY - minY || 1
    const scale = Math.min(120 / graphWidth, 80 / graphHeight)

    const targetX = minX + x / scale
    const targetY = minY + y / scale

    setTransform(prev => ({
      ...prev,
      x: dims.width / 2 - targetX * prev.scale,
      y: dims.height / 2 - targetY * prev.scale
    }))
  }, [nodes, positions, dims])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleDoubleClick = useCallback((e, node) => {
    e.stopPropagation()
    setSelectedNode(node)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
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
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <svg className="w-12 h-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <circle cx="8" cy="10" r="2" />
          <circle cx="16" cy="10" r="2" />
          <circle cx="12" cy="16" r="2" />
          <line x1="8" y1="10" x2="12" y2="16" />
          <line x1="16" y1="10" x2="12" y2="16" />
        </svg>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No graph data available</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {nodes.length} nodes · {edges.length} edges
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: 'white', opacity: 0.9 }}>
            {graphData?.communities?.length || 0} communities
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFit}
            className="text-[10px] px-2 py-1 rounded border transition-colors hover:bg-[var(--surface)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Fit
          </button>
          {onClose && (
            <button onClick={onClose} className="text-xs px-2 py-1 rounded hover:bg-[var(--surface)] transition-colors" style={{ color: 'var(--text-tertiary)' }}>
              Close
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-[var(--bg)]"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <svg
          width={dims.width}
          height={dims.height}
          className="absolute inset-0"
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--border)" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {edges.map((edge, i) => {
              const src = positions[edge.source]
              const tgt = positions[edge.target]
              if (!src || !tgt) return null
              const isHighlighted = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id)
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isHighlighted ? 'var(--accent)' : 'var(--border)'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    opacity={isHighlighted ? 1 : 0.5}
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.relation && (
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 6}
                      textAnchor="middle"
                      fill="var(--text-tertiary)"
                      style={{ fontSize: 8, pointerEvents: 'none' }}
                    >
                      {edge.relation}
                    </text>
                  )}
                </g>
              )
            })}

            {nodes.map(node => {
              const pos = positions[node.id]
              if (!pos) return null
              const isSelected = selectedNode?.id === node.id
              const isHovered = hoveredNode === node.id
              const isHighlighted = selectedNode && (edges.some(e => e.source === node.id && e.target === selectedNode.id) || edges.some(e => e.target === node.id && e.source === selectedNode.id))
              const color = getNodeColor(node.type)
              const radius = isSelected ? 24 : isHovered ? 20 : 16

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => { startDrag(node.id, e); setSelectedNode(node) }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onDoubleClick={(e) => handleDoubleClick(e, node)}
                  style={{ cursor: 'grab' }}
                >
                  {isSelected && (
                    <circle r={radius + 6} fill="none" stroke={color} strokeWidth={2} opacity={0.4} filter="url(#glow)" />
                  )}
                  <circle
                    r={radius}
                    fill={`${color}30`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                  />
                  {isHovered && !isSelected && (
                    <circle r={radius + 3} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
                  )}
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fill="var(--text)"
                    style={{ fontSize: 10, fontWeight: 600, pointerEvents: 'none' }}
                  >
                    {(node.name || node.id).substring(0, 16)}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="1.5em"
                    fill="var(--text-tertiary)"
                    style={{ fontSize: 8, pointerEvents: 'none' }}
                  >
                    {node.type}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onCenter={handleCenter}
          zoom={transform.scale}
        />

        <Minimap
          nodes={nodes}
          positions={positions}
          transform={transform}
          dims={dims}
          onMinimapClick={handleMinimapClick}
        />

        {contextMenu && (
          <div
            className="absolute z-20 min-w-32 rounded border shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y, backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            onMouseLeave={() => setContextMenu(null)}
          >
            <button
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-hover)] transition-colors"
              style={{ color: 'var(--text)' }}
              onClick={() => { handleFit(); setContextMenu(null) }}
            >
              Fit to screen
            </button>
            <button
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-hover)] transition-colors"
              style={{ color: 'var(--text)' }}
              onClick={() => { handleCenter(); setContextMenu(null) }}
            >
              Reset view
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 overflow-x-auto">
          {Object.entries(NODE_COLORS).filter(([k]) => k !== 'DEFAULT').map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{type}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--text-tertiary)' }}>
          Scroll to zoom · Drag to pan · Double-click node for details
        </div>
      </div>

      {selectedNode && (
        <div
          className="absolute inset-y-0 right-0 w-72 border-l overflow-y-auto p-4 z-10"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', marginTop: 48 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Entity Details</h4>
            <button onClick={() => setSelectedNode(null)} className="text-lg leading-none hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>×</button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Name</div>
              <div className="text-base font-semibold" style={{ color: 'var(--text)' }}>{selectedNode.name || selectedNode.id}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Type</div>
              <span
                className="inline-block text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: getNodeColor(selectedNode.type) + '20', color: getNodeColor(selectedNode.type) }}
              >
                {selectedNode.type || 'Unknown'}
              </span>
            </div>

            {selectedNode.description && (
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Description</div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedNode.description}</div>
              </div>
            )}

            {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Properties</div>
                <div className="space-y-1">
                  {Object.entries(selectedNode.properties).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-tertiary)' }}>{key}</span>
                      <span className="font-mono" style={{ color: 'var(--text)' }}>{String(value).substring(0, 50)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Relationships ({edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length})
              </div>
              <div className="space-y-1.5">
                {edges
                  .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e, i) => {
                    const isSource = e.source === selectedNode.id
                    const otherId = isSource ? e.target : e.source
                    const other = nodes.find(n => n.id === otherId)
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[var(--surface)] transition-colors"
                        onClick={() => setSelectedNode(other)}
                      >
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: 'white', opacity: 0.9 }}>
                          {isSource ? '→' : '←'}
                        </span>
                        <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{e.relation || 'related_to'}</span>
                        <span className="text-xs font-medium truncate max-w-24" style={{ color: getNodeColor(other?.type) }}>
                          {other?.name || otherId}
                        </span>
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
  )
}