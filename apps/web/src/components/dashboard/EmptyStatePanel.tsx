import { Icon } from '@iconify/react';

export interface EmptyStatePanelProps {
  title: string;
  icon: string;
  emptyIcon: string;
  message: string;
  description: string;
  href?: string;
}

export function EmptyStatePanel({
  title,
  icon,
  emptyIcon,
  message,
  description,
  href,
}: EmptyStatePanelProps) {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl flex-1 flex flex-col shadow-sm transition-colors">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon={icon} className="text-[#8C8C8C] dark:text-[#6B7280]" />
          {title}
        </h2>
        {href ? (
          <a
            href={href}
            className="w-6 h-6 flex items-center justify-center rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] transition-colors"
            aria-label={`Open ${title}`}
          >
            <Icon icon="lucide:arrow-up-right" className="text-sm" />
          </a>
        ) : (
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] transition-colors cursor-pointer"
            aria-label={`Open ${title}`}
          >
            <Icon icon="lucide:arrow-up-right" className="text-sm" />
          </button>
        )}
      </div>

      <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#F0F2F5] dark:bg-[#131416] flex items-center justify-center mb-4 transition-colors">
          <Icon icon={emptyIcon} className="text-3xl text-[#8C8C8C] dark:text-[#6B7280]" />
        </div>
        <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1">{message}</p>
        <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">{description}</p>
      </div>
    </div>
  );
}
