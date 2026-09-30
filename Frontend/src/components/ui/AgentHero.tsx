import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Network, Bot, ShieldCheck, History } from 'lucide-react';

/**
 * Greeting panel for the Overview: a framed dark window with a diagonal light beam,
 * the shield mark, a two-tone greeting and quick-action chips. Every chip routes to an
 * existing page; nothing here fetches or computes data of its own.
 */
export const AgentHero: React.FC<{ pending: number; changed: number }> = ({ pending, changed }) => {
  const navigate = useNavigate();
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  const chips: { label: string; icon: React.ReactNode; to: string; tone?: string }[] = [
    { label: 'Upload a source', icon: <Upload />, to: '/dashboard/documents' },
    { label: 'Trace impact', icon: <Network />, to: '/dashboard/impact' },
    { label: 'Ask the assistant', icon: <Bot />, to: '/dashboard/assistant' },
    {
      label: pending ? `Review ${pending} pending` : 'Review queue',
      icon: <ShieldCheck />,
      to: '/dashboard/reviews',
      tone: pending ? 'text-amber' : undefined,
    },
    { label: 'Open audit log', icon: <History />, to: '/dashboard/audit' },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[20px] border border-line-strong bg-[#05070c]/70 backdrop-blur-sm px-6 pb-12 pt-14 text-center shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:px-10">
      {/* Diagonal light beam, the signature of the reference, in Black Ice ice-to-violet */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-[2%] -top-[45%] h-[190%] w-[40%] rotate-[34deg] bg-[linear-gradient(90deg,transparent,rgb(139_92_246/0.38)_30%,rgb(217_70_239/0.30)_52%,rgb(127_227_255/0.16)_72%,transparent)] blur-3xl" />
        <div className="absolute right-[14%] -top-[45%] h-[190%] w-[10%] rotate-[34deg] bg-[linear-gradient(90deg,transparent,rgb(236_120_255/0.35),transparent)] blur-xl" />
        <div className="absolute right-[19%] -top-[45%] h-[190%] w-px rotate-[34deg] bg-[linear-gradient(180deg,transparent,rgb(190_170_255/0.55),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_45%,rgb(127_227_255/0.06),transparent_70%)]" />
      </div>

      {/* Window chrome */}
      <div aria-hidden className="absolute left-5 top-5 flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center">
        <div className="relative">
          <div aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.35),transparent_65%)] blur-xl" />
          <img
            src="/logo-shield.png"
            alt=""
            className="h-20 w-auto motion-safe:animate-[float_6s_ease-in-out_infinite]"
          />
        </div>

        <h1 className="mt-6 text-[30px] font-light leading-tight tracking-tight text-ink sm:text-[34px]">
          {greeting}, <span className="font-medium">analyst.</span>
          <span className="block text-ink-2/70">
            {changed ? `${changed} source${changed === 1 ? ' has' : 's have'} moved. What should we verify?` : 'What should we verify today?'}
          </span>
        </h1>

        <div className="mt-9 flex flex-wrap justify-center gap-2.5">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => navigate(c.to)}
              className="group inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 text-[13.5px] text-ink-2 backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-px hover:border-ice/30 hover:bg-white/[0.06] hover:text-ink"
            >
              <span className={`[&_svg]:h-4 [&_svg]:w-4 ${c.tone ?? 'text-ice/80'} transition-colors group-hover:text-ice`}>
                {c.icon}
              </span>
              <span className={c.tone}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
