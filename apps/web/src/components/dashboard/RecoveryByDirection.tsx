import { Icon } from '@iconify/react';
import { RECOVERY_DIRECTIONS, DirectionItem } from '../../mocks/overview';

export interface RecoveryByDirectionProps {
  directions?: DirectionItem[];
}

export function RecoveryByDirection({
  directions = RECOVERY_DIRECTIONS,
}: RecoveryByDirectionProps) {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm transition-colors">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:bar-chart-2" className="text-[#8C8C8C] dark:text-[#6B7280]" />
          Recovery by Direction
        </h2>
        <div className="flex items-center gap-2">
          <select
            defaultValue="all"
            className="bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs px-3 py-1.5 text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none font-medium cursor-pointer transition-colors"
          >
            <option value="all">All Directions</option>
          </select>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] hover:bg-[#F0F2F5] dark:hover:bg-[#131416] transition-colors cursor-pointer"
            aria-label="Open recovery by direction"
          >
            <Icon icon="lucide:arrow-up-right" className="text-sm" />
          </button>
        </div>
      </div>

      <div className="p-0 overflow-x-auto scrollbar-hide">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280] bg-[#F0F2F5] dark:bg-[#131416] uppercase font-bold tracking-wider transition-colors">
            <tr>
              <th className="px-6 py-4">Direction</th>
              <th className="px-6 py-4 text-right">Cases</th>
              <th className="px-6 py-4 text-right">At Risk</th>
              <th className="px-6 py-4 text-right">Recovered</th>
              <th className="px-6 py-4 text-right">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB]">
            {directions.map((direction) => (
              <tr
                key={direction.name}
                className="hover:bg-[#F0F2F5] dark:hover:bg-[#131416] transition-colors"
              >
                <td className="px-6 py-4">
                  <a
                    href={direction.href}
                    className="flex items-center gap-3 font-medium hover:text-[#3B82F6] dark:hover:text-[#60A5FA] transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: direction.color }}
                    />
                    <span>{direction.name}</span>
                  </a>
                </td>
                <td className="px-6 py-4 text-right font-mono text-[#4A4A4A] dark:text-[#9CA3AF]">-</td>
                <td className="px-6 py-4 text-right font-mono text-[#4A4A4A] dark:text-[#9CA3AF]">-</td>
                <td className="px-6 py-4 text-right font-mono text-[#4A4A4A] dark:text-[#9CA3AF]">-</td>
                <td className="px-6 py-4 text-right font-mono text-[#4A4A4A] dark:text-[#9CA3AF]">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
