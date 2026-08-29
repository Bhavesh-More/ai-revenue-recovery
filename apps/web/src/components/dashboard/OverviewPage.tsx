import { MetricCard } from './MetricCard';
import { EmptyStatePanel } from './EmptyStatePanel';
import { RecoveryByDirection } from './RecoveryByDirection';
import { RecoveryFunnel } from './RecoveryFunnel';
import { OverviewData, mockOverviewData } from '../../mocks/overview';

export interface OverviewPageProps {
  data?: OverviewData;
}

export function OverviewPage({ data = mockOverviewData }: OverviewPageProps) {
  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon="lucide:tag"
          label="Revenue at Risk"
          value={data.revenueAtRisk}
          detail="System ready"
        />
        <MetricCard
          icon="lucide:check-square"
          label="Revenue Recovered"
          value={data.revenueRecovered}
          detail="Awaiting processing"
        />
        <MetricCard
          icon="lucide:pie-chart"
          label="Recovery Rate"
          value={data.recoveryRate}
          detail="Insufficient data"
        />
        <MetricCard
          icon="lucide:users"
          label="Active Cases"
          value={String(data.activeCases)}
          detail={data.activeCaseSummary}
          href="#"
        />
        <MetricCard
          icon="lucide:flame"
          label="High Risk"
          value={String(data.highRiskCases)}
          detail={data.riskSummary}
          href="#"
          iconClassName="text-[#FF4444]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-1 flex flex-col gap-6">
          <EmptyStatePanel
            title="Agent Activity"
            icon="lucide:activity-square"
            emptyIcon="lucide:history"
            message="No activity yet"
            description="Recovery agent operations will appear here."
          />

          <EmptyStatePanel
            title="High-Risk Cases"
            icon="lucide:shield-alert"
            emptyIcon="lucide:clipboard-x"
            message="No cases found"
            description="High priority interventions will be listed here."
            href="#"
          />
        </div>

        {/* Right Column */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <RecoveryByDirection />
          <RecoveryFunnel />
        </div>
      </div>
    </div>
  );
}
