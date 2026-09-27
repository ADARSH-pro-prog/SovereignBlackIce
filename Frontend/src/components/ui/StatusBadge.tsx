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

  let colorClass =
    'bg-[#1E293B] text-[#94A3B8] border-[#263247]';
  let dotColor = 'bg-[#64748B]';

  if (
    norm.includes('verified') ||
    norm.includes('nominal') ||
    norm.includes('resolved') ||
    norm.includes('completed') ||
    norm.includes('no impact')
  ) {
    colorClass = 'bg-[#14B8A6]/15 text-[#14B8A6] border-[#14B8A6]/30';
    dotColor = 'bg-[#14B8A6]';
  } else if (
    norm.includes('review') ||
    norm.includes('pending') ||
    norm.includes('medium') ||
    norm.includes('warning')
  ) {
    colorClass = 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30';
    dotColor = 'bg-[#F59E0B]';
  } else if (
    norm.includes('critical') ||
    norm.includes('conflict') ||
    norm.includes('escalated') ||
    norm.includes('high') ||
    norm.includes('error') ||
    norm.includes('outdated')
  ) {
    colorClass = 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30';
    dotColor = 'bg-[#EF4444]';
  } else if (
    norm.includes('progress') ||
    norm.includes('impact analysis') ||
    norm.includes('active') ||
    norm.includes('info')
  ) {
    colorClass = 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30';
    dotColor = 'bg-[#3B82F6]';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap ${sizeClasses} ${colorClass}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <span>{status}</span>
    </span>
  );
};
