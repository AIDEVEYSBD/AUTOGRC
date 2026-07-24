"use client";

import { useEffect, useRef, useState } from "react";

/* =========================================================================
   AutoGRC landing page
   Dark, EY-design-language marketing page (spectrum accents, squared, Arial).
   Standalone (no platform shell). Self-contained colors so it renders the
   same regardless of the app's light/dark theme. Fully responsive + animated.
   ========================================================================= */

const SPECTRUM = "linear-gradient(90deg,#FFE600,#FF7D1E,#FF32FF,#32FFFF,#FFE600)";

const ENTER_HREF = "/overview"; // middleware sends unauthenticated users to /login

const HERO_BARS = [
  { name: "SOC 2", pct: 95 },
  { name: "NIST CSF", pct: 91 },
  { name: "ISO 27001", pct: 88 },
  { name: "NIS2", pct: 72 },
];

const CAPABILITIES = [
  {
    no: "01", accent: "#FFE600", title: "Framework baselining & mapping",
    desc: "AI maps your internal controls to NIST, ISO 27001, CIS, SOC 2, NIS2 and more — surfacing overlaps, gaps and consolidation opportunities.",
    features: ["Control-to-control mapping with confidence scores", "15+ major frameworks and regulations", "Bidirectional mapping for evidence reuse"],
  },
  {
    no: "02", accent: "#188CE5", title: "Automated controls testing",
    desc: "Continuous, automated testing across your application portfolio. Connect your tools, define procedures, and let AutoGRC collect the evidence.",
    features: ["Integration with security tools and APIs", "Configurable schedules and sampling", "Automated evidence collection and storage"],
  },
  {
    no: "03", accent: "#2DB757", title: "Reporting & analytics",
    desc: "Generate audit-ready reports instantly. Track posture across frameworks, applications and business units with dynamic dashboards.",
    features: ["Real-time compliance dashboards", "Custom templates for any framework", "Export to Excel, PDF and audit portals"],
  },
];

const MAP_COLS = ["NIST", "ISO", "CIS", "SOC 2", "NIS2"];
const cell = (s: "full" | "partial" | "gap") => ({ s, color: s === "full" ? "#2DB757" : s === "partial" ? "#FF810A" : "transparent" });
const MAP_ROWS = [
  { ctrl: "Identity & access", cells: ["full", "full", "full", "full", "partial"] },
  { ctrl: "Asset management", cells: ["full", "partial", "full", "partial", "gap"] },
  { ctrl: "Risk assessment", cells: ["full", "full", "partial", "full", "full"] },
  { ctrl: "Data protection", cells: ["full", "full", "partial", "full", "partial"] },
  { ctrl: "Incident response", cells: ["full", "full", "full", "full", "full"] },
  { ctrl: "Continuous monitoring", cells: ["partial", "partial", "full", "partial", "gap"] },
  { ctrl: "Supplier risk", cells: ["partial", "full", "gap", "full", "partial"] },
  { ctrl: "Resilience & recovery", cells: ["full", "partial", "partial", "partial", "full"] },
].map((r) => ({ ctrl: r.ctrl, cells: (r.cells as ("full" | "partial" | "gap")[]).map(cell) }));

const CHART = [
  { label: "SOC 2", value: 95 },
  { label: "NIST", value: 91 },
  { label: "ISO", value: 88 },
  { label: "CIS", value: 84 },
];

/* ---- animation helpers ---- */

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(28px)",
        transition: `opacity .7s ${delay}ms cubic-bezier(.2,0,0,1), transform .7s ${delay}ms cubic-bezier(.2,0,0,1)`,
      }}
    >
      {children}
    </div>
  );
}

function CountUp({ to, suffix = "", className, style }: { to: number; suffix?: string; className?: string; style?: React.CSSProperties }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now(), dur = 1200;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(to * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else setVal(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref} className={className} style={style}>{Math.round(val).toLocaleString()}{suffix}</span>;
}

/* squared yellow→ghost CTA */
function CTA({ href, variant = "primary", children }: { href: string; variant?: "primary" | "ghost"; children: React.ReactNode }) {
  const base = "inline-flex h-[46px] items-center justify-center gap-2 px-6 text-[14px] font-bold transition-colors duration-200";
  if (variant === "primary") {
    return (
      <a href={href} className={`${base} border border-[#FFE600] bg-[#FFE600] text-[#1A1A24] hover:bg-[#1A1A24] hover:text-[#FFE600]`} style={{ letterSpacing: "-0.01em" }}>
        {children}
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="2" y1="9" x2="15" y2="9" /><path d="M10 4 L15 9 L10 14" /></svg>
      </a>
    );
  }
  return (
    <a href={href} className={`${base} border border-[#5A5A66] bg-transparent text-white hover:border-[#FFE600] hover:text-[#FFE600]`} style={{ letterSpacing: "-0.01em" }}>
      {children}
    </a>
  );
}

function ApproachLine({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  const staticOpacity = [1, 0.55, 0.32];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 ${animate ? "agrc-sq" : ""}`}
            style={{ background: "#FFE600", animationDelay: animate ? `${i * 0.3}s` : undefined, opacity: animate ? undefined : staticOpacity[i] }}
          />
        ))}
      </div>
      <span className="text-[13px] font-bold leading-tight text-white" style={{ letterSpacing: "-0.01em" }}>
        Map once. Test always. Prove instantly.
      </span>
    </div>
  );
}

/* ---- hero live-posture card with animated bars ---- */
function HeroCard() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className="relative w-full">
      <div className="spectrum-frame" style={{ "--surface": "#23232E" } as React.CSSProperties}>
        <div className="relative flex flex-col gap-5 p-6 sm:p-7">
          <div className="absolute left-6 right-6 top-0 h-0.5 sm:left-7 sm:right-7" style={{ background: "#FFE600", opacity: 0.9 }} />
          <div className="flex items-start justify-between gap-4 pt-1.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-[#9A9AA6]" style={{ letterSpacing: "-0.01em" }}>Live compliance posture</span>
              <span className="inline-flex items-center gap-2 text-[11px] text-[#747480]"><span className="h-[7px] w-[7px]" style={{ background: "#2DB757" }} />Updated 2 hours ago</span>
            </div>
            <span className="whitespace-nowrap px-2.5 py-1 text-[11px] font-bold text-[#1A1A24]" style={{ background: "#FFE600" }}>6 frameworks</span>
          </div>
          <div className="flex items-end gap-3.5">
            <CountUp to={87} suffix="%" className="text-[64px] font-bold leading-[0.85] text-[#FFE600] sm:text-[84px]" style={{ letterSpacing: "-0.04em" }} />
            <span className="max-w-[150px] pb-3 text-[13px] leading-snug text-[#C4C4CD]">controls aligned and continuously tested</span>
          </div>
          <div className="flex flex-col gap-3 border-t border-[#34343F] pt-5">
            {HERO_BARS.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="w-[74px] flex-none text-[12px] font-bold text-white">{b.name}</span>
                <div className="h-2.5 flex-1" style={{ background: "#34343F" }}>
                  <div style={{ height: "100%", width: inView ? `${b.pct}%` : "0%", background: "#188CE5", transition: `width 1s ${i * 0.12}s cubic-bezier(.2,0,0,1)` }} />
                </div>
                <span className="w-9 flex-none text-right text-[12px] font-bold text-[#C4C4CD]">{b.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- light-section bar chart in a spectrum frame ---- */
function DataChart() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const max = 100;
  return (
    <div ref={ref} className="spectrum-frame" style={{ "--surface": "#FFFFFF" } as React.CSSProperties}>
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <span className="text-[13px] font-bold text-[#1A1A24]" style={{ letterSpacing: "-0.01em" }}>Compliance by framework (%)</span>
        <div className="flex items-end justify-between gap-3 sm:gap-5" style={{ height: 280 }}>
          {CHART.map((d, i) => (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[13px] font-bold text-[#1A1A24]">{d.value}%</span>
              <div className="flex w-full items-end justify-center" style={{ height: "100%" }}>
                <div style={{ width: "100%", maxWidth: 56, height: inView ? `${(d.value / max) * 100}%` : "0%", background: i === 0 ? "#FFE600" : "#188CE5", transition: `height .9s ${i * 0.1}s cubic-bezier(.2,0,0,1)` }} />
              </div>
              <span className="text-[12px] font-bold text-[#747480]">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, context, source, highlight = false }: { label: string; value: string; context: string; source: string; highlight?: boolean }) {
  return (
    <div className="relative flex min-h-[160px] flex-col gap-1.5 border p-5" style={{ background: "#FFFFFF", borderColor: "#C4C4CD" }}>
      {highlight && <div className="absolute left-0 right-0 top-0 h-1" style={{ background: "#FFE600" }} />}
      <span className="text-[12px] font-bold text-[#747480]" style={{ letterSpacing: "-0.01em" }}>{label}</span>
      <span className="text-[40px] font-bold leading-none text-[#1A1A24]" style={{ letterSpacing: "-0.035em" }}>{value}</span>
      <span className="text-[13px] text-[#2E2E38]">{context}</span>
      <span className="mt-auto pt-2 text-[11px] text-[#747480]">{source}</span>
    </div>
  );
}

function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <span className={`font-bold leading-none text-[#FFE600] ${size === "lg" ? "text-[24px]" : "text-[20px]"}`} style={{ letterSpacing: "-0.03em" }}>AutoGRC</span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[10px] text-[#9A9AA6]">Automated assurance</span>
      </span>
    </a>
  );
}

export default function LandingPage() {
  return (
    <div id="top" className="min-h-screen w-full overflow-x-hidden" style={{ background: "#1A1A24", color: "#fff", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        .spectrum-frame {
          border: 12px solid transparent;
          background:
            linear-gradient(var(--surface), var(--surface)) padding-box,
            ${SPECTRUM} border-box;
          background-size: 100% 100%, 300% 100%;
          animation: agrcSpectrum 9s linear infinite;
        }
        @keyframes agrcSpectrum { to { background-position: 0 0, -300% 0; } }
        .agrc-sq { animation: agrcGlow 1.8s ease-in-out infinite; }
        @keyframes agrcGlow { 0%, 100% { opacity: .28; } 50% { opacity: 1; } }
        @media (max-width: 640px){ .spectrum-frame{ border-width: 8px; } }
        @media (prefers-reduced-motion: reduce){ .spectrum-frame, .agrc-sq { animation: none; } }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: "rgba(26,26,36,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid #2E2E38" }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-5 py-3.5 sm:px-8">
          <Logo />
          <nav className="ml-auto flex items-center gap-1">
            <a href="#capabilities" className="hidden px-3 py-2 text-[13px] font-bold text-[#C4C4CD] transition-colors hover:text-white md:block" style={{ letterSpacing: "-0.01em" }}>Capabilities</a>
            <a href="#coverage" className="hidden px-3 py-2 text-[13px] font-bold text-[#C4C4CD] transition-colors hover:text-white md:block" style={{ letterSpacing: "-0.01em" }}>Coverage</a>
            <a href="#platform" className="hidden px-3 py-2 text-[13px] font-bold text-[#C4C4CD] transition-colors hover:text-white md:block" style={{ letterSpacing: "-0.01em" }}>Platform</a>
            <div className="mx-2 hidden h-5 w-px md:block" style={{ background: "#2E2E38" }} />
            <a href={ENTER_HREF} className="inline-flex h-[40px] items-center gap-2 border border-[#FFE600] bg-[#FFE600] px-4 text-[13px] font-bold text-[#1A1A24] transition-colors hover:bg-[#1A1A24] hover:text-[#FFE600]" style={{ letterSpacing: "-0.01em" }}>Enter platform</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-14 pt-16 sm:px-8 sm:pt-20" style={{ background: "#1A1A24" }}>
        {/* ambient glow */}
        <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] -translate-y-1/4 translate-x-1/4" style={{ background: "radial-gradient(circle, rgba(255,230,0,0.12), transparent 70%)" }} />
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <Reveal>
            <div className="flex flex-col gap-6">
              <span className="inline-flex items-center gap-2.5 text-[12px] font-bold text-[#9A9AA6]" style={{ letterSpacing: "0.02em" }}>
                <span className="h-0.5 w-6" style={{ background: "#FFE600" }} />Automated cyber governance
              </span>
              <h1 className="m-0 font-bold" style={{ fontSize: "clamp(34px,5.6vw,80px)", lineHeight: 1.0, letterSpacing: "-0.03em" }}>
                <span className="block">How do you prove compliance</span>
                <span className="block text-[#FFE600] sm:pl-[14%]">the moment someone asks?</span>
              </h1>
              <p className="m-0 max-w-[520px] text-[17px] leading-relaxed text-[#C4C4CD] sm:text-[20px]" style={{ letterSpacing: "-0.01em" }}>
                AutoGRC maps your controls to every framework, tests them continuously, and turns weeks of audit prep into minutes of intelligent automation.
              </p>
              <div className="mt-1 flex flex-wrap gap-3.5">
                <CTA href={ENTER_HREF} variant="primary">Enter platform</CTA>
                <CTA href="#capabilities" variant="ghost">See how it works</CTA>
              </div>
              <ApproachLine className="mt-4" animate />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <HeroCard />
          </Reveal>
        </div>
      </section>

      {/* Narrative */}
      <section className="px-5 py-20 sm:px-8 sm:py-24" style={{ background: "#1A1A24" }}>
        <Reveal className="mx-auto max-w-[900px]">
          <span className="text-[12px] font-bold text-[#9A9AA6]" style={{ letterSpacing: "-0.01em" }}>The compliance challenge</span>
          <h2 className="m-0 mb-8 mt-3.5 font-bold" style={{ fontSize: "clamp(26px,3.6vw,44px)", lineHeight: 1.1, letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}>
            <span className="text-[#FFE600]">“</span>How do you keep controls aligned to every framework when the rules keep changing?
          </h2>
          <div className="flex flex-col gap-5 border-l-2 pl-5 sm:pl-7" style={{ borderColor: "#FFE600" }}>
            <p className="m-0 text-[16px] leading-relaxed text-[#C4C4CD] sm:text-[18px]" style={{ letterSpacing: "-0.01em" }}>
              AutoGRC maps your control library to NIST, ISO 27001, CIS, SOC 2 and NIS2 with AI confidence scoring — then tests every control continuously against your live environment.
            </p>
            <p className="m-0 text-[16px] leading-relaxed text-white sm:text-[18px]" style={{ letterSpacing: "-0.01em" }}>
              Audit-ready evidence is generated in minutes, your posture is always current, and teams stop running the same assessment six times over.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24" style={{ background: "#1A1A24" }}>
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <span className="text-[12px] font-bold text-[#9A9AA6]" style={{ letterSpacing: "-0.01em" }}>Core capabilities</span>
            <h2 className="m-0 mb-2 mt-3.5 max-w-[760px] font-bold" style={{ fontSize: "clamp(28px,4vw,52px)", lineHeight: 1.06, letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}>
              Three modules that turn compliance from a project into a property of the system.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-px md:grid-cols-3" style={{ background: "#2E2E38", border: "1px solid #2E2E38" }}>
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.no} delay={i * 90}>
                <div className="relative flex h-full flex-col gap-4 p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-[#23232E]" style={{ background: "#1A1A24" }}>
                  <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: c.accent }} />
                  <span className="text-[13px] font-bold text-[#747480]" style={{ letterSpacing: "0.02em" }}>{c.no}</span>
                  <h3 className="m-0 text-[22px] font-bold leading-tight text-white" style={{ letterSpacing: "-0.02em" }}>{c.title}</h3>
                  <p className="m-0 text-[15px] leading-relaxed text-[#C4C4CD]" style={{ letterSpacing: "-0.01em" }}>{c.desc}</p>
                  <div className="mt-1.5 flex flex-col gap-3 border-t pt-4" style={{ borderColor: "#2E2E38" }}>
                    {c.features.map((f) => (
                      <div key={f} className="flex items-start gap-3">
                        <span className="mt-1 h-[9px] w-[9px] flex-none" style={{ background: "#FFE600" }} />
                        <span className="text-[13px] leading-snug text-[#C4C4CD]" style={{ letterSpacing: "-0.01em" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage matrix */}
      <section id="coverage" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24" style={{ background: "#23232E" }}>
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-[640px]">
                <span className="text-[12px] font-bold text-[#9A9AA6]" style={{ letterSpacing: "-0.01em" }}>One control library</span>
                <h2 className="m-0 mt-3.5 font-bold" style={{ fontSize: "clamp(26px,3.6vw,46px)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}>Map once. Satisfy every framework.</h2>
              </div>
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-2 text-[12px] text-[#C4C4CD]"><span className="h-3 w-3" style={{ background: "#2DB757" }} />Full</span>
                <span className="inline-flex items-center gap-2 text-[12px] text-[#C4C4CD]"><span className="h-3 w-3" style={{ background: "#FF810A" }} />Partial</span>
                <span className="inline-flex items-center gap-2 text-[12px] text-[#C4C4CD]"><span className="h-3 w-3" style={{ border: "1px solid #5A5A66" }} />Gap</span>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <div className="overflow-x-auto" style={{ background: "#1A1A24", border: "1px solid #34343F" }}>
              <div className="min-w-[560px] px-6 py-6 sm:px-8">
                <div className="grid items-center gap-2.5 border-b pb-3.5" style={{ gridTemplateColumns: "1.5fr repeat(5,1fr)", borderColor: "#34343F" }}>
                  <span className="text-[11px] font-bold text-[#747480]">Control area</span>
                  {MAP_COLS.map((col) => <span key={col} className="text-center text-[11px] font-bold text-[#747480]">{col}</span>)}
                </div>
                {MAP_ROWS.map((row) => (
                  <div key={row.ctrl} className="grid items-center gap-2.5 border-b py-2.5 transition-colors hover:bg-[#23232E]" style={{ gridTemplateColumns: "1.5fr repeat(5,1fr)", borderColor: "#2E2E38" }}>
                    <span className="text-[13px] font-bold text-white" style={{ letterSpacing: "-0.01em" }}>{row.ctrl}</span>
                    {row.cells.map((c, i) => (
                      <div key={i} className="flex h-[30px] items-center justify-center">
                        <div className="h-full w-full" style={{ background: c.color, border: "1px solid #34343F" }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Platform (light) */}
      <section id="platform" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24" style={{ background: "#F6F6FA", color: "#1A1A24" }}>
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <Reveal>
            <div>
              <span className="text-[12px] font-bold text-[#747480]" style={{ letterSpacing: "-0.01em" }}>Real-time visibility</span>
              <h2 className="m-0 mb-5 mt-3.5 font-bold" style={{ fontSize: "clamp(26px,3.6vw,46px)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}>Your compliance posture, live — not quarterly.</h2>
              <p className="m-0 mb-7 max-w-[460px] text-[16px] leading-relaxed text-[#2E2E38] sm:text-[17px]" style={{ letterSpacing: "-0.01em" }}>
                Dynamic dashboards track control effectiveness across every framework, application and business unit — so you walk into any audit already prepared.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard label="Controls automated" value="1,284" context="of 1,612 total controls" source="80% automation coverage" />
                <MetricCard label="Audit readiness" value="94%" context="SOC 2 Type II" source="Next audit · Q3 2026" highlight />
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <DataChart />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-24 sm:px-8 sm:py-28" style={{ background: "#1A1A24" }}>
        <Reveal className="mx-auto flex max-w-[1100px] flex-col gap-7">
          <h2 className="m-0 font-bold" style={{ fontSize: "clamp(32px,5vw,72px)", lineHeight: 1.02, letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}>
            <span className="block">What could your team do with the</span>
            <span className="block text-[#FFE600]">weeks you&apos;d get back?</span>
          </h2>
          <p className="m-0 max-w-[560px] text-[17px] leading-relaxed text-[#C4C4CD] sm:text-[19px]" style={{ letterSpacing: "-0.01em" }}>
            Bring your control library. AutoGRC handles the mapping, the testing and the evidence — across every framework you answer to.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3.5">
            <CTA href={ENTER_HREF} variant="primary">Enter platform</CTA>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="px-5 pb-9 pt-16 sm:px-8" style={{ background: "#1A1A24", borderTop: "1px solid #2E2E38" }}>
        <div className="mx-auto grid max-w-[1280px] gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <ApproachLine />
            <p className="m-0 mt-7 max-w-[340px] text-[11px] leading-relaxed text-[#747480]">
              Internal demonstration build for evaluation purposes only. No client data. Private and confidential. © 2026 AutoGRC.
            </p>
          </div>
          <nav className="flex flex-col gap-2.5">
            <span className="mb-1 text-[12px] font-bold text-[#C4C4CD]">Platform</span>
            <a href="#capabilities" className="text-[14px] text-white transition-colors hover:text-[#FFE600]" style={{ letterSpacing: "-0.01em" }}>Capabilities</a>
            <a href="#coverage" className="text-[14px] text-white transition-colors hover:text-[#FFE600]" style={{ letterSpacing: "-0.01em" }}>Framework coverage</a>
            <a href="#platform" className="text-[14px] text-white transition-colors hover:text-[#FFE600]" style={{ letterSpacing: "-0.01em" }}>Dashboards</a>
          </nav>
          <div className="flex flex-col items-start justify-between gap-6">
            <a href="#top" className="text-[22px] font-bold leading-none text-[#FFE600]" style={{ letterSpacing: "-0.03em" }}>AutoGRC</a>
            <a href={ENTER_HREF} className="inline-flex h-[42px] items-center gap-2 border border-[#5A5A66] px-5 text-[13px] font-bold text-white transition-colors hover:border-[#FFE600] hover:text-[#FFE600]" style={{ letterSpacing: "-0.01em" }}>Enter platform</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
