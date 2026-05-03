import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, TextField, Switch, FormControlLabel, FormControl, Select,
  MenuItem, Typography, Paper, Card, CardContent,
  Chip, IconButton, Tooltip, InputAdornment, CircularProgress, Alert, Snackbar
} from '@mui/material';
import {
  AutoAwesome, Search, Check, Close, Edit, Undo,
  CheckBoxOutlineBlank, CheckBox, IndeterminateCheckBox,
  Stop, Download, Delete, Assessment, History,
  ArrowBack, ArrowForward
} from '@mui/icons-material';
import { BrainIcon } from './common/Icons';

const CioAgentPage = ({ config, onSave, cioProcessing, setCioProcessing }) => {
  // CIO Agent state
  const [cioEnabled, setCioEnabled] = useState(false);
  const [cioAutoScan, setCioAutoScan] = useState(true);
  const [cioIncludeTests, setCioIncludeTests] = useState(false);
  const [cioIncludeUnderstanding, setCioIncludeUnderstanding] = useState(true);
  const [cioExcludeDirs, setCioExcludeDirs] = useState('');
  const [cioExcludeFiles, setCioExcludeFiles] = useState('');
  const [cioTargetDir, setCioTargetDir] = useState('');
  const [cioSuggestions, setCioSuggestions] = useState([]);
  const [cioLoading, setCioLoading] = useState(false);
  const [cioAnalyzing, setCioAnalyzing] = useState(false);
  const [cioAnalysisInProgress, setCioAnalysisInProgress] = useState(false);
  const [cioFilter, setCioFilter] = useState('all');
  const [cioInsightType, setCioInsightType] = useState('all');
  const [cioPage, setCioPage] = useState(0);
  const CIO_PAGE_SIZE = 20;
  const [cioLastScan, setCioLastScan] = useState(null);
  const [cioProgress, setCioProgress] = useState('');
  const [localProcessing, setLocalProcessing] = useState(false);
  const [cioStats, setCioStats] = useState(null);
  const [cioPriorityFilter, setCioPriorityFilter] = useState('all');
  const [cioSearch, setCioSearch] = useState('');
  const [cioSelectedIds, setCioSelectedIds] = useState(new Set());
  const [cioScanHistory, setCioScanHistory] = useState([]);
  const [cioShowHistory, setCioShowHistory] = useState(false);
  const [cioShowStats, setCioShowStats] = useState(false);
  const [cioSortBy, setCioSortBy] = useState('timestamp');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const cioEventSourceRef = useRef(null);
  const cioStopRequestedRef = useRef(false);
  const isProcessing = cioProcessing !== undefined ? cioProcessing : localProcessing;
  const setProcessing = setCioProcessing !== undefined ? setCioProcessing : setLocalProcessing;

  // Load CIO Agent status and suggestions on mount
  useEffect(() => {
    const loadCIOStatus = async () => {
      try {
        const response = await fetch('/api/cio-agent/status');
        if (!response.ok) return;
        const data = await response.json();
        setCioEnabled(data.enabled || false);
        setCioAutoScan(data.auto_scan !== false);
        setCioIncludeTests(data.include_tests || false);
        setCioLastScan(data.last_scan);
        const defaultDirs = ['node_modules', '__pycache__', '.git', 'venv', 'env', '.venv', '.env', 'dist', 'build', 'backup', '.vscode', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox', 'coverage', '.coverage', '.copilot', '.idea', '.next', 'out', '.nuxt', '.output'];
        const defaultFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'vite.config.js', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js', 'jest.config.js', 'eslint.config.js'];
        const loadedDirs = Array.isArray(data.exclude_dirs) && data.exclude_dirs.length > 0 ? data.exclude_dirs : defaultDirs;
        const loadedFiles = Array.isArray(data.exclude_files) && data.exclude_files.length > 0 ? data.exclude_files : defaultFiles;
        setCioExcludeDirs(loadedDirs.join(', '));
        setCioExcludeFiles(loadedFiles.join(', '));
        setCioTargetDir(data.target_dir || '');
        setCioAnalysisInProgress(data.analysis_in_progress || false);
        setProcessing(data.last_scan ? false : true);

        const suggResponse = await fetch('/api/cio-agent/suggestions');
        const suggData = await suggResponse.json();
        setCioSuggestions(suggData.suggestions || []);
      } catch (err) {
        console.log('CIO Agent not available:', err.message);
      }
    };
    loadCIOStatus();

    return () => {
      if (cioEventSourceRef.current) {
        cioEventSourceRef.current.close();
        cioEventSourceRef.current = null;
      }
    };
  }, []);

  const handleCIOToggle = async (e) => {
    const enabled = e.target.checked;
    setCioEnabled(enabled);
    setCioPage(0);
    try {
      await fetch('/api/cio-agent/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, auto_scan: cioAutoScan })
      });
      onSave({ cio_agent_enabled: enabled });
      if (enabled && cioAutoScan) handleCIOAnalyze();
    } catch (err) {
      console.error('Failed to toggle CIO Agent:', err);
    }
  };

  const handleCIOAnalyze = async () => {
    setCioAnalyzing(true);
    setCioLoading(true);
    setProcessing(true);
    setCioProgress('Starting analysis...');
    setCioSuggestions([]);
    cioStopRequestedRef.current = false;

    try {
      const eventSource = new EventSource('/api/cio-agent/stream');
      cioEventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'start') {
            setCioProgress(data.message || 'Starting analysis...');
          } else if (data.type === 'progress') {
            setCioProgress(data.message);
          } else if (data.type === 'suggestion') {
            if (data.suggestion && data.suggestion.category === 'meta') {
              setCioProgress(data.suggestion.description || 'Processing...');
              return;
            }
            setCioSuggestions(prev => {
              const newCount = prev.length + 1;
              setCioProgress(`Found ${newCount} suggestions...`);
              if (prev.length === 0) setCioLoading(false);
              return [...prev, data.suggestion];
            });
          } else if (data.type === 'complete') {
            setCioProgress(`Analysis complete! Found ${data.count} suggestions.`);
            setCioAnalyzing(false);
            setCioLoading(false);
            setTimeout(() => { setProcessing(false); setCioProgress(''); }, 3000);
            eventSource.close();
            cioEventSourceRef.current = null;
          } else if (data.type === 'cancelled') {
            setCioProgress(`Analysis cancelled. Found ${data.count} suggestions before stopping.`);
            setCioAnalyzing(false);
            setCioLoading(false);
            setProcessing(false);
            eventSource.close();
            cioEventSourceRef.current = null;
            fetch('/api/cio-agent/suggestions').then(r => r.json()).then(d => setCioSuggestions(d.suggestions || []));
          } else if (data.type === 'error') {
            setCioProgress(`Error: ${data.message}`);
            setCioAnalyzing(false);
            setCioLoading(false);
            setProcessing(false);
            eventSource.close();
            cioEventSourceRef.current = null;
            setSnackbar({ open: true, message: data.message, severity: 'error' });
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        cioEventSourceRef.current = null;
        if (!cioStopRequestedRef.current) {
          setProcessing(false);
          setCioProgress('Analysis failed');
          handleCIOAnalyzeFallback();
        }
      };
    } catch (err) {
      console.error('Failed to start analysis:', err);
      setProcessing(false);
    }
  };

  const handleCIOAnalyzeFallback = async () => {
    try {
      setCioProgress('Running analysis...');
      const response = await fetch('/api/cio-agent/analyze-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_tests: cioIncludeTests })
      });
      const data = await response.json();
      if (data.count !== undefined) {
        setCioSuggestions(data.suggestions || []);
        setCioProgress(`Analysis complete! Found ${data.count} suggestions.`);
      }
    } catch (err) {
      console.error('Failed to analyze:', err);
      setCioProgress('Analysis failed');
    } finally {
      setCioAnalyzing(false);
      setCioLoading(false);
      setTimeout(() => setProcessing(false), 3000);
    }
  };

  const handleDismissSuggestion = async (id) => {
    try {
      await fetch(`/api/cio-agent/suggestion/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' })
      });
      setCioSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error('Failed to dismiss suggestion:', err); }
  };

  const handleApplySuggestion = async (id) => {
    try {
      const response = await fetch(`/api/cio-agent/suggestion/${id}/apply`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setCioSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: data.status, applied_at: new Date().toISOString() } : s));
        setSnackbar({ open: true, message: data.message, severity: 'success' });
      } else {
        const errData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setSnackbar({ open: true, message: errData.detail || `Failed to apply suggestion (${response.status})`, severity: 'error' });
      }
    } catch (err) {
      console.error('Failed to apply suggestion:', err);
      setSnackbar({ open: true, message: 'Failed to apply suggestion', severity: 'error' });
    }
  };

  const handleAdaptSuggestion = async (id, adaptedCode) => {
    try {
      const response = await fetch(`/api/cio-agent/suggestion/${id}/adapt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapted_code: adaptedCode })
      });
      if (response.ok) {
        setCioSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'adapted', adapted_code: adaptedCode } : s));
        setSnackbar({ open: true, message: 'Suggestion adapted and saved', severity: 'success' });
      } else {
        const errData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setSnackbar({ open: true, message: errData.detail || `Failed to adapt suggestion (${response.status})`, severity: 'error' });
      }
    } catch (err) {
      console.error('Failed to adapt suggestion:', err);
      setSnackbar({ open: true, message: 'Failed to adapt suggestion', severity: 'error' });
    }
  };

  const handleApplyAdapted = async (id, adaptedCode) => {
    try {
      const response = await fetch(`/api/cio-agent/suggestion/${id}/apply-adapted`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapted_code: adaptedCode })
      });
      if (response.ok) {
        const data = await response.json();
        setCioSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'adapted', applied_at: new Date().toISOString() } : s));
        setSnackbar({ open: true, message: data.message, severity: 'success' });
      } else {
        const errData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setSnackbar({ open: true, message: errData.detail || `Failed to apply adapted suggestion (${response.status})`, severity: 'error' });
      }
    } catch (err) {
      console.error('Failed to apply adapted suggestion:', err);
      setSnackbar({ open: true, message: 'Failed to apply suggestion', severity: 'error' });
    }
  };

  const handleCIOStop = async () => {
    try {
      cioStopRequestedRef.current = true;
      if (cioEventSourceRef.current) { cioEventSourceRef.current.close(); cioEventSourceRef.current = null; }
      await fetch('/api/cio-agent/stop', { method: 'POST' });
      setCioProgress('Stopping analysis...');
      setCioAnalyzing(false);
      setCioLoading(false);
      setProcessing(false);
    } catch (err) { console.error('Failed to stop analysis:', err); }
  };

  const handleCIOPurge = async () => {
    try {
      const response = await fetch('/api/cio-agent/purge', { method: 'POST' });
      const data = await response.json();
      setCioSuggestions([]);
      setCioPage(0);
      setSnackbar({ open: true, message: data.message, severity: 'success' });
      const suggResponse = await fetch('/api/cio-agent/suggestions');
      const suggData = await suggResponse.json();
      setCioSuggestions(suggData.suggestions || []);
    } catch (err) {
      console.error('Failed to purge suggestions:', err);
      setSnackbar({ open: true, message: 'Failed to purge suggestions', severity: 'error' });
    }
  };

  const handleCIODeleteAll = async () => {
    if (!window.confirm('Delete ALL suggestions including applied and dismissed? This cannot be undone.')) return;
    try {
      const response = await fetch('/api/cio-agent/suggestions?purge_all=true', { method: 'DELETE' });
      const data = await response.json();
      setCioSuggestions([]);
      setCioPage(0);
      setSnackbar({ open: true, message: data.message, severity: 'success' });
    } catch (err) {
      console.error('Failed to delete suggestions:', err);
      setSnackbar({ open: true, message: 'Failed to delete suggestions', severity: 'error' });
    }
  };

  const handleCIORevert = async (id) => {
    try {
      const response = await fetch(`/api/cio-agent/suggestion/${id}/revert`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setCioSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'reverted' } : s));
        setSnackbar({ open: true, message: data.message, severity: 'success' });
      } else {
        const errData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setSnackbar({ open: true, message: errData.detail || 'Failed to revert', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to revert suggestion', severity: 'error' });
    }
  };

  const handleCIOBatchDismiss = async () => {
    if (cioSelectedIds.size === 0) return;
    try {
      const response = await fetch('/api/cio-agent/suggestions/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion_ids: Array.from(cioSelectedIds), status: 'dismissed' })
      });
      const data = await response.json();
      setCioSuggestions(prev => prev.map(s => cioSelectedIds.has(s.id) ? { ...s, status: 'dismissed' } : s));
      setCioSelectedIds(new Set());
      setSnackbar({ open: true, message: `Dismissed ${data.updated} suggestions`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Batch dismiss failed', severity: 'error' });
    }
  };

  const handleCIOBatchApply = async () => {
    if (cioSelectedIds.size === 0) return;
    try {
      const response = await fetch('/api/cio-agent/suggestions/batch-apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion_ids: Array.from(cioSelectedIds) })
      });
      const data = await response.json();
      setCioSuggestions(prev => prev.map(s => cioSelectedIds.has(s.id) ? { ...s, status: 'applied' } : s));
      setCioSelectedIds(new Set());
      setSnackbar({ open: true, message: `Applied ${data.applied} suggestions`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Batch apply failed', severity: 'error' });
    }
  };

  const handleCIOExport = async (format = 'json') => {
    try {
      const response = await fetch(`/api/cio-agent/suggestions/export?format=${format}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cio_suggestions.${format}`; a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: `Exported as ${format.toUpperCase()}`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Export failed', severity: 'error' });
    }
  };

  const handleCIOLoadStats = async () => {
    try {
      const response = await fetch('/api/cio-agent/stats');
      const data = await response.json();
      setCioStats(data);
      setCioShowStats(true);
    } catch (err) { console.error('Failed to load stats:', err); }
  };

  const handleCIOLoadHistory = async () => {
    try {
      const response = await fetch('/api/cio-agent/scan-history');
      const data = await response.json();
      setCioScanHistory(data.scans || []);
      setCioShowHistory(true);
    } catch (err) { console.error('Failed to load scan history:', err); }
  };

  const handleCIOSelectAll = (filtered) => {
    const pendingIds = filtered.filter(s => s.status === 'pending').map(s => s.id);
    if (cioSelectedIds.size >= pendingIds.length && pendingIds.every(id => cioSelectedIds.has(id))) {
      setCioSelectedIds(new Set());
    } else {
      setCioSelectedIds(new Set(pendingIds));
    }
  };

  const handleCIOToggleSelect = (id) => {
    setCioSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Filtered suggestions helper
  const getFilteredSuggestions = () => {
    return cioSuggestions
      .filter(s => cioFilter === 'all' || s.category === cioFilter)
      .filter(s => cioPriorityFilter === 'all' || s.priority === cioPriorityFilter)
      .filter(s => cioInsightType === 'all' || (s.insight_type || 'improvement') === cioInsightType)
      .filter(s => !cioSearch || s.title?.toLowerCase().includes(cioSearch.toLowerCase()) || s.file_path?.toLowerCase().includes(cioSearch.toLowerCase()) || s.description?.toLowerCase().includes(cioSearch.toLowerCase()));
  };

  const understandingInsights = cioSuggestions.filter(s => s.insight_type === 'understanding');
  const improvementInsights = cioSuggestions.filter(s => !s.insight_type || s.insight_type === 'improvement');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ background: 'var(--glass)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf615', border: '1px solid #8b5cf630' }}>
              <BrainIcon size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>CIO Agent</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {isProcessing ? cioProgress : cioLastScan ? `Last scan: ${new Date(cioLastScan).toLocaleString()}` : 'AI-powered code analysis and improvement suggestions'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isProcessing && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-glow)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                Processing
              </div>
            )}
            <Button variant="contained" startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
              onClick={handleCIOAnalyze} disabled={isProcessing || !cioEnabled}
              sx={{ borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'var(--bg)', fontWeight: 600, textTransform: 'none' }}>
              {isProcessing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
            {isProcessing && (
              <Button variant="outlined" color="error" startIcon={<Stop fontSize="small" />} onClick={handleCIOStop}
                sx={{ borderRadius: 'var(--radius-sm)', textTransform: 'none' }}>Stop</Button>
            )}
            <Tooltip title="Statistics"><IconButton size="small" onClick={handleCIOLoadStats} sx={{ color: 'var(--text-secondary)' }}><Assessment fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Scan History"><IconButton size="small" onClick={handleCIOLoadHistory} sx={{ color: 'var(--text-secondary)' }}><History fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Export JSON"><IconButton size="small" onClick={() => handleCIOExport('json')} sx={{ color: 'var(--text-secondary)' }}><Download fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Purge pending"><IconButton size="small" onClick={handleCIOPurge} sx={{ color: 'var(--text-secondary)' }}><Delete fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete all"><IconButton size="small" onClick={handleCIODeleteAll} sx={{ color: '#ef4444' }}><Delete fontSize="small" /></IconButton></Tooltip>
          </div>
        </div>

        {/* Settings strip */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <FormControlLabel control={<Switch checked={cioEnabled} onChange={handleCIOToggle} />} label={<span className="text-sm" style={{ color: 'var(--text)' }}>Enabled</span>} />
          <FormControlLabel control={<Switch checked={cioAutoScan} onChange={(e) => { setCioAutoScan(e.target.checked); onSave({ cio_agent_auto_scan: e.target.checked }); }} />}
            label={<span className="text-sm" style={{ color: 'var(--text)' }}>Auto-scan</span>} />
          <FormControlLabel control={<Switch checked={cioIncludeTests} onChange={(e) => { setCioIncludeTests(e.target.checked); onSave({ cio_agent_include_tests: e.target.checked }); }} />}
            label={<span className="text-sm" style={{ color: 'var(--text)' }}>Include Tests</span>} />
          <FormControlLabel control={<Switch checked={cioIncludeUnderstanding} onChange={(e) => {
            setCioIncludeUnderstanding(e.target.checked);
            fetch('/api/cio-agent/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: cioEnabled, include_understanding: e.target.checked }) }).catch(() => {});
            onSave({ cio_agent_include_understanding: e.target.checked });
          }} />} label={<span className="text-sm" style={{ color: 'var(--text)' }}>Architecture Understanding</span>} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Stats Dashboard */}
        {cioShowStats && cioStats && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Dashboard</h3>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Total', value: cioStats.total, color: 'var(--text)' },
                { label: 'Pending', value: cioStats.by_status?.pending || 0, color: '#f59e0b' },
                { label: 'Applied', value: cioStats.by_status?.applied || 0, color: '#10b981' },
                { label: 'Dismissed', value: cioStats.by_status?.dismissed || 0, color: 'var(--text-tertiary)' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                  <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>By Category</div>
                {Object.entries(cioStats.by_category || {}).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between py-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{count}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>By Priority</div>
                {Object.entries(cioStats.by_priority || {}).map(([pri, count]) => (
                  <div key={pri} className="flex justify-between py-0.5">
                    <span className="text-xs" style={{ color: pri === 'high' ? '#ef4444' : pri === 'medium' ? '#f59e0b' : 'var(--text-secondary)' }}>{pri}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            {cioStats.avg_impact_score > 0 && (
              <div className="flex gap-6 mt-3">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg Impact: <strong>{cioStats.avg_impact_score}/10</strong></span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg Effort: <strong>{cioStats.avg_effort_score}/10</strong></span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Scans: <strong>{cioStats.scan_count}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Architecture Overview */}
        {(() => {
          const archInsights = understandingInsights.filter(s => ['architecture', 'feature_map', 'dependency', 'design_pattern', 'data_flow', 'cross_cutting'].includes(s.category));
          if (archInsights.length === 0) return null;
          const featuresCount = understandingInsights.filter(s => s.category === 'feature_map').length;
          const depsCount = understandingInsights.filter(s => s.category === 'dependency').length;
          const patternsCount = understandingInsights.filter(s => s.category === 'design_pattern').length;
          const dataFlowsCount = understandingInsights.filter(s => s.category === 'data_flow').length;
          const crossCuttingCount = understandingInsights.filter(s => s.category === 'cross_cutting').length;
          const archCount = understandingInsights.filter(s => s.category === 'architecture').length;
          return (
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: '#06b6d4' }}>
                <span className="mr-1" style={{ fontSize: '1.1rem' }}>&#x1F3D7;&#xFE0F;</span> Architecture Overview
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { label: 'Features', value: featuresCount, color: '#0ea5e9' },
                  { label: 'Dependencies', value: depsCount, color: '#f59e0b' },
                  { label: 'Patterns', value: patternsCount, color: '#a855f7' },
                  { label: 'Data Flows', value: dataFlowsCount, color: '#14b8a6' },
                  { label: 'Cross-Cutting', value: crossCuttingCount, color: '#ec4899' },
                  { label: 'Architecture', value: archCount, color: '#06b6d4' },
                ].filter(item => item.value > 0).map(item => (
                  <div key={item.label} className="text-center p-2 rounded-lg" style={{ background: 'var(--surface)' }}>
                    <div className="text-lg font-black" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                {understandingInsights.length} architectural insights &middot; {improvementInsights.length} improvement suggestions
              </p>
            </div>
          );
        })()}

        {/* Scan History */}
        {cioShowHistory && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Scan History</h3>
            {cioScanHistory.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No scan history yet</p>
            ) : (
              cioScanHistory.slice().reverse().slice(0, 10).map(scan => (
                <div key={scan.id} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: scan.status === 'completed' ? '#10b981' : scan.status === 'error' ? '#ef4444' : 'var(--text-secondary)' }}>
                      {scan.status.toUpperCase()}
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>{scan.suggestion_count} suggestions</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(scan.timestamp).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}

        {(cioEnabled || cioSuggestions.length > 0) && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <TextField size="small" placeholder="Search suggestions..." value={cioSearch}
                onChange={(e) => { setCioSearch(e.target.value); setCioPage(0); }}
                sx={{ minWidth: 180, '& .MuiInputBase-root': { borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', fontSize: '0.85rem' } }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select value={cioSortBy} onChange={(e) => setCioSortBy(e.target.value)}
                  sx={{ borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', fontSize: '0.85rem' }}>
                  <MenuItem value="timestamp">Newest</MenuItem>
                  <MenuItem value="priority">Priority</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                  <MenuItem value="file_path">File</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Insight Type Toggle */}
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {[
                { value: 'all', label: 'All Types' },
                { value: 'improvement', label: 'Improvements' },
                { value: 'understanding', label: 'Understanding' },
              ].map(opt => (
                <Chip key={opt.value} label={opt.label} size="small" onClick={() => { setCioInsightType(opt.value); setCioPage(0); }}
                  sx={{ cursor: 'pointer', bgcolor: cioInsightType === opt.value ? (opt.value === 'understanding' ? '#06b6d4' : 'var(--accent)') : 'var(--surface)', color: cioInsightType === opt.value ? 'white' : 'var(--text-secondary)', '&:hover': { bgcolor: cioInsightType === opt.value ? (opt.value === 'understanding' ? '#0891b2' : 'var(--accent)') : 'var(--surface-hover)' } }} />
              ))}
            </div>

            {/* Category & Priority Filters */}
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {['all', 'functionality', 'documentation', 'refactoring', 'enhancement', 'security', 'performance', 'bug', 'architecture', 'feature_map', 'dependency', 'design_pattern', 'data_flow', 'cross_cutting'].map(cat => (
                <Chip key={cat} label={cat === 'all' ? 'All' : cat === 'feature_map' ? 'Feature Map' : cat === 'data_flow' ? 'Data Flow' : cat === 'cross_cutting' ? 'Cross-Cutting' : cat === 'design_pattern' ? 'Design Pattern' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  size="small" onClick={() => { setCioFilter(cat); setCioPage(0); }}
                  sx={{ cursor: 'pointer', bgcolor: cioFilter === cat ? 'var(--accent)' : 'var(--surface)', color: cioFilter === cat ? 'var(--bg)' : 'var(--text-secondary)', '&:hover': { bgcolor: cioFilter === cat ? 'var(--accent)' : 'var(--surface-hover)' } }} />
              ))}
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {['all', 'high', 'medium', 'low'].map(pri => (
                <Chip key={pri} label={pri === 'all' ? 'All priorities' : pri.charAt(0).toUpperCase() + pri.slice(1)}
                  size="small" onClick={() => { setCioPriorityFilter(pri); setCioPage(0); }}
                  sx={{ cursor: 'pointer', bgcolor: cioPriorityFilter === pri ? (pri === 'high' ? '#ef4444' : pri === 'medium' ? '#f59e0b' : '#10b981') : 'var(--surface)', color: cioPriorityFilter === pri ? 'white' : 'var(--text-secondary)', '&:hover': { bgcolor: cioPriorityFilter === pri ? (pri === 'high' ? '#ef4444' : pri === 'medium' ? '#f59e0b' : '#10b981') : 'var(--surface-hover)' } }} />
              ))}
            </div>

            {/* Batch Actions */}
            {cioSelectedIds.size > 0 && (
              <div className="flex gap-2 p-3 mb-3 rounded-lg items-center" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{cioSelectedIds.size} selected</span>
                <Button size="small" variant="outlined" startIcon={<Check fontSize="small" />} onClick={handleCIOBatchApply}
                  sx={{ borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: '#10b981', borderColor: '#10b981' }}>Apply All</Button>
                <Button size="small" variant="outlined" startIcon={<Close fontSize="small" />} onClick={handleCIOBatchDismiss}
                  sx={{ borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>Dismiss All</Button>
                <Button size="small" variant="text" onClick={() => setCioSelectedIds(new Set())} sx={{ fontSize: '0.75rem' }}>Clear</Button>
              </div>
            )}

            {/* Select All + Count */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <IconButton size="small" onClick={() => handleCIOSelectAll(getFilteredSuggestions())}>
                  {(() => {
                    const filtered = getFilteredSuggestions();
                    const pendingIds = filtered.filter(s => s.status === 'pending').map(s => s.id);
                    if (cioSelectedIds.size >= pendingIds.length && pendingIds.length > 0 && pendingIds.every(id => cioSelectedIds.has(id))) return <CheckBox fontSize="small" sx={{ color: 'var(--accent)' }} />;
                    if (cioSelectedIds.size > 0) return <IndeterminateCheckBox fontSize="small" sx={{ color: 'var(--accent)' }} />;
                    return <CheckBoxOutlineBlank fontSize="small" />;
                  })()}
                </IconButton>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {getFilteredSuggestions().length} total &middot; {cioSuggestions.filter(s => s.status === 'pending').length} pending
                </span>
              </div>
            </div>

            {/* Loading / Empty state */}
            {cioLoading ? (
              <div className="text-center py-8">
                <CircularProgress size={32} sx={{ color: 'var(--accent)' }} />
                <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>Analyzing codebase...</p>
              </div>
            ) : cioSuggestions.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>No suggestions yet. Click "Run Analysis" to start.</p>
            ) : (
              /* Suggestions List */
              (() => {
                const filtered = getFilteredSuggestions();
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const sorted = [...filtered].sort((a, b) => {
                  if (cioSortBy === 'priority') return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                  if (cioSortBy === 'category') return (a.category || '').localeCompare(b.category || '');
                  if (cioSortBy === 'file_path') return (a.file_path || '').localeCompare(b.file_path || '');
                  return 0;
                });
                const totalPages = Math.ceil(sorted.length / CIO_PAGE_SIZE);
                const safePage = cioPage >= totalPages && totalPages > 0 ? totalPages - 1 : cioPage;
                const start = safePage * CIO_PAGE_SIZE;
                const page = sorted.slice(start, start + CIO_PAGE_SIZE);
                return page.map((suggestion, idx) => (
                  <div key={suggestion.id || idx} className="mb-3 p-4 rounded-xl" style={{ background: suggestion.status === 'applied' ? 'rgba(16, 185, 129, 0.05)' : suggestion.status === 'dismissed' ? 'rgba(156, 163, 175, 0.05)' : 'var(--glass)', border: `1px solid ${suggestion.status === 'applied' ? 'rgba(16, 185, 129, 0.3)' : suggestion.status === 'dismissed' ? 'rgba(156, 163, 175, 0.2)' : 'var(--border)'}`, opacity: suggestion.status === 'dismissed' ? 0.6 : 1 }}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {suggestion.status === 'pending' && (
                          <IconButton size="small" onClick={() => handleCIOToggleSelect(suggestion.id)} sx={{ p: 0.25 }}>
                            {cioSelectedIds.has(suggestion.id) ? <CheckBox fontSize="small" sx={{ color: 'var(--accent)' }} /> : <CheckBoxOutlineBlank fontSize="small" />}
                          </IconButton>
                        )}
                        <Chip size="small" label={suggestion.category === 'feature_map' ? 'Feature Map' : suggestion.category === 'data_flow' ? 'Data Flow' : suggestion.category === 'cross_cutting' ? 'Cross-Cutting' : suggestion.category === 'design_pattern' ? 'Design Pattern' : suggestion.category}
                          sx={{ bgcolor: suggestion.category === 'architecture' ? '#06b6d4' : suggestion.category === 'feature_map' ? '#0ea5e9' : suggestion.category === 'dependency' ? '#f59e0b' : suggestion.category === 'design_pattern' ? '#a855f7' : suggestion.category === 'data_flow' ? '#14b8a6' : suggestion.category === 'cross_cutting' ? '#ec4899' : suggestion.category === 'refactoring' ? '#06b6d4' : suggestion.category === 'enhancement' ? 'var(--accent)' : suggestion.category === 'documentation' ? '#8b5cf6' : suggestion.category === 'security' ? '#ef4444' : suggestion.category === 'bug' ? '#f97316' : suggestion.category === 'performance' ? '#8b5cf6' : '#10b981', color: 'var(--bg)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' }} />
                        {(suggestion.insight_type === 'understanding') && (
                          <Chip size="small" label="UNDERSTANDING" sx={{ bgcolor: '#06b6d4', color: 'white', fontWeight: 700, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                        )}
                        <Chip size="small" label={suggestion.priority} sx={{ bgcolor: suggestion.priority === 'high' ? '#ef4444' : suggestion.priority === 'medium' ? '#f59e0b' : '#10b981', color: 'var(--bg)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' }} />
                      </div>
                      <div className="flex gap-1">
                        {suggestion.status === 'pending' && (
                          <>
                            <Tooltip title="Apply suggestion"><IconButton size="small" onClick={() => handleApplySuggestion(suggestion.id)} sx={{ color: '#10b981' }}><Check fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Adapt before applying"><IconButton size="small" onClick={() => { const adapted = window.prompt('Edit the suggested code:', suggestion.suggested_code); if (adapted) handleAdaptSuggestion(suggestion.id, adapted); }} sx={{ color: 'var(--accent)' }}><Edit fontSize="small" /></IconButton></Tooltip>
                          </>
                        )}
                        {(suggestion.status === 'applied' || suggestion.status === 'adapted') && (
                          <Tooltip title="Revert this change"><IconButton size="small" onClick={() => handleCIORevert(suggestion.id)} sx={{ color: '#f59e0b' }}><Undo fontSize="small" /></IconButton></Tooltip>
                        )}
                        {suggestion.status === 'adapted' && suggestion.adapted_code && (
                          <Tooltip title="Apply adapted version"><IconButton size="small" onClick={() => handleApplyAdapted(suggestion.id, suggestion.adapted_code)} sx={{ color: '#10b981' }}><Check fontSize="small" /></IconButton></Tooltip>
                        )}
                        <Chip size="small" label={suggestion.status} sx={{ bgcolor: suggestion.status === 'applied' ? '#10b981' : suggestion.status === 'reverted' ? '#f59e0b' : suggestion.status === 'adapted' ? 'var(--accent)' : suggestion.status === 'dismissed' ? 'var(--text-tertiary)' : 'var(--surface)', color: !['pending', 'adapted'].includes(suggestion.status) ? 'var(--bg)' : 'var(--text-tertiary)', fontWeight: 700, fontSize: '0.6rem', height: 20 }} />
                        {suggestion.status === 'pending' && (
                          <IconButton size="small" onClick={() => handleDismissSuggestion(suggestion.id)} title="Dismiss"><Close fontSize="small" /></IconButton>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{suggestion.title}</div>
                    <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{suggestion.file_path}:{suggestion.line_start}</div>
                    <div className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>{suggestion.description}</div>
                    {suggestion.current_code && (
                      <div className="mt-2 p-2 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>Current:</div>
                        <pre className="text-xs overflow-auto m-0" style={{ color: 'var(--text)' }}>{suggestion.current_code}</pre>
                      </div>
                    )}
                    {suggestion.suggested_code && (suggestion.suggested_code.includes('\n') || suggestion.suggested_code.includes('"""') || suggestion.suggested_code.startsWith('#')) && (
                      <div className="mt-1 p-2 rounded-lg" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-glow)' }}>
                        <div className="text-xs font-bold mb-1" style={{ color: 'var(--accent)' }}>Suggested:</div>
                        <pre className="text-xs overflow-auto m-0" style={{ color: 'var(--accent)' }}>{suggestion.suggested_code}</pre>
                      </div>
                    )}
                    {suggestion.rationale && <div className="text-xs mt-2 italic" style={{ color: 'var(--text-tertiary)' }}>{suggestion.rationale}</div>}
                    {suggestion.impact && (
                      <div className="flex gap-2 mt-2 items-center">
                        <Chip size="small" label={`Impact: ${suggestion.impact.impact_score}/10`} sx={{ bgcolor: suggestion.impact.impact_score >= 7 ? '#ef4444' : suggestion.impact.impact_score >= 4 ? '#f59e0b' : '#10b981', color: 'white', fontWeight: 700, fontSize: '0.65rem' }} />
                        <Chip size="small" label={`Effort: ${suggestion.impact.effort_score}/10`} sx={{ bgcolor: suggestion.impact.effort_score <= 3 ? '#10b981' : suggestion.impact.effort_score <= 6 ? '#f59e0b' : '#ef4444', color: 'white', fontWeight: 700, fontSize: '0.65rem' }} />
                        {suggestion.impact.downstream_affected?.length > 0 && (
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Affects: {suggestion.impact.downstream_affected.join(', ')}</span>
                        )}
                      </div>
                    )}
                    {suggestion.hypothesis && <div className="text-xs mt-1" style={{ color: '#06b6d4' }}>{suggestion.hypothesis}</div>}
                  </div>
                ));
              })()
            )}

            {/* Pagination */}
            {(() => {
              const filtered = getFilteredSuggestions();
              const totalPages = Math.ceil(filtered.length / CIO_PAGE_SIZE);
              if (totalPages <= 1) return null;
              return (
                <div className="flex justify-center gap-2 mt-4">
                  <IconButton size="small" disabled={cioPage === 0} onClick={() => setCioPage(p => Math.max(0, p - 1))}><ArrowBack fontSize="small" /></IconButton>
                  <span className="text-sm flex items-center px-2">{cioPage + 1} / {totalPages}</span>
                  <IconButton size="small" disabled={cioPage >= totalPages - 1} onClick={() => setCioPage(p => Math.min(totalPages - 1, p + 1))}><ArrowForward fontSize="small" /></IconButton>
                </div>
              );
            })()}
          </>
        )}
      </div>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default CioAgentPage;