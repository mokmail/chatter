import React from 'react'
import AccessTime from '@mui/icons-material/AccessTime'
import AccountTree from '@mui/icons-material/AccountTree'
import Add from '@mui/icons-material/Add'
import Archive from '@mui/icons-material/Archive'
import Article from '@mui/icons-material/Article'
import AutoAwesome from '@mui/icons-material/AutoAwesome'
import AttachFile from '@mui/icons-material/AttachFile'
import BugReport from '@mui/icons-material/BugReport'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import Check from '@mui/icons-material/Check'
import CheckBox from '@mui/icons-material/CheckBox'
import ChatBubble from '@mui/icons-material/ChatBubble'
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined'
import ChevronRight from '@mui/icons-material/ChevronRight'
import Clear from '@mui/icons-material/Clear'
import Cloud from '@mui/icons-material/Cloud'
import Close from '@mui/icons-material/Close'
import CloseFullscreen from '@mui/icons-material/CloseFullscreen'
import Code from '@mui/icons-material/Code'
import ContentCopy from '@mui/icons-material/ContentCopy'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import Description from '@mui/icons-material/Description'
import Dns from '@mui/icons-material/Dns'
import Download from '@mui/icons-material/Download'
import Edit from '@mui/icons-material/Edit'
import ExpandMore from '@mui/icons-material/ExpandMore'
import FilterList from '@mui/icons-material/FilterList'
import Folder from '@mui/icons-material/Folder'
import FolderOpen from '@mui/icons-material/FolderOpen'
import Bookmarks from '@mui/icons-material/Bookmarks'
import GitHub from '@mui/icons-material/GitHub'
import GridView from '@mui/icons-material/GridView'
import Image from '@mui/icons-material/Image'
import InsertDriveFile from '@mui/icons-material/InsertDriveFile'
import Label from '@mui/icons-material/Label'
import LightMode from '@mui/icons-material/LightMode'
import Link from '@mui/icons-material/Link'
import Menu from '@mui/icons-material/Menu'
import Mic from '@mui/icons-material/Mic'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import Note from '@mui/icons-material/Note'
import Notifications from '@mui/icons-material/Notifications'
import OpenInFull from '@mui/icons-material/OpenInFull'
import OpenInNew from '@mui/icons-material/OpenInNew'
import Person from '@mui/icons-material/Person'
import People from '@mui/icons-material/People'
import PlayArrow from '@mui/icons-material/PlayArrow'
import PushPin from '@mui/icons-material/PushPin'
import Public from '@mui/icons-material/Public'
import Refresh from '@mui/icons-material/Refresh'
import Remove from '@mui/icons-material/Remove'
import Save from '@mui/icons-material/Save'
import Search from '@mui/icons-material/Search'
import Send from '@mui/icons-material/Send'
import Settings from '@mui/icons-material/Settings'
import Share from '@mui/icons-material/Share'
import SmartToy from '@mui/icons-material/SmartToy'
import Sort from '@mui/icons-material/Sort'
import Storage from '@mui/icons-material/Storage'
import Stop from '@mui/icons-material/Stop'
import TableChart from '@mui/icons-material/TableChart'
import ThumbDownOffAlt from '@mui/icons-material/ThumbDownOffAlt'
import ThumbUpOffAlt from '@mui/icons-material/ThumbUpOffAlt'
import Undo from '@mui/icons-material/Undo'
import UploadFile from '@mui/icons-material/UploadFile'
import Visibility from '@mui/icons-material/Visibility'
import Book from '@mui/icons-material/Book'
import Psychology from '@mui/icons-material/Psychology'
import CallSplit from '@mui/icons-material/CallSplit'
import ForkRight from '@mui/icons-material/ForkRight'
import Layers from '@mui/icons-material/Layers'
import FormatBold from '@mui/icons-material/FormatBold'
import FormatItalic from '@mui/icons-material/FormatItalic'
import FormatListBulleted from '@mui/icons-material/FormatListBulleted'
import FormatQuote from '@mui/icons-material/FormatQuote'
import DarkMode from '@mui/icons-material/DarkMode'

const createIcon = (Component) => ({ size = 20, className = '', sx = {}, ...props }) => (
  <Component
    fontSize="inherit"
    className={className}
    sx={{ width: size, height: size, ...sx }}
    {...props}
  />
)

export const Icon = ({
  children,
  size = 20,
  className = '',
  strokeWidth = 2,
  color = 'currentColor',
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
)

export const ChatIcon = createIcon(ChatBubbleOutlineOutlined)
export const KnowledgeIcon = createIcon(Bookmarks)
export const NotesIcon = createIcon(Note)
export const SettingsIcon = createIcon(Settings)
export const DocumentationIcon = createIcon(Description)
export const SearchIcon = createIcon(Search)
export const PlusIcon = createIcon(Add)
export const MoreIcon = createIcon(MoreHoriz)
export const CloseIcon = createIcon(Close)
export const ChevronDownIcon = createIcon(ExpandMore)
export const MenuIcon = createIcon(Menu)
export const CopyIcon = createIcon(ContentCopy)
export const CheckIcon = createIcon(Check)
export const EditIcon = createIcon(Edit)
export const ThumbsUpIcon = createIcon(ThumbUpOffAlt)
export const ThumbsDownIcon = createIcon(ThumbDownOffAlt)
export const RefreshIcon = createIcon(Refresh)
export const PlayIcon = createIcon(PlayArrow)
export const BranchIcon = createIcon(CallSplit)
export const ForkIcon = createIcon(ForkRight)
export const ShareIcon = createIcon(Share)
export const FolderIcon = createIcon(Folder)
export const FolderPlusIcon = createIcon(CreateNewFolder)
export const StopIcon = createIcon(Stop)
export const TrashIcon = createIcon(DeleteOutlineOutlined)
export const ArchiveIcon = createIcon(Archive)
export const SendIcon = createIcon(Send)
export const PaperclipIcon = createIcon(AttachFile)
export const SparklesIcon = createIcon(AutoAwesome)
export const BrainIcon = createIcon(Psychology)
export const RobotIcon = createIcon(SmartToy)
export const UserIcon = createIcon(Person)
export const FileIcon = createIcon(InsertDriveFile)
export const ImageIcon = createIcon(Image)
export const CodeIcon = createIcon(Code)
export const ExternalLinkIcon = createIcon(OpenInNew)
export const LinkIcon = createIcon(Link)
export const GridIcon = createIcon(GridView)
export const DownloadIcon = createIcon(Download)
export const UploadIcon = createIcon(UploadFile)
export const MaximizeIcon = createIcon(OpenInFull)
export const MinimizeIcon = createIcon(CloseFullscreen)
export const SunIcon = createIcon(LightMode)
export const MoonIcon = createIcon(DarkMode)
export const BellIcon = createIcon(Notifications)
export const FilterIcon = createIcon(FilterList)
export const SortIcon = createIcon(Sort)
export const TagIcon = createIcon(Label)
export const ClockIcon = createIcon(AccessTime)
export const CalendarIcon = createIcon(CalendarMonth)
export const BoldIcon = createIcon(FormatBold)
export const ItalicIcon = createIcon(FormatItalic)
export const ListIcon = createIcon(FormatListBulleted)
export const QuoteIcon = createIcon(FormatQuote)
export const MinusIcon = createIcon(Remove)
export const TableIcon = createIcon(TableChart)
export const CheckboxIcon = createIcon(CheckBox)
export const UndoIcon = createIcon(Undo)
export const PinIcon = createIcon(PushPin)
export const DatabaseIcon = createIcon(Storage)
export const EyeIcon = createIcon(Visibility)
export const XIcon = createIcon(Clear)
export const LayersIcon = createIcon(Layers)
export const FileTextIcon = createIcon(Article)
export const MicIcon = createIcon(Mic)
export const UsersIcon = createIcon(People)
export const MessageSquareIcon = createIcon(ChatBubble)
export const ChevronRightIcon = createIcon(ChevronRight)
export const SaveIcon = createIcon(Save)
export const BugIcon = createIcon(BugReport)
export const BookIcon = createIcon(Book)
export const GlobeIcon = createIcon(Public)
export const GithubIcon = createIcon(GitHub)
export const ServerIcon = createIcon(Dns)
export const CloudIcon = createIcon(Cloud)
export const FolderOpenIcon = createIcon(FolderOpen)
export const WorkflowIcon = createIcon(AccountTree)

export const LoadingSpinner = ({ size = 20, className = '' }) => (
  <Icon size={size} className={`animate-spin ${className}`} strokeWidth={2}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </Icon>
)

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
  LinkIcon,
  GridIcon,
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
  GlobeIcon,
  GithubIcon,
  ServerIcon,
  CloudIcon,
  FolderOpenIcon,
  WorkflowIcon,
}

export default Icons
