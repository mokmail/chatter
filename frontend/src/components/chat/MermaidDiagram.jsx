import React, { useRef, useEffect } from 'react'
import mermaid from 'mermaid'

const mermaidCodeCache = new Map()
let mermaidId = 0

const MermaidDiagram = ({ code }) => {
  const ref = useRef(null)
  const idRef = useRef(`mermaid-${++mermaidId}`)
  useEffect(() => {
    if (ref.current && code) {
      const cached = mermaidCodeCache.get(code)
      if (cached) { ref.current.innerHTML = cached }
      else {
        mermaid.render(idRef.current, code).then(({ svg }) => {
          mermaidCodeCache.set(code, svg)
          if (ref.current) ref.current.innerHTML = svg
        }).catch((err) => { if (ref.current) ref.current.innerHTML = `<pre class="text-xs" style="color: var(--danger);">Mermaid error: ${err.message}</pre>` })
      }
    }
  }, [code])
  return <div ref={ref} className="flex justify-center my-2" />
}

export default MermaidDiagram
