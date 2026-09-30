import React from 'react';

/*
  Chart kit: one visual language for every chart and stat in the dashboard.
  Deep navy cards, mono uppercase labels, straight-segment lines with gradient fills,
  a glass tooltip with a large value, and a tab strip (Build / Observe / Runtime style).
  Surfaces come from `.chart-card` and `.label-mono` in index.css.
*/

export const AXIS_TICK = { fill: '#8E9BB5', fontSize: 12, fontFamily: 'JetBrains Mono' } as const;
export const GRID_STROKE = 'rgb(150 180 255 / 0.07)';

/** Lavender single-series palette from the reference; ice/amber stay for semantic two-series views. */
export const SERIES = {
  solo: { stroke: '#C9D2FF', fill: '#6D7CFF' },
  changes: { stroke: '#9BE9FF', fill: '#7FE3FF' },
  flagged: { stroke: '#FFB547', fill: '#FFB547' },
} as const;

export const SegmentTabs = <T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) => (
  <div role="tablist" className="grid border-b border-white/[0.07]" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
    {options.map((o) => {
      const active = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(o.value)}
          className={`relative h-12 font-mono text-[13px] uppercase tracking-[0.16em] transition-colors duration-200 ${
            active ? 'bg-white/[0.05] text-ink' : 'text-muted hover:bg-white/[0.02] hover:text-ink-2'
          }`}
        >
          {o.label}
          <span
            aria-hidden
            className={`absolute inset-x-0 bottom-0 h-px transition-opacity duration-300 ${active ? 'bg-[#7c8cff] opacity-100' : 'opacity-0'}`}
          />
        </button>
      );
    })}
  </div>
);

type TipItem = { name: string; value: number; color?: string; stroke?: string };

/** Glass tooltip: one row per series, mono label left, large value right. */
export const GlassTooltip: React.FC<{ active?: boolean; payload?: TipItem[]; label?: string; suffix?: string }> = ({
  active,
  payload,
  label,
  suffix = '',
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.14] bg-[#0b1230]/85 px-5 py-3 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md">
      {payload.length > 1 && <div className="mb-1.5 font-mono text-[11.5px] uppercase tracking-[0.16em] text-muted">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-baseline justify-between gap-8 py-0.5">
          <span className="font-mono text-[13px] uppercase tracking-[0.14em] text-ink-2">
            {payload.length > 1 ? p.name : `${p.name} · ${label}`}
          </span>
          <span className="font-mono text-[24px] font-medium leading-none tabular-nums text-ink" style={{ color: payload.length > 1 ? p.stroke ?? p.color : undefined }}>
            {p.value}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Big mono stat with an optional chip, like "SUCCESS RATE 81.7% ↑8.2%". */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  chip?: React.ReactNode;
  tone?: 'ice' | 'amber' | 'red' | 'green';
  note?: string;
  className?: string;
}> = ({ label, value, chip, tone = 'ice', note, className = '' }) => {
  const chipTone = {
    ice: 'border-ice/30 bg-ice/10 text-ice',
    amber: 'border-amber/30 bg-amber/10 text-amber',
    red: 'border-red/30 bg-red/10 text-red',
    green: 'border-green/30 bg-green/10 text-green',
  }[tone];
  return (
    <div className={`chart-card p-6 ${className}`}>
      <div className="label-mono">{label}</div>
      <div className="mt-5 flex items-center gap-3">
        <span className="font-mono text-[40px] font-medium leading-none tabular-nums tracking-tight text-ink">{value}</span>
        {chip && <span className={`rounded-md border px-2 py-1 font-mono text-xs ${chipTone}`}>{chip}</span>}
      </div>
      {note && <p className="mt-3 text-sm text-muted">{note}</p>}
    </div>
  );
};

/** Labelled progress bars ("AGENT READINESS" style). Values are 0..1. */
export const Bars: React.FC<{ label: string; items: [string, number][]; className?: string }> = ({ label, items, className = '' }) => (
  <div className={`chart-card p-6 ${className}`}>
    <div className="label-mono">{label}</div>
    {items.map(([name, v]) => (
      <div key={name} className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-sm uppercase tracking-[0.1em] text-ink">{name}</span>
          <span className="font-mono text-sm tabular-nums text-ink-2">{Math.round(v * 100)}%</span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#3b4bff,#7c8cff_60%,#9BE9FF)] transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${Math.max(2, v * 100)}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);
