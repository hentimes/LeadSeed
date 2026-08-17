import {
  faUsers, faPaperPlane, faClipboardCheck, faChartBar, faDiagramProject,
  faList, faClockRotateLeft, faGear, faEllipsis,
  faEye, faPencil, faTrash, faDownload, faUpload, faFileImport,
  faCheck, faSearch, faPlus, faTimes, faQuestion, faMoon, faSun,
  faRotateLeft, faChevronDown, faChevronUp, faChevronRight, faCaretUp, faCaretDown, faEnvelope, faGripVertical,
  faPalette, faDatabase, faBullseye, faPhone, faChartPie, faExclamationTriangle, faPaperclip, faCopy, faShieldHalved, faArrowRightFromBracket,
  faInbox, faRobot, faArrowLeft, faCheckCircle, faThumbsUp, faThumbsDown, faReply,
  faCrown, faUser, faBell, faCommentDots, faArrowRight, faFilter,
  faLightbulb, faLayerGroup, faCalendarDays, faShareNodes
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

const I = ({ icon, className = '' }: { icon: IconDefinition; className?: string }) => (
  <FontAwesomeIcon icon={icon} className={className} />
);

export const Icon = {
  // Nav
  Leads: () => <I icon={faUsers} className="text-sm" />,
  Send: () => <I icon={faPaperPlane} className="text-sm" />,
  Tasks: () => <I icon={faClipboardCheck} className="text-sm" />,
  Dashboard: () => <I icon={faChartBar} className="text-sm" />,
  TrendUp: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  ),
  Pipeline: () => <I icon={faDiagramProject} className="text-sm" />,
  Funnel: () => <I icon={faFilter} className="text-sm" />,
  Lists: () => <I icon={faList} className="text-sm" />,
  Messages: () => <I icon={faCommentDots} className="text-sm" />,
  History: () => <I icon={faClockRotateLeft} className="text-sm" />,
  Settings: () => <I icon={faGear} className="text-sm" />,
  Admin: () => <I icon={faShieldHalved} className="text-sm" />,
  More: () => <I icon={faEllipsis} className="text-sm" />,
  Users: () => <I icon={faUsers} className="text-sm" />,
  Inbox: () => <I icon={faInbox} className="text-sm" />,
  Bot: () => <I icon={faRobot} className="text-sm" />,
  User: () => <I icon={faUser} className="text-sm" />,
  Crown: () => <I icon={faCrown} className="text-sm" />,

  // Actions
  View: () => <I icon={faEye} className="text-xs" />,
  Edit: () => <I icon={faPencil} className="text-xs" />,
  Trash: () => <I icon={faTrash} className="text-xs" />,
  Export: () => <I icon={faDownload} className="text-sm" />,
  Import: () => <I icon={faFileImport} className="text-sm" />,
  Download: () => <I icon={faDownload} className="text-xs" />,
  Upload: () => <I icon={faUpload} className="text-xs" />,
  Check: () => <I icon={faCheck} className="text-xs" />,
  Search: () => <I icon={faSearch} className="text-xs" />,
  Plus: () => <I icon={faPlus} className="text-xs" />,
  Close: () => <I icon={faTimes} className="text-xs" />,
  Help: () => <I icon={faQuestion} className="text-sm" />,
  Restore: () => <I icon={faRotateLeft} className="text-xs" />,
  ArrowLeft: () => <I icon={faArrowLeft} className="text-xs" />,
  ArrowRight: () => <I icon={faArrowRight} className="text-sm" />,
  CheckCircle: () => <I icon={faCheckCircle} className="text-xs" />,
  Logout: () => <I icon={faArrowRightFromBracket} className="text-sm" />,
  Email: () => <I icon={faEnvelope} className="text-xs" />,
  Palette: () => <I icon={faPalette} className="text-xs" />,
  Database: () => <I icon={faDatabase} className="text-xs" />,
  Bullseye: () => <I icon={faBullseye} className="text-xs" />,
  Phone: () => <I icon={faPhone} className="text-xs" />,
  ChartPie: () => <I icon={faChartPie} className="text-xs" />,
  Warning: () => <I icon={faExclamationTriangle} className="text-xs" />,
  Paperclip: () => <I icon={faPaperclip} className="text-xs" />,
  Copy: () => <I icon={faCopy} className="text-xs" />,
  Reply: () => <I icon={faReply} className="text-xs" />,
  Bell: () => <I icon={faBell} className="text-xs" />,
  TargetArrow: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
      <path d="M12 2v4"></path>
      <path d="M12 18v4"></path>
      <path d="M4 12H2"></path>
      <path d="M22 12h-2"></path>
      <path d="m20.5 3.5-6 6"></path>
      <path d="M21 7V3h-4"></path>
    </svg>
  ),

  // UI
  ChevronDown: () => <I icon={faChevronDown} className="text-xs" />,
  ChevronUp: () => <I icon={faChevronUp} className="text-xs" />,
  ChevronRight: () => <I icon={faChevronRight} className="text-xs" />,
  // Misma familia de glifos en los tres estados: antes el inactivo usaba
  // faArrowsUpDown y los activos faCaret*, y se veian como iconos distintos.
  // El activo se distingue por color, no por forma.
  Sort: () => (
    <span className="inline-flex flex-col leading-none text-ink-muted">
      <I icon={faCaretUp} className="text-[9px] -mb-[3px]" />
      <I icon={faCaretDown} className="text-[9px]" />
    </span>
  ),
  SortUp: () => (
    <span className="inline-flex flex-col leading-none">
      <I icon={faCaretUp} className="text-[9px] -mb-[3px] text-primary" />
      <I icon={faCaretDown} className="text-[9px] text-ink-muted" />
    </span>
  ),
  SortDown: () => (
    <span className="inline-flex flex-col leading-none">
      <I icon={faCaretUp} className="text-[9px] -mb-[3px] text-ink-muted" />
      <I icon={faCaretDown} className="text-[9px] text-primary" />
    </span>
  ),
  Grip: () => <I icon={faGripVertical} className="text-[10px] text-ink-muted" />,
  Moon: () => <I icon={faMoon} className="text-xs" />,
  Sun: () => <I icon={faSun} className="text-xs" />,
  ThumbUp: () => <I icon={faThumbsUp} className="text-xs" />,
  ThumbDown: () => <I icon={faThumbsDown} className="text-xs" />,
  Sparkles: () => <I icon={faLightbulb} className="text-sm" />,
  Layers: () => <I icon={faLayerGroup} className="text-sm" />,
  Calendar: () => <I icon={faCalendarDays} className="text-sm" />,
  Share: () => <I icon={faShareNodes} className="text-sm" />,
  WhatsAppOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  ),
  EmailOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
      <path d="M2 4l10 8 10-8"></path>
    </svg>
  ),
  PhoneOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  ),
  CheckOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect>
      <path d="M9 12l2 2 4-4"></path>
    </svg>
  ),
  SendOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  // Mismo trazo que el resto de la familia Outline: 24px, 1.25 de grosor.
  LeadsOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  MessagesOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <path d="M9 10h.01"></path>
      <path d="M15 10h.01"></path>
      <path d="M12 10h.01"></path>
    </svg>
  ),
  CalendarOutline: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  pin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
      <path d="M21.17 3.25q.22.21.39.46c.17.25.3.54.38.86s.12.67.12 1.05c0 .38-.04.73-.12 1.05s-.21.61-.38.86-.39.46-.66.62l-3.32 1.83 1.13 5.34c.05.24.04.48-.03.71s-.18.44-.34.6a1.5 1.5 0 0 1-1.01.37c-.37 0-.71-.12-1.02-.37l-3.56-3.56-4.96 4.96c-.23.23-.51.35-.85.35s-.62-.12-.85-.35c-.23-.23-.35-.51-.35-.85s.12-.62.35-.85l4.96-4.96-3.56-3.56c-.25-.31-.37-.65-.37-1.02 0-.39.12-.73.37-1.01.16-.16.36-.27.6-.34s.47-.08.71-.03l5.34 1.13 1.83-3.32c.16-.27.37-.5.62-.66s.54-.3.86-.38.67-.12 1.05-.12.73.04 1.05.12.61.21.86.38.46.39.67.66zM7.34 7.64l4.22 4.22.42-2-2.64-2.64-2 .42z"/>
    </svg>
  )
};
