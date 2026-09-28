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
  const accentBorderColors = {
    blue: 'bg-[#38BDF8]',
    green: 'bg-[#A3E635]',
    amber: 'bg-[#F59E0B]',
    red: 'bg-[#EF4444]',
    pink: 'bg-[#F472B6]',
    teal: 'bg-[#14B8A6]',
  };

  const iconBgColors = {
    blue: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]',
    green: 'bg-[#F7FEE7] text-[#65A30D] border-[#D9F99D]',
    amber: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    red: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    pink: 'bg-[#FDF2F8] text-[#DB2777] border-[#FBCFE8]',
    teal: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]',
  };

  const trendColors = {
    positive: 'text-[#65A30D]',
    warning: 'text-[#D97706]',
    critical: 'text-[#DC2626]',
    impact: 'text-[#DB2777]',
    neutral: 'text-[#938DA2]',
  };

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl bg-white border border-[#E9E4DD] p-5 flex flex-col justify-between overflow-hidden transition-all duration-200 shadow-[0_4px_18px_rgba(41,35,61,0.05)] ${
        onClick
          ? 'cursor-pointer hover:border-[#D9F99D] hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(41,35,61,0.10)]'
          : ''
      }`}
    >
      {/* Semantic accent line */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[3px] ${accentBorderColors[accentColor]}`}
      />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F687C] block">
            {title}
          </span>

          <div className="text-2xl font-semibold text-[#29233D] tracking-tight mt-1 font-mono">
            {value}
          </div>
        </div>

        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBgColors[accentColor]}`}
        >
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#F3EEF1]">
        <span className="text-[13px] text-[#938DA2] truncate max-w-[70%]">
          {subtext}
        </span>

        {trendText && (
          <span
            className={`text-xs font-semibold shrink-0 ${trendColors[trendType]}`}
          >
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
};