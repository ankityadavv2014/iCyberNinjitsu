'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ICNLogo } from '@/components/AstraLogo';

const showDevHints = process.env.NEXT_PUBLIC_SHOW_DEV_HINTS === 'true';
const isDev = process.env.NODE_ENV === 'development';
const DEV_TOKEN = '00000000-0000-0000-0000-000000000001';

/* ─── Story pipeline ─── */
const STORY_STEPS = [
  {
    num: '01',
    title: 'Listen to the noise',
    body: 'iCyberNinjitsu connects to RSS feeds, Reddit, X, Quora, and news APIs — pulling signals from across the internet in real time.',
    accent: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    num: '02',
    title: 'Surface what matters',
    body: 'Our ranking engine scores every signal by momentum, velocity, and source diversity. Only the trends worth your time bubble up.',
    accent: 'from-indigo-500/20 to-blue-500/10',
  },
  {
    num: '03',
    title: 'Draft with intelligence',
    body: 'AI generates on‑brand posts in your voice — CEO, CISO, Engineer — with evidence links, confidence scores, and compliance checks built in.',
    accent: 'from-violet-500/20 to-indigo-500/10',
  },
  {
    num: '04',
    title: 'Govern before you publish',
    body: 'Approval workflows, policy gates, blocked‑term scanners, and kill switches. Nothing goes live without passing your rules.',
    accent: 'from-emerald-500/20 to-teal-500/10',
  },
  {
    num: '05',
    title: 'Publish everywhere',
    body: 'Schedule and push to LinkedIn today — with X, Instagram, and multi‑channel coming next. One pipeline, every platform.',
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  {
    num: '06',
    title: 'Moderate & respond',
    body: 'Unified inbox for comments, mentions, and DMs. Sentiment tagging, auto‑routing, and AI‑suggested replies — so your brand stays protected.',
    accent: 'from-rose-500/20 to-pink-500/10',
  },
];

/* ─── Capabilities ─── */
const CAPABILITIES = [
  { icon: SignalIcon, label: 'Signal detection', desc: 'RSS, Reddit, X, News APIs' },
  { icon: TrendIcon, label: 'Trend ranking', desc: 'Momentum, velocity, diversity' },
  { icon: DraftIcon, label: 'AI content studio', desc: 'Drafts in your brand voice' },
  { icon: ShieldIcon, label: 'Governance', desc: 'Approvals, policies, audit trails' },
  { icon: ChannelIcon, label: 'Multi-channel publish', desc: 'LinkedIn, X, IG and more' },
  { icon: InboxIcon, label: 'Moderation inbox', desc: 'Comments, DMs, sentiment' },
  { icon: AlertIcon, label: 'Crisis controls', desc: 'Kill switch, pause, escalate' },
  { icon: ChartIcon, label: 'Analytics', desc: 'Attribution, UTM, outcomes' },
];

/* ─── Social proof metrics ─── */
const METRICS = [
  { value: '10x', label: 'faster from trend to post' },
  { value: '6', label: 'pipeline stages, zero manual handoffs' },
  { value: '100%', label: 'governed — nothing ships unreviewed' },
  { value: '∞', label: 'channels from one workflow' },
];

/* ─── Testimonials ─── */
const TESTIMONIALS = [
  {
    quote: 'We went from 3 hours per post to 15 minutes. The trend engine alone is worth it.',
    name: 'Head of Content',
    role: 'Series B Cybersecurity Startup',
  },
  {
    quote: 'Finally — governance and speed in the same tool. Our legal team actually likes it.',
    name: 'VP of Communications',
    role: 'Enterprise SaaS',
  },
  {
    quote: 'The kill switch saved us during a PR incident. Paused everything in one click.',
    name: 'Social Media Director',
    role: 'Digital Agency',
  },
];

/* ─── FAQ ─── */
const FAQ = [
  {
    q: 'How long does setup take?',
    a: 'Under 5 minutes. Connect your LinkedIn, add a few RSS sources, and the pipeline starts running. No developer required.',
  },
  {
    q: 'Is my content safe and private?',
    a: 'Yes. All data is encrypted at rest and in transit. We never use your content to train models. SOC 2 compliance is on our roadmap.',
  },
  {
    q: 'Which platforms does iCyberNinjitsu support?',
    a: 'LinkedIn is fully supported today. X (Twitter), Instagram, and Threads are in active development. The pipeline is channel-agnostic — your content adapts automatically.',
  },
  {
    q: 'Can my team use this together?',
    a: 'Multi-user workspaces with role-based access, approval chains, and audit trails are built in. From two-person teams to enterprise orgs.',
  },
  {
    q: 'What makes iCyberNinjitsu different from Hootsuite or Buffer?',
    a: 'Those are publishing schedulers. iCyberNinjitsu is a social operations system — trend detection, AI drafts in your brand voice, policy gates, moderation inbox, and crisis controls. Publishing is just one step in the pipeline.',
  },
  {
    q: 'Is there a free plan?',
    a: 'We offer a generous free tier to explore the full pipeline. Paid plans unlock team features, higher volume, and priority support.',
  },
];

/* ─── Mini SVG icons ─── */
function SignalIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788m13.788 0c3.808 3.808 3.808 9.98 0 13.788" /></svg>;
}
function TrendIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}
function DraftIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}
function ShieldIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
}
function ChannelIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>;
}
function InboxIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v6.75m-17.5 0v6a2.25 2.25 0 002.25 2.25h13a2.25 2.25 0 002.25-2.25v-6" /></svg>;
}
function AlertIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
}
function ChartIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
}

/* ─── Animated counter ─── */
function AnimatedValue({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <span
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {value}
    </span>
  );
}

/* ─── FAQ item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        className="w-full flex items-center justify-between py-5 text-left text-white hover:text-blue-300 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm sm:text-base font-medium pr-4">{q}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48 pb-5' : 'max-h-0'}`}>
        <p className="text-sm text-slate-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════ */

export default function Home() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );
    el.querySelectorAll('.astra-reveal').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const goToDashboard = () => {
    if ((isDev || showDevHints) && typeof window !== 'undefined') {
      const stored = localStorage.getItem('astra_token');
      if (!stored) localStorage.setItem('astra_token', DEV_TOKEN);
    }
    setNavigating(true);
    router.push('/dashboard');
  };

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // TODO: POST to waitlist API
    setJoined(true);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-x-hidden">
      {/* ─── Background: signal → story → channels ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute inset-0" style={{
          background:
            'radial-gradient(ellipse 40% 40% at 50% 38%, rgba(59,130,246,0.12), transparent),' +
            'radial-gradient(ellipse 30% 30% at 20% 35%, rgba(56,189,248,0.06), transparent),' +
            'radial-gradient(ellipse 30% 30% at 80% 40%, rgba(99,102,241,0.06), transparent)',
        }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute left-0 right-0 h-px top-[38%]" style={{
          background: 'linear-gradient(90deg, transparent 5%, rgba(59,130,246,0.15) 30%, rgba(59,130,246,0.25) 50%, rgba(129,140,248,0.15) 70%, transparent 95%)',
          animation: 'astra-spine-glow 4s ease-in-out infinite',
        }} />
        <div className="absolute top-[38%] left-1/2 w-[320px] h-[320px] rounded-full" style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          animation: 'astra-nexus-breathe 6s ease-in-out infinite',
        }} />
        <div className="absolute top-[38%] left-1/2 w-[200px] h-[200px] rounded-full border border-blue-500/[0.08]" style={{ animation: 'astra-ring-pulse 5s ease-in-out infinite' }} />
        <div className="absolute top-[38%] left-1/2 w-[400px] h-[400px] rounded-full border border-indigo-400/[0.04]" style={{ animation: 'astra-ring-pulse 7s ease-in-out infinite 1s' }} />
        {/* Signal particles */}
        {[
          { top: '30%', delay: '0s', dur: '8s', color: 'bg-cyan-400/60', size: 'w-1.5 h-1.5' },
          { top: '36%', delay: '1.5s', dur: '7s', color: 'bg-blue-400/50', size: 'w-1 h-1' },
          { top: '42%', delay: '3s', dur: '9s', color: 'bg-sky-400/55', size: 'w-1.5 h-1.5' },
          { top: '34%', delay: '4.5s', dur: '7.5s', color: 'bg-teal-400/45', size: 'w-1 h-1' },
          { top: '40%', delay: '6s', dur: '8.5s', color: 'bg-blue-300/50', size: 'w-1 h-1' },
          { top: '28%', delay: '2s', dur: '10s', color: 'bg-indigo-400/40', size: 'w-1 h-1' },
          { top: '44%', delay: '5s', dur: '9.5s', color: 'bg-cyan-300/45', size: 'w-1.5 h-1.5' },
        ].map((p, i) => (
          <div key={`sig-${i}`} className={`absolute rounded-full ${p.color} ${p.size}`} style={{ left: '4%', top: p.top, animation: `astra-signal-drift ${p.dur} ease-in-out ${p.delay} infinite` }} />
        ))}
        {/* Channel particles */}
        {[
          { fanY: '-12vh', delay: '0s', dur: '7s', color: 'bg-violet-400/50', size: 'w-1 h-1' },
          { fanY: '0px', delay: '1s', dur: '6s', color: 'bg-blue-400/55', size: 'w-1.5 h-1.5' },
          { fanY: '10vh', delay: '2s', dur: '8s', color: 'bg-indigo-400/50', size: 'w-1 h-1' },
          { fanY: '-6vh', delay: '3.5s', dur: '7.5s', color: 'bg-purple-400/45', size: 'w-1 h-1' },
          { fanY: '16vh', delay: '4.5s', dur: '9s', color: 'bg-fuchsia-400/40', size: 'w-1 h-1' },
        ].map((p, i) => (
          <div key={`ch-${i}`} className={`absolute rounded-full ${p.color} ${p.size}`} style={{ left: '52%', top: '38%', ['--fan-y' as string]: p.fanY, animation: `astra-channel-fan ${p.dur} ease-out ${p.delay} infinite` }} />
        ))}
        {/* Stage labels */}
        <div className="absolute top-[38%] left-0 right-0 flex items-center justify-between px-[8%] -translate-y-8 opacity-[0.07] text-[10px] font-mono tracking-widest text-white uppercase">
          {['signals', 'trends', 'story', 'draft', 'channels'].map((s, i) => (
            <span key={s} style={{ animation: `astra-stage-float 5s ease-in-out ${i * 0.5}s infinite` }}>{s}</span>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div ref={revealRef} className="relative z-10">

        {/* ═══ Header ═══ */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-6 max-w-7xl mx-auto">
          <a href="/" className="flex items-center gap-2.5 text-white/90 hover:text-white transition-colors" aria-label="iCyberNinjitsu home">
            <ICNLogo size={28} />
            <span className="text-lg font-semibold tracking-tight">iCyberNinjitsu</span>
          </a>
          <nav className="flex items-center gap-6">
            <a href="#how-it-works" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">How it works</a>
            <a href="#faq" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">FAQ</a>
            <button
              type="button"
              onClick={goToDashboard}
              disabled={navigating}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {navigating ? 'Opening...' : 'Dashboard →'}
            </button>
          </nav>
        </header>

        {/* ═══ Hero ═══ */}
        <section className="px-6 pt-16 pb-16 sm:pt-24 sm:pb-20 text-center max-w-4xl mx-auto">
          <p
            className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-slate-400 mb-8"
            style={{ animation: 'astra-fade-in-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.05s both' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
            Social operations platform
          </p>
          <h1
            className="astra-hero-title font-tech text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white mb-8"
            style={{ animation: 'astra-fade-in-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}
          >
            iCyberNinjitsu
          </h1>
          <p
            className="astra-hero-lead text-xl sm:text-2xl text-slate-300 font-medium max-w-2xl mx-auto mb-5"
            style={{ animation: 'astra-fade-in-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}
          >
            From signal to story. From draft to every channel.
          </p>
          <p
            className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto mb-12"
            style={{ animation: 'astra-fade-in-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}
          >
            iCyberNinjitsu watches the internet, surfaces trends, generates governed content, and publishes across platforms — so your brand moves fast and stays safe.
          </p>

          {/* Dual CTA */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animation: 'astra-fade-in-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both' }}
          >
            <button
              type="button"
              onClick={goToDashboard}
              disabled={navigating}
              className="icn-btn icn-btn-primary inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-wait"
            >
              {navigating ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Opening...
                </>
              ) : (
                'Start exploring'
              )}
            </button>
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-full transition-all duration-300 hover:scale-[1.02]"
            >
              Join the waitlist
            </a>
          </div>
        </section>

        {/* ═══ Social proof metrics ═══ */}
        <section className="px-6 py-10 border-y border-white/[0.04]">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
            {METRICS.map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                  <AnimatedValue value={m.value} />
                </p>
                <p className="text-sm text-slate-500">{m.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Product preview ═══ */}
        <section className="px-6 py-16 sm:py-20 max-w-5xl mx-auto">
          <div className="astra-reveal text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">See the pipeline in action</h2>
            <p className="text-slate-500 max-w-lg mx-auto">From raw internet signals to polished, governed posts — all in one view.</p>
          </div>
          {/* Dashboard mockup */}
          <div className="astra-reveal astra-reveal-delay-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-slate-600 ml-3 font-mono">app.icyberninjitsu.com/dashboard</span>
            </div>
            <div className="p-6 sm:p-8">
              {/* Mini pipeline visualization */}
              <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
                {['Sources', 'Trends', 'AI Draft', 'Review', 'Publish'].map((stage, i) => (
                  <div key={stage} className="flex items-center gap-3 shrink-0">
                    <div className={`px-4 py-2 rounded-lg text-xs font-medium border ${i < 3 ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                      {stage}
                    </div>
                    {i < 4 && (
                      <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              {/* Content cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Trending', title: 'AI governance frameworks gaining momentum', score: 92, tag: 'Cybersecurity' },
                  { label: 'Draft ready', title: 'Why CISOs are rethinking AI policy in 2026', score: 87, tag: 'AI' },
                  { label: 'Scheduled', title: 'Zero trust isn\'t optional anymore — here\'s why', score: 78, tag: 'Security' },
                ].map((card) => (
                  <div key={card.title} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider mb-2 ${card.label === 'Trending' ? 'text-emerald-400' : card.label === 'Draft ready' ? 'text-blue-400' : 'text-amber-400'}`}>
                      {card.label}
                    </span>
                    <p className="text-sm text-white font-medium mb-3 leading-snug">{card.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 rounded-full bg-white/5 px-2 py-0.5">{card.tag}</span>
                      <span className="text-[10px] text-slate-500">{card.score}% confidence</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ How iCyberNinjitsu works ═══ */}
        <section id="how-it-works" className="px-6 py-16 sm:py-24 max-w-5xl mx-auto scroll-mt-20" aria-labelledby="story-heading">
          <div className="text-center mb-20">
            <h2 id="story-heading" className="astra-reveal text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              How iCyberNinjitsu works
            </h2>
            <p className="astra-reveal astra-reveal-delay-1 text-slate-500 text-base sm:text-lg max-w-xl mx-auto">
              Six steps from internet noise to published, governed, multi-channel content.
            </p>
          </div>
          <div className="space-y-6">
            {STORY_STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`astra-reveal astra-reveal-delay-${(i % 4) + 1} group rounded-2xl bg-gradient-to-r ${step.accent} border border-white/[0.06] p-8 sm:p-10 transition-all duration-300 hover:border-white/[0.12]`}
              >
                <div className="flex items-start gap-6">
                  <span className="text-3xl font-black text-white/10 shrink-0 tabular-nums">{step.num}</span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Capabilities grid ═══ */}
        <section className="px-6 py-16 sm:py-24 max-w-6xl mx-auto" aria-labelledby="capabilities-heading">
          <div className="text-center mb-16">
            <h2 id="capabilities-heading" className="astra-reveal text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Everything you need to run social at scale
            </h2>
            <p className="astra-reveal astra-reveal-delay-1 text-slate-500 max-w-lg mx-auto">
              Not just a posting tool. A full operations system for content, compliance, and community.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {CAPABILITIES.map((c, i) => (
              <div
                key={c.label}
                className={`astra-reveal astra-reveal-delay-${(i % 4) + 1} rounded-2xl bg-white/[0.025] border border-white/[0.05] p-6 text-center transition-all hover:bg-white/[0.04] hover:border-white/[0.10] group`}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 group-hover:text-blue-400 transition-colors mb-4 mx-auto" aria-hidden>
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-white mb-1">{c.label}</h3>
                <p className="text-xs text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Testimonials ═══ */}
        <section className="px-6 py-16 sm:py-24 border-y border-white/[0.04]" aria-labelledby="testimonials-heading">
          <div className="max-w-6xl mx-auto">
            <h2 id="testimonials-heading" className="astra-reveal text-2xl sm:text-3xl font-bold text-white tracking-tight text-center mb-16">
              Trusted by forward-thinking teams
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className={`astra-reveal astra-reveal-delay-${i + 1} rounded-2xl bg-white/[0.025] border border-white/[0.06] p-8`}
                >
                  {/* Star rating */}
                  <div className="flex gap-0.5 mb-4">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-sm text-slate-300 leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Comparison callout ═══ */}
        <section className="px-6 py-16 sm:py-24 max-w-3xl mx-auto text-center">
          <h2 className="astra-reveal text-2xl sm:text-3xl font-bold text-white tracking-tight mb-6">
            Built different
          </h2>
          <p className="astra-reveal astra-reveal-delay-1 text-slate-400 text-base sm:text-lg leading-relaxed mb-10">
            Sprinklr, Hootsuite, Buffer — they&apos;re publishing tools with add-ons.<br className="hidden sm:block" />
            iCyberNinjitsu is a <span className="text-white font-medium">social operations system</span>: trend intelligence, governed pipelines, multi-channel output, and moderation — unified from day one.
          </p>
          <div className="astra-reveal astra-reveal-delay-2 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
            {['Trend→Narrative engine', 'Explainable momentum', 'Policy-as-code', 'Crisis kill switch', 'Approval chains', 'Asset library', 'Unified inbox'].map((tag) => (
              <span key={tag} className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5">{tag}</span>
            ))}
          </div>
        </section>

        {/* ═══ Security & compliance strip ═══ */}
        <section className="px-6 py-10 border-y border-white/[0.04]">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-slate-500">
            {[
              { icon: '🔐', text: 'Encrypted at rest & in transit' },
              { icon: '🛡️', text: 'SOC 2 on roadmap' },
              { icon: '🚫', text: 'We never train on your data' },
              { icon: '📋', text: 'Full audit trails' },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-sm">
                <span aria-hidden>{badge.icon}</span>
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" className="px-6 py-16 sm:py-24 max-w-3xl mx-auto scroll-mt-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="astra-reveal text-2xl sm:text-3xl font-bold text-white tracking-tight text-center mb-16">
            Frequently asked questions
          </h2>
          <div className="astra-reveal astra-reveal-delay-1">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ═══ Waitlist + final CTA ═══ */}
        <section id="waitlist" className="px-6 py-16 sm:py-24 border-t border-white/[0.04] scroll-mt-20">
          <div className="max-w-2xl mx-auto text-center">
            <ICNLogo size={64} animated className="mx-auto mb-8" />
            <h2 className="astra-reveal text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Ready to move faster?
            </h2>
            <p className="astra-reveal astra-reveal-delay-1 text-slate-500 mb-10 max-w-md mx-auto">
              Start with LinkedIn. Scale to every channel. Govern it all from one place.
            </p>

            {/* Waitlist form */}
            <div className="astra-reveal astra-reveal-delay-2 mb-8">
              {joined ? (
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  You&apos;re on the list. We&apos;ll be in touch.
                </div>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full sm:flex-1 px-5 py-3.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                  />
                  <button
                    type="submit"
                    className="icn-btn icn-btn-primary w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-500/20"
                  >
                    Join waitlist
                  </button>
                </form>
              )}
            </div>

            {/* Or go straight in */}
            <div className="astra-reveal astra-reveal-delay-3">
              <button
                type="button"
                onClick={goToDashboard}
                disabled={navigating}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                or explore the dashboard now →
              </button>
            </div>

            {/* Trust note */}
            <p className="astra-reveal astra-reveal-delay-4 mt-6 text-xs text-slate-600">
              No credit card required. Free tier available. Unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* ═══ Footer ═══ */}
        <footer className="px-6 py-12 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <ICNLogo size={20} />
              <span className="text-sm text-slate-500">iCyberNinjitsu</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <a href="#how-it-works" className="hover:text-slate-400 transition-colors">How it works</a>
              <a href="#faq" className="hover:text-slate-400 transition-colors">FAQ</a>
              <a href="#waitlist" className="hover:text-slate-400 transition-colors">Waitlist</a>
            </div>
            <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} iCyberNinjitsu. All rights reserved.</p>
          </div>
        </footer>

        {showDevHints && (
          <div className="px-6 py-4 border-t border-white/5">
            <p className="text-center text-xs text-slate-600">
              <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400/80 font-medium mb-1">Dev only</span>
              <br />
              API: <code className="bg-white/5 px-1.5 py-0.5 rounded text-slate-500">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
