import { Icon } from '@iconify/react';

export function RecoveryFunnel() {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm transition-colors">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:filter" className="text-[#8C8C8C] dark:text-[#6B7280]" />
          Recovery Funnel
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 border border-[#E5E7EB] dark:border-[#2A2B2D] px-3 py-1.5 rounded-lg text-xs text-[#1A1A1A] dark:text-[#F9FAFB] bg-transparent dark:bg-[#131416] hover:bg-[#F0F2F5] dark:hover:bg-[#171819] transition-colors font-medium cursor-pointer"
          >
            All Directions
            <Icon icon="lucide:chevron-down" className="text-[10px]" />
          </button>
        </div>
      </div>

      <div className="p-8 flex items-center justify-center min-h-[220px]">
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#F0F2F5] dark:bg-[#131416] flex items-center justify-center mb-4 transition-colors">
            <Icon icon="lucide:inbox" className="text-3xl text-[#8C8C8C] dark:text-[#6B7280]" />
          </div>
          <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1">
            No events processed
          </p>
          <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF] max-w-xs">
            The recovery funnel is currently empty. Start a batch or await external events.
          </p>
        </div>
      </div>
    </div>
  );
}
