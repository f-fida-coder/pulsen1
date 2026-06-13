import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { trpc } from "@/lib/trpc";
import { Sun, BatteryCharging, RadioTower, Coins, Bell, MoreVertical, BrainCircuit, ChevronRight, ChevronDown, AlertTriangle, User, EyeOff, TrendingUp, ShieldCheck, Shield, Star, Crown, Check, Zap, Leaf, Calendar, Cloud, CloudSun, CloudRain, Info, PlugZap, ArrowRight, Quote, X, Headphones, BarChart3, Monitor, Search, FileText, Trophy, Lock, ChevronsRight, Mail, Phone, MapPin, Linkedin, Twitter, Facebook } from "lucide-react";

// ─── Design tokens (dark theme) ─────────────────────────────────────────────
const C = {
  bg: "#05090A",        // page background — near-black
  card: "#0A1411",      // panels / cards
  secondary: "#0E1A16", // inner tiles / surfaces
  border: "#19302A",    // hairline borders
  text: "#F4F8F6",      // primary text (light)
  muted: "#8499A0",     // secondary text
  gold: "#E0B23E",      // amber accent (AI card, logo CARE)
  goldDark: "#C2922A",
  green: "#2FD3A5",     // mint/teal — primary accent
  greenDark: "#23B68C",
  red: "#E0796B",
  elevated: "#02060A",  // deepest surface (footer / highlight contrast)
};

const LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/solpulsen-care-logo-4k_ce5a0a3a.webp";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function GoldLine() {
  return <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.goldDark})`, marginBottom: 20 }} />;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "Inter, sans-serif",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: C.gold,
    }}>
      {children}
    </span>
  );
}

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2 style={{
      fontFamily: "Playfair Display, serif",
      fontSize: "clamp(30px, 3.2vw, 48px)",
      fontWeight: 600,
      color: C.text,
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
      textAlign: center ? "center" : "left",
    }}>
      {children}
    </h2>
  );
}

// ─── 1. NAVBAR ────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const links = [
    { label: "Paket", href: "#packages" },
    { label: "Re-CARE", href: "#recare" },
    { label: "Innehåll", href: "#features" },
    { label: "Support", href: "#contact" },
  ];

  const linkStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: 500,
    color: C.text,
    textDecoration: "none",
    letterSpacing: "0.02em",
    transition: "color 0.2s",
  };

  return (
    <nav style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      transition: "all 0.35s ease",
    }}>
      <div style={{
        position: "relative",
        maxWidth: 1280,
        margin: "14px auto 0",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.08)`,
        background: scrolled ? "rgba(6,12,11,0.92)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(14px)",
        boxShadow: scrolled ? "0 8px 30px rgba(0,0,0,0.45)" : "none",
        transition: "all 0.35s ease",
      }}>
        {/* Logo (left) */}
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src={LOGO} alt="Solpulsen CARE" style={{ height: 46, width: "auto", objectFit: "contain" }} />
        </a>

        {/* Center links (desktop) */}
        <div className="care-nav-desktop" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", gap: 40 }}>
          {links.map(l => (
            <a key={l.href} href={l.href} style={linkStyle}
              onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.color = C.text)}
            >{l.label}</a>
          ))}
        </div>

        {/* Login (right, desktop) */}
        <a href="/login" className="care-nav-desktop" style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: C.text,
          textDecoration: "none",
          padding: "9px 22px",
          border: `1px solid rgba(255,255,255,0.22)`,
          borderRadius: 8,
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = C.text; }}
        >Logga in</a>

        {/* Mobile hamburger */}
        <button className="care-nav-mobile" onClick={() => setMobileOpen(!mobileOpen)} style={{
          display: "none", background: "none", border: "none", cursor: "pointer", padding: 8,
        }}>
          <div style={{ width: 22, height: 2, background: C.text, marginBottom: 5, transition: "all 0.2s", transform: mobileOpen ? "rotate(45deg) translateY(7px)" : "none" }} />
          <div style={{ width: 22, height: 2, background: C.text, marginBottom: 5, opacity: mobileOpen ? 0 : 1, transition: "opacity 0.2s" }} />
          <div style={{ width: 22, height: 2, background: C.text, transition: "all 0.2s", transform: mobileOpen ? "rotate(-45deg) translateY(-7px)" : "none" }} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: "20px 32px" }} className="care-nav-mobile">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{ ...linkStyle, display: "block", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>{l.label}</a>
          ))}
          <a href="/login" onClick={() => setMobileOpen(false)} style={{ ...linkStyle, display: "block", padding: "12px 0", fontWeight: 600, color: C.gold }}>Logga in</a>
        </div>
      )}
    </nav>
  );
}

// ─── Hero dashboard sub-visuals ───────────────────────────────────────────────
function Sparkline({ points, color = C.green }: { points: string; color?: string }) {
  return (
    <svg width="100%" height="30" viewBox="0 0 120 30" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressMini({ pct, color = C.green }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.greenDark}, ${color})`, borderRadius: 4, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}

function MiniBars({ heights, color = C.green }: { heights: number[]; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 30 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, background: color, opacity: 0.45 + h / 200, borderRadius: 1.5 }} />
      ))}
    </div>
  );
}

// Stylized "energy home" scene — solar house → battery → grid pylon with glowing links
function HouseScene() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 170" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <defs>
        <filter id="tealGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="roofGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#123" />
          <stop offset="1" stopColor="#0a1f1a" />
        </linearGradient>
      </defs>

      {/* ground glow line */}
      <line x1="14" y1="146" x2="226" y2="146" stroke={C.border} strokeWidth="1" />

      {/* glowing energy links: house -> battery -> pylon */}
      <path d="M70,140 L70,150 L150,150 L150,138" fill="none" stroke={C.green} strokeWidth="2" filter="url(#tealGlow)" opacity="0.9" />
      <path d="M150,150 L196,150 L196,128" fill="none" stroke={C.green} strokeWidth="2" filter="url(#tealGlow)" opacity="0.9" />
      <circle cx="110" cy="150" r="2.4" fill="#9af5db" />
      <circle cx="174" cy="150" r="2.4" fill="#9af5db" />

      {/* house body */}
      <rect x="40" y="86" width="64" height="54" rx="3" fill="#0c1c17" stroke={C.border} strokeWidth="1.2" />
      {/* roof */}
      <polygon points="34,88 72,56 110,88" fill="url(#roofGrad)" stroke="rgba(47,211,165,0.35)" strokeWidth="1.2" />
      {/* solar panel grid on roof */}
      <g stroke="rgba(47,211,165,0.55)" strokeWidth="0.8" fill="rgba(47,211,165,0.10)">
        <polygon points="46,84 71,64 78,64 56,84" />
        <polygon points="58,84 80,64 87,64 68,84" />
        <polygon points="70,84 89,64 98,84" />
      </g>
      {/* lit window */}
      <rect x="56" y="104" width="14" height="16" rx="1.5" fill="rgba(224,178,62,0.9)" />
      <rect x="78" y="104" width="14" height="16" rx="1.5" fill="rgba(224,178,62,0.35)" />

      {/* battery unit */}
      <rect x="128" y="100" width="26" height="38" rx="4" fill="#0c1c17" stroke="rgba(47,211,165,0.45)" strokeWidth="1.2" />
      <rect x="136" y="96" width="10" height="5" rx="1.5" fill="rgba(47,211,165,0.6)" />
      <rect x="132" y="118" width="18" height="6" rx="2" fill={C.green} filter="url(#tealGlow)" />
      <rect x="132" y="128" width="12" height="4" rx="2" fill="rgba(47,211,165,0.5)" />

      {/* grid pylon */}
      <g stroke={C.muted} strokeWidth="1.4" fill="none" opacity="0.85">
        <line x1="196" y1="60" x2="186" y2="128" />
        <line x1="196" y1="60" x2="206" y2="128" />
        <line x1="190" y1="92" x2="202" y2="92" />
        <line x1="188" y1="110" x2="204" y2="110" />
        <line x1="180" y1="72" x2="212" y2="72" />
        <line x1="184" y1="80" x2="208" y2="80" />
      </g>
    </svg>
  );
}

// "Energiflöde idag" multi-series line chart
function FlowChart() {
  const grid = [14, 40, 66, 92, 118];
  const yLabels = ["10", "5", "0", "-5", "-10"];
  const xLabels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];
  return (
    <svg width="100%" height="150" viewBox="0 0 380 150" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="solFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.green} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.green} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines + y labels */}
      {grid.map((y, i) => (
        <g key={y}>
          <line x1="34" y1={y} x2="372" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x="28" y={y + 3} textAnchor="end" fontSize="8" fill={C.muted} fontFamily="Inter, sans-serif">{yLabels[i]}</text>
        </g>
      ))}
      <text x="34" y="6" fontSize="8" fill={C.muted} fontFamily="Inter, sans-serif">kW</text>
      {/* x labels */}
      {xLabels.map((l, i) => (
        <text key={l} x={34 + (i * (338 / 6))} y="138" textAnchor="middle" fontSize="7.5" fill={C.muted} fontFamily="Inter, sans-serif">{l}</text>
      ))}
      {/* Solproduktion area + line */}
      <path d="M38,66 C90,64 150,30 205,24 C260,30 320,62 372,66 L372,66 L38,66 Z" fill="url(#solFill)" />
      <path d="M38,66 C90,64 150,30 205,24 C260,30 320,62 372,66" fill="none" stroke={C.green} strokeWidth="2" />
      {/* Förbrukning */}
      <path d="M38,52 C80,46 110,40 140,48 C180,58 230,40 270,46 C310,50 340,56 372,50" fill="none" stroke="#D7E0DC" strokeWidth="1.6" />
      {/* Nätexport */}
      <path d="M38,64 C90,60 150,78 205,92 C260,80 320,62 372,60" fill="none" stroke={C.gold} strokeWidth="1.6" />
      {/* Batteri */}
      <path d="M38,70 C90,72 150,60 205,58 C260,60 320,70 372,68" fill="none" stroke="#5FE6C6" strokeWidth="1.4" strokeDasharray="3 3" />
    </svg>
  );
}

// ─── 2. HERO ──────────────────────────────────────────────────────────────────
function Hero() {
  const kpis = [
    { Icon: Sun, iconColor: C.gold, value: "8.4", unit: "kW", label: "Solproduktion", viz: <Sparkline points="0,26 15,22 30,24 45,16 60,18 75,10 90,12 105,5 120,7" /> },
    { Icon: BatteryCharging, iconColor: C.green, value: "87", unit: "%", label: "Batterikapacitet", viz: <ProgressMini pct={87} /> },
    { Icon: RadioTower, iconColor: C.muted, value: "2.1", unit: "kW", label: "Nätexport", viz: <Sparkline points="0,18 15,22 30,14 45,20 60,12 75,18 90,10 105,16 120,11" /> },
    { Icon: Coins, iconColor: C.gold, value: "43", unit: "kr", label: "Besparing idag", viz: <MiniBars heights={[35, 50, 42, 65, 55, 78, 70, 92]} /> },
  ];

  return (
    <section style={{ position: "relative", background: `radial-gradient(1100px 560px at 78% 16%, rgba(47,211,165,0.12), transparent 62%), ${C.bg}`, paddingTop: 150, paddingBottom: 90, overflow: "hidden" }}>
      {/* faint dotted grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "26px 26px", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.18fr", gap: 56, alignItems: "center" }} className="care-hero-grid">
          {/* Left: text */}
          <FadeIn>
            <h1 style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(72px, 9.5vw, 150px)",
              fontWeight: 800,
              color: C.text,
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
              marginBottom: 16,
            }}>
              CARE.
            </h1>
            <h2 style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "clamp(20px, 2.1vw, 28px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: C.green,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              marginBottom: 26,
            }}>
              AI, trygghet och optimering för ditt energisystem.
            </h2>
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              lineHeight: 1.75,
              color: C.muted,
              maxWidth: 470,
              marginBottom: 38,
            }}>
              Med Solpulsen CARE får du dygnet-runt-övervakning av ditt energisystem, AI-driven optimering för maximal besparing och detaljerade realtidsrapporter direkt i din portal. Vi garanterar trygghet och långsiktig prestanda.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <a href="#packages" style={{
                display: "inline-block",
                padding: "15px 36px",
                background: C.green,
                color: "#04130E",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.03em",
                textDecoration: "none",
                borderRadius: 8,
                boxShadow: "0 8px 32px rgba(47,211,165,0.30)",
                transition: "background 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = C.greenDark)}
                onMouseLeave={e => (e.currentTarget.style.background = C.green)}
              >Se CARE-paket</a>

              <a href="#contact" style={{
                display: "inline-block",
                padding: "15px 36px",
                background: "transparent",
                color: C.green,
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.03em",
                textDecoration: "none",
                borderRadius: 8,
                border: `1px solid ${C.green}`,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(47,211,165,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >Boka genomgång</a>
            </div>
          </FadeIn>

          {/* Right: live dashboard preview */}
          <FadeIn delay={200} className="care-hero-visual">
            <div style={{
              background: "linear-gradient(160deg, #0d1f19, #08140f)",
              borderRadius: 20,
              padding: "22px 22px 20px",
              boxShadow: "0 0 100px rgba(47,211,165,0.20), 0 30px 90px rgba(0,0,0,0.6)",
              border: `1px solid rgba(47,211,165,0.30)`,
              position: "relative",
            }}>
              {/* header */}
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: "livePulse 2s ease-in-out infinite" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 700, color: C.text, letterSpacing: "0.08em", textTransform: "uppercase" }}>System aktivt</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, color: C.muted }}>
                  <Bell size={16} strokeWidth={1.6} />
                  <MoreVertical size={16} strokeWidth={1.6} />
                </div>
              </div>

              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                {kpis.map(k => (
                  <div key={k.label} style={{
                    background: "rgba(255,255,255,0.025)",
                    borderRadius: 12,
                    padding: "14px 12px 12px",
                    border: `1px solid ${C.border}`,
                  }}>
                    <k.Icon size={17} strokeWidth={1.7} color={k.iconColor} style={{ marginBottom: 10 }} />
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>{k.value}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.muted, fontWeight: 500 }}>{k.unit}</span>
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.muted, margin: "2px 0 10px" }}>{k.label}</div>
                    {k.viz}
                  </div>
                ))}
              </div>

              {/* middle: house + flow chart */}
              <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.3fr", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 12, border: `1px solid ${C.border}`, padding: 8, minHeight: 168 }}>
                  <HouseScene />
                </div>
                <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 12px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.text, letterSpacing: "0.08em", textTransform: "uppercase" }}>Energiflöde idag</span>
                    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontFamily: "Inter, sans-serif", fontSize: 10, color: C.muted, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px" }}>
                      Idag <ChevronDown size={11} />
                    </span>
                  </div>
                  <FlowChart />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 4 }}>
                    {[
                      { l: "Solproduktion", c: C.green },
                      { l: "Förbrukning", c: "#D7E0DC" },
                      { l: "Nätexport", c: C.gold },
                      { l: "Batteri", c: "#5FE6C6" },
                    ].map(it => (
                      <span key={it.l} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 9.5, color: C.muted }}>
                        <span style={{ width: 12, height: 2.5, borderRadius: 2, background: it.c }} />{it.l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI recommendation banner */}
              <div style={{
                background: "linear-gradient(135deg, rgba(224,178,62,0.10), rgba(224,178,62,0.02))",
                borderRadius: 12,
                padding: "14px 16px",
                border: `1px solid rgba(224,178,62,0.45)`,
                display: "flex",
                gap: 13,
                alignItems: "center",
                boxShadow: "0 0 26px rgba(224,178,62,0.10)",
              }}>
                <BrainCircuit size={26} strokeWidth={1.5} color={C.gold} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 700, color: C.gold, marginBottom: 3 }}>AI Rekommendation</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "rgba(244,248,246,0.78)", lineHeight: 1.5 }}>
                    Ladda batteriet nu — spotpriset stiger med 38% kl. 17–20.<br />Beräknad besparing: +67 kr.
                  </div>
                </div>
                <ChevronRight size={20} strokeWidth={1.8} color={C.gold} style={{ flexShrink: 0 }} />
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── SOCIAL PROOF BAR ────────────────────────────────────────────────────
function SocialProof() {
  const items = [
    { label: "För system från flera olika fabrikat", icon: "✓" },
    { label: "För kunder som blivit lämnade utan support", icon: "✓" },
    { label: "Byggt för långsiktig drift, inte engångsförsäljning", icon: "✓" },
  ];
  return (
    <section style={{ background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "28px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
        {items.map(it => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: C.green, fontSize: 14, fontWeight: 700 }}>{it.icon}</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: C.muted, letterSpacing: "0.01em" }}>{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── 3. WHY CARE EXISTS (problemstatement) ────────────────────────────────────
function WhyCareExists() {
  const RED = "#E0654F";
  const cards = [
    {
      num: "01",
      title: "Installatörer försvinner",
      text: "Marknadskonsolidering gör att installatörer försvinner eller slutar erbjuda stöd för äldre system och lösningar. Kunden blir utan support.",
      Icon: User,
    },
    {
      num: "02",
      title: "System utan övervakning",
      text: "Utan aktiv övervakning är det ingen som upptäcker fel eller driftstörningar. Små problem blir stora – ofta utan att någon märker det på månader.",
      Icon: EyeOff,
    },
    {
      num: "03",
      title: "Elkostnader ökar",
      text: "Utan optimering och löpande analys betalar kunder i snitt 30–40 % mer än nödvändigt för sin el.",
      Icon: TrendingUp,
    },
  ];

  return (
    <section style={{ position: "relative", background: C.bg, padding: "110px 0 120px", overflow: "hidden" }}>
      {/* dotted texture + teal glow sweep */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "26px 26px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, right: -80, width: 640, height: 420, background: "radial-gradient(circle at 70% 40%, rgba(47,211,165,0.14), transparent 60%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        {/* Heading block */}
        <FadeIn>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={15} color={C.green} strokeWidth={2} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.green }}>Problemstatement</span>
          </div>
          <h2 style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(40px, 6vw, 76px)",
            fontWeight: 700,
            color: C.text,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            marginBottom: 22,
          }}>
            När andra försvinner
          </h2>
          <div style={{ width: 56, height: 2, background: C.green, marginBottom: 22, boxShadow: `0 0 10px ${C.green}` }} />
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 17, lineHeight: 1.7, color: C.muted, marginBottom: 56 }}>
            Många energikunder lämnas ensamma när marknaden konsolideras.<br />
            Det får stora konsekvenser – varje dag.
          </p>
        </FadeIn>

        {/* 3 cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 36 }} className="care-3col">
          {cards.map((c, i) => (
            <FadeIn key={c.num} delay={i * 110}>
              <div style={{
                position: "relative",
                background: "linear-gradient(160deg, rgba(47,211,165,0.05), rgba(10,20,17,0.4))",
                borderRadius: 16,
                padding: "34px 32px 30px",
                border: `1px solid rgba(47,211,165,0.22)`,
                height: "100%",
                minHeight: 320,
                transition: "border-color 0.25s, box-shadow 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(47,211,165,0.5)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(47,211,165,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(47,211,165,0.22)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* warning triangle top-right */}
                <div style={{
                  position: "absolute", top: 28, right: 28,
                  width: 52, height: 52, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `radial-gradient(circle, ${RED}33, transparent 70%)`,
                }}>
                  <AlertTriangle size={26} color={RED} strokeWidth={2} />
                </div>

                {/* outlined number */}
                <div style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 60,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "transparent",
                  WebkitTextStroke: `1.5px rgba(47,211,165,0.6)`,
                  marginBottom: 22,
                }}>{c.num}</div>

                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 14, letterSpacing: "-0.01em" }}>{c.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>{c.text}</div>

                {/* bottom-left icon in red ring */}
                <div style={{
                  width: 46, height: 46, borderRadius: "50%",
                  border: `1px solid ${RED}66`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <c.Icon size={20} color={RED} strokeWidth={1.8} />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* bottom banner */}
        <FadeIn delay={120}>
          <div style={{
            position: "relative",
            background: "linear-gradient(180deg, rgba(47,211,165,0.04), rgba(10,20,17,0.3))",
            borderRadius: 16,
            border: `1px solid rgba(47,211,165,0.28)`,
            padding: "40px 44px",
            display: "flex",
            alignItems: "center",
            gap: 28,
            overflow: "hidden",
          }}>
            <ShieldCheck size={54} color={C.green} strokeWidth={1.6} style={{ flexShrink: 0, filter: `drop-shadow(0 0 10px ${C.green})` }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(22px, 2.8vw, 38px)", fontWeight: 600, color: C.green, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              CARE finns för att ingen kund ska stå ensam med sitt energisystem.
            </span>
            {/* glowing underline */}
            <div style={{ position: "absolute", bottom: 0, left: "30%", right: "30%", height: 3, background: `linear-gradient(90deg, transparent, ${C.green}, transparent)`, filter: `blur(2px)`, boxShadow: `0 0 16px ${C.green}` }} />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── 4. WHAT CARE INCLUDES ────────────────────────────────────────────────────
function WhatCareIncludes() {
  const features = [
    { icon: "◉", title: "Liveövervakning", text: "Ditt system kontrolleras dygnet runt. Avvikelser och larm hanteras proaktivt." },
    { icon: "◈", title: "AI-optimering", text: "Batterioptimering baserat på spotpriser, väder och förbrukningsmönster." },
    { icon: "◇", title: "Rapporter & insikter", text: "Månads- och årsrapporter med tydlig bild av produktion, besparing och rekommendationer." },
    { icon: "◆", title: "Prioriterad support", text: "Dedikerade svarstider baserat på din CARE-nivå. Riktig teknisk hjälp, inte callcenter." },
    { icon: "◎", title: "Garantihantering", text: "Vi hjälper dig hävda garantier och navigera avtal — även mot tredje part." },
    { icon: "◐", title: "Fakturaanalys", text: "Vi hjälper dig förstå elkostnader, nätavgifter och möjlig besparingspotential." },
    { icon: "◑", title: "Referralbelöningar", text: "Rekommendera CARE och tjäna upp till 15 000 kr. Platinum-medlemmar får högst belöning." },
    { icon: "◒", title: "Pilotprojekt & tidig access", text: "Platinum-medlemmar får tillgång till nya funktioner och pilotprojekt före alla andra." },
  ];

  return (
    <section id="features" style={{ background: C.bg, padding: "120px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <Tag>VAD CARE INKLUDERAR</Tag>
            <div style={{ height: 20 }} />
            <div style={{ display: "flex", justifyContent: "center" }}><GoldLine /></div>
            <SectionHeading center>Ett komplett energimedlemskap</SectionHeading>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="care-4col">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 60}>
              <div style={{
                background: C.card,
                borderRadius: 14,
                padding: "32px 24px",
                border: `1px solid ${C.border}`,
                height: "100%",
                transition: "box-shadow 0.2s, transform 0.2s",
                cursor: "default",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.07)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.secondary, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 16, color: C.gold }}>{f.icon}</span>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{f.text}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. CARE PACKAGES ─────────────────────────────────────────────────────────
function CarePackages() {
  const SILVER = "#AEB9B6";
  const packages = [
    {
      tier: "Basic",
      price: "299",
      accent: SILVER,
      Glyph: Check,
      popular: false,
      theme: "basic" as const,
      features: ["24/7 övervakning", "Månatlig rapport", "E-postsupport", "48h svarstid"],
    },
    {
      tier: "Silver",
      price: "599",
      accent: C.green,
      Glyph: Star,
      popular: true,
      theme: "silver" as const,
      features: ["Allt i Basic +", "AI-optimering", "Kvartalsrapport", "Telefonsupport", "24h svarstid", "Prioriterad service"],
    },
    {
      tier: "Platinum",
      price: "999",
      accent: C.gold,
      Glyph: Crown,
      popular: false,
      theme: "platinum" as const,
      features: ["Allt i Silver +", "Dedikerad kontaktperson", "Realtidsövervakning", "4h svarstid", "Proaktiv service", "ROI-garanti"],
    },
  ];

  return (
    <section id="packages" style={{ position: "relative", background: C.bg, padding: "110px 0 120px", overflow: "hidden" }}>
      {/* side glows */}
      <div style={{ position: "absolute", left: -120, top: 220, width: 520, height: 520, background: "radial-gradient(circle, rgba(47,211,165,0.10), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -120, top: 160, width: 560, height: 560, background: "radial-gradient(circle, rgba(224,178,62,0.12), transparent 60%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <FadeIn>
          <h2 style={{
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(36px, 5vw, 60px)",
            fontWeight: 700,
            color: C.text,
            letterSpacing: "-0.03em",
            marginBottom: 64,
          }}>
            Välj ditt CARE-paket
          </h2>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch" }} className="care-3col">
          {packages.map((pkg, i) => {
            const filled = pkg.theme !== "basic";
            const btnBg = pkg.theme === "silver" ? C.green : pkg.theme === "platinum" ? `linear-gradient(180deg, ${C.gold}, ${C.goldDark})` : "transparent";
            return (
            <FadeIn key={pkg.tier} delay={i * 100}>
              <div style={{
                position: "relative",
                height: "100%",
                background: pkg.theme === "platinum"
                  ? "radial-gradient(circle at 70% 20%, rgba(224,178,62,0.10), rgba(8,12,10,0.7))"
                  : pkg.theme === "silver"
                  ? "linear-gradient(180deg, rgba(47,211,165,0.06), rgba(8,16,13,0.6))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(10,16,14,0.5))",
                borderRadius: 18,
                padding: "40px 34px 34px",
                border: `1px solid ${pkg.theme === "basic" ? C.border : pkg.accent}`,
                boxShadow: pkg.theme === "silver"
                  ? `0 0 60px rgba(47,211,165,0.16)`
                  : pkg.theme === "platinum"
                  ? `0 0 60px rgba(224,178,62,0.18)`
                  : "0 2px 10px rgba(0,0,0,0.3)",
                transform: pkg.popular ? "scale(1.035)" : "none",
                display: "flex",
                flexDirection: "column",
              }}>
                {/* POPULÄRAST badge */}
                {pkg.popular && (
                  <div style={{
                    position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)",
                    background: C.green, color: "#04130E",
                    fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    padding: "6px 22px", borderRadius: 20,
                    boxShadow: `0 6px 18px rgba(47,211,165,0.35)`,
                  }}>Populärast</div>
                )}

                {/* emblem */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                  <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Shield size={68} color={pkg.accent} fill={`${pkg.accent}1F`} strokeWidth={1.4} />
                    <pkg.Glyph size={24} color={pkg.accent} strokeWidth={2} style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)" }} />
                  </div>
                </div>

                {/* tier name */}
                <div style={{
                  textAlign: "center",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: pkg.accent,
                  marginBottom: 18,
                }}>{pkg.tier}</div>

                <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`, marginBottom: 22 }} />

                {/* price */}
                <div style={{ textAlign: "center", marginBottom: 30, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 52, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>{pkg.price}</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: C.muted }}>kr/mån</span>
                </div>

                {/* features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 15, marginBottom: 32, flex: 1 }}>
                  {pkg.features.map(f => (
                    <div key={f} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        border: `1px solid ${pkg.accent}`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Check size={12} color={pkg.accent} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: C.text }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a href="#contact" style={{
                  display: "block",
                  textAlign: "center",
                  padding: "15px 24px",
                  background: btnBg,
                  color: filled ? "#04130E" : C.text,
                  border: filled ? "none" : `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                  boxShadow: pkg.theme === "silver" ? "0 8px 26px rgba(47,211,165,0.30)" : pkg.theme === "platinum" ? "0 8px 26px rgba(224,178,62,0.30)" : "none",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { if (!filled) { e.currentTarget.style.borderColor = pkg.accent; e.currentTarget.style.color = pkg.accent; } else { e.currentTarget.style.opacity = "0.9"; } }}
                  onMouseLeave={e => { if (!filled) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; } else { e.currentTarget.style.opacity = "1"; } }}
                >Välj {pkg.tier.toUpperCase()}</a>
              </div>
            </FadeIn>
          );})}
        </div>
      </div>
    </section>
  );
}

// ─── 5b. TESTIMONIALS (Vad våra kunder säger) ────────────────────────────────
function Testimonials() {
  const reviews = [
    { quote: "Sedan vi gick med i CARE har vår elkostnad minskat med 34%. AI-optimeringen är fantastisk.", name: "Erik Lindström", role: "Villaägare Malmö" },
    { quote: "Äntligen en partner som inte försvinner efter installationen. CARE ger oss trygghet.", name: "Maria Svensson", role: "BRF Ordförande Stockholm" },
    { quote: "ROI-rapporten visade att systemet betalar sig 2 år snabbare med CARE.", name: "Anders Björk", role: "Fastighetsägare Göteborg" },
  ];
  const partners = ["Nordic Energy", "EATON", "Schneider Electric", "aws", "TÜV SÜD", "ISO 50001", "AAA", "SundaHus"];

  return (
    <section style={{ position: "relative", background: C.bg, padding: "110px 0 100px", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "30px 30px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: -100, top: 120, width: 460, height: 460, background: "radial-gradient(circle, rgba(47,211,165,0.10), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -100, top: 200, width: 460, height: 460, background: "radial-gradient(circle, rgba(47,211,165,0.08), transparent 60%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <FadeIn>
          <h2 style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 700, color: C.text, letterSpacing: "-0.03em", marginBottom: 18 }}>
            Vad våra kunder säger
          </h2>
          <div style={{ width: 80, height: 2, background: C.green, margin: "0 auto 60px", boxShadow: `0 0 10px ${C.green}` }} />
        </FadeIn>

        {/* testimonial cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 80 }} className="care-3col">
          {reviews.map((r, i) => (
            <FadeIn key={r.name} delay={i * 110}>
              <div style={{
                position: "relative",
                background: "linear-gradient(160deg, rgba(47,211,165,0.04), rgba(10,20,17,0.45))",
                border: `1px solid rgba(47,211,165,0.18)`,
                borderRadius: 16,
                padding: "32px 30px",
                height: "100%",
                boxShadow: "0 0 40px rgba(47,211,165,0.04)",
                transition: "border-color 0.25s, box-shadow 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(47,211,165,0.4)"; e.currentTarget.style.boxShadow = "0 0 44px rgba(47,211,165,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(47,211,165,0.18)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(47,211,165,0.04)"; }}
              >
                {/* stars */}
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={18} color={C.gold} fill={C.gold} strokeWidth={0} />
                  ))}
                </div>
                {/* quote */}
                <div style={{ display: "flex", gap: 12 }}>
                  <Quote size={26} color={C.green} strokeWidth={0} fill={C.green} style={{ flexShrink: 0, opacity: 0.5, transform: "scaleX(-1)" }} />
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 19, fontWeight: 500, color: C.text, lineHeight: 1.5, margin: 0 }}>{r.quote}</p>
                </div>
                {/* divider + author */}
                <div style={{ width: 32, height: 1, background: C.border, margin: "26px 0 14px 38px" }} />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.muted, marginLeft: 38 }}>{r.name}, {r.role}</div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* partners label */}
        <FadeIn>
          <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center", marginBottom: 28 }}>
            <div style={{ flex: 1, maxWidth: 280, height: 1, background: `linear-gradient(90deg, transparent, ${C.border})` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <ShieldCheck size={16} color={C.green} strokeWidth={2} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted }}>Partners &amp; Certifications</span>
            </div>
            <div style={{ flex: 1, maxWidth: 280, height: 1, background: `linear-gradient(270deg, transparent, ${C.border})` }} />
          </div>
        </FadeIn>

        {/* partner logos */}
        <FadeIn delay={100}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 14 }} className="care-partners">
            {partners.map(p => (
              <div key={p} style={{
                height: 78,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "0 10px",
                textAlign: "center",
              }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: "rgba(213,224,220,0.55)", lineHeight: 1.2 }}>{p}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── 6. RE-CARE ───────────────────────────────────────────────────────────────
function ReCare() {
  const RED = "#E0654F";
  const withoutCare = [
    { Icon: EyeOff, label: "Ingen övervakning" },
    { Icon: AlertTriangle, label: "Okända fel" },
    { Icon: Headphones, label: "Ingen support" },
    { Icon: BarChart3, label: "0% optimering" },
  ];
  const withCare = [
    { Icon: Monitor, label: "24/7 övervakning" },
    { Icon: ShieldCheck, label: "Proaktiv felhantering" },
    { Icon: Headphones, label: "Dedikerad support" },
    { Icon: BrainCircuit, label: "AI-optimering" },
  ];
  const steps = [
    { Icon: Search, title: "Systemanalys (free)", text: "Vi går igenom din anläggning utan kostnad." },
    { Icon: FileText, title: "Diagnostik & rapport", text: "Du får en tydlig rapport med status, fel och förbättringspotential." },
    { Icon: Zap, title: "Aktivering av CARE", text: "Vi tar över övervakning, support och optimering av ditt system." },
    { Icon: TrendingUp, title: "Kontinuerlig optimering", text: "AI och proaktiv övervakning säkerställer maximal produktion – varje dag." },
  ];
  const features = [
    { Icon: ShieldCheck, title: "Expert på räddade system", text: "Vi specialiserar oss på övergivna och problematiska anläggningar." },
    { Icon: Trophy, title: "Maximerad avkastning", text: "Upp till 30% mer produktion med AI-optimering." },
    { Icon: Headphones, title: "Svensk support – på riktigt", text: "Dedikerade experter som känner din anläggning." },
    { Icon: Lock, title: "Tryggt & transparent", text: "Inga bindningstider. Full insyn, alltid." },
  ];

  return (
    <section id="recare" style={{ position: "relative", background: C.bg, padding: "100px 0 110px", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "30px 30px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -100, top: 120, width: 520, height: 520, background: "radial-gradient(circle, rgba(47,211,165,0.10), transparent 60%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
        {/* heading */}
        <FadeIn>
          <span style={{ display: "inline-block", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.green, border: `1px solid rgba(47,211,165,0.4)`, borderRadius: 20, padding: "7px 16px", marginBottom: 22 }}>Re-CARE Program</span>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 700, color: C.text, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 14 }}>
            Re-CARE — Vi räddar övergivna system
          </h2>
          <div style={{ width: 240, maxWidth: "50%", height: 3, background: C.green, marginBottom: 18, boxShadow: `0 0 10px ${C.green}` }} />
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 17, lineHeight: 1.7, color: C.muted, marginBottom: 48, maxWidth: 720 }}>
            Vi tar över, optimerar och framtidssäkrar solcellsanläggningar som ingen längre bryr sig om.
          </p>
        </FadeIn>

        {/* main grid: comparison (left) + steps (right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 40, alignItems: "start", marginBottom: 36 }} className="care-recare-grid">
          {/* comparison cards */}
          <FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, alignItems: "center" }}>
              {/* UTAN CARE */}
              <div style={{ background: "linear-gradient(180deg, rgba(224,101,79,0.07), rgba(16,8,8,0.4))", border: `1px solid rgba(224,101,79,0.4)`, borderRadius: 16, padding: "24px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.05em", color: RED }}>UTAN CARE</span>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${RED}`, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} color={RED} /></span>
                </div>
                {withoutCare.map(it => (
                  <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid rgba(224,101,79,0.15)` }}>
                    <it.Icon size={20} color={RED} strokeWidth={1.7} />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: C.text }}>{it.label}</span>
                  </div>
                ))}
                {/* declining graph */}
                <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" style={{ marginTop: 10 }}>
                  <polyline points="0,20 30,24 60,22 90,30 120,28 150,38 200,42" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {/* arrow */}
              <div style={{ display: "flex", justifyContent: "center", padding: "0 10px" }} className="care-recare-arrow">
                <div style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.card, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronsRight size={18} color={C.muted} />
                </div>
              </div>

              {/* MED CARE */}
              <div style={{ background: "linear-gradient(180deg, rgba(47,211,165,0.07), rgba(8,16,13,0.4))", border: `1px solid rgba(47,211,165,0.45)`, borderRadius: 16, padding: "24px 22px", boxShadow: "0 0 50px rgba(47,211,165,0.10)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.05em", color: C.green }}>MED CARE</span>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={15} color={C.green} strokeWidth={2.5} /></span>
                </div>
                {withCare.map(it => (
                  <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid rgba(47,211,165,0.15)` }}>
                    <it.Icon size={20} color={C.green} strokeWidth={1.7} />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: C.text }}>{it.label}</span>
                  </div>
                ))}
                {/* rising graph */}
                <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" style={{ marginTop: 10 }}>
                  <polyline points="0,40 30,36 60,38 90,28 120,30 150,16 200,6" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="200" cy="6" r="3.5" fill={C.green} />
                </svg>
              </div>
            </div>
          </FadeIn>

          {/* steps */}
          <FadeIn delay={150}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.green, marginBottom: 24 }}>Så här fungerar det</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((s, i) => (
                <div key={s.title} style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                  {/* number + connector */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: C.green }}>{i + 1}</div>
                    {i < steps.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 28, borderLeft: `1px dashed rgba(47,211,165,0.4)`, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, color: C.text }}>{s.title}</div>
                      <div style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><s.Icon size={18} color={C.green} strokeWidth={1.8} /></div>
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 4, maxWidth: 320 }}>{s.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a href="#contact" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              marginTop: 28, padding: "20px 28px",
              background: C.green, color: "#04130E",
              fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700,
              textDecoration: "none", borderRadius: 14,
              boxShadow: "0 10px 36px rgba(47,211,165,0.30)", transition: "background 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = C.greenDark)}
              onMouseLeave={e => (e.currentTarget.style.background = C.green)}
            ><Calendar size={20} color="#04130E" /> Boka gratis systemanalys <ArrowRight size={20} color="#04130E" /></a>
          </FadeIn>
        </div>

        {/* bottom feature bar */}
        <FadeIn delay={100}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 16, padding: "8px 0" }} className="care-4col">
            {features.map((f, i) => (
              <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "22px 26px", borderLeft: i === 0 ? "none" : `1px solid ${C.border}` }}>
                <f.Icon size={26} color={C.gold} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: C.gold, marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── 7. CONTACT ───────────────────────────────────────────────────────────────
function Contact() {
  const submitMutation = trpc.contactForm.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: "", phone: "", email: "", interest: "basic", message: "" });
    },
    onError: (err) => {
      console.error("[contactForm]", err);
      setError("Något gick fel. Försök igen eller kontakta oss direkt.");
    },
  });

  const [form, setForm] = useState({ name: "", phone: "", email: "", interest: "basic" as "basic" | "silver" | "platinum" | "recare" | "other", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    submitMutation.mutate(form);
  }, [form, submitMutation]);

  const inputStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    padding: "13px 16px",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    background: C.bg,
    color: C.text,
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  };

  return (
    <section id="contact" style={{ background: C.card, padding: "120px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <Tag>KONTAKT</Tag>
            <div style={{ height: 20 }} />
            <div style={{ display: "flex", justifyContent: "center" }}><GoldLine /></div>
            <SectionHeading center>Få en analys av ditt system</SectionHeading>
            <div style={{ height: 12 }} />
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: C.muted, maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
              Berätta vad du har idag och vad du behöver hjälp med. Vi återkommer med rätt nästa steg.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 64, alignItems: "start" }} className="care-two-col">
          {/* Left: info */}
          <FadeIn>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { label: "E-post", value: "care@solpulsen.se", icon: "✉" },
                { label: "Telefon", value: "Kontakta oss via formuläret", icon: "☎" },
              ].map(c => (
                <div key={c.label} style={{
                  background: C.bg,
                  borderRadius: 12,
                  padding: "22px 24px",
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 18, color: C.gold }}>{c.icon}</span>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{c.label}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.text }}>{c.value}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* SLA table */}
              <div style={{
                background: C.bg,
                borderRadius: 12,
                padding: "22px 24px",
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Svarstider per CARE-nivå</div>
                {[
                  { tier: "Basic", time: "72 timmar" },
                  { tier: "Silver", time: "24 timmar" },
                  { tier: "Platinum", time: "4 timmar", highlight: true },
                ].map(s => (
                  <div key={s.tier} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.text, fontWeight: s.highlight ? 600 : 400 }}>{s.tier}</span>
                    <span style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: s.highlight ? C.gold : C.muted,
                    }}>{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Right: form */}
          <FadeIn delay={100}>
            {submitted ? (
              <div style={{
                background: C.bg,
                borderRadius: 16,
                padding: "48px 40px",
                border: `1px solid ${C.border}`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 16, color: C.green }}>✓</div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 8 }}>Tack för ditt meddelande</div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.6 }}>Vi har tagit emot din förfrågan och återkommer inom kort. En bekräftelse har skickats till din e-post.</p>
                <button onClick={() => setSubmitted(false)} style={{
                  marginTop: 24,
                  padding: "10px 24px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: C.text,
                  cursor: "pointer",
                }}>Skicka nytt meddelande</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{
                background: C.bg,
                borderRadius: 16,
                padding: "40px 36px",
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Namn</label>
                    <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Ditt namn" onFocus={e => (e.currentTarget.style.borderColor = C.gold)} onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
                  </div>
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Telefon</label>
                    <input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="070-000 00 00" onFocus={e => (e.currentTarget.style.borderColor = C.gold)} onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>E-post</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="din@epost.se" onFocus={e => (e.currentTarget.style.borderColor = C.gold)} onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Intresserad av</label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.interest} onChange={e => setForm(p => ({ ...p, interest: e.target.value as typeof p.interest }))}>
                    <option value="basic">CARE Basic</option>
                    <option value="silver">CARE Silver</option>
                    <option value="platinum">CARE Platinum</option>
                    <option value="recare">Re-CARE</option>
                    <option value="other">Annat</option>
                  </select>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Meddelande</label>
                  <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required placeholder="Berätta om ditt system och vad du behöver hjälp med..." onFocus={e => (e.currentTarget.style.borderColor = C.gold)} onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
                </div>

                {error && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>
                )}

                <button type="submit" disabled={submitMutation.isPending} style={{
                  width: "100%",
                  padding: "14px 24px",
                  background: C.gold,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  cursor: submitMutation.isPending ? "wait" : "pointer",
                  opacity: submitMutation.isPending ? 0.7 : 1,
                  transition: "background 0.2s, opacity 0.2s",
                }}
                  onMouseEnter={e => { if (!submitMutation.isPending) (e.currentTarget as HTMLElement).style.background = C.goldDark; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.gold}
                >
                  {submitMutation.isPending ? "Skickar..." : "Skicka meddelande"}
                </button>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.muted, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
                  Vi återkommer med rätt nästa steg baserat på ditt system — inte med ett generiskt säljsvar.
                </p>
              </form>
            )}
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── 8. FINAL CTA BANNER ──────────────────────────────────────────────────────
function MemberCta() {
  return (
    <section style={{ background: C.bg, padding: "60px 0 40px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <FadeIn>
          <div style={{
            position: "relative", overflow: "hidden",
            background: "linear-gradient(160deg, rgba(12,26,22,0.5), rgba(8,14,12,0.6))",
            border: `1px solid rgba(47,211,165,0.22)`,
            borderRadius: 20,
            padding: "56px 56px",
          }} className="care-cta-card">
            {/* flowing teal light wave */}
            <svg viewBox="0 0 600 300" preserveAspectRatio="xMaxYMid slice" style={{ position: "absolute", top: 0, right: 0, width: "55%", height: "100%", pointerEvents: "none", opacity: 0.9 }}>
              <defs>
                <linearGradient id="ctaWave" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.green} stopOpacity="0" /><stop offset="1" stopColor={C.green} stopOpacity="0.9" /></linearGradient>
                <filter id="ctaBlur"><feGaussianBlur stdDeviation="2" /></filter>
              </defs>
              <path d="M0,210 C160,200 300,150 420,90 C500,50 560,30 600,20" fill="none" stroke="url(#ctaWave)" strokeWidth="2.5" filter="url(#ctaBlur)" />
              <path d="M40,250 C200,235 320,180 440,120 C520,80 570,55 600,45" fill="none" stroke="url(#ctaWave)" strokeWidth="1.5" opacity="0.6" />
              {[[470,70],[520,110],[400,130],[560,60],[350,170],[300,200]].map(([cx,cy],i)=>(
                <circle key={i} cx={cx} cy={cy} r={i % 2 ? 1.8 : 1.2} fill={C.green} opacity="0.8" />
              ))}
            </svg>

            <div style={{ position: "relative", maxWidth: 620 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 16 }}>
                Redo att ta kontroll över ditt energisystem?
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: C.muted, marginBottom: 34 }}>
                Boka en kostnadsfri genomgång och se vad CARE kan göra för dig.
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <a href="#contact" style={{
                  display: "inline-block", padding: "16px 40px",
                  background: C.green, color: "#04130E",
                  fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700,
                  textDecoration: "none", borderRadius: 10,
                  boxShadow: "0 10px 32px rgba(47,211,165,0.30)", transition: "background 0.2s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.greenDark)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.green)}
                >Kom igång</a>
                <a href="#contact" style={{
                  display: "inline-block", padding: "16px 40px",
                  background: "transparent", color: C.text,
                  fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600,
                  textDecoration: "none", borderRadius: 10, border: `1px solid ${C.border}`,
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
                >Kontakta oss</a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── 9. FOOTER ────────────────────────────────────────────────────────────────
function Footer() {
  const columns = [
    { title: "Produkt", links: ["CARE Basic", "CARE Silver", "CARE Platinum", "Re-CARE"] },
    { title: "Resurser", links: ["Kunskapsbas", "Blogg", "FAQ", "Dokumentation"] },
    { title: "Företag", links: ["Om oss", "Karriär", "Press", "Kontakt"] },
  ];
  const contact = [
    { Icon: Mail, value: "info@solpulsen.se" },
    { Icon: Phone, value: "+46 10 123 45 67" },
    { Icon: MapPin, value: "Kungsgatan 1, 111 43 Stockholm\nSverige" },
  ];
  const socials = [Linkedin, Twitter, Facebook];

  return (
    <footer style={{ background: C.elevated, borderTop: `1px solid ${C.border}`, padding: "72px 0 0" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.2fr", gap: 40 }} className="care-footer-grid">
          {/* Brand */}
          <div>
            <img src={LOGO} alt="Solpulsen CARE" style={{ height: 84, width: "auto", objectFit: "contain" }} />
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 20 }}>{col.title}</div>
              {col.links.map(l => (
                <a key={l} href="#" onClick={e => e.preventDefault()} style={{
                  display: "block", fontFamily: "Inter, sans-serif", fontSize: 14,
                  color: C.muted, textDecoration: "none", padding: "7px 0", transition: "color 0.2s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.green)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                >{l}</a>
              ))}
            </div>
          ))}

          {/* Contact */}
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 20 }}>Kontakta oss</div>
            {contact.map(c => (
              <div key={c.value} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                <c.Icon size={17} color={C.green} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.5, whiteSpace: "pre-line" }}>{c.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              {socials.map((S, i) => (
                <a key={i} href="#" onClick={e => e.preventDefault()} style={{
                  width: 38, height: 38, borderRadius: "50%", border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = "rgba(47,211,165,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}
                ><S size={16} color={C.muted} /></a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          marginTop: 56, padding: "24px 0", borderTop: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.muted }}>
            © {new Date().getFullYear()} Solpulsen Energy Norden AB — Alla rättigheter förbehållna
          </span>
          <div style={{ display: "flex", gap: 32 }}>
            {["Integritetspolicy", "Villkor", "Cookies"].map(l => (
              <a key={l} href="#" onClick={e => e.preventDefault()} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.muted, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
              >{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── RESPONSIVE CSS ───────────────────────────────────────────────────────────
const responsiveCss = `
  @keyframes livePulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(47,143,114,0.2); }
    50% { box-shadow: 0 0 0 6px rgba(47,143,114,0.1); }
  }
  @media (max-width: 900px) {
    .care-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
    .care-hero-visual { display: none; }
    .care-two-col { grid-template-columns: 1fr !important; gap: 48px !important; }
    .care-3col { grid-template-columns: 1fr 1fr !important; }
    .care-4col { grid-template-columns: 1fr 1fr !important; }
    .care-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
    .care-nav-desktop { display: none !important; }
    .care-nav-mobile { display: block !important; }
  }
  @media (min-width: 901px) {
    .care-nav-mobile { display: none !important; }
  }
  @media (max-width: 600px) {
    .care-3col { grid-template-columns: 1fr !important; }
    .care-4col { grid-template-columns: 1fr !important; }
    .care-footer-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 1000px) {
    .care-partners { grid-template-columns: repeat(4, 1fr) !important; }
    .care-recare-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
  }
  @media (max-width: 600px) { .care-cta-card { padding: 36px 28px !important; } }
  @media (max-width: 560px)  { .care-partners { grid-template-columns: repeat(2, 1fr) !important; } }
  @media (max-width: 900px) {
    .care-flow-stats { grid-template-columns: 1fr 1fr !important; }
    .care-gold-banner { gap: 20px !important; }
  }
  @media (max-width: 760px) {
    .care-flow-node { width: 150px !important; padding: 10px 12px !important; }
    .care-flow-house svg { width: 170px !important; height: auto !important; }
  }
  @media (max-width: 600px) {
    .care-flow-stats { grid-template-columns: 1fr !important; }
  }
`;

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function CarePublic() {
  return (
    <>
      <Helmet>
        <title>Solpulsen CARE | AI, support och optimering för ditt energisystem</title>
        <meta name="description" content="Solpulsen CARE ger dig övervakning, AI-optimering, rapporter, garantihantering och prioriterad support för ditt energisystem." />
        <meta property="og:title" content="Solpulsen CARE | AI, support och optimering för ditt energisystem" />
        <meta property="og:description" content="Långsiktig trygghet för ditt energisystem. Övervakning, AI-optimering, rapporter och direkt expertstöd." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={LOGO} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Solpulsen CARE" />
        <meta name="twitter:description" content="AI, trygghet och optimering för ditt energisystem." />
      </Helmet>
      <div style={{ background: C.bg, fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
        <style>{responsiveCss}</style>
        <Nav />
        <Hero />
        <SocialProof />
        <WhyCareExists />
        <WhatCareIncludes />
        <CarePackages />
        <Testimonials />
        <ReCare />
        <Contact />
        <MemberCta />
        <Footer />
      </div>
    </>
  );
}
