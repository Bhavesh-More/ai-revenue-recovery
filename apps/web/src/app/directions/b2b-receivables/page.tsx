'use client';

import { DirectionDashboardPage } from '../../../components/dashboard/DirectionDashboardPage';
import { DIRECTION_DATA_MAP } from '../../../mocks/directions';

export default function B2BReceivablesPage() {
  const direction = DIRECTION_DATA_MAP['b2b-receivables'];
  return (
    <DirectionDashboardPage
      direction={direction}
      activeItem="b2b"
    />
  );
}
