'use client';

import { DirectionDashboardPage } from '../../../components/dashboard/DirectionDashboardPage';
import { DIRECTION_DATA_MAP } from '../../../mocks/directions';

export default function PromiseToPayPage() {
  const direction = DIRECTION_DATA_MAP['promise-to-pay'];
  return (
    <DirectionDashboardPage
      direction={direction}
      activeItem="promise"
    />
  );
}
