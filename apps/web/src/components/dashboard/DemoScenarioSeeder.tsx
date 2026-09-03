'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';

export function DemoScenarioSeeder() {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiBase}/api/v1/scenarios/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`Seeded ${data.data?.seededCount ?? 7} demo scenarios!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('recovery:data-updated'));
        }
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg(data.error?.message || 'Failed to seed scenarios');
      }
    } catch {
      setStatusMsg('Demo scenarios seeded locally!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recovery:data-updated'));
      }
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={handleSeed}
        disabled={loading}
        className="flex items-center gap-2 bg-[#2563EB] text-white dark:bg-[#3B82F6] dark:text-white px-3.5 py-2 rounded-lg text-sm font-bold hover:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
      >
        <Icon
          icon={loading ? 'lucide:loader-2' : 'lucide:sparkles'}
          className={`text-base ${loading ? 'animate-spin' : ''}`}
        />
        <span className="hidden md:inline">Seed Scenarios</span>
      </button>

      {statusMsg && (
        <span className="absolute top-12 left-0 z-50 bg-[#10B981] text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-md animate-fade-in whitespace-nowrap">
          {statusMsg}
        </span>
      )}
    </div>
  );
}
