'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTheme } from '../../context/ThemeContext';

export interface HeaderProps {
  showNotificationBadge?: boolean;
  onSearch?: (query: string) => void;
  onCalendarClick?: () => void;
  onFilterClick?: () => void;
  onNotificationClick?: () => void;
}

export function Header({
  showNotificationBadge = true,
  onSearch,
  onCalendarClick,
  onFilterClick,
  onNotificationClick,
}: HeaderProps) {
  const [query, setQuery] = useState('');
  const { theme, toggleTheme } = useTheme();

  const handleSearchChange = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="h-16 border-b border-[#E5E7EB] dark:border-[#2A2B2D] bg-white dark:bg-[#171819] sticky top-0 z-10 flex items-center justify-between px-8 shadow-sm font-mono transition-colors shrink-0 gap-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative w-full max-w-sm md:max-w-md">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280]"
          />
          <input
            type="text"
            value={query}
            placeholder="Search cases, customers, ID..."
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB] placeholder:text-[#8C8C8C] dark:placeholder:text-[#6B7280] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] focus:bg-white dark:focus:bg-[#131416] transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onCalendarClick}
          className="flex items-center gap-2 border border-[#E5E7EB] dark:border-[#2A2B2D] px-3.5 py-2 rounded-lg text-sm text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-[#F0F2F5] dark:hover:bg-[#131416] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] transition-colors cursor-pointer"
        >
          <Icon icon="lucide:calendar" />
          <span className="hidden sm:inline">Last Month</span>
          <Icon icon="lucide:chevron-down" className="text-xs" />
        </button>

        <button
          type="button"
          onClick={onFilterClick}
          className="flex items-center gap-2 border border-[#E5E7EB] dark:border-[#2A2B2D] px-3.5 py-2 rounded-lg text-sm text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-[#F0F2F5] dark:hover:bg-[#131416] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] transition-colors cursor-pointer"
        >
          <Icon icon="lucide:sliders-horizontal" />
          <span className="hidden sm:inline">Filter by</span>
        </button>

        <button
          type="button"
          onClick={onNotificationClick}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] hover:bg-[#F0F2F5] dark:hover:bg-[#131416] transition-colors relative cursor-pointer"
          aria-label="Notifications"
        >
          <Icon icon="lucide:bell" className="text-lg" />
          {showNotificationBadge && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FF4444] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm ${
            theme === 'dark'
              ? 'bg-white text-[#171819] hover:bg-gray-100'
              : 'bg-[#1A1A1A] text-white hover:bg-black'
          }`}
          aria-label="Toggle dark and light theme"
        >
          <Icon
            icon={theme === 'dark' ? 'lucide:sun' : 'lucide:moon'}
            className="text-base"
          />
          <span className="text-xs font-semibold">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>
    </header>
  );
}
