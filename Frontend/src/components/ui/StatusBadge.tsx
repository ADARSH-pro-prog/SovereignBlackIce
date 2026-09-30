import React from 'react';
import { IntegrityStatus, ReviewStatus, SeverityLevel } from '../../types';

interface StatusBadgeProps {
  status: IntegrityStatus | ReviewStatus | SeverityLevel | string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  pulse = false,
}) => {
  const norm = status?.toLowerCase() || '';

  // Semantic only: ice = trusted, amber = needs review, red = compromised, green = resolved.
  let tone = 'text-ink-2 border-line-strong bg-raised';
  if (norm.includes('resolved') || norm.includes('approved')) {
    tone = 'text-green border-green/25 bg-green/[0.07]';
  } else if (
    norm.includes('verified') ||
    norm.includes('nominal') ||
    norm.includes('completed') ||
    norm.includes('no impact') ||
    norm.includes('no changes')
  ) {
    tone = 'text-ice border-ice/25 bg-ice/[0.06]';
  } else if (
    norm.includes('critical') ||
    norm.includes('conflict') ||
    norm.includes('escalated') ||
    norm.includes('high') ||
    norm.includes('error') ||
    norm.includes('outdated') ||
    norm.includes('rejected')
  ) {
    tone = 'text-red border-red/30 bg-red/[0.07]';
  } else if (
    norm.includes('review') ||
    norm.includes('pending') ||
    norm.includes('medium') ||
    norm.includes('warning') ||
    norm.includes('impact')
  ) {
    tone = 'text-amber border-amber/30 bg-amber/[0.07]';
  }

  const sizeClasses = size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap ${sizeClasses} ${tone}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full bg-current ${
          pulse ? 'animate-[breathe_2.4s_ease-in-out_infinite]' : ''
        }`}
      />
      <span>{status}</span>
    </span>
  );
};
