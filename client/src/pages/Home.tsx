import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sun, Battery, Home as HomeIcon, Zap, TrendingUp, TrendingDown,
  Activity, Brain, BrainCircuit, Lightbulb, BarChart3, Wrench,
  FileText, Bell, ChevronRight, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ForecastHour {
  hour: number;
  price_sek: number;
  production_kw?: number;
  consumption_kw?: number;
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function AnimatedNumber({ value, decimals = 1, duration = 1200 }: { value: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    }
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display.toFixed(decimals)}</>;
}

// ─── AI Status Bar ──────────────────────────────────────────────────────────

function AIStatusBar() {
  const [confidence, setConfidence] = useState(94);
  useEffect(() => {
    const i = setInterval(() => setConfidence((c) => Math.min(99, Math.max(88, c + (Math.random() > 0.5 ? 1 : -1)))), 8000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex items-center gap-4 px-5 py-3 bg-card rounded-xl border border-border shadow-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Live</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5">
        <BrainCircuit className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-xs font-medium text-muted-foreground">AI Active</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Confidence</span>
        <span className="text-xs font-bold text-amber-400">{confidence}%</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({ data, color, width = 100, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon fill={color} fillOpacity="0.08" points={areaPoints} />
    </svg>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({
  title, value, unit, icon: Icon, trend, trendValue, color, loading, sparkData,
}: {
  title: string; value: number; unit: string; icon: React.ElementType;
  trend?: "up" | "down"; trendValue?: string; color: string; loading?: boolean;
  sparkData?: number[];
}) {
  const [hovered, setHovered] = useState(false);
  const colorMap: Record<string, { bg: string; icon: string; border: string; spark: string }> = {
    amber: { bg: "bg-amber-500/10", icon: "text-amber-600", border: "border-amber-500/20", spark: "#d97706" },
    emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-600", border: "border-emerald-500/20", spark: "#059669" },
    blue: { bg: "bg-blue-500/10", icon: "text-blue-600", border: "border-blue-500/20", spark: "#2563eb" },
    violet: { bg: "bg-violet-500/10", icon: "text-violet-600", border: "border-violet-500/20", spark: "#7c3aed" },
    teal: { bg: "bg-teal-500/10", icon: "text-teal-600", border: "border-teal-500/20", spark: "#0d9488" },
  };
  const c = colorMap[color] ?? colorMap.amber;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card className={`border ${c.border} shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${c.bg}`}>
              <Icon className={`h-4 w-4 ${c.icon}`} />
            </div>
            {trend && trendValue && (
              <div className={`flex items-center gap-0.5 text-xs font-medium ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
                {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground tracking-tight">
                  <AnimatedNumber value={value} decimals={unit === "%" ? 0 : 1} />
                </span>
                <span className="text-sm text-muted-foreground font-medium">{unit}</span>
              </div>
            )}
          </div>
          {/* Sparkline on hover */}
          {sparkData && sparkData.length > 2 && (
            <div
              className="transition-all duration-300 overflow-hidden"
              style={{
                maxHeight: hovered ? 36 : 0,
                opacity: hovered ? 1 : 0,
                marginTop: hovered ? 8 : 0,
              }}
            >
              <div className="flex items-center justify-between">
                <Sparkline data={sparkData} color={c.spark} width={120} height={28} />
                <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">Senaste 24h</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Energy Flow Visualization ──────────────────────────────────────────────

function EnergyFlowViz({ solar, battery, home, grid }: { solar: number; battery: number; home: number; grid: number }) {
  const gridExport = grid < 0;
  const gridValue = Math.abs(grid);

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">Energiflöde</CardTitle>
          <Badge variant="outline" className="text-xs border-emerald-500/25 text-emerald-400 bg-emerald-500/10">Realtid</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <svg viewBox="0 0 480 280" className="w-full h-auto" style={{ maxHeight: 280 }}>
          {/* Background glow */}
          <defs>
            <radialGradient id="solarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="battGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="homeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glows */}
          <circle cx="80" cy="70" r="50" fill="url(#solarGlow)" />
          <circle cx="80" cy="210" r="50" fill="url(#battGlow)" />
          <circle cx="280" cy="140" r="60" fill="url(#homeGlow)" />
          <circle cx="420" cy="140" r="50" fill="url(#gridGlow)" />

          {/* Flow lines */}
          {solar > 0 && (
            <g>
              <path d="M 120 70 C 180 70, 220 120, 250 140" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.6" filter="url(#glow)">
                <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
              </path>
              <text x="170" y="90" textAnchor="middle" className="text-[10px]" fill="#92400e" fontWeight="600">{solar.toFixed(1)} kW</text>
            </g>
          )}
          {battery > 0 && (
            <g>
              <path d="M 120 210 C 180 210, 220 170, 250 150" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.6" filter="url(#glow)">
                <animate attributeName="stroke-dashoffset" from="20" to="0" dur="2s" repeatCount="indefinite" />
              </path>
              <text x="170" y="195" textAnchor="middle" className="text-[10px]" fill="#065f46" fontWeight="600">{battery.toFixed(1)} kW</text>
            </g>
          )}
          {gridValue > 0 && (
            <g>
              <path d={gridExport ? "M 310 140 C 350 140, 380 140, 390 140" : "M 390 140 C 380 140, 350 140, 310 140"} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.6" filter="url(#glow)">
                <animate attributeName="stroke-dashoffset" from={gridExport ? "0" : "20"} to={gridExport ? "20" : "0"} dur="1.8s" repeatCount="indefinite" />
              </path>
              <text x="350" y="130" textAnchor="middle" className="text-[10px]" fill={gridExport ? "#065f46" : "#0369a1"} fontWeight="600">
                {gridExport ? "Export" : "Import"} {gridValue.toFixed(1)} kW
              </text>
            </g>
          )}

          {/* Nodes */}
          {/* Solar */}
          <g>
            <circle cx="80" cy="70" r="32" fill="white" stroke="#fbbf24" strokeWidth="2" />
            <text x="80" y="65" textAnchor="middle" fill="#92400e" fontSize="18" fontWeight="bold">☀</text>
            <text x="80" y="82" textAnchor="middle" fill="#78716c" fontSize="9" fontWeight="500">Sol</text>
          </g>

          {/* Battery */}
          <g>
            <circle cx="80" cy="210" r="32" fill="white" stroke="#34d399" strokeWidth="2" />
            <text x="80" y="205" textAnchor="middle" fill="#065f46" fontSize="16" fontWeight="bold">🔋</text>
            <text x="80" y="222" textAnchor="middle" fill="#78716c" fontSize="9" fontWeight="500">Batteri</text>
          </g>

          {/* Home */}
          <g>
            <circle cx="280" cy="140" r="40" fill="white" stroke="#818cf8" strokeWidth="2.5" />
            <text x="280" y="133" textAnchor="middle" fill="#4338ca" fontSize="20" fontWeight="bold">🏠</text>
            <text x="280" y="152" textAnchor="middle" fill="#78716c" fontSize="9" fontWeight="500">{home.toFixed(1)} kW</text>
          </g>

          {/* Grid */}
          <g>
            <circle cx="420" cy="140" r="32" fill="white" stroke="#38bdf8" strokeWidth="2" />
            <text x="420" y="135" textAnchor="middle" fill="#0369a1" fontSize="16" fontWeight="bold">⚡</text>
            <text x="420" y="152" textAnchor="middle" fill="#78716c" fontSize="9" fontWeight="500">Nät</text>
          </g>
        </svg>
      </CardContent>
    </Card>
  );
}

// ─── AI Insights Panel ──────────────────────────────────────────────────────

function AIInsightsPanel({ forecast }: { forecast: any }) {
  const insights = useMemo(() => {
    if (!forecast?.summary) return [];
    const tips: { icon: React.ElementType; text: string; type: "tip" | "alert" | "info" }[] = [];

    if (forecast.summary.price_spread_sek > 0.5) {
      tips.push({
        icon: TrendingUp,
        text: `Stor prisspridning idag (${(forecast.summary.price_spread_sek * 100).toFixed(0)} öre). Ladda batteri vid lägsta pris, urladdning vid topp.`,
        type: "tip",
      });
    }
    if (forecast.summary.total_solar_kwh > 20) {
      tips.push({
        icon: Sun,
        text: `Stark solprognos: ${forecast.summary.total_solar_kwh.toFixed(0)} kWh. Prioritera egenförbrukning och batteriladdning.`,
        type: "info",
      });
    }
    if (forecast.summary.avg_price_sek > 1.0) {
      tips.push({
        icon: AlertTriangle,
        text: `Högt genomsnittspris (${(forecast.summary.avg_price_sek * 100).toFixed(0)} öre/kWh). Minimera nätimport under topparna.`,
        type: "alert",
      });
    }
    if (tips.length === 0) {
      tips.push({
        icon: CheckCircle2,
        text: "Systemet körs optimalt. Inga åtgärder krävs just nu.",
        type: "info",
      });
    }
    return tips;
  }, [forecast]);

  const typeColors = {
    tip: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    alert: "bg-red-500/10 border-red-500/25 text-red-400",
    info: "bg-blue-500/10 border-blue-500/25 text-blue-400",
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base font-semibold text-foreground">AI Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className={`flex items-start gap-2.5 p-3 rounded-lg border ${typeColors[insight.type]}`}
          >
            <insight.icon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">{insight.text}</p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Notifications Panel ────────────────────────────────────────────────────

function NotificationsPanel() {
  const { user } = useAuth();
  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 5 },
    { enabled: !!user, staleTime: 30_000 }
  );

  const typeIcon: Record<string, { icon: React.ElementType; color: string }> = {
    ai: { icon: BrainCircuit, color: "text-amber-600 bg-amber-500/10" },
    energy: { icon: Zap, color: "text-emerald-600 bg-emerald-500/10" },
    system: { icon: Activity, color: "text-blue-600 bg-blue-500/10" },
    alert: { icon: AlertTriangle, color: "text-red-600 bg-red-500/10" },
    ticket: { icon: Wrench, color: "text-violet-600 bg-violet-500/10" },
    info: { icon: Bell, color: "text-muted-foreground bg-secondary" },
  };

  const items = notifications ?? [];

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold text-foreground">Notiser</CardTitle>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-400 border-0">
              {items.filter((n) => !n.isRead).length} nya
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Inga notiser ännu</p>
        ) : (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {items.map((n) => {
                const t = typeIcon[n.type ?? "info"] ?? typeIcon.info;
                return (
                  <div key={n.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors ${n.isRead ? "opacity-60" : "bg-secondary/50"}`}>
                    <div className={`p-1.5 rounded-md ${t.color}`}>
                      <t.icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AI Actions Panel ───────────────────────────────────────────────────────

function AIActionsPanel() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const runOptimization = trpc.optimization.run.useMutation({
    onSuccess: () => {
      utils.optimization.latest.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const actions = [
    {
      icon: Battery,
      label: "Optimera Laddning",
      desc: "AI-baserad batterioptimering",
      color: "from-emerald-500 to-teal-600",
      onClick: () => runOptimization.mutate({}),
      loading: runOptimization.isPending,
    },
    {
      icon: BarChart3,
      label: "Prognos 48h",
      desc: "Pris- och produktionsprognos",
      color: "from-blue-500 to-indigo-600",
      onClick: () => { /* Navigate to energy page */ },
    },
    {
      icon: Wrench,
      label: "Systemdiagnostik",
      desc: "Kontrollera alla enheter",
      color: "from-violet-500 to-purple-600",
      onClick: () => { /* Navigate to devices */ },
    },
    {
      icon: FileText,
      label: "Generera Rapport",
      desc: "Månadsrapport med AI-analys",
      color: "from-amber-500 to-orange-600",
      onClick: () => { /* Generate report */ },
    },
  ];

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base font-semibold text-foreground">AI Åtgärder</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={a.onClick}
              disabled={a.loading}
              className="flex flex-col items-start gap-2 p-3 rounded-xl bg-card border border-border hover:border-border hover:shadow-sm transition-all text-left disabled:opacity-50"
            >
              <div className={`p-2 rounded-lg bg-gradient-to-br ${a.color} text-white`}>
                {a.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <a.icon className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{a.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Price Chart (compact) ──────────────────────────────────────────────────

function PriceChartCompact({ prices }: { prices: { hour: number; price_sek: number }[] }) {
  const chartData = prices.map((p) => ({
    hour: `${String(p.hour).padStart(2, "0")}:00`,
    price: Math.round(p.price_sek * 100),
  }));
  const avg = chartData.length > 0 ? chartData.reduce((s, d) => s + d.price, 0) / chartData.length : 0;

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">Spotpris idag</CardTitle>
          <span className="text-xs text-muted-foreground">öre/kWh</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#8B9BB4" }} tickLine={false} axisLine={false} interval={5} />
            <YAxis tick={{ fontSize: 9, fill: "#8B9BB4" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "rgba(20,29,46,0.95)", border: "1px solid rgba(20,184,166,0.3)", color: "#E8EDF5", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
              labelStyle={{ color: "#8B9BB4" }}
              formatter={(v: number) => [`${v} öre/kWh`, "Pris"]}
            />
            <ReferenceLine y={avg} stroke="#d97706" strokeDasharray="4 4" strokeWidth={1} />
            <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} fill="url(#priceGrad)" dot={false} animationDuration={1000} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main Home Page ─────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Fetch forecast data (public, works without auth)
  const { data: forecast, isLoading: forecastLoading } = trpc.energy.forecast.useQuery(
    { zone: "SE3", lat: 59.3293, lon: 18.0686, panelKwp: 10 },
    { staleTime: 5 * 60 * 1000, retry: 2 }
  );

  // Derive KPI values from forecast
  const kpis = useMemo(() => {
    if (!forecast) return null;
    const now = new Date().getHours();
    const currentSolar = forecast.solar.find((s: any) => s.hour === now);
    const currentLoad = forecast.load.find((l: any) => l.hour === now);
    const production = currentSolar?.production_kw ?? 0;
    const consumption = currentLoad?.consumption_kw ?? 0;
    const batterySOC = 65; // Simulated - would come from real device API
    const gridFlow = consumption - production - (batterySOC > 50 ? 1.5 : 0);
    const dailySavings = forecast.summary.total_solar_kwh * forecast.summary.avg_price_sek;

    return {
      production,
      consumption,
      batterySOC,
      gridFlow,
      dailySavings,
      totalSolar: forecast.summary.total_solar_kwh,
      totalLoad: forecast.summary.total_load_kwh,
      avgPrice: forecast.summary.avg_price_sek,
    };
  }, [forecast]);

  // Sparkline data derived from forecast hourly arrays
  const sparklines = useMemo(() => {
    if (!forecast) return { solar: [], load: [], price: [], battery: [], savings: [] };
    const solar = forecast.solar.map((s: any) => s.production_kw ?? 0);
    const load = forecast.load.map((l: any) => l.consumption_kw ?? 0);
    const price = forecast.prices.map((p: any) => p.price_sek ?? 0);
    // Simulate battery SOC curve (charge during solar, discharge evening)
    const battery = forecast.solar.map((_: any, i: number) => {
      const hour = i % 24;
      if (hour >= 10 && hour <= 15) return 60 + (hour - 10) * 7;
      if (hour >= 16 && hour <= 22) return 95 - (hour - 16) * 10;
      return 40 + Math.random() * 10;
    });
    // Cumulative savings through the day
    const savings = price.map((p: number, i: number) => {
      const solarKw = solar[i] ?? 0;
      return solarKw * p;
    });
    return { solar, load, price, battery, savings };
  }, [forecast]);

  // Energy flow values
  const flowValues = useMemo(() => {
    if (!kpis) return { solar: 0, battery: 0, home: 0, grid: 0 };
    return {
      solar: kpis.production,
      battery: kpis.batterySOC > 50 ? 1.5 : -1.0,
      home: kpis.consumption,
      grid: kpis.gridFlow,
    };
  }, [kpis]);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Välkommen{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })} — Energiöversikt
          </p>
        </div>
        <AIStatusBar />
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard
          title="Produktion"
          value={kpis?.production ?? 0}
          unit="kW"
          icon={Sun}
          trend="up"
          trendValue={`${kpis?.totalSolar?.toFixed(0) ?? 0} kWh idag`}
          color="amber"
          loading={forecastLoading}
          sparkData={sparklines.solar}
        />
        <KPICard
          title="Förbrukning"
          value={kpis?.consumption ?? 0}
          unit="kW"
          icon={HomeIcon}
          trend="down"
          trendValue={`${kpis?.totalLoad?.toFixed(0) ?? 0} kWh idag`}
          color="violet"
          loading={forecastLoading}
          sparkData={sparklines.load}
        />
        <KPICard
          title="Batteri"
          value={kpis?.batterySOC ?? 0}
          unit="%"
          icon={Battery}
          color="emerald"
          loading={forecastLoading}
          sparkData={sparklines.battery}
        />
        <KPICard
          title="Nät"
          value={Math.abs(kpis?.gridFlow ?? 0)}
          unit="kW"
          icon={Zap}
          trend={(kpis?.gridFlow ?? 0) < 0 ? "up" : "down"}
          trendValue={(kpis?.gridFlow ?? 0) < 0 ? "Export" : "Import"}
          color="blue"
          loading={forecastLoading}
          sparkData={sparklines.price}
        />
        <KPICard
          title="Besparing"
          value={kpis?.dailySavings ?? 0}
          unit="kr"
          icon={TrendingUp}
          trend="up"
          trendValue="idag"
          color="teal"
          loading={forecastLoading}
          sparkData={sparklines.savings}
        />
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Energy Flow + Price Chart */}
        <div className="lg:col-span-2 space-y-4">
          <EnergyFlowViz {...flowValues} />
          {forecast?.prices && <PriceChartCompact prices={forecast.prices} />}
        </div>

        {/* Right: AI Insights + Notifications + Actions */}
        <div className="space-y-4">
          {forecast && <AIInsightsPanel forecast={forecast} />}
          <NotificationsPanel />
          <AIActionsPanel />
        </div>
      </div>
    </div>
  );
}
