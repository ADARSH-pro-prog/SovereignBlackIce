import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export type Tone = 'ice' | 'amber' | 'red' | 'green' | 'muted';

const toneText: Record<Tone, string> = {
  ice: 'text-ice',
  amber: 'text-amber',
  red: 'text-red',
  green: 'text-green',
  muted: 'text-muted',
};

/** Small state dot. Breathes only when the state needs attention. */
export const StatusDot: React.FC<{ tone: Tone; pulse?: boolean; className?: string }> = ({
  tone,
  pulse,
  className = '',
}) => (
  <span
    aria-hidden
    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current ${toneText[tone]} ${
      pulse ? 'animate-[breathe_2.4s_ease-in-out_infinite]' : ''
    } ${className}`}
  />
);

/** Truncated SHA-256 (or any id) in mono, with a copy button. */
export const Hash: React.FC<{ value?: string; chars?: number; className?: string }> = ({
  value,
  chars = 10,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted">n/a</span>;
  const short = value.length > chars ? `${value.slice(0, chars)}…` : value;
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable: nothing to do */
    }
  };
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs text-ink-2 ${className}`}>
      <span title={value}>{short}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy full hash'}
        className="rounded p-0.5 text-muted transition-colors hover:text-ice"
      >
        {copied ? <Check className="h-3 w-3 text-ice" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div aria-hidden className={`skeleton ${className}`} />
);

/** One sentence and, optionally, one primary action. */
export const EmptyState: React.FC<{
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, body, action, icon }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    {icon && <div className="text-muted">{icon}</div>}
    <p className="text-[15px] font-medium text-ink">{title}</p>
    {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

/** Counts up once when first shown. Plain number under reduced motion. */
export const CountUp: React.FC<{ value: number; duration?: number; suffix?: string }> = ({
  value,
  duration = 900,
  suffix = '',
}) => {
  const [shown, setShown] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    done.current = true;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span className="tabular-nums">
      {shown}
      {suffix}
    </span>
  );
};
