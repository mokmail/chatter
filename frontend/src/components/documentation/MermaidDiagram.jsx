import React, { useState, useRef, useEffect } from 'react'
import mermaid from 'mermaid'
import { useTheme } from '../../hooks/useTheme'

const getMermaidConfig = (theme) => {
  const isDark = theme === 'dark'
  return {
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    themeVariables: {
      primaryColor: isDark ? '#4f8ef7' : '#3b82f6',
      primaryTextColor: isDark ? '#fafafa' : '#18181b',
      primaryBorderColor: isDark ? '#333333' : '#d4d4d8',
      lineColor: isDark ? '#4f8ef7' : '#3b82f6',
      secondaryColor: isDark ? '#0f0f12' : '#f8f9fa',
      tertiaryColor: isDark ? '#16161a' : '#f1f3f5',
      background: isDark ? '#09090b' : '#ffffff',
      mainBkg: isDark ? '#16161a' : '#f1f3f5',
      nodeBorder: isDark ? '#333333' : '#d4d4d8',
      clusterBkg: isDark ? '#16161a' : '#f1f3f5',
      clusterBorder: isDark ? '#3f3f46' : '#e4e4e7',
      titleColor: isDark ? '#fafafa' : '#18181b',
      edgeLabelBackground: isDark ? '#16161a' : '#f1f3f5',
    },
  }
}

let mermaidId = 0

export const MermaidDiagram = ({ chart }) => {
  const ref = useRef(null)
  const { theme } = useTheme()

  useEffect(() => {
    mermaid.initialize(getMermaidConfig(theme))
    const currentId = `mermaid-svg-${++mermaidId}`
    if (ref.current) {
      mermaid.render(currentId, chart).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      }).catch((err) => {
        if (ref.current) ref.current.innerHTML = `<pre class="text-xs" style="color:var(--danger-icon)">${err}</pre>`
      })
    }
  }, [chart, theme])

  return <div ref={ref} className="flex justify-center" />
}

export default MermaidDiagram
