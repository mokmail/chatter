import React from 'react';

// Enhanced icon component with consistent styling
export const Icon = ({ 
  children, 
  size = 20, 
  className = '', 
  strokeWidth = 2,
  color = 'currentColor'
}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={`transition-all duration-200 ${className}`}
  >
    {children}
  </svg>
);

// Navigation Icons
export const ChatIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M8 12h.01" strokeWidth={3} />
    <path d="M12 12h.01" strokeWidth={3} />
    <path d="M16 12h.01" strokeWidth={3} />
  </Icon>
);

export const KnowledgeIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    <path d="M9 7h.01" strokeWidth={3} />
    <path d="M13 7h.01" strokeWidth={3} />
    <path d="M9 11h.01" strokeWidth={3} />
    <path d="M13 11h.01" strokeWidth={3} />
    <circle cx="16.5" cy="16.5" r="2.5" strokeWidth={1.5} />
    <path d="M19 14l-1.5 1.5" strokeWidth={1.5} />
  </Icon>
);

export const NotesIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M8 9h.01" strokeWidth={3} />
    <path d="M12 9h.01" strokeWidth={3} />
    <path d="M8 13h8" />
    <path d="M8 17h6" />
    <circle cx="10" cy="20" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

export const SettingsIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v3" />
    <path d="M12 20v3" />
    <path d="M4.22 4.22l2.12 2.12" />
    <path d="M17.66 17.66l2.12 2.12" />
    <path d="M1 12h3" />
    <path d="M20 12h3" />
    <path d="M4.22 19.78l2.12-2.12" />
    <path d="M17.66 6.34l2.12-2.12" />
  </Icon>
);

export const DocumentationIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 9h.01" strokeWidth={3} />
    <path d="M12 9h.01" strokeWidth={3} />
    <path d="M8 13h.01" strokeWidth={3} />
    <path d="M12 13h.01" strokeWidth={3} />
    <path d="M8 17h8" />
    <circle cx="19" cy="19" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

// Action Icons
export const SearchIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);

export const PlusIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2.5}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

export const MoreIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </Icon>
);

export const CloseIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2.5}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

export const ChevronDownIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2.5}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const MenuIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </Icon>
);

// Message Action Icons
export const CopyIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Icon>
);

export const CheckIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={3}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

export const EditIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </Icon>
);

export const ThumbsUpIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
  </Icon>
);

export const ThumbsDownIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
  </Icon>
);

export const RefreshIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
);

export const PlayIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <polygon points="6 3 20 12 6 21 6 3" />
  </Icon>
);

export const BranchIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <line x1="6" x2="6" y1="3" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </Icon>
);

export const ForkIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 6v6" />
    <path d="M6 6v6" />
    <path d="M12 12v3" />
  </Icon>
);

export const ShareIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" x2="12" y1="2" y2="15" />
  </Icon>
);

export const FolderIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4Z" />
  </Icon>
);

export const FolderPlusIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M12 10v6" />
    <path d="M9 13h6" />
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 6.9A2 2 0 0 0 7.93 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
  </Icon>
);

export const StopIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <rect width="14" height="14" x="5" y="5" rx="2" />
  </Icon>
);

export const TrashIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </Icon>
);

export const ArchiveIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <rect width="20" height="5" x="2" y="3" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </Icon>
);

// Additional Icons
export const SendIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.818a.75.75 0 00.46.5l5.092 1.637c.3.096.3.508 0 .604l-5.094 1.636a.75.75 0 00-.46.501l-2.43 7.819a.75.75 0 00.926.94 60.462 60.462 0 0018.044-8.55.75.75 0 000-1.218A60.462 60.462 0 003.478 2.405z" />
  </Icon>
);

export const PaperclipIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Icon>
);

export const SparklesIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </Icon>
);

export const BrainIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </Icon>
);

export const FileTextIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </Icon>
);

export const MicIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </Icon>
);

export const LayersIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </Icon>
);

export const UsersIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const MessageSquareIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const ChevronRightIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2.5}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const SaveIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </Icon>
);

export const RobotIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </Icon>
);

export const UserIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

export const FileIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </Icon>
);

export const ImageIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </Icon>
);

export const CodeIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Icon>
);

export const ExternalLinkIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </Icon>
);

export const DownloadIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </Icon>
);

export const UploadIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </Icon>
);

export const MaximizeIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </Icon>
);

export const MinimizeIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
  </Icon>
);

export const SunIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" x2="12" y1="1" y2="3" />
    <line x1="12" x2="12" y1="21" y2="23" />
    <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
    <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
    <line x1="1" x2="3" y1="12" y2="12" />
    <line x1="21" x2="23" y1="12" y2="12" />
    <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
    <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
  </Icon>
);

export const MoonIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Icon>
);

export const BellIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icon>
);

export const FilterIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Icon>
);

export const SortIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="m21 8-4-4-4 4" />
    <path d="M17 4v16" />
  </Icon>
);

export const TagIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <circle cx="7" cy="7" r="1" />
  </Icon>
);

export const ClockIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

export const CalendarIcon = ({ size = 16, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </Icon>
);

export const LoadingSpinner = ({ size = 20, className = '' }) => (
  <Icon size={size} className={`animate-spin ${className}`} strokeWidth={2}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </Icon>
);

export const BoldIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={3}>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </Icon>
);

export const ItalicIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <line x1="19" x2="10" y1="4" y2="4" />
    <line x1="14" x2="5" y1="20" y2="20" />
    <line x1="15" x2="9" y1="4" y2="20" />
  </Icon>
);

export const ListIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" strokeWidth={3} />
    <line x1="3" x2="3.01" y1="12" y2="12" strokeWidth={3} />
    <line x1="3" x2="3.01" y1="18" y2="18" strokeWidth={3} />
  </Icon>
);

export const QuoteIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v3c0 1.25.75 2 2 2h3c0 4-2 6-4 6" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v3c0 1.25 2 2 2 2h3c0 4-2 6-4 6" />
  </Icon>
);

export const MinusIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2.5}>
    <line x1="5" x2="19" y1="12" y2="12" />
  </Icon>
);

export const TableIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M3 3h18v18H3z" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </Icon>
);

export const CheckboxIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const UndoIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-13.5A9 9 0 0 0 3 13" />
  </Icon>
);

export const PinIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.79.9a.5.5 0 0 0 .1.92l4.8 1.1a.5.5 0 0 0 .58-.28l2-4.1a.5.5 0 0 0-.14-.61L12 8" />
    <path d="m15 5-1.5 1.5" />
    <path d="m15 9 4-4" />
  </Icon>
);

export const DatabaseIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </Icon>
);

export const EyeIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const XIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2.5}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

export const BugIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="m8 2 1.88 1.88" />
    <path d="M12.12 10.12 14 8" />
    <path d="M14 14.12 12.12 12" />
    <path d="m16 2 1.88 1.88" />
    <path d="M12.12 13.88 14 16" />
    <path d="M2 8h2" />
    <path d="M20 8h2" />
    <path d="M2 16h2" />
    <path d="M20 16h2" />
    <rect width="18" height="10" x="3" y="11" rx="1" />
    <path d="M12 21v-2" />
    <path d="M8 21v-2" />
    <path d="M16 21v-2" />
  </Icon>
);

export const BookIcon = ({ size = 20, className = '' }) => (
  <Icon size={size} className={className} strokeWidth={2}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Icon>
);

// Export all icons as a default object for backward compatibility
const Icons = {
  Icon,
  ChatIcon,
  KnowledgeIcon,
  NotesIcon,
  SettingsIcon,
  DocumentationIcon,
  SearchIcon,
  PlusIcon,
  MoreIcon,
  CloseIcon,
  ChevronDownIcon,
  MenuIcon,
  CopyIcon,
  CheckIcon,
  EditIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  RefreshIcon,
  PlayIcon,
  BranchIcon,
  ForkIcon,
  ShareIcon,
  FolderIcon,
  FolderPlusIcon,
  StopIcon,
  TrashIcon,
  ArchiveIcon,
  SendIcon,
  PaperclipIcon,
  SparklesIcon,
  BrainIcon,
  RobotIcon,
  UserIcon,
  FileIcon,
  ImageIcon,
  CodeIcon,
  ExternalLinkIcon,
  DownloadIcon,
  UploadIcon,
  MaximizeIcon,
  MinimizeIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  FilterIcon,
  SortIcon,
  TagIcon,
  ClockIcon,
  CalendarIcon,
  LoadingSpinner,
  BoldIcon,
  ItalicIcon,
  ListIcon,
  QuoteIcon,
  MinusIcon,
  TableIcon,
  CheckboxIcon,
  UndoIcon,
  PinIcon,
  DatabaseIcon,
  EyeIcon,
  XIcon,
  LayersIcon,
  FileTextIcon,
  MicIcon,
  UsersIcon,
  MessageSquareIcon,
  ChevronRightIcon,
  SaveIcon,
  BugIcon,
  BookIcon,
};

export default Icons;
