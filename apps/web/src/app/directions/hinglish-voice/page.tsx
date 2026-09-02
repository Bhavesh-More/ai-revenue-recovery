'use client';

import { DirectionDashboardPage } from '../../../components/dashboard/DirectionDashboardPage';
import { DIRECTION_DATA_MAP } from '../../../mocks/directions';

export default function HinglishVoicePage() {
  const direction = DIRECTION_DATA_MAP['hinglish-voice'];
  return (
    <DirectionDashboardPage
      direction={direction}
      activeItem="voice"
    />
  );
}
