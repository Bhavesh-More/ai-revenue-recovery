'use client';

import { DirectionDashboardPage } from '../../../components/dashboard/DirectionDashboardPage';
import { DIRECTION_DATA_MAP } from '../../../mocks/directions';

export default function CheckoutDropoffPage() {
  const direction = DIRECTION_DATA_MAP['checkout-dropoff'];
  return (
    <DirectionDashboardPage
      direction={direction}
      activeItem="checkout"
    />
  );
}
