import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, TextField, Switch, FormControlLabel, FormControl, Select,
  MenuItem, InputLabel, Typography, Paper, Divider, Card, CardContent,
  Chip, IconButton, List, ListItem, ListItemIcon, ListItemText,
  Tooltip, InputAdornment, Fade, Zoom, CircularProgress, Alert, Snackbar
} from '@mui/material';
import {
  Devices, Palette, Psychology, Storage, Add, Edit, Delete, ArrowBack,
  Check, Close, Cloud, Terminal, Key, Settings, AutoAwesome, Search,
  Code, Extension, Visibility, VisibilityOff, Refresh, Star, StarBorder,
  SmartToy, Language, Hub, Tune, Science, Info, Public
} from '@mui/icons-material';

const PROVIDER_TYPES = [
  { id: 'ollama', name: 'Ollama', icon: '🦙', defaultUrl: 'http://localhost:11434', description: 'Local models via Ollama', color: '#f59e0b' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', defaultUrl: 'https://api.openai.com/v1', description: 'OpenAI API compatible', color: '#10b981' },
  { id: 'anthropic', name: 'Anthropic', icon: '🐜', defaultUrl: '', description: 'Claude via Anthropic API', color: '#ef4444' },
];

const SettingsPage = ({ config, onSave, models = [], onRefreshModels }) => {
  const [activeTab, setActiveTab] = useState('connections');
  const [view, setView] = useState('list');
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'ollama', base_url: 'http://localhost:11434', api_key: '' });
  const [showApiKey, setShowApiKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
      const newProviders = config.providers.filter(p => p.id !== id);
      const updates = { providers: newProviders };
      if (config.active_provider_id === id) {
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
                        {(config.providers || []).length === 0 ? (
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
                          (config.providers || []).map(p => {
                            const type = PROVIDER_TYPES.find(t => t.id === p.type);
                            const isActive = config.active_provider_id === p.id;
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
                            {config.providers?.find(p => p.id === config.active_provider_id)?.name || 'Unknown'}
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
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
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