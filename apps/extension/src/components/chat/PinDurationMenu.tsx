import ChatMenuSurface, { ChatMenuItem, ChatMenuLabel } from './ChatMenuSurface';

interface PinDurationMenuProps {
  onSelect: (hours: number) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

const OPTIONS: { label: string; hours: number }[] = [
  { label: '1 hora', hours: 1 },
  { label: '6 horas', hours: 6 },
  { label: '24 horas', hours: 24 },
  { label: '3 días', hours: 72 },
];

export default function PinDurationMenu({ onSelect, onClose, align = 'right' }: PinDurationMenuProps) {
  return (
    <ChatMenuSurface onClose={onClose} align={align} width="w-36" label="Duración del fijado">
      <ChatMenuLabel>Fijar por</ChatMenuLabel>
      {OPTIONS.map((option) => (
        <ChatMenuItem key={option.hours} onClick={() => onSelect(option.hours)}>
          {option.label}
        </ChatMenuItem>
      ))}
    </ChatMenuSurface>
  );
}
