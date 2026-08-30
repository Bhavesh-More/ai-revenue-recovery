export type RetryIntervalOption = '12 Hours' | '24 Hours' | '48 Hours' | '72 Hours';

export interface GlobalPolicyLimits {
  maxAutomaticRetries: {
    value: number;
    enabled: boolean;
  };
  maxCommunications: {
    value: number;
    enabled: boolean;
  };
  defaultRetryInterval: {
    value: RetryIntervalOption;
    enabled: boolean;
  };
}

export interface EscalationRules {
  highValueThreshold: {
    value: number;
    enabled: boolean;
  };
  criticalRiskThreshold: {
    value: number;
    enabled: boolean;
  };
  humanApprovalRequired: {
    enabled: boolean;
    strict: boolean;
  };
}

export interface DirectionPolicyOverride {
  id: string;
  name: string;
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
  enabled: boolean;
  maxRetries: number;
  isCustomRetries?: boolean;
  maxCommunications: number;
  isCustomComms?: boolean;
  autoApproveActions: boolean;
}

export interface PolicyMetadata {
  systemStatus: string;
  lastUpdated: string;
  appliedAcross: string;
  modifiedBy: {
    name: string;
    email: string;
    avatarUrl?: string;
    initials: string;
  };
}

export interface FullPolicyConfig {
  globalLimits: GlobalPolicyLimits;
  escalationRules: EscalationRules;
  directionOverrides: DirectionPolicyOverride[];
  metadata: PolicyMetadata;
}

export const RETRY_INTERVAL_OPTIONS: RetryIntervalOption[] = [
  '12 Hours',
  '24 Hours',
  '48 Hours',
  '72 Hours',
];

export const INITIAL_POLICIES_DATA: FullPolicyConfig = {
  globalLimits: {
    maxAutomaticRetries: {
      value: 3,
      enabled: true,
    },
    maxCommunications: {
      value: 4,
      enabled: true,
    },
    defaultRetryInterval: {
      value: '24 Hours',
      enabled: true,
    },
  },
  escalationRules: {
    highValueThreshold: {
      value: 100000,
      enabled: true,
    },
    criticalRiskThreshold: {
      value: 95,
      enabled: true,
    },
    humanApprovalRequired: {
      enabled: true,
      strict: true,
    },
  },
  directionOverrides: [
    {
      id: 'subscription',
      name: 'Subscription Recovery',
      icon: 'lucide:repeat',
      iconBgClass: 'bg-[#3B82F6]/10 text-[#3B82F6] dark:bg-[#3B82F6]/20',
      iconTextClass: 'text-[#3B82F6]',
      enabled: true,
      maxRetries: 3,
      maxCommunications: 4,
      autoApproveActions: false,
    },
    {
      id: 'payment',
      name: 'Payment Degradation',
      icon: 'lucide:credit-card',
      iconBgClass: 'bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/20',
      iconTextClass: 'text-[#F59E0B]',
      enabled: true,
      maxRetries: 2,
      maxCommunications: 3,
      autoApproveActions: true,
    },
    {
      id: 'checkout',
      name: 'Checkout Recovery',
      icon: 'lucide:shopping-cart',
      iconBgClass: 'bg-[#00B074]/10 text-[#00B074] dark:bg-[#00B074]/20',
      iconTextClass: 'text-[#00B074]',
      enabled: true,
      maxRetries: 2,
      maxCommunications: 3,
      autoApproveActions: true,
    },
    {
      id: 'b2b',
      name: 'B2B Receivables',
      icon: 'lucide:building',
      iconBgClass: 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
      iconTextClass: 'text-purple-600 dark:text-purple-400',
      enabled: true,
      maxRetries: 5,
      isCustomRetries: true,
      maxCommunications: 6,
      isCustomComms: true,
      autoApproveActions: false,
    },
  ],
  metadata: {
    systemStatus: 'Active & Enforcing',
    lastUpdated: 'Today, 09:41 AM',
    appliedAcross: '12,482 Active Cases',
    modifiedBy: {
      name: 'Admin User',
      email: 'admin@company.com',
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin+User&background=3B82F6&color=fff',
      initials: 'AU',
    },
  },
};

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}
