'use client';

import { DirectionDashboardPage } from '../../../components/dashboard/DirectionDashboardPage';
import { DIRECTION_DATA_MAP } from '../../../mocks/directions';

export default function MandateRetryPage() {
  const direction = DIRECTION_DATA_MAP['mandate-retry'];
  return (
    <DirectionDashboardPage
      direction={direction}
      activeItem="mandate"
    />
  );
}
