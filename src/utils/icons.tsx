import {
  faUsers, faPaperPlane, faClipboardCheck, faChartBar, faDiagramProject,
  faList, faMessage, faClockRotateLeft, faGear, faEllipsis,
  faEye, faPencil, faTrash, faDownload, faUpload, faFileImport,
  faCheck, faSearch, faPlus, faTimes, faQuestion, faMoon, faSun,
  faRotateLeft, faChevronDown, faChevronRight, faArrowsUpDown,
  faCaretUp, faCaretDown, faEnvelope, faGripVertical,
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
  Pipeline: () => <I icon={faDiagramProject} className="text-sm" />,
  Lists: () => <I icon={faList} className="text-sm" />,
  Messages: () => <I icon={faMessage} className="text-sm" />,
  History: () => <I icon={faClockRotateLeft} className="text-sm" />,
  Settings: () => <I icon={faGear} className="text-sm" />,
  More: () => <I icon={faEllipsis} className="text-sm" />,

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
  Email: () => <I icon={faEnvelope} className="text-xs" />,

  // UI
  ChevronDown: () => <I icon={faChevronDown} className="text-xs" />,
  ChevronRight: () => <I icon={faChevronRight} className="text-xs" />,
  Sort: () => <I icon={faArrowsUpDown} className="text-[10px] text-gray-400" />,
  SortUp: () => <I icon={faCaretUp} className="text-[10px] text-gray-400" />,
  SortDown: () => <I icon={faCaretDown} className="text-[10px] text-gray-400" />,
  Grip: () => <I icon={faGripVertical} className="text-[10px] text-gray-400" />,
  Moon: () => <I icon={faMoon} className="text-xs" />,
  Sun: () => <I icon={faSun} className="text-xs" />,
};
