export interface OverviewData {
  revenueAtRisk: string;
  revenueRecovered: string;
  recoveryRate: string;
  activeCases: number;
  highRiskCases: number;
  activeCaseSummary: string;
  riskSummary: string;
}

export interface DirectionItem {
  name: string;
  color: string;
  icon: string;
  href: string;
}

export const RECOVERY_DIRECTIONS: DirectionItem[] = [
  { name: 'Payment Degradation', color: '#3B82F6', icon: 'lucide:credit-card', href: '#' },
  { name: 'Checkout Recovery', color: '#00B074', icon: 'lucide:shopping-cart', href: '#' },
  { name: 'Subscription Recovery', color: '#F59E0B', icon: 'lucide:repeat', href: '#' },
  { name: 'B2B Receivables', color: '#8B5CF6', icon: 'lucide:building', href: '#' },
  { name: 'Mandate Retry', color: '#EC4899', icon: 'lucide:refresh-cw', href: '#' },
  { name: 'Hinglish Voice', color: '#6366F1', icon: 'lucide:mic', href: '#' },
  { name: 'Promise-to-Pay', color: '#14B8A6', icon: 'lucide:calendar-clock', href: '#' },
];

export const mockOverviewData: OverviewData = {
  revenueAtRisk: '₹0',
  revenueRecovered: '₹0',
  recoveryRate: '—',
  activeCases: 0,
  highRiskCases: 0,
  activeCaseSummary: '0 processing, 0 waiting',
  riskSummary: 'Requires attention',
};
