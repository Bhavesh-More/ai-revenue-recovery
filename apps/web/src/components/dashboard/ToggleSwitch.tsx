'use client';

export interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

export function ToggleSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  ariaLabel = 'Toggle setting',
  size = 'md',
}: ToggleSwitchProps) {
  const isSm = size === 'sm';

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
        isSm ? 'h-5 w-9' : 'h-6 w-11'
      } ${
        checked
          ? 'bg-[#00B074] dark:bg-[#10B981]'
          : 'bg-[#D1D5DB] dark:bg-[#374151]'
      }`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow-sm transition-transform ${
          isSm ? 'h-3.5 w-3.5' : 'h-4 w-4'
        } ${
          checked
            ? isSm
              ? 'translate-x-4.5'
              : 'translate-x-6'
            : isSm
            ? 'translate-x-1'
            : 'translate-x-1'
        }`}
      />
    </button>
  );
}
