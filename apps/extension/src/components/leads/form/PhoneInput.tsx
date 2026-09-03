import React, { useMemo } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
}

export function PhoneInput({ value, onChange, onBlur }: Props) {
  // Ensure we strip '+56' or '56' if it exists to display only the remaining digits
  const displayValue = useMemo(() => {
    let clean = value.replace(/\D/g, '');
    if (clean.startsWith('56')) {
      clean = clean.slice(2);
    }
    return clean;
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 9) {
      raw = raw.slice(0, 9);
    }
    
    if (raw) {
      onChange('+56' + raw);
    } else {
      onChange('');
    }
  };

  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold text-ink-secondary uppercase tracking-wide">Teléfono</label>
      <div className="flex items-center w-full rounded-[6px] border border-line bg-surface-muted focus-within:bg-surface focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all overflow-hidden">
        <span className="pl-3 pr-1 text-[13px] text-ink-secondary font-medium select-none pointer-events-none">
          +56
        </span>
        <input
          type="tel"
          value={displayValue}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder="9 1234 5678"
          maxLength={9}
          className="w-full bg-transparent py-1.5 pr-3 text-[13px] text-ink font-medium outline-none placeholder:text-ink-muted"
          inputMode="numeric"
          autoComplete="tel-national"
        />
      </div>
    </div>
  );
}
