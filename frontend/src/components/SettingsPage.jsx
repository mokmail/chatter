import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, TextField, Switch, FormControlLabel, FormControl, Select,
  MenuItem, InputLabel, Typography, Paper, Divider, Card, CardContent,
  Chip, IconButton, List, ListItem, ListItemIcon, ListItemText,
  Tooltip, InputAdornment, Fade, Zoom, CircularProgress, Alert, Snackbar
} from '@mui/material';
import {
  Devices, Palette, Psychology, Storage, Add, Edit, Delete, ArrowBack, ArrowForward,
  Check, Close, Cloud, Terminal, Key, Settings, AutoAwesome, Search,
  Code, Extension, Visibility, VisibilityOff, Refresh, Star, StarBorder,
  SmartToy, Language, Hub, Tune, Science, Info, Public, CreateNewFolder,
  NoteAdd, AddCircle, RemoveCircle, Stop, Download, Undo, CheckBoxOutlineBlank, CheckBox, IndeterminateCheckBox, Assessment, History
} from '@mui/icons-material';

const PROVIDER_TYPES = [
  { id: 'ollama', name: 'Ollama', icon: '🦙', defaultUrl: 'http://localhost:11434', description: 'Local models via Ollama', color: '#f59e0b' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', defaultUrl: 'https://api.openai.com/v1', description: 'OpenAI API compatible', color: '#10b981' },
  { id: 'anthropic', name: 'Anthropic', icon: '🐜', defaultUrl: '', description: 'Claude via Anthropic API', color: '#ef4444' },
];

const SettingsPage = ({ config, onSave, models = [], onRefreshModels, cioProcessing, setCioProcessing }) => {
  const [activeTab, setActiveTab] = useState('connections');
  const [view, setView] = useState('list');
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'ollama', base_url: 'http://localhost:11434', api_key: '' });
  const [showApiKey, setShowApiKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

  // Refs for CIO Agent streaming control
  const cioEventSourceRef = useRef(null);
  const cioStopRequestedRef = useRef(false);

  // Use passed-in processing state from parent, fall back to local if not provided
  const isProcessing = cioProcessing !== undefined ? cioProcessing : localProcessing;
  const setProcessing = setCioProcessing !== undefined ? setCioProcessing : setLocalProcessing;

  const handleCIOToggle = async (e) => {
    const enabled = e.target.checked;
    setCioEnabled(enabled);
    setCioPage(0); // Reset page when toggling
    try {
      await fetch('/api/cio-agent/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, auto_scan: cioAutoScan })
      });
      // Also save to config for persistence
      onSave({ cio_agent_enabled: enabled });
      if (enabled && cioAutoScan) {
        handleCIOAnalyze();
      }
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
            // Skip meta/status suggestions in the UI list
            if (data.suggestion && data.suggestion.category === 'meta') {
              setCioProgress(data.suggestion.description || 'Processing...');
              return;
            }
            setCioSuggestions(prev => {
              const newCount = prev.length + 1;
              setCioProgress(`Found ${newCount} suggestions...`);
              // Once we get first suggestion, hide spinner and show list
              if (prev.length === 0) {
                setCioLoading(false);
              }
              return [...prev, data.suggestion];
            });
          } else if (data.type === 'complete') {
            setCioProgress(`Analysis complete! Found ${data.count} suggestions.`);
            setCioAnalyzing(false);
            setCioLoading(false);
            setTimeout(() => {
              setProcessing(false);
              setCioProgress('');
            }, 3000);
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
      
      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        eventSource.close();
        cioEventSourceRef.current = null;
        // Only fallback if stop was not intentionally requested
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' })
      });
      setCioSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to dismiss suggestion:', err);
    }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapted_code: adaptedCode })
      });
      if (response.ok) {
        const data = await response.json();
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      // Close the SSE connection first to prevent onerror fallback
      if (cioEventSourceRef.current) {
        cioEventSourceRef.current.close();
        cioEventSourceRef.current = null;
      }
      const response = await fetch('/api/cio-agent/stop', { method: 'POST' });
      const data = await response.json();
      setCioProgress('Stopping analysis...');
      // Immediately stop the UI state since analysis will end
      setCioAnalyzing(false);
      setCioLoading(false);
      setProcessing(false);
    } catch (err) {
      console.error('Failed to stop analysis:', err);
    }
  };

  const handleCIOPurge = async () => {
    try {
      const response = await fetch('/api/cio-agent/purge', { method: 'POST' });
      const data = await response.json();
      setCioSuggestions([]);
      setCioPage(0);
      setSnackbar({ open: true, message: data.message, severity: 'success' });
      // Reload to get accurate count
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      a.href = url;
      a.download = `cio_suggestions.${format}`;
      a.click();
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
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleCIOLoadHistory = async () => {
    try {
      const response = await fetch('/api/cio-agent/scan-history');
      const data = await response.json();
      setCioScanHistory(data.scans || []);
      setCioShowHistory(true);
    } catch (err) {
      console.error('Failed to load scan history:', err);
    }
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

  useEffect(() => {
    // Load CIO Agent status and suggestions on mount
    const loadCIOStatus = async () => {
      try {
        const response = await fetch('/api/cio-agent/status');
        const data = await response.json();
        setCioEnabled(data.enabled || false);
        setCioAutoScan(data.auto_scan !== false);
        setCioIncludeTests(data.include_tests || false);
        setCioLastScan(data.last_scan);
        const defaultDirs = ['node_modules', '__pycache__', '.git', 'venv', 'env', '.venv', '.env', 'dist', 'build', 'backup', '.vscode', '.pytest_cache', '.claude', '.mypy_cache', '.ruff_cache', '.tox', 'coverage', '.coverage', '.copilot', '.idea', '.next', 'out', '.nuxt', '.output'];
        const defaultFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'vite.config.js', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js', 'jest.config.js', 'eslint.config.js'];
        const loadedDirs = Array.isArray(data.exclude_dirs) && data.exclude_dirs.length > 0 ? data.exclude_dirs : defaultDirs;
        const loadedFiles = Array.isArray(data.exclude_files) && data.exclude_files.length > 0 ? data.exclude_files : defaultFiles;
        setCioExcludeDirs(loadedDirs.join(', '));
        setCioExcludeFiles(loadedFiles.join(', '));
        setCioTargetDir(data.target_dir || '');
        setCioAnalysisInProgress(data.analysis_in_progress || false);
        setProcessing(data.last_scan ? false : true); // Show indicator if never scanned
        
        // Load existing suggestions
        const suggResponse = await fetch('/api/cio-agent/suggestions');
        const suggData = await suggResponse.json();
        setCioSuggestions(suggData.suggestions || []);
      } catch (err) {
        console.error('Failed to load CIO Agent status:', err);
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

  const [localPrefs, setLocalPrefs] = useState({
    followup_auto_generate: true, followup_keep_in_chat: false, followup_insert_to_input: false,
    iframe_same_origin: false, artifacts_enabled: true, artifacts_auto_open: true,
    reasoning_enabled: true, reasoning_mode: 'default', reasoning_custom_start: '', reasoning_custom_end: '',
    ollama_think: false, reasoning_effort: '', rag_system_context: false, rag_chunk_size: 1000,
    rag_chunk_overlap: 100, rag_min_chunk_size: 0, rag_hybrid_search: true, rag_reranking: true, rag_top_k: 10,
    web_search_enabled: true, web_search_provider: 'duckduckgo', web_search_api_key: '',
    web_search_result_count: 10,
  });

  const tabs = [
    { id: 'connections', label: 'AI Providers', icon: Devices, description: 'Manage your AI connections' },
    { id: 'interface', label: 'Interface', icon: Palette, description: 'Customize your chat experience' },
    { id: 'reasoning', label: 'Reasoning', icon: Psychology, description: 'Configure thinking models' },
    { id: 'retrieval', label: 'Retrieval', icon: Storage, description: 'RAG and knowledge settings' },
    { id: 'websearch', label: 'Web Search', icon: Public, description: 'Agentic web search configuration' },
    { id: 'cioagent', label: 'CIO Agent', icon: SmartToy, description: 'AI-powered code analysis and suggestions' },
  ];

  useEffect(() => {
    if (config) {
      setLocalPrefs({
        followup_auto_generate: config.followup_auto_generate ?? true,
        followup_keep_in_chat: config.followup_keep_in_chat ?? false,
        followup_insert_to_input: config.followup_insert_to_input ?? false,
        iframe_same_origin: config.iframe_same_origin ?? false,
        artifacts_enabled: config.artifacts_enabled ?? true,
        artifacts_auto_open: config.artifacts_auto_open ?? true,
        reasoning_enabled: config.reasoning_enabled ?? true,
        reasoning_mode: config.reasoning_mode ?? 'default',
        reasoning_custom_start: config.reasoning_custom_start ?? '',
        reasoning_custom_end: config.reasoning_custom_end ?? '',
        ollama_think: config.ollama_think ?? false,
        reasoning_effort: config.reasoning_effort ?? '',
        rag_system_context: config.rag_system_context ?? false,
        rag_chunk_size: config.rag_chunk_size ?? 1000,
        rag_chunk_overlap: config.rag_chunk_overlap ?? 100,
        rag_min_chunk_size: config.rag_min_chunk_size ?? 0,
        rag_hybrid_search: config.rag_hybrid_search ?? true,
        rag_reranking: config.rag_reranking ?? true,
        rag_top_k: config.rag_top_k ?? 10,
        web_search_enabled: config.web_search_enabled ?? true,
        web_search_provider: config.web_search_provider ?? 'duckduckgo',
        web_search_api_key: config.web_search_api_key ?? '',
        web_search_result_count: config.web_search_result_count ?? 10,
      });
    }
  }, [config]);

  const handleAddClick = () => {
    setFormData({ name: '', type: 'ollama', base_url: 'http://localhost:11434', api_key: '' });
    setView('add');
  };

  const handleEditClick = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      type: provider.type,
      base_url: provider.base_url || '',
      api_key: provider.api_key || '',
    });
    setView('edit');
  };

  const handleTypeChange = (typeId) => {
    const type = PROVIDER_TYPES.find(t => t.id === typeId);
    setFormData(prev => ({ ...prev, type: typeId, base_url: type.defaultUrl, name: prev.name || type.name }));
  };

  const handleSubmitProvider = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { showMessage('Please enter a provider name', 'error'); return; }
    if (formData.type !== 'anthropic' && !formData.base_url.trim()) { showMessage('Please enter a base URL', 'error'); return; }
    
    let newProviders = [...(config.providers || [])];
    const isFirst = newProviders.length === 0;
    const providerId = view === 'edit' ? editingProvider.id : Math.random().toString(36).substring(2, 11);
    const providerData = { ...formData, id: providerId };
    
    if (view === 'edit') { 
      newProviders = newProviders.map(p => p.id === editingProvider.id ? providerData : p); 
    } else { 
      newProviders.push(providerData); 
    }
    
    const updates = { providers: newProviders };
    if (isFirst) updates.active_provider_id = providerId;
    
    onSave(updates);
    setView('list');
    showMessage(`Provider ${view === 'edit' ? 'updated' : 'added'} successfully`);
  };

  const handleDeleteProvider = (id) => {
    if (window.confirm('Delete this provider connection?')) {
      const newProviders = (config?.providers || []).filter(p => p.id !== id);
      const updates = { providers: newProviders };
      if (config?.active_provider_id === id) {
        updates.active_provider_id = newProviders.length > 0 ? newProviders[0].id : null;
      }
      onSave(updates);
      showMessage('Provider deleted');
    }
  };

  const handleSetActiveProvider = (id) => {
    onSave({ active_provider_id: id });
    showMessage('Active provider updated');
  };

  const handleRefreshModels = async () => {
    if (!onRefreshModels) return;
    setRefreshing(true);
    try {
      await onRefreshModels();
      showMessage('Models refreshed');
    } catch (err) {
      showMessage('Failed to refresh models', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const SettingSection = ({ title, description, icon: Icon, children, action }) => (
    <Paper sx={{ 
      p: 3, mb: 4, borderRadius: 'var(--radius)', 
      background: 'var(--surface)', 
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {Icon && (
            <Box sx={{ 
              p: 1, borderRadius: 'var(--radius-sm)', 
              background: 'var(--accent-subtle)',
              color: 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon fontSize="small" />
            </Box>
          )}
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</Typography>
            {description && <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>{description}</Typography>}
          </Box>
        </Box>
        {action}
      </Box>
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {children}
      </Box>
    </Paper>
  );

  const SettingRow = ({ label, description, children, divider = true }) => (
    <Box sx={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      py: 2, borderBottom: divider ? '1px solid var(--border)' : 'none',
      '&:last-child': { borderBottom: 0 }
    }}>
      <Box sx={{ flex: 1, mr: 4 }}>
        <Typography variant="body1" fontWeight="600" sx={{ color: 'var(--text)' }}>{label}</Typography>
        {description && <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', mt: 0.5, display: 'block' }}>{description}</Typography>}
      </Box>
      <Box sx={{ flexShrink: 0 }}>
        {children}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ 
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', 
      overflow: 'hidden', bgcolor: 'var(--bg)', color: 'var(--text)'
    }}>
      {/* Header */}
      <Box sx={{ 
        px: 6, py: 5, borderBottom: '1px solid var(--border)', 
        background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Box>
          <Typography variant="h4" fontWeight="900" sx={{ color: 'var(--text)', letterSpacing: '-0.04em', mb: 0.5 }}>Settings</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Configure and fine-tune your workspace</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeTab === 'connections' && (
            <Button 
              variant="outlined" 
              startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <Refresh />} 
              onClick={handleRefreshModels}
              disabled={refreshing}
              sx={{ 
                borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: 'var(--text)',
                '&:hover': { borderColor: 'var(--border-hover)', background: 'var(--surface-hover)' }
              }}
            >
              Refresh Models
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<Check />} 
            onClick={() => showMessage('Settings are auto-saved')}
            sx={{ 
              borderRadius: 'var(--radius-sm)', background: 'var(--text)', color: 'var(--bg)',
              fontWeight: 700, px: 3, '&:hover': { opacity: 0.9, background: 'var(--text)' }
            }}
          >
            Done
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar Nav */}
        <Box sx={{ 
          width: 300, borderRight: '1px solid var(--border)', 
          background: 'rgba(var(--bg-rgb), 0.5)', backdropFilter: 'blur(10px)',
          p: 2, display: 'flex', flexDirection: 'column', gap: 0.5
        }}>
          {tabs.map((tab) => (
            <Box 
              key={tab.id} 
              onClick={() => { setActiveTab(tab.id); setView('list'); }}
              sx={{ 
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', p: 2,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', alignItems: 'center', gap: 2,
                background: activeTab === tab.id ? 'var(--surface-active)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'var(--border-active)' : 'transparent',
                boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none',
                '&:hover': { 
                  background: activeTab === tab.id ? 'var(--surface-active)' : 'var(--surface-hover)',
                  color: 'var(--text)',
                  transform: 'translateX(4px)'
                }
              }}
            >
              <Box sx={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 'var(--radius-xs)',
                background: activeTab === tab.id ? 'var(--text)' : 'var(--surface)',
                color: activeTab === tab.id ? 'var(--bg)' : 'inherit',
                transition: 'all 0.3s'
              }}>
                <tab.icon fontSize="small" />
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '0.9rem',
                  letterSpacing: '-0.01em',
                  color: 'inherit'
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          ))}
          
          <Box sx={{ 
            mt: 'auto', p: 3, borderRadius: 'var(--radius)', 
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg-secondary) 100%)', 
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <div className="w-8 h-8 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center">
                <Hub sx={{ color: 'var(--accent-secondary)', fontSize: 16 }} />
              </div>
              <Typography variant="caption" fontWeight="800" sx={{ color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}>System Health</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--success)', boxShadow: '0 0 12px var(--success)' }} />
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Operational</Typography>
            </Box>
          </Box>
        </Box>

        {/* Content Area */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 6, background: 'var(--bg)' }}>
          {view === 'list' ? (
            <Fade in={true} timeout={400}>
              <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                {activeTab === 'connections' && (
                  <>
                    <SettingSection 
                      title="AI Providers" 
                      description="Connect to your preferred AI engines and cloud services"
                      icon={Devices}
                      action={
                        <Button 
                          variant="contained" 
                          startIcon={<Add />} 
                          onClick={handleAddClick}
                          sx={{ borderRadius: 'var(--radius-sm)', background: 'var(--text)', color: 'var(--bg)', fontWeight: 600 }}
                        >
                          Add New
                        </Button>
                      }
                    >
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 3 }}>
                        {(config?.providers || []).length === 0 ? (
                          <Paper sx={{ 
                            gridColumn: '1 / -1', p: 8, textAlign: 'center', borderRadius: 'var(--radius)', 
                            border: '2px dashed var(--border)', background: 'transparent'
                          }}>
                            <Cloud sx={{ fontSize: 64, color: 'var(--text-tertiary)', mb: 3 }} />
                            <Typography variant="h6" fontWeight="700" sx={{ color: 'var(--text)', mb: 1 }}>No Providers Found</Typography>
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 4, maxWidth: 300, mx: 'auto' }}>
                              Add your first AI provider to start chatting with advanced models.
                            </Typography>
                            <Button variant="contained" startIcon={<Add />} onClick={handleAddClick} sx={{ borderRadius: 'var(--radius-sm)', px: 4 }}>
                              Get Started
                            </Button>
                          </Paper>
                        ) : (
                          (config?.providers || []).map(p => {
                            const type = PROVIDER_TYPES.find(t => t.id === p.type);
                            const isActive = config?.active_provider_id === p.id;
                            return (
                              <Card 
                                key={p.id} 
                                sx={{ 
                                  borderRadius: 'var(--radius)', 
                                  background: isActive ? 'var(--bg-secondary)' : 'var(--surface)',
                                  border: '1px solid',
                                  borderColor: isActive ? 'var(--text)' : 'var(--border)',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  position: 'relative',
                                  '&:hover': { 
                                    borderColor: isActive ? 'var(--text)' : 'var(--border-hover)',
                                    boxShadow: 'var(--shadow-lg)',
                                    transform: 'translateY(-4px)'
                                  }
                                }}
                              >
                                <CardContent sx={{ p: 3 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Box sx={{ 
                                        width: 48, height: 48, borderRadius: '12px', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isActive ? 'var(--text)' : 'var(--accent-subtle)',
                                        color: isActive ? 'var(--bg)' : 'inherit',
                                        fontSize: '1.5rem',
                                        boxShadow: isActive ? 'var(--shadow-glow)' : 'none'
                                      }}>
                                        {type?.icon || '🔌'}
                                      </Box>
                                      <Box>
                                        <Typography variant="subtitle1" fontWeight="800" sx={{ color: 'var(--text)', lineHeight: 1.2 }}>{p.name}</Typography>
                                        <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{p.type}</Typography>
                                      </Box>
                                    </Box>
                                    {isActive ? (
                                      <Chip 
                                        label="Active" 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: 'var(--text)', color: 'var(--bg)', fontWeight: 800, px: 1,
                                          fontSize: '0.65rem', height: 20
                                        }} 
                                      />
                                    ) : (
                                      <Tooltip title="Set as Active">
                                        <IconButton size="small" onClick={() => handleSetActiveProvider(p.id)} sx={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--text)' } }}>
                                          <StarBorder fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>
                                  
                                  <Box sx={{ 
                                    mb: 3, p: 1.5, borderRadius: 'var(--radius-sm)', 
                                    background: 'var(--bg)', border: '1px solid var(--border)',
                                    fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                  }}>
                                    {p.base_url || 'Cloud API Endpoint'}
                                  </Box>

                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button 
                                      fullWidth size="small" variant="outlined" startIcon={<Edit />} 
                                      onClick={() => handleEditClick(p)}
                                      sx={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                                    >
                                      Edit
                                    </Button>
                                    <IconButton 
                                      size="small" color="error" onClick={() => handleDeleteProvider(p.id)}
                                      sx={{ 
                                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', 
                                        color: 'var(--danger-icon)', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } 
                                      }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </CardContent>
                              </Card>
                            );
                          })
                        )}
                      </Box>
                    </SettingSection>

                    <SettingSection title="Model Intelligence" description="Current active model and provider information" icon={AutoAwesome}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2, borderRadius: 'var(--radius)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <SmartToy sx={{ fontSize: 40, color: 'var(--text-secondary)' }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>Currently Active</Typography>
                          <Typography variant="h6" sx={{ color: 'var(--text)', fontWeight: 800 }}>{config.active_model || 'No model selected'}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', display: 'block' }}>Provider</Typography>
                          <Typography variant="body2" fontWeight="700">
                            {config?.providers?.find(p => p.id === config?.active_provider_id)?.name || 'Unknown'}
                          </Typography>
                        </Box>
                      </Box>
                    </SettingSection>
                  </>
                )}

                {activeTab === 'interface' && (
                  <SettingSection title="Interface Settings" description="Personalize your interaction experience" icon={Palette}>
                    <SettingRow label="Auto-generate follow-ups" description="Automatically suggest relevant follow-up questions after each response">
                      <Switch 
                        checked={localPrefs.followup_auto_generate} 
                        onChange={(e) => { 
                          setLocalPrefs(prev => ({ ...prev, followup_auto_generate: e.target.checked })); 
                          onSave({ followup_auto_generate: e.target.checked }); 
                        }} 
                      />
                    </SettingRow>
                    <SettingRow label="Persistent Suggestions" description="Keep follow-up questions visible even after you've replied">
                      <Switch 
                        checked={localPrefs.followup_keep_in_chat} 
                        onChange={(e) => { 
                          setLocalPrefs(prev => ({ ...prev, followup_keep_in_chat: e.target.checked })); 
                          onSave({ followup_keep_in_chat: e.target.checked }); 
                        }} 
                      />
                    </SettingRow>
                    <SettingRow label="One-click Prompting" description="Load suggested questions directly into the input field instead of sending immediately">
                      <Switch 
                        checked={localPrefs.followup_insert_to_input} 
                        onChange={(e) => { 
                          setLocalPrefs(prev => ({ ...prev, followup_insert_to_input: e.target.checked })); 
                          onSave({ followup_insert_to_input: e.target.checked }); 
                        }} 
                      />
                    </SettingRow>
                    <Divider sx={{ my: 1, opacity: 0.5 }} />
                    <SettingRow label="Visual Artifacts" description="Enable dedicated panel for code previews, SVG rendering, and Three.js scenes">
                      <Switch 
                        checked={localPrefs.artifacts_enabled} 
                        onChange={(e) => { 
                          setLocalPrefs(prev => ({ ...prev, artifacts_enabled: e.target.checked })); 
                          onSave({ artifacts_enabled: e.target.checked }); 
                        }} 
                      />
                    </SettingRow>
                    <SettingRow label="Smart Expansion" description="Automatically open the artifacts panel when new content is generated">
                      <Switch 
                        checked={localPrefs.artifacts_auto_open} 
                        onChange={(e) => { 
                          setLocalPrefs(prev => ({ ...prev, artifacts_auto_open: e.target.checked })); 
                          onSave({ artifacts_auto_open: e.target.checked }); 
                        }} 
                      />
                    </SettingRow>
                    <SettingRow label="Artifact Security" description="Apply same-origin restrictions to preview iframes (disable if components need external assets)" divider={false}>
                      <Switch 
                        checked={localPrefs.iframe_same_origin} 
                        onChange={(e) => { 
                          setLocalPrefs(prev => ({ ...prev, iframe_same_origin: e.target.checked })); 
                          onSave({ iframe_same_origin: e.target.checked }); 
                        }} 
                      />
                    </SettingRow>
                  </SettingSection>
                )}

                {activeTab === 'reasoning' && (
                  <>
                    <SettingSection title="Reasoning & Thinking" description="Configure how models process complex thoughts" icon={Psychology}>
                      <SettingRow label="Extract Reasoning" description="Surface the chain-of-thought process from model responses">
                        <Switch 
                          checked={localPrefs.reasoning_enabled} 
                          onChange={(e) => { 
                            setLocalPrefs(prev => ({ ...prev, reasoning_enabled: e.target.checked })); 
                            onSave({ reasoning_enabled: e.target.checked }); 
                          }} 
                        />
                      </SettingRow>
                      
                      {localPrefs.reasoning_enabled && (
                        <Fade in={true}>
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--border)' }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: 'var(--text-secondary)' }}>Reasoning Effort</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                              {[
                                { id: 'low', label: 'Lite', desc: 'Fast & Concise', color: 'var(--success)' },
                                { id: 'medium', label: 'Balanced', desc: 'Default Detail', color: 'var(--text)' },
                                { id: 'high', label: 'Deep', desc: 'Thorough Analysis', color: 'var(--danger-icon)' }
                              ].map(effort => (
                                <Box 
                                  key={effort.id}
                                  onClick={() => { setLocalPrefs(p => ({ ...p, reasoning_effort: effort.id })); onSave({ reasoning_effort: effort.id }); }}
                                  sx={{ 
                                    p: 2, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    border: '1px solid',
                                    borderColor: localPrefs.reasoning_effort === effort.id ? effort.color : 'var(--border)',
                                    background: localPrefs.reasoning_effort === effort.id ? 'var(--bg-secondary)' : 'transparent',
                                    transition: 'all 0.2s',
                                    '&:hover': { borderColor: effort.color, background: 'var(--surface-hover)' }
                                  }}
                                >
                                  <Typography variant="subtitle2" fontWeight="800" sx={{ color: localPrefs.reasoning_effort === effort.id ? effort.color : 'var(--text)' }}>{effort.label}</Typography>
                                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>{effort.desc}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        </Fade>
                      )}
                    </SettingSection>

                    <SettingSection title="Ollama Integration" description="Specific settings for local Ollama instances" icon={Terminal}>
                      <SettingRow label="Local Think Tags" description="Explicitly support <think> tags used by models like DeepSeek" divider={false}>
                        <Switch 
                          checked={localPrefs.ollama_think} 
                          onChange={(e) => { 
                            setLocalPrefs(prev => ({ ...prev, ollama_think: e.target.checked })); 
                            onSave({ ollama_think: e.target.checked }); 
                          }} 
                        />
                      </SettingRow>
                    </SettingSection>

                    <SettingSection title="Custom XML Extraction" description="Define custom tags for non-standard reasoning output" icon={Code}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                        <TextField 
                          fullWidth size="small" label="Opening Tag" placeholder="e.g. <thought>"
                          value={localPrefs.reasoning_custom_start}
                          onChange={(e) => { setLocalPrefs(p => ({ ...p, reasoning_custom_start: e.target.value })); onSave({ reasoning_custom_start: e.target.value }); }}
                          slotProps={{ 
                            input: { 
                              sx: { borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', bgcolor: 'var(--bg)', border: '1px solid var(--border)' },
                              startAdornment: <InputAdornment position="start"><Code fontSize="small" /></InputAdornment>
                            } 
                          }}
                        />
                        <TextField 
                          fullWidth size="small" label="Closing Tag" placeholder="e.g. </thought>"
                          value={localPrefs.reasoning_custom_end}
                          onChange={(e) => { setLocalPrefs(p => ({ ...p, reasoning_custom_end: e.target.value })); onSave({ reasoning_custom_end: e.target.value }); }}
                          slotProps={{ 
                            input: { 
                              sx: { borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', bgcolor: 'var(--bg)', border: '1px solid var(--border)' },
                              startAdornment: <InputAdornment position="start"><Code fontSize="small" /></InputAdornment>
                            } 
                          }}
                        />
                      </Box>
                    </SettingSection>
                  </>
                )}

                {activeTab === 'retrieval' && (
                  <>
                    <SettingSection title="Knowledge Retrieval (RAG)" description="Fine-tune how your AI accesses external information" icon={Storage}>
                      <SettingRow label="System-level Context" description="Inject retrieved documents into the system prompt for better model adherence">
                        <Switch 
                          checked={localPrefs.rag_system_context} 
                          onChange={(e) => { 
                            setLocalPrefs(prev => ({ ...prev, rag_system_context: e.target.checked })); 
                            onSave({ rag_system_context: e.target.checked }); 
                          }} 
                        />
                      </SettingRow>
                      <SettingRow label="Hybrid Search" description="Combine semantic vector search with traditional keyword matching">
                        <Switch 
                          checked={localPrefs.rag_hybrid_search} 
                          onChange={(e) => { 
                            setLocalPrefs(prev => ({ ...prev, rag_hybrid_search: e.target.checked })); 
                            onSave({ rag_hybrid_search: e.target.checked }); 
                          }} 
                        />
                      </SettingRow>
                      <SettingRow label="AI Reranking" description="Use a specialized model to re-evaluate search results for maximum relevance" divider={false}>
                        <Switch 
                          checked={localPrefs.rag_reranking} 
                          onChange={(e) => { 
                            setLocalPrefs(prev => ({ ...prev, rag_reranking: e.target.checked })); 
                            onSave({ rag_reranking: e.target.checked }); 
                          }} 
                        />
                      </SettingRow>
                    </SettingSection>

                    <SettingSection title="Chunking Strategy" description="Control how documents are split and processed" icon={Tune}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                        {[
                          { label: 'Top K', field: 'rag_top_k', options: [3, 5, 10, 15, 20] },
                          { label: 'Chunk Size', field: 'rag_chunk_size', options: [256, 512, 1000, 1500, 2048] },
                          { label: 'Overlap', field: 'rag_chunk_overlap', options: [0, 50, 100, 200, 400] },
                          { label: 'Min Size', field: 'rag_min_chunk_size', options: [0, 50, 100, 200] },
                        ].map(param => (
                          <FormControl key={param.field} fullWidth size="small">
                            <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', mb: 1, fontWeight: 700 }}>{param.label}</Typography>
                            <Select 
                              value={localPrefs[param.field]} 
                              onChange={(e) => { 
                                const v = parseInt(e.target.value); 
                                setLocalPrefs(p => ({ ...p, [param.field]: v })); 
                                onSave({ [param.field]: v }); 
                              }}
                              sx={{ borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', border: '1px solid var(--border)' }}
                            >
                              {param.options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ))}
                      </Box>
                    </SettingSection>
                  </>
                )}

                {activeTab === 'websearch' && (
                  <>
                    <SettingSection title="Agentic Web Search" description="Configure web search for agentic research with interleaved thinking" icon={Public}>
                      <SettingRow label="Enable Web Search" description="Allow agents to search the web for real-time information">
                        <Switch
                          checked={localPrefs.web_search_enabled}
                          onChange={(e) => {
                            setLocalPrefs(prev => ({ ...prev, web_search_enabled: e.target.checked }));
                            onSave({ web_search_enabled: e.target.checked });
                          }}
                        />
                      </SettingRow>
                    </SettingSection>

                    <SettingSection title="Search Provider" description="Choose your search backend" icon={Search}>
                      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                        <InputLabel>Provider</InputLabel>
                        <Select
                          value={localPrefs.web_search_provider}
                          onChange={(e) => {
                            setLocalPrefs(prev => ({ ...prev, web_search_provider: e.target.value }));
                            onSave({ web_search_provider: e.target.value });
                          }}
                          label="Provider"
                          sx={{ borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', border: '1px solid var(--border)' }}
                        >
                          <MenuItem value="duckduckgo">DuckDuckGo (Default - No API Key)</MenuItem>
                          <MenuItem value="serpapi">SerpAPI (Google Results)</MenuItem>
                          <MenuItem value="searxng">SearXNG (Self-hosted)</MenuItem>
                        </Select>
                      </FormControl>

                      {localPrefs.web_search_provider === 'serpapi' && (
                        <TextField
                          fullWidth
                          size="small"
                          label="SerpAPI API Key"
                          type={showApiKey ? 'text' : 'password'}
                          value={localPrefs.web_search_api_key}
                          onChange={(e) => {
                            setLocalPrefs(prev => ({ ...prev, web_search_api_key: e.target.value }));
                          }}
                          onBlur={(e) => {
                            onSave({ web_search_api_key: e.target.value });
                          }}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={{ mb: 2 }}
                        />
                      )}

                      {localPrefs.web_search_provider === 'searxng' && (
                        <TextField
                          fullWidth
                          size="small"
                          label="SearXNG Base URL"
                          placeholder="https://your-searxng-instance.com"
                          value={localPrefs.web_search_searxng_base_url || ''}
                          onChange={(e) => {
                            setLocalPrefs(prev => ({ ...prev, web_search_searxng_base_url: e.target.value }));
                          }}
                          onBlur={(e) => {
                            onSave({ web_search_searxng_base_url: e.target.value });
                          }}
                          sx={{ mb: 2 }}
                        />
                      )}

                      <SettingRow label="Result Count" description="Maximum number of search results per query" divider={false}>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={localPrefs.web_search_result_count}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              setLocalPrefs(prev => ({ ...prev, web_search_result_count: v }));
                              onSave({ web_search_result_count: v });
                            }}
                            sx={{ borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', border: '1px solid var(--border)' }}
                          >
                            {[5, 10, 15, 20].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </SettingRow>
                    </SettingSection>
                  </>
                )}

                {activeTab === 'cioagent' && (
                  <>
                    <SettingSection 
                      title="CIO Agent" 
                      description={cioProcessing ? `\u26a1 ${cioProgress}` : cioLastScan ? `Last scan: ${new Date(cioLastScan).toLocaleString()}` : "AI-powered code analysis and improvement suggestions"}
                      icon={SmartToy}
                      action={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {cioProcessing && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 8, height: 8, borderRadius: '50%', 
                                bgcolor: 'var(--accent-primary)',
                                animation: 'pulse 1.5s ease-in-out infinite'
                              }} />
                              <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                Processing
                              </Typography>
                            </Box>
                          )}
                          <Button 
                            variant="contained" 
                            startIcon={cioProcessing ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />} 
                            onClick={handleCIOAnalyze}
                            disabled={cioProcessing || !cioEnabled}
                            sx={{ borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)', color: 'var(--bg)', fontWeight: 600 }}
                          >
                            {cioProcessing ? 'Analyzing...' : 'Run Analysis'}
                          </Button>
                          {cioProcessing && (
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<Stop fontSize="small" />}
                              onClick={handleCIOStop}
                              sx={{ borderRadius: 'var(--radius-sm)' }}
                            >
                              Stop
                            </Button>
                          )}
                          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                            <Tooltip title="Statistics dashboard">
                              <IconButton size="small" onClick={handleCIOLoadStats} sx={{ color: 'var(--text-secondary)' }}>
                                <Assessment fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Scan history">
                              <IconButton size="small" onClick={handleCIOLoadHistory} sx={{ color: 'var(--text-secondary)' }}>
                                <History fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export suggestions">
                              <IconButton size="small" onClick={() => handleCIOExport('json')} sx={{ color: 'var(--text-secondary)' }}>
                                <Download fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Purge pending suggestions">
                              <IconButton size="small" onClick={handleCIOPurge} sx={{ color: 'var(--text-secondary)' }}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete all suggestions">
                              <IconButton size="small" onClick={handleCIODeleteAll} sx={{ color: 'var(--error)' }}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      }
                    >
                      <SettingRow label="Enable CIO Agent" description="Activate AI-powered code analysis and suggestions">
                        <Switch
                          checked={cioEnabled}
                          onChange={handleCIOToggle}
                        />
                      </SettingRow>
                      <SettingRow label="Auto-scan on Enable" description="Automatically analyze code when agent is enabled">
                        <Switch
                          checked={cioAutoScan}
                          onChange={(e) => {
                            setCioAutoScan(e.target.checked);
                            onSave({ cio_agent_auto_scan: e.target.checked });
                          }}
                        />
                      </SettingRow>
                       <SettingRow label="Include Test Files" description="Include test files in code analysis">
                         <Switch
                           checked={cioIncludeTests}
                           onChange={(e) => {
                             setCioIncludeTests(e.target.checked);
                             onSave({ cio_agent_include_tests: e.target.checked });
                           }}
                         />
                       </SettingRow>
                       <SettingRow label="Architecture Understanding" description="Include architectural insights: feature maps, dependency analysis, design patterns, and data flows">
                         <Switch
                           checked={cioIncludeUnderstanding}
                           onChange={(e) => {
                             setCioIncludeUnderstanding(e.target.checked);
                             fetch('/api/cio-agent/toggle', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ enabled: cioEnabled, include_understanding: e.target.checked })
                             }).catch(() => {});
                             onSave({ cio_agent_include_understanding: e.target.checked });
                           }}
                         />
                       </SettingRow>
                       {cioProgress && (
                        <Box sx={{ mt: 2, p: 2, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--accent-subtle)', border: '1px solid var(--border-glow)' }}>
                          <Typography variant="body2" sx={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
                            {cioProgress}
                          </Typography>
                        </Box>
                      )}
                    </SettingSection>

                    {(cioEnabled || cioSuggestions.length > 0) && (
                      <SettingSection title="CIO Intelligence Dashboard" description={`${cioSuggestions.length} total \u00b7 ${cioSuggestions.filter(s => s.insight_type === 'understanding').length} architectural insights \u00b7 ${cioSuggestions.filter(s => !s.insight_type || s.insight_type === 'improvement').length} improvements`} icon={Code}>
                        {/* Architecture Overview */}
                        {(() => {
                          const understandingInsights = cioSuggestions.filter(s => s.insight_type === 'understanding');
                          const improvementInsights = cioSuggestions.filter(s => !s.insight_type || s.insight_type === 'improvement');
                          const archInsights = understandingInsights.filter(s => ['architecture', 'feature_map', 'dependency', 'design_pattern', 'data_flow', 'cross_cutting'].includes(s.category));
                          const featuresCount = understandingInsights.filter(s => s.category === 'feature_map').length;
                          const depsCount = understandingInsights.filter(s => s.category === 'dependency').length;
                          const patternsCount = understandingInsights.filter(s => s.category === 'design_pattern').length;
                          const dataFlowsCount = understandingInsights.filter(s => s.category === 'data_flow').length;
                          const crossCuttingCount = understandingInsights.filter(s => s.category === 'cross_cutting').length;
                          const archCount = understandingInsights.filter(s => s.category === 'architecture').length;
                          return archInsights.length > 0 && (
                            <Box sx={{ mb: 3, p: 2.5, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                              <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 1.5, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: '1.1rem' }}>&#x1F3D7;&#xFE0F;</span> Architecture Overview
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1.5 }}>
                                {[
                                  { label: 'Features', value: featuresCount, icon: '&#x1F4CB;', color: '#0ea5e9' },
                                  { label: 'Dependencies', value: depsCount, icon: '&#x1F517;', color: '#f59e0b' },
                                  { label: 'Patterns', value: patternsCount, icon: '&#x1F3AF;', color: '#a855f7' },
                                  { label: 'Data Flows', value: dataFlowsCount, icon: '&#x1F504;', color: '#14b8a6' },
                                  { label: 'Cross-Cutting', value: crossCuttingCount, icon: '&#x2702;&#xFE0F;', color: '#ec4899' },
                                  { label: 'Architecture', value: archCount, icon: '&#x1F3D7;&#xFE0F;', color: '#06b6d4' },
                                ].map(item => item.value > 0 && (
                                  <Box key={item.label} sx={{ textAlign: 'center', p: 1, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--surface)' }}>
                                    <Typography variant="body1" fontWeight="900" sx={{ color: item.color }}>{item.value}</Typography>
                                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{item.label}</Typography>
                                  </Box>
                                )).filter(Boolean)}
                              </Box>
                              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'var(--text-tertiary)' }}>
                                {understandingInsights.length} architectural insights &middot; {improvementInsights.length} improvement suggestions
                              </Typography>
                            </Box>
                          );
                        })()}
                        {/* Stats Dashboard */}
                        {cioShowStats && cioStats && (
                          <Box sx={{ mb: 3, p: 2, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 2, color: 'var(--text)' }}>Dashboard</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
                              {[
                                { label: 'Total', value: cioStats.total, color: 'var(--text)' },
                                { label: 'Pending', value: cioStats.by_status?.pending || 0, color: '#f59e0b' },
                                { label: 'Applied', value: cioStats.by_status?.applied || 0, color: 'var(--success)' },
                                { label: 'Dismissed', value: cioStats.by_status?.dismissed || 0, color: 'var(--text-tertiary)' },
                              ].map(stat => (
                                <Box key={stat.label} sx={{ textAlign: 'center', p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--surface)' }}>
                                  <Typography variant="h5" fontWeight="900" sx={{ color: stat.color }}>{stat.value}</Typography>
                                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{stat.label}</Typography>
                                </Box>
                              ))}
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                              <Box>
                                <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 700, mb: 1, display: 'block' }}>By Category</Typography>
                                {Object.entries(cioStats.by_category || {}).map(([cat, count]) => (
                                  <Box key={cat} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>{cat}</Typography>
                                    <Typography variant="caption" fontWeight="700" sx={{ color: 'var(--text)' }}>{count}</Typography>
                                  </Box>
                                ))}
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 700, mb: 1, display: 'block' }}>By Priority</Typography>
                                {Object.entries(cioStats.by_priority || {}).map(([pri, count]) => (
                                  <Box key={pri} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: pri === 'high' ? '#ef4444' : pri === 'medium' ? '#f59e0b' : 'var(--text-secondary)' }}>{pri}</Typography>
                                    <Typography variant="caption" fontWeight="700" sx={{ color: 'var(--text)' }}>{count}</Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                            {cioStats.avg_impact_score > 0 && (
                              <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
                                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                                  Avg Impact: <strong>{cioStats.avg_impact_score}/10</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                                  Avg Effort: <strong>{cioStats.avg_effort_score}/10</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                                  Scans: <strong>{cioStats.scan_count}</strong>
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}

                        {/* Scan History */}
                        {cioShowHistory && (
                          <Box sx={{ mb: 3, p: 2, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 1, color: 'var(--text)' }}>Scan History</Typography>
                            {cioScanHistory.length === 0 ? (
                              <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>No scan history yet</Typography>
                            ) : (
                              cioScanHistory.slice().reverse().slice(0, 10).map(scan => (
                                <Box key={scan.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid var(--border)' }}>
                                  <Box>
                                    <Typography variant="caption" fontWeight="600" sx={{ color: scan.status === 'completed' ? 'var(--success)' : scan.status === 'error' ? '#ef4444' : 'var(--text-secondary)' }}>
                                      {scan.status.toUpperCase()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', ml: 1 }}>{scan.suggestion_count} suggestions</Typography>
                                  </Box>
                                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                                    {new Date(scan.timestamp).toLocaleString()}
                                  </Typography>
                                </Box>
                              ))
                            )}
                          </Box>
                        )}

                        {cioLoading ? (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress size={32} sx={{ color: 'var(--accent-primary)' }} />
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 2 }}>
                              Analyzing codebase...
                            </Typography>
                          </Box>
                        ) : cioSuggestions.length === 0 ? (
                          <Typography variant="body2" sx={{ color: 'var(--text-tertiary)', textAlign: 'center', py: 4 }}>
                            No suggestions yet. Click "Run Analysis" to start.
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Search, Filter & Sort Bar */}
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                              <TextField
                                size="small"
                                placeholder="Search suggestions..."
                                value={cioSearch}
                                onChange={(e) => { setCioSearch(e.target.value); setCioPage(0); }}
                                sx={{ minWidth: 180, '& .MuiInputBase-root': { borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', fontSize: '0.85rem' } }}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
                              />
                              <FormControl size="small" sx={{ minWidth: 100 }}>
                                <Select
                                  value={cioSortBy}
                                  onChange={(e) => setCioSortBy(e.target.value)}
                                  sx={{ borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', fontSize: '0.85rem' }}
                                >
                                  <MenuItem value="timestamp">Newest</MenuItem>
                                  <MenuItem value="priority">Priority</MenuItem>
                                  <MenuItem value="category">Category</MenuItem>
                                  <MenuItem value="file_path">File</MenuItem>
                                </Select>
                              </FormControl>
                            </Box>

                            {/* Insight Type Toggle */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {[
                                { value: 'all', label: 'All Types' },
                                { value: 'improvement', label: 'Improvements' },
                                { value: 'understanding', label: 'Understanding' },
                              ].map(opt => (
                                <Chip 
                                  key={opt.value}
                                  label={opt.label}
                                  size="small"
                                  onClick={() => { setCioInsightType(opt.value); setCioPage(0); }}
                                  sx={{ 
                                    cursor: 'pointer',
                                    bgcolor: cioInsightType === opt.value ? (opt.value === 'understanding' ? '#06b6d4' : opt.value === 'improvement' ? 'var(--accent-primary)' : 'var(--accent-primary)') : 'var(--surface)',
                                    color: cioInsightType === opt.value ? 'white' : 'var(--text-secondary)',
                                    '&:hover': { bgcolor: cioInsightType === opt.value ? (opt.value === 'understanding' ? '#0891b2' : 'var(--accent-primary)') : 'var(--surface-hover)' }
                                  }}
                                />
                              ))}
                            </Box>

                            {/* Category & Priority Filters */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {['all', 'functionality', 'documentation', 'refactoring', 'enhancement', 'security', 'performance', 'bug', 'architecture', 'feature_map', 'dependency', 'design_pattern', 'data_flow', 'cross_cutting'].map(cat => (
                                <Chip 
                                  key={cat}
                                  label={cat === 'all' ? 'All' : cat === 'feature_map' ? 'Feature Map' : cat === 'data_flow' ? 'Data Flow' : cat === 'cross_cutting' ? 'Cross-Cutting' : cat === 'design_pattern' ? 'Design Pattern' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  size="small"
                                  onClick={() => { setCioFilter(cat); setCioPage(0); }}
                                  sx={{ 
                                    cursor: 'pointer',
                                    bgcolor: cioFilter === cat ? 'var(--accent-primary)' : 'var(--surface)',
                                    color: cioFilter === cat ? 'var(--bg)' : 'var(--text-secondary)',
                                    '&:hover': { bgcolor: cioFilter === cat ? 'var(--accent-primary)' : 'var(--surface-hover)' }
                                  }}
                                />
                              ))}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {['all', 'high', 'medium', 'low'].map(pri => (
                                <Chip 
                                  key={pri}
                                  label={pri === 'all' ? 'All priorities' : pri.charAt(0).toUpperCase() + pri.slice(1)}
                                  size="small"
                                  onClick={() => { setCioPriorityFilter(pri); setCioPage(0); }}
                                  sx={{ 
                                    cursor: 'pointer',
                                    bgcolor: cioPriorityFilter === pri ? (pri === 'high' ? '#ef4444' : pri === 'medium' ? '#f59e0b' : '#10b981') : 'var(--surface)',
                                    color: cioPriorityFilter === pri ? 'white' : 'var(--text-secondary)',
                                    '&:hover': { bgcolor: cioPriorityFilter === pri ? (pri === 'high' ? '#ef4444' : pri === 'medium' ? '#f59e0b' : '#10b981') : 'var(--surface-hover)' }
                                  }}
                                />
                              ))}
                            </Box>

                            {/* Batch Actions */}
                            {cioSelectedIds.size > 0 && (
                              <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--accent-subtle)', border: '1px solid var(--border)', alignItems: 'center' }}>
                                <Typography variant="caption" fontWeight="700" sx={{ color: 'var(--text)' }}>
                                  {cioSelectedIds.size} selected
                                </Typography>
                                <Button size="small" variant="outlined" startIcon={<Check fontSize="small" />} onClick={handleCIOBatchApply} sx={{ borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--success)', borderColor: 'var(--success)' }}>
                                  Apply All
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<Close fontSize="small" />} onClick={handleCIOBatchDismiss} sx={{ borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                                  Dismiss All
                                </Button>
                                <Button size="small" variant="text" onClick={() => setCioSelectedIds(new Set())} sx={{ fontSize: '0.75rem' }}>
                                  Clear
                                </Button>
                              </Box>
                            )}

                            {/* Select All + Count */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton size="small" onClick={() => handleCIOSelectAll(
                                  cioSuggestions.filter(s => cioFilter === 'all' || s.category === cioFilter).filter(s => cioPriorityFilter === 'all' || s.priority === cioPriorityFilter).filter(s => cioInsightType === 'all' || (s.insight_type || 'improvement') === cioInsightType).filter(s => !cioSearch || s.title?.toLowerCase().includes(cioSearch.toLowerCase()) || s.file_path?.toLowerCase().includes(cioSearch.toLowerCase()))
                                )}>
                                  {(() => {
                                    const filtered = cioSuggestions.filter(s => cioFilter === 'all' || s.category === cioFilter).filter(s => cioPriorityFilter === 'all' || s.priority === cioPriorityFilter).filter(s => cioInsightType === 'all' || (s.insight_type || 'improvement') === cioInsightType);
                                    const pendingIds = filtered.filter(s => s.status === 'pending').map(s => s.id);
                                    if (cioSelectedIds.size >= pendingIds.length && pendingIds.length > 0 && pendingIds.every(id => cioSelectedIds.has(id))) return <CheckBox fontSize="small" sx={{ color: 'var(--accent-primary)' }} />;
                                    if (cioSelectedIds.size > 0) return <IndeterminateCheckBox fontSize="small" sx={{ color: 'var(--accent-primary)' }} />;
                                    return <CheckBoxOutlineBlank fontSize="small" />;
                                  })()}
                                </IconButton>
                                <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                                  {(() => {
                                    const filtered = cioSuggestions.filter(s => cioFilter === 'all' || s.category === cioFilter)
                                      .filter(s => cioPriorityFilter === 'all' || s.priority === cioPriorityFilter)
                                      .filter(s => cioInsightType === 'all' || (s.insight_type || 'improvement') === cioInsightType)
                                      .filter(s => !cioSearch || s.title?.toLowerCase().includes(cioSearch.toLowerCase()) || s.file_path?.toLowerCase().includes(cioSearch.toLowerCase()));
                                    return `${filtered.length} total`;
                                  })()} \u00b7 {cioSuggestions.filter(s => s.status === 'pending').length} pending
                                </Typography>
                              </Box>
                            </Box>

                            {/* Suggestions List - paginated */}
                            {(() => {
                              const filtered = cioSuggestions
                                .filter(s => cioFilter === 'all' || s.category === cioFilter)
                                .filter(s => cioPriorityFilter === 'all' || s.priority === cioPriorityFilter)
                                .filter(s => cioInsightType === 'all' || (s.insight_type || 'improvement') === cioInsightType)
                                .filter(s => !cioSearch || s.title?.toLowerCase().includes(cioSearch.toLowerCase()) || s.file_path?.toLowerCase().includes(cioSearch.toLowerCase()) || s.description?.toLowerCase().includes(cioSearch.toLowerCase()));

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
                                <Card 
                                  key={suggestion.id || idx}
                                  sx={{ 
                                    borderRadius: 'var(--radius)', 
                                    bgcolor: suggestion.status === 'applied' ? 'rgba(16, 185, 129, 0.05)' : suggestion.status === 'dismissed' ? 'rgba(156, 163, 175, 0.05)' : 'var(--bg-secondary)',
                                    border: '1px solid',
                                    borderColor: suggestion.status === 'applied' ? 'rgba(16, 185, 129, 0.3)' : suggestion.status === 'dismissed' ? 'rgba(156, 163, 175, 0.2)' : 'var(--border)',
                                    opacity: suggestion.status === 'dismissed' ? 0.6 : 1,
                                    '&:hover': { borderColor: 'var(--border-hover)' }
                                  }}
                                >
                                  <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        {suggestion.status === 'pending' && (
                                          <IconButton size="small" onClick={() => handleCIOToggleSelect(suggestion.id)} sx={{ p: 0.25 }}>
                                            {cioSelectedIds.has(suggestion.id) ? <CheckBox fontSize="small" sx={{ color: 'var(--accent-primary)' }} /> : <CheckBoxOutlineBlank fontSize="small" />}
                                          </IconButton>
                                        )}
                                        <Chip 
                                          size="small" 
                                          label={suggestion.category === 'feature_map' ? 'Feature Map' : suggestion.category === 'data_flow' ? 'Data Flow' : suggestion.category === 'cross_cutting' ? 'Cross-Cutting' : suggestion.category === 'design_pattern' ? 'Design Pattern' : suggestion.category}
                                          sx={{ 
                                            bgcolor: suggestion.category === 'architecture' ? '#06b6d4' :
                                                     suggestion.category === 'feature_map' ? '#0ea5e9' :
                                                     suggestion.category === 'dependency' ? '#f59e0b' :
                                                     suggestion.category === 'design_pattern' ? '#a855f7' :
                                                     suggestion.category === 'data_flow' ? '#14b8a6' :
                                                     suggestion.category === 'cross_cutting' ? '#ec4899' :
                                                     suggestion.category === 'refactoring' ? 'var(--accent-cyan)' : 
                                                     suggestion.category === 'enhancement' ? 'var(--accent-primary)' :
                                                     suggestion.category === 'documentation' ? 'var(--accent-secondary)' :
                                                     suggestion.category === 'security' ? '#ef4444' :
                                                     suggestion.category === 'bug' ? '#f97316' :
                                                     suggestion.category === 'performance' ? '#8b5cf6' :
                                                     'var(--success)',
                                            color: 'var(--bg)',
                                            fontWeight: 700,
                                            fontSize: '0.65rem',
                                            textTransform: 'uppercase'
                                          }}
                                        />
                                        {(suggestion.insight_type === 'understanding' || suggestion.insight_type === 'understanding') && (
                                          <Chip
                                            size="small"
                                            label="UNDERSTANDING"
                                            sx={{
                                              bgcolor: '#06b6d4',
                                              color: 'white',
                                              fontWeight: 700,
                                              fontSize: '0.55rem',
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.05em'
                                            }}
                                          />
                                        )}
                                        <Chip
                                          size="small"
                                          label={suggestion.priority}
                                          sx={{
                                            bgcolor: suggestion.priority === 'high' ? '#ef4444' : 
                                                     suggestion.priority === 'medium' ? '#f59e0b' : '#10b981',
                                            color: 'var(--bg)',
                                            fontWeight: 700,
                                            fontSize: '0.65rem',
                                            textTransform: 'uppercase'
                                          }}
                                        />
                                      </Box>
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        {suggestion.status === 'pending' && (
                                          <>
                                            <Tooltip title="Apply suggestion">
                                              <IconButton size="small" onClick={() => handleApplySuggestion(suggestion.id)} sx={{ color: 'var(--success)' }}>
                                                <Check fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Adapt before applying">
                                              <IconButton size="small" onClick={() => {
                                                const adapted = window.prompt('Edit the suggested code:', suggestion.suggested_code);
                                                if (adapted) handleAdaptSuggestion(suggestion.id, adapted);
                                              }} sx={{ color: 'var(--accent-primary)' }}>
                                                <Edit fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </>
                                        )}
                                        {(suggestion.status === 'applied' || suggestion.status === 'adapted') && (
                                          <Tooltip title="Revert this change">
                                            <IconButton size="small" onClick={() => handleCIORevert(suggestion.id)} sx={{ color: 'var(--warning, #f59e0b)' }}>
                                              <Undo fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                        {suggestion.status === 'adapted' && suggestion.adapted_code && (
                                          <Tooltip title="Apply adapted version">
                                            <IconButton size="small" onClick={() => handleApplyAdapted(suggestion.id, suggestion.adapted_code)} sx={{ color: 'var(--success)' }}>
                                              <Check fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                        <Chip
                                          size="small"
                                          label={suggestion.status}
                                          sx={{
                                            bgcolor: suggestion.status === 'applied' ? 'var(--success)' :
                                                     suggestion.status === 'reverted' ? '#f59e0b' :
                                                     suggestion.status === 'adapted' ? 'var(--accent-primary)' :
                                                     suggestion.status === 'dismissed' ? 'var(--text-tertiary)' : 'var(--surface)',
                                            color: !['pending', 'adapted'].includes(suggestion.status) ? 'var(--bg)' : 'var(--text-tertiary)',
                                            fontWeight: 700,
                                            fontSize: '0.6rem',
                                            height: 20
                                          }}
                                        />
                                        {suggestion.status === 'pending' && (
                                          <IconButton size="small" onClick={() => handleDismissSuggestion(suggestion.id)} title="Dismiss">
                                            <Close fontSize="small" />
                                          </IconButton>
                                        )}
                                      </Box>
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight="700" sx={{ color: 'var(--text)', mb: 0.5 }}>
                                      {suggestion.title}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                      {suggestion.file_path}:{suggestion.line_start}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 1, fontSize: '0.85rem' }}>
                                      {suggestion.description}
                                    </Typography>
                                    {suggestion.current_code && (
                                      <Box sx={{ mt: 2, p: 2, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', border: '1px solid var(--border)' }}>
                                        <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 700, mb: 1, display: 'block' }}>
                                          Current:
                                        </Typography>
                                        <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto', color: 'var(--text)' }}>
                                          {suggestion.current_code}
                                        </pre>
                                      </Box>
                                    )}
                                    {suggestion.suggested_code && suggestion.suggested_code.includes('\n') || suggestion.suggested_code.includes('"""') || suggestion.suggested_code.startsWith('#') ? (
                                      <Box sx={{ mt: 1, p: 2, borderRadius: 'var(--radius-sm)', bgcolor: 'var(--accent-subtle)', border: '1px solid var(--border-glow)' }}>
                                        <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontWeight: 700, mb: 1, display: 'block' }}>
                                          Suggested:
                                        </Typography>
                                        <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto', color: 'var(--accent-primary)' }}>
                                          {suggestion.suggested_code}
                                        </pre>
                                      </Box>
                                    ) : null}
                                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', mt: 1.5, fontStyle: 'italic', display: 'block' }}>
                                      {suggestion.rationale}
                                    </Typography>
                                    {suggestion.impact && (
                                      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Chip 
                                          size="small"
                                          label={`Impact: ${suggestion.impact.impact_score}/10`}
                                          sx={{
                                            bgcolor: suggestion.impact.impact_score >= 7 ? '#ef4444' : 
                                                     suggestion.impact.impact_score >= 4 ? '#f59e0b' : '#10b981',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '0.65rem'
                                          }}
                                        />
                                        <Chip 
                                          size="small"
                                          label={`Effort: ${suggestion.impact.effort_score}/10`}
                                          sx={{
                                            bgcolor: suggestion.impact.effort_score <= 3 ? '#10b981' : 
                                                     suggestion.impact.effort_score <= 6 ? '#f59e0b' : '#ef4444',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '0.65rem'
                                          }}
                                        />
                                        {suggestion.impact.downstream_affected?.length > 0 && (
                                          <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                                            Affects: {suggestion.impact.downstream_affected.join(', ')}
                                          </Typography>
                                        )}
                                      </Box>
                                    )}
                                    {suggestion.hypothesis && (
                                      <Typography variant="caption" sx={{ color: 'var(--accent-cyan)', mt: 1, display: 'block' }}>
                                        {suggestion.hypothesis}
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              ));
                            })()}
                            {/* Pagination */}
                            {(() => {
                              const filtered = cioSuggestions
                                .filter(s => cioFilter === 'all' || s.category === cioFilter)
                                .filter(s => cioPriorityFilter === 'all' || s.priority === cioPriorityFilter)
                                .filter(s => cioInsightType === 'all' || (s.insight_type || 'improvement') === cioInsightType)
                                .filter(s => !cioSearch || s.title?.toLowerCase().includes(cioSearch.toLowerCase()) || s.file_path?.toLowerCase().includes(cioSearch.toLowerCase()));
                              const totalPages = Math.ceil(filtered.length / CIO_PAGE_SIZE);
                              if (totalPages <= 1) return null;
                              return (
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                                  <IconButton size="small" disabled={cioPage === 0} onClick={() => setCioPage(p => Math.max(0, p - 1))}>
                                    <ArrowBack fontSize="small" />
                                  </IconButton>
                                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                                    {cioPage + 1} / {totalPages}
                                  </Typography>
                                  <IconButton size="small" disabled={cioPage >= totalPages - 1} onClick={() => setCioPage(p => Math.min(totalPages - 1, p + 1))}>
                                    <ArrowForward fontSize="small" />
                                  </IconButton>
                                </Box>
                              );
                            })()}
                          </Box>
                        )}
                      </SettingSection>
                    )}
                  </>
                )}
              </Box>
            </Fade>
          ) : (
            <Fade in={true}>
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                <Button 
                  startIcon={<ArrowBack />} 
                  onClick={() => setView('list')} 
                  sx={{ mb: 4, color: 'var(--text-secondary)', '&:hover': { color: 'var(--text)' } }}
                >
                  Back to Overview
                </Button>
                
                <Paper sx={{ 
                  p: 5, borderRadius: 'var(--radius)', 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" fontWeight="900" sx={{ color: 'var(--text)', letterSpacing: '-0.04em', mb: 1 }}>
                      {view === 'add' ? 'New AI Provider' : 'Edit Connection'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      Connect your AI infrastructure with a few simple details
                    </Typography>
                  </Box>

                  <form onSubmit={handleSubmitProvider}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Select Service Type
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                      {PROVIDER_TYPES.map(type => {
                        const isSelected = formData.type === type.id;
                        return (
                          <Box 
                            key={type.id} 
                            onClick={() => handleTypeChange(type.id)}
                            sx={{ 
                              flex: 1, p: 2, cursor: 'pointer', borderRadius: 'var(--radius-sm)', 
                              border: '2px solid',
                              borderColor: isSelected ? 'var(--text)' : 'var(--border)',
                              background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              textAlign: 'center',
                              '&:hover': { borderColor: isSelected ? 'var(--text)' : 'var(--border-hover)', transform: 'translateY(-2px)' }
                            }}
                          >
                            <Typography variant="h4" sx={{ mb: 1 }}>{type.icon}</Typography>
                            <Typography variant="caption" fontWeight="800" sx={{ color: isSelected ? 'var(--text)' : 'var(--text-secondary)' }}>{type.name}</Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField 
                        fullWidth label="Connection Name" 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="e.g. My Local Llama"
                        slotProps={{ input: { sx: { borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)' } } }} 
                      />
                      
                      {formData.type !== 'anthropic' && (
                        <TextField 
                          fullWidth label="API Base URL" 
                          value={formData.base_url} 
                          onChange={e => setFormData({ ...formData, base_url: e.target.value })} 
                          placeholder={formData.type === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'} 
                          slotProps={{ 
                            input: { 
                              sx: { borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', fontFamily: 'monospace' },
                              startAdornment: <InputAdornment position="start"><Language fontSize="small" /></InputAdornment>
                            } 
                          }} 
                        />
                      )}

                      {(formData.type === 'openai' || formData.type === 'anthropic') && (
                        <TextField 
                          fullWidth label="API Access Key" 
                          type={showApiKey ? 'text' : 'password'}
                          value={formData.api_key} 
                          onChange={e => setFormData({ ...formData, api_key: e.target.value })} 
                          placeholder="sk-..."
                          slotProps={{ 
                            input: { 
                              sx: { borderRadius: 'var(--radius-sm)', bgcolor: 'var(--bg)', fontFamily: 'monospace' },
                              startAdornment: <InputAdornment position="start"><Key fontSize="small" /></InputAdornment>,
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                                    {showApiKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                  </IconButton>
                                </InputAdornment>
                              )
                            } 
                          }} 
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mt: 5 }}>
                      <Button 
                        variant="outlined" fullWidth onClick={() => setView('list')} 
                        sx={{ borderRadius: 'var(--radius-sm)', py: 1.5, borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="contained" fullWidth type="submit" 
                        sx={{ borderRadius: 'var(--radius-sm)', py: 1.5, background: 'var(--text)', color: 'var(--bg)', fontWeight: 800 }}
                      >
                        {view === 'add' ? 'Connect Service' : 'Save Changes'}
                      </Button>
                    </Box>
                  </form>
                </Paper>
                
                <Box sx={{ mt: 4, p: 2, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', gap: 2 }}>
                  <Info sx={{ color: '#3b82f6', mt: 0.2 }} fontSize="small" />
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your API keys are stored securely on your local server. For cloud providers, we recommend using restricted API keys with specific model access.
                  </Typography>
                </Box>
              </Box>
            </Fade>
          )}
        </Box>
      </Box>

      {/* Notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ borderRadius: 'var(--radius-sm)', fontWeight: 600, boxShadow: 'var(--shadow-lg)' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;