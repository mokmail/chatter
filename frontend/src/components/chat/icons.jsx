import React from 'react';
import {
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
  FolderPlusIcon,
  StopIcon,
  TrashIcon,
  MoreIcon,
} from '../common/Icons';

// Enhanced Icons for Message Actions with animations
const ICONS = {
  copy: <CopyIcon size={16} />,
  check: <CheckIcon size={16} className="text-[var(--success)]" />,
  edit: <EditIcon size={16} />,
  thumbsUp: <ThumbsUpIcon size={16} />,
  thumbsDown: <ThumbsDownIcon size={16} />,
  refresh: <RefreshIcon size={16} className="hover:rotate-180 transition-transform duration-500" />,
  play: <PlayIcon size={16} />,
  branch: <BranchIcon size={16} />,
  fork: <ForkIcon size={16} />,
  share: <ShareIcon size={16} />,
  folderPlus: <FolderPlusIcon size={16} />,
  stop: <StopIcon size={16} />,
  trash: <TrashIcon size={16} />,
  more: <MoreIcon size={16} />,
}

export default ICONS
