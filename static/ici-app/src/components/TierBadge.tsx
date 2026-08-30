import React from 'react';
import Badge from '@atlaskit/badge';
import { PerformanceTier } from '../types/scoring';

interface TierBadgeProps {
  tier: PerformanceTier;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  let appearance: 'added' | 'primary' | 'important' | 'removed' = 'primary';
  switch (tier) {
    case 'Strong Contributor':
      appearance = 'added';
      break;
    case 'On Track':
      appearance = 'primary';
      break;
    case 'Below Target':
      appearance = 'important';
      break;
    case 'Needs Attention':
      appearance = 'removed';
      break;
  }

  return <Badge appearance={appearance}>{tier}</Badge>;
};
