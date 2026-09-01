'use client';

import { Icon } from '@iconify/react';
import { BatchActivityEvent } from '../../mocks/batches';

export interface BatchActivityTimelineProps {
  activity: BatchActivityEvent[];
  isLive?: boolean;
}

export function BatchActivityTimeline({
  activity,
  isLive = true,
}: BatchActivityTimelineProps) {
  const getHighlightClass = (color?: string) => {
    switch (color) {
      case 'green':
        return 'font-mono font-bold text-[#00B074]';
      case 'orange':
        return 'font-bold text-[#F59E0B]';
      case 'blue':
        return 'font-bold text-[#3B82F6]';
      case 'red':
        return 'font-bold text-[#FF4444]';
      default:
        return 'font-bold text-[#1A1A1A] dark:text-[#F9FAFB]';
    }
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col flex-1 min-h-[380px] max-h-[600px] font-mono transition-colors overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center shrink-0">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:activity" className="text-[#3B82F6] text-base" />
          Live Processing Activity
        </h2>
        <div className="flex items-center gap-2 text-xs text-[#8C8C8C] dark:text-[#6B7280] font-medium">
          {isLive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#00B074] animate-pulse" />
              Auto-updating
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#8C8C8C]" />
              Paused
            </>
          )}
        </div>
      </div>

      {/* Timeline Event List */}
      <div className="p-6 overflow-y-auto flex-1 scrollbar-hide min-h-0">
        <div className="space-y-6">
          {activity.map((event, index) => {
            const isLast = index === activity.length - 1;

            return (
              <div key={event.id} className="flex gap-4">
                {/* Node & Line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${event.iconBgClass} ${event.iconTextClass}`}
                  >
                    <Icon icon={event.icon} className="text-base" />
                  </div>
                  {!isLast && (
                    <div className="w-px h-full bg-[#E5E7EB] dark:bg-[#2A2B2D] -my-1" />
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                        {event.caseNumber}
                      </span>
                      <span className="text-xs text-[#8C8C8C] dark:text-[#6B7280] bg-[#F0F2F5] dark:bg-[#131416] px-2 py-0.5 rounded border border-[#E5E7EB] dark:border-[#2A2B2D]">
                        {event.tag}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#8C8C8C] dark:text-[#6B7280]">
                      {event.time}
                    </span>
                  </div>

                  <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF] mt-1 flex items-center gap-2 flex-wrap">
                    <Icon icon="lucide:arrow-right" className="text-[#8C8C8C] dark:text-[#6B7280] text-xs shrink-0" />
                    <span>
                      {event.description}{' '}
                      {event.highlightText && (
                        <span className={getHighlightClass(event.highlightColor)}>
                          {event.highlightText}
                        </span>
                      )}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
