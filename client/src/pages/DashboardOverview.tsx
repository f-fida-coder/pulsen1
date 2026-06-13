import {
  Sun, BatteryCharging, RadioTower, PlugZap, Zap, Leaf, Coins,
  ShieldCheck, TrendingUp, AlertTriangle, Calendar, User, Check, Info, ArrowRight,
  Cloud, CloudSun, CloudRain,
} from "lucide-react";

// ─── Dark theme tokens ────────────────────────────────────────────────────────
const C = {
  bg: "#05090A",
  panel: "#0A1411",
  border: "#19302A",
  text: "#F4F8F6",
  muted: "#8499A0",
  gold: "#E0B23E",
  green: "#2FD3A5",
  greenDark: "#23B68C",
  white: "#D7E0DC",
};

const styleCss = `
  @keyframes ovPulse { 0%,100% { box-shadow: 0 0 0 3px rgba(47,211,165,0.25);} 50% { box-shadow: 0 0 0 6px rgba(47,211,165,0.08);} }
  @media (max-width: 900px)  { .ov-flow-stats { grid-template-columns: 1fr 1fr !important; } .ov-3col { grid-template-columns: 1fr !important; } }
  @media (max-width: 760px)  {
    .ov-flow-node { width: 150px !important; padding: 10px 12px !important; }
    .ov-flow-house svg { width: 170px !important; height: auto !important; }
  }
  @media (max-width: 600px)  { .ov-flow-stats { grid-template-columns: 1fr !important; } }
`;

type IconType = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>;

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ points, color }: { points: string; color: string }) {
  return (
    <svg width="100%" height="30" viewBox="0 0 120 30" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlowNode({ x, y, accent, Icon, label, sub, value, points }: { x: number; y: number; accent: string; Icon: IconType; label: string; sub: string; value: string; points: string }) {
  return (
    <div className="ov-flow-node" style={{
      position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
      width: 210, maxWidth: "32vw",
      background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(8,16,13,0.6))",
      border: `1px solid ${accent}`, borderRadius: 14, padding: "14px 16px",
      boxShadow: `0 0 30px ${accent}33`, backdropFilter: "blur(4px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: accent }}>{label}</span>
        <Icon size={18} color={accent} strokeWidth={1.7} />
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{sub}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{value}</div>
      <Sparkline points={points} color={accent} />
    </div>
  );
}

function HouseHero() {
  return (
    <svg width="250" height="200" viewBox="0 0 260 210" style={{ display: "block" }}>
      <defs>
        <filter id="ovHouseGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="ovWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#16302a" /><stop offset="1" stopColor="#0a1813" /></linearGradient>
      </defs>
      <ellipse cx="130" cy="180" rx="118" ry="26" fill="none" stroke="rgba(47,211,165,0.5)" strokeWidth="2" filter="url(#ovHouseGlow)" />
      <ellipse cx="130" cy="180" rx="118" ry="26" fill="rgba(47,211,165,0.05)" />
      <rect x="78" y="92" width="104" height="74" rx="3" fill="url(#ovWall)" stroke="rgba(47,211,165,0.3)" strokeWidth="1" />
      <polygon points="70,96 130,58 190,96" fill="#13241f" stroke="rgba(47,211,165,0.4)" strokeWidth="1" />
      {[[90,108],[112,108],[150,108],[90,134],[150,134]].map(([wx,wy],i)=>(
        <rect key={i} x={wx} y={wy} width="18" height="20" rx="1.5" fill="rgba(224,178,62,0.75)" />
      ))}
      <rect x="120" y="138" width="26" height="28" rx="2" fill="rgba(47,211,165,0.12)" stroke="rgba(47,211,165,0.3)" strokeWidth="1" />
    </svg>
  );
}

// ─── AI section charts ────────────────────────────────────────────────────────
function BatteryOptChart() {
  return (
    <svg width="100%" height="190" viewBox="0 0 400 190" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      {[20, 55, 90, 125, 160].map((y, i) => (
        <g key={y}>
          <line x1="34" y1={y} x2="366" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x="28" y={y + 3} textAnchor="end" fontSize="8" fill={C.muted}>{[100, 75, 50, 25, 0][i]}</text>
          <text x="372" y={y + 3} textAnchor="start" fontSize="8" fill={C.muted}>{[200, 150, 100, 50, 0][i]}</text>
        </g>
      ))}
      {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"].map((l, i) => (
        <text key={l} x={34 + i * (332 / 6)} y="178" textAnchor="middle" fontSize="7.5" fill={C.muted}>{l}</text>
      ))}
      <path d="M34,98 C70,72 95,64 120,80 C150,98 175,72 205,90 C240,110 270,74 300,88 C330,100 355,110 366,114" fill="none" stroke="#9AA8A3" strokeWidth="1.6" strokeDasharray="3 3" />
      <path d="M34,120 C64,130 92,156 120,156 C152,156 180,60 210,32 C242,28 272,32 300,56 C328,82 352,110 366,118" fill="none" stroke={C.green} strokeWidth="2.5" />
    </svg>
  );
}

function ForecastChart() {
  const days = [
    { d: "Idag", v: 78, W: Sun }, { d: "Imorgon", v: 82, W: CloudSun }, { d: "Ons", v: 65, W: Cloud },
    { d: "Tors", v: 74, W: CloudSun }, { d: "Fre", v: 80, W: Sun }, { d: "Lör", v: 62, W: Cloud }, { d: "Sön", v: 48, W: CloudRain },
  ];
  const TRACK = 120, AVG = 50;
  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: TRACK + 22, fontSize: 8, color: C.muted, paddingBottom: 2 }}>
          {[100, 75, 50, 25, 0].map(n => <span key={n}>{n}</span>)}
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: (AVG / 100) * TRACK, borderTop: "1px dashed rgba(215,224,220,0.5)", zIndex: 2 }} />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: TRACK + 22 }}>
            {days.map(day => (
              <div key={day.d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <day.W size={16} color={C.gold} style={{ marginBottom: 3 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: C.text, marginBottom: 3 }}>{day.v}</span>
                <div style={{ width: "62%", height: (day.v / 100) * TRACK, background: `linear-gradient(180deg, ${C.green}, ${C.greenDark})`, borderRadius: "4px 4px 0 0" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, paddingLeft: 22, marginTop: 5 }}>
        {days.map(day => <span key={day.d} style={{ flex: 1, textAlign: "center", fontSize: 9.5, color: C.muted }}>{day.d}</span>)}
      </div>
    </div>
  );
}

function AiCardShell({ Icon, title, sub, children }: { Icon: IconType; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "linear-gradient(160deg, rgba(47,211,165,0.04), rgba(8,16,13,0.5))",
      border: `1px solid rgba(47,211,165,0.22)`, borderRadius: 16, padding: "24px 22px",
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(47,211,165,0.1)", border: `1px solid rgba(47,211,165,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={22} color={C.green} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{title}</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Info size={12} color={C.muted} />
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Page (renders inside DashboardLayout) ─────────────────────────────────────
export default function DashboardOverview() {
  const stats = [
    { Icon: Zap, color: C.green, label: "TOTAL FÖRBRUKNING", value: "12.9 kW" },
    { Icon: Sun, color: C.green, label: "TOTAL PRODUKTION", value: "8.7 kW" },
    { Icon: BatteryCharging, color: C.gold, label: "BATTERISTATUS", value: "68 %", extra: "(6.2 kWh)" },
    { Icon: Leaf, color: C.green, label: "CO₂-BESPARING IDAG", value: "12.4 kg" },
    { Icon: Coins, color: C.gold, label: "BESPARING IDAG", value: "18.7 SEK" },
  ];

  return (
    <div style={{ background: "transparent", color: C.text, fontFamily: "Inter, sans-serif", padding: "20px 4px 48px", minHeight: "100%" }}>
      <style>{styleCss}</style>

      {/* ─── Energy flow ─── */}
      <h1 style={{ textAlign: "center", fontSize: "clamp(34px, 4.5vw, 56px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8 }}>
        Se ditt energiflöde i realtid
      </h1>
      <p style={{ textAlign: "center", fontSize: 18, color: C.muted, marginBottom: 38 }}>
        CARE övervakar varje watt — <span style={{ color: C.gold, fontWeight: 600 }}>24/7</span>
      </p>

      <div style={{
        position: "relative", maxWidth: 1280, margin: "0 auto",
        background: "linear-gradient(180deg, rgba(12,26,22,0.6), rgba(6,12,10,0.7))",
        border: `1px solid rgba(47,211,165,0.28)`, borderRadius: 22,
        boxShadow: "0 0 80px rgba(47,211,165,0.10)", padding: "28px 28px 0", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 22, right: 26, textAlign: "right", zIndex: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: "ovPulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>System normalt</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Alla system fungerar som de ska.</div>
        </div>

        <div style={{ position: "relative", height: 470 }}>
          <svg viewBox="0 0 1000 480" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}>
            <defs>
              <filter id="ovGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <marker id="ovArrTeal" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill={C.green} /></marker>
              <marker id="ovArrGold" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill={C.gold} /></marker>
              <marker id="ovArrGoldL" markerWidth="9" markerHeight="9" refX="3" refY="4.5" orient="auto"><path d="M9,0 L0,4.5 L9,9 Z" fill={C.gold} /></marker>
              <marker id="ovArrWhite" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill={C.white} /></marker>
            </defs>
            <path d="M250,150 C360,160 380,210 450,225" fill="none" stroke={C.green} strokeWidth="2.5" markerEnd="url(#ovArrTeal)" filter="url(#ovGlow)" />
            <path d="M270,300 L450,275" fill="none" stroke={C.gold} strokeWidth="2.5" markerEnd="url(#ovArrGold)" markerStart="url(#ovArrGoldL)" />
            <path d="M560,215 C650,200 700,190 760,185" fill="none" stroke={C.white} strokeWidth="2.5" markerEnd="url(#ovArrWhite)" />
            <path d="M575,300 C660,330 700,340 760,348" fill="none" stroke={C.green} strokeWidth="2.5" markerEnd="url(#ovArrTeal)" filter="url(#ovGlow)" />
          </svg>

          <span style={{ position: "absolute", left: "34%", top: "27%", fontSize: 14, fontWeight: 600, color: C.green, zIndex: 2 }}>3.2 kW</span>
          <span style={{ position: "absolute", left: "33%", top: "55%", fontSize: 14, fontWeight: 600, color: C.gold, zIndex: 2 }}>1.8 kW</span>
          <span style={{ position: "absolute", left: "68%", top: "37%", fontSize: 14, fontWeight: 600, color: C.white, zIndex: 2 }}>0.5 kW</span>
          <span style={{ position: "absolute", left: "70%", top: "63%", fontSize: 14, fontWeight: 600, color: C.green, zIndex: 2 }}>7.4 kW</span>

          <div className="ov-flow-house" style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)", zIndex: 2 }}>
            <HouseHero />
          </div>

          <FlowNode x={16} y={31} accent={C.green} Icon={Sun} label="SOLAR" sub="Produktion" value="3.2 kW" points="0,26 20,20 40,24 60,12 80,16 100,6 120,9" />
          <FlowNode x={15} y={63} accent={C.gold} Icon={BatteryCharging} label="BATTERI" sub="Laddning · 68% · 6.2 kWh" value="1.8 kW" points="0,20 20,24 40,16 60,20 80,12 100,18 120,10" />
          <FlowNode x={85} y={37} accent={C.white} Icon={RadioTower} label="ELNÄT" sub="Export" value="0.5 kW" points="0,22 20,24 40,20 60,22 80,19 100,21 120,18" />
          <FlowNode x={85} y={68} accent={C.green} Icon={PlugZap} label="ELBILSLADDARE" sub="Aktiv effekt" value="7.4 kW" points="0,24 20,18 40,22 60,12 80,16 100,8 120,10" />
        </div>

        <div className="ov-flow-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderTop: `1px solid ${C.border}`, margin: "0 -28px" }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 22px", borderLeft: i === 0 ? "none" : `1px solid ${C.border}` }}>
              <s.Icon size={22} color={s.color} strokeWidth={1.7} />
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", color: C.muted, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: s.color }}>{s.value}{s.extra && <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}> {s.extra}</span>}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── AI section ─── */}
      <div style={{ maxWidth: 1280, margin: "80px auto 0" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(30px, 4vw, 50px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 48 }}>
          AI som arbetar för dig — dygnet runt
        </h2>

        <div className="ov-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginBottom: 32 }}>
          {/* Batterioptimering */}
          <AiCardShell Icon={BatteryCharging} title="Batterioptimering" sub="AI-optimerad laddning baserat på spotpris">
            <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 10.5, color: C.muted }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 2.5, background: C.green, borderRadius: 2 }} />Optimal Laddning/Urladdning</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 0, borderTop: "2px dashed #9AA8A3" }} />Spotpris (öre/kWh)</span>
            </div>
            <BatteryOptChart />
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14, background: "rgba(47,211,165,0.05)", border: `1px solid rgba(47,211,165,0.2)`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid rgba(47,211,165,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrendingUp size={18} color={C.green} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.muted }}>Genom AI-optimering har du sparat</div>
                <div><span style={{ fontSize: 28, fontWeight: 700, color: C.green }}>847 kr</span> <span style={{ fontSize: 12, color: C.muted }}>sparades denna månad</span></div>
              </div>
            </div>
          </AiCardShell>

          {/* Feldetektering */}
          <AiCardShell Icon={ShieldCheck} title="Feldetektering" sub="AI övervakar systemet i realtid">
            <div style={{ background: "radial-gradient(circle at 50% 30%, rgba(224,80,70,0.14), rgba(20,8,8,0.5))", border: "1px solid rgba(224,80,70,0.4)", borderRadius: 12, padding: "24px 20px", textAlign: "center", marginBottom: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid #E0504F", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: "0 0 18px rgba(224,80,70,0.5)" }}>
                <AlertTriangle size={26} color="#E0504F" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>Inverter E-12<br />övertemperatur detekterad</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Detekterad idag, 08:42</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(47,211,165,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={16} color={C.green} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Serviceärende #7345</div>
                <div style={{ fontSize: 12, color: C.green }}>skapat automatiskt</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                { Ic: AlertTriangle, k: "Prioritet", v: "Kritisk", vc: "#E0504F" },
                { Ic: Calendar, k: "Beräknad åtgärd", v: "Inom 24h", vc: C.text },
                { Ic: User, k: "Tilldelad tekniker", v: "Auto-assigned", vc: C.green },
              ].map(it => (
                <div key={it.k}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.muted, marginBottom: 4 }}><it.Ic size={11} color={C.muted} />{it.k}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: it.vc }}>{it.v}</div>
                </div>
              ))}
            </div>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 16px", textDecoration: "none", fontSize: 13, fontWeight: 600, color: C.green }}>
              Visa ärende i portal <ArrowRight size={16} color={C.green} />
            </a>
          </AiCardShell>

          {/* Prognoser */}
          <AiCardShell Icon={TrendingUp} title="Prognoser" sub="7-dagars produktionsprognos">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 12, fontSize: 10.5, color: C.muted }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 11, height: 11, background: C.green, borderRadius: 2 }} />Prognostiserad produktion (kWh)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 0, borderTop: "1px dashed #9AA8A3" }} />Genomsnittlig produktion (kWh)</span>
            </div>
            <ForecastChart />
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14, background: "rgba(47,211,165,0.05)", border: `1px solid rgba(47,211,165,0.2)`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid rgba(47,211,165,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Calendar size={18} color={C.green} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.muted }}>Total prognostiserad produktion</div>
                <div><span style={{ fontSize: 28, fontWeight: 700, color: C.green }}>489 kWh</span> <span style={{ fontSize: 12, color: C.muted }}>kommande 7 dagar</span></div>
              </div>
            </div>
          </AiCardShell>
        </div>

        {/* gold banner */}
        <div style={{ position: "relative", overflow: "hidden", background: "radial-gradient(circle at 12% 50%, rgba(224,178,62,0.16), rgba(8,12,10,0.7))", border: `1px solid rgba(224,178,62,0.4)`, borderRadius: 16, padding: "30px 40px", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 26px rgba(224,178,62,0.3)` }}>
            <TrendingUp size={32} color={C.gold} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", flex: 1 }}>
            <span style={{ fontSize: "clamp(36px, 4.5vw, 60px)", fontWeight: 700, color: C.gold, letterSpacing: "-0.02em", lineHeight: 1 }}>12,400 kr</span>
            <span style={{ fontSize: 18, color: C.gold, fontWeight: 500 }}>genomsnittlig årlig besparing per CARE-kund</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, borderLeft: `1px solid rgba(224,178,62,0.3)`, paddingLeft: 28 }}>
            <ShieldCheck size={26} color={C.gold} strokeWidth={1.6} />
            <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4, maxWidth: 200 }}>Baserat på faktiska resultat från över 1,200 CARE-kunder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
