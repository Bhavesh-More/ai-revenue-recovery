'use client';

import { DirectionDashboardPage } from '../../../components/dashboard/DirectionDashboardPage';
import { DIRECTION_DATA_MAP } from '../../../mocks/directions';

export default function PaymentDegradationPage() {
  const direction = DIRECTION_DATA_MAP['payment-degradation'];
  return (
    <DirectionDashboardPage
      direction={direction}
      activeItem="payment"
    />
  );
}
