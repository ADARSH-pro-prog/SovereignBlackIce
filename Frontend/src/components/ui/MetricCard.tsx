import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  accentColor?: 'blue' | 'amber' | 'red' | 'teal';
  trendText?: string;
  trendType?: 'positive' | 'warning' | 'critical' | 'neutral';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon,
  accentColor = 'blue',
  trendText,
  trendType = 'neutral',
  onClick,
}) => {
  const accentBorderColors = {
    blue: 'bg-[#3B82F6]',
    amber: 'bg-[#F59E0B]',
    red: 'bg-[#EF4444]',
    teal: 'bg-[#14B8A6]',
  };

  const iconBgColors = {
    blue: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
    amber: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    red: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
    teal: 'bg-[#14B8A6]/10 text-[#14B8A6] border-[#14B8A6]/30',
  };

  const trendColors = {
    positive: 'text-[#14B8A6]',
    warning: 'text-[#F59E0B]',
    critical: 'text-[#EF4444]',
    neutral: 'text-[#94A3B8]',
  };

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl bg-[#111827] border border-[#263247] p-5 flex flex-col justify-between overflow-hidden transition-all duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-[#3B82F6]/60 hover:-translate-y-0.5'
          : ''
      }`}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${accentBorderColors[accentColor]}`}
      />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#94A3B8] block">
            {title}
          </span>
          <div className="text-2xl font-semibold text-[#F8FAFC] tracking-tight mt-1 font-mono">
            {value}
          </div>
        </div>
        <div
          className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconBgColors[accentColor]}`}
        >
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1A2438]">
        <span className="text-[13px] text-[#64748B] truncate max-w-[70%]">
          {subtext}
        </span>
        {trendText && (
          <span
            className={`text-xs font-medium shrink-0 ${trendColors[trendType]}`}
          >
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
};
