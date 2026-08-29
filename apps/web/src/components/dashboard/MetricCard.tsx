import { Icon } from '@iconify/react';

export interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  detail: string;
  href?: string;
  iconClassName?: string;
}

export function MetricCard({
  icon,
  label,
  value,
  detail,
  href,
  iconClassName = 'text-[#8C8C8C] dark:text-[#6B7280]',
}: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-5 shadow-sm transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 text-[#4A4A4A] dark:text-[#9CA3AF]">
          <Icon icon={icon} className={iconClassName} />
          <h3 className="text-[11px] font-bold uppercase tracking-wider">
            {label}
          </h3>
        </div>
        {href && (
          <a
            href={href}
            className="text-[#8C8C8C] dark:text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] transition-colors"
            aria-label={`Open ${label}`}
          >
            <Icon icon="lucide:arrow-up-right" />
          </a>
        )}
      </div>
      <p className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-2 font-mono">
        {value}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#8C8C8C] dark:text-[#6B7280]">{detail}</span>
      </div>
    </div>
  );
}
