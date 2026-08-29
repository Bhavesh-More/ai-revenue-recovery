import Link from 'next/link';
import { Icon } from '@iconify/react';

export interface SidebarProps {
  activeItem?: string;
  overviewHref?: string;
  casesHref?: string;
  batchesHref?: string;
  paymentDegradationHref?: string;
  checkoutRecoveryHref?: string;
  subscriptionRecoveryHref?: string;
  b2bReceivablesHref?: string;
  mandateRetryHref?: string;
  hinglishVoiceHref?: string;
  promiseToPayHref?: string;
  approvalsHref?: string;
  policiesHref?: string;
  auditLogHref?: string;
  batchesCount?: number;
  showBatchesBadge?: boolean;
}

export function Sidebar({
  activeItem = 'overview',
  overviewHref = '/',
  casesHref = '/recovery-cases',
  batchesHref = '#',
  paymentDegradationHref = '#',
  checkoutRecoveryHref = '#',
  subscriptionRecoveryHref = '#',
  b2bReceivablesHref = '#',
  mandateRetryHref = '#',
  hinglishVoiceHref = '#',
  promiseToPayHref = '#',
  approvalsHref = '#',
  policiesHref = '#',
  auditLogHref = '#',
  batchesCount = 2,
  showBatchesBadge = true,
}: SidebarProps) {
  const navClass = (item: string) => {
    const isActive = activeItem === item;
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
      isActive
        ? 'bg-black text-white border-black shadow-sm dark:bg-black dark:text-white dark:border-[#374151]'
        : 'border-transparent text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB]'
    }`;
  };

  return (
    <aside className="w-64 border-r border-[#E5E7EB] dark:border-[#2A2B2D] flex flex-col h-full shrink-0 font-mono bg-[#F8F9FA] dark:bg-[#171819] transition-colors">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded flex items-center justify-center bg-[#1A1A1A] dark:bg-[#131416] border border-transparent dark:border-[#2A2B2D]">
          <Icon icon="lucide:zap" className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-[#1A1A1A] dark:text-[#F9FAFB]">
            RevRecovery AI
          </h1>
          <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280]">
            Platform
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-3 px-2 text-[#8C8C8C] dark:text-[#6B7280]">
          Main
        </p>
        <nav className="space-y-1">
          <Link
            href={overviewHref}
            className={navClass('overview')}
          >
            <Icon icon="lucide:layout-dashboard" className="text-lg" />
            <span className="text-sm font-medium">Overview</span>
          </Link>
          <Link
            href={casesHref}
            className={navClass('cases')}
          >
            <Icon icon="lucide:briefcase" className="text-lg" />
            <span className="text-sm font-medium">Recovery Cases</span>
          </Link>
          <Link
            href={batchesHref}
            className={navClass('batches')}
          >
            <Icon icon="lucide:layers" className="text-lg" />
            <span className="text-sm font-medium">Batches</span>
            {showBatchesBadge && (
              <span className="ml-auto text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF4444]">
                {batchesCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Directions Navigation */}
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-3 px-2 text-[#8C8C8C] dark:text-[#6B7280]">
          Directions
        </p>
        <nav className="space-y-1">
          <a href={paymentDegradationHref} className={navClass('payment')}>
            <Icon icon="lucide:credit-card" className="text-lg" />
            <span className="text-sm font-medium">Payment Degradation</span>
          </a>
          <a href={checkoutRecoveryHref} className={navClass('checkout')}>
            <Icon icon="lucide:shopping-cart" className="text-lg" />
            <span className="text-sm font-medium">Checkout Recovery</span>
          </a>
          <a href={subscriptionRecoveryHref} className={navClass('subscription')}>
            <Icon icon="lucide:repeat" className="text-lg" />
            <span className="text-sm font-medium">Subscription Recovery</span>
          </a>
          <a href={b2bReceivablesHref} className={navClass('b2b')}>
            <Icon icon="lucide:building" className="text-lg" />
            <span className="text-sm font-medium">B2B Receivables</span>
          </a>
          <a href={mandateRetryHref} className={navClass('mandate')}>
            <Icon icon="lucide:refresh-cw" className="text-lg" />
            <span className="text-sm font-medium">Mandate Retry</span>
          </a>
          <a href={hinglishVoiceHref} className={navClass('voice')}>
            <Icon icon="lucide:mic" className="text-lg" />
            <span className="text-sm font-medium">Hinglish Voice</span>
          </a>
          <a href={promiseToPayHref} className={navClass('promise')}>
            <Icon icon="lucide:calendar-clock" className="text-lg" />
            <span className="text-sm font-medium">Promise-to-Pay</span>
          </a>
        </nav>
      </div>

      {/* System Navigation */}
      <div className="px-4 py-4 mt-auto border-t border-[#E5E7EB] dark:border-[#2A2B2D]">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-3 px-2 text-[#8C8C8C] dark:text-[#6B7280]">
          System
        </p>
        <nav className="space-y-1">
          <a href={approvalsHref} className={navClass('approvals')}>
            <Icon icon="lucide:check-circle" className="text-lg" />
            <span className="text-sm font-medium">Approvals</span>
          </a>
          <a href={policiesHref} className={navClass('policies')}>
            <Icon icon="lucide:shield" className="text-lg" />
            <span className="text-sm font-medium">Policies</span>
          </a>
          <a href={auditLogHref} className={navClass('audit')}>
            <Icon icon="lucide:file-text" className="text-lg" />
            <span className="text-sm font-medium">Audit Log</span>
          </a>
        </nav>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center gap-3 bg-white dark:bg-[#171819]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 bg-[#3B82F6]"
          aria-label="Admin User avatar"
        >
          AU
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate text-[#1A1A1A] dark:text-[#F9FAFB]">
            Admin User
          </p>
          <p className="text-xs truncate text-[#8C8C8C] dark:text-[#9CA3AF]">
            admin@company.com
          </p>
        </div>
      </div>
    </aside>
  );
}
