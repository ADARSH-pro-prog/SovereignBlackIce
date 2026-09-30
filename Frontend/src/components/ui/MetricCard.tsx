import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;

  accentColor?:
    | 'blue'
    | 'green'
    | 'amber'
    | 'red'
    | 'pink'
    | 'teal';

  trendText?: string;

  trendType?:
    | 'positive'
    | 'warning'
    | 'critical'
    | 'impact'
    | 'neutral';

  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon,
  accentColor = 'green',
  trendText,
  trendType = 'neutral',
  onClick,
}) => {
  const accentText = {
    blue: 'text-ice',
    green: 'text-ice',
    teal: 'text-ice',
    amber: 'text-amber',
    pink: 'text-amber',
    red: 'text-red',
  };

  const trendColors = {
    positive: 'text-ice',
    warning: 'text-amber',
    critical: 'text-red',
    impact: 'text-amber',
    neutral: 'text-muted',
  };

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`chart-card group flex w-full flex-col gap-3 px-5 py-4 text-left transition-[border-color,transform] duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-white/[0.14]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label-mono">{title}</span>
        <span className={`[&_svg]:h-4 [&_svg]:w-4 ${accentText[accentColor]} opacity-70`}>{icon}</span>
      </div>
      <div className="font-mono text-[34px] font-medium leading-none tracking-tight text-ink tabular-nums">
        {value}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-muted">{subtext}</span>
        {trendText && (
          <span className={`shrink-0 font-medium ${trendColors[trendType]}`}>{trendText}</span>
        )}
      </div>
    </Tag>
  );
};
