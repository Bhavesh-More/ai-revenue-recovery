'use client';

import { Icon } from '@iconify/react';
import { TimelineEvent } from '../../mocks/recoveryCaseDetails';

export interface RecoveryTimelineProps {
  events: TimelineEvent[];
}

export function RecoveryTimeline({ events }: RecoveryTimelineProps) {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden flex-1 font-mono transition-colors">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center gap-2">
        <Icon icon="lucide:git-commit" className="text-[#8C8C8C] dark:text-[#6B7280] text-base" />
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider">
          Recovery Timeline
        </h2>
      </div>

      <div className="p-6">
        <div className="relative space-y-6">
          {events.map((event, index) => {
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Vertical Line */}
                {!isLast && (
                  <div className="absolute left-3 top-6 bottom-[-24px] w-0.5 bg-[#E5E7EB] dark:bg-[#2A2B2D] z-0" />
                )}

                {/* Node Icon */}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${event.bgClass}`}
                >
                  <Icon icon={event.icon} className="text-xs" />
                </div>

                {/* Event Details */}
                <div className="flex-1 pt-0.5">
                  <p
                    className={`text-sm font-bold ${
                      isLast && event.iconColor === 'green'
                        ? 'text-[#00B074]'
                        : 'text-[#1A1A1A] dark:text-[#F9FAFB]'
                    }`}
                  >
                    {event.title}
                  </p>

                  {event.description && (
                    <p
                      className={`text-sm mt-0.5 ${
                        event.title === 'Recovery probability calculated'
                          ? 'font-bold text-[#00B074]'
                          : 'text-[#4A4A4A] dark:text-[#9CA3AF]'
                      }`}
                    >
                      {event.description}
                    </p>
                  )}

                  <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280] mt-1 font-mono">
                    {event.time}
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
