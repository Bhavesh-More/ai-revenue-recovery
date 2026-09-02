'use client';

import { DirectionDashboardPage } from '../../../components/dashboard/DirectionDashboardPage';
import { DIRECTION_DATA_MAP } from '../../../mocks/directions';

export default function SubscriptionRecoveryPage() {
  const direction = DIRECTION_DATA_MAP['subscription-recovery'];
  return (
    <DirectionDashboardPage
      direction={direction}
      activeItem="subscription"
    />
  );
}
