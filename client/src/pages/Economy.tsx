import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Wallet, Zap, BarChart3,
  ArrowUpRight, ArrowDownRight, Calendar, Download,
  Sparkles, Battery, Sun, Wind, DollarSign, Target,
  Clock, ChevronRight, RefreshCw, Loader2, PiggyBank,
  Shield, LineChart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ComposedChart, Line,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptRun {
  id: number;
  zone: string;
  date: string;
  netSavingsSek: number;
  arbitrageProfitSek: number;
  peakShavingValueSek: number;
  selfConsumptionPct: number;
  baselineCostSek: number;
  totalCostSek: number;
  batteryCapacityKwh: number;
  panelKwp: number;
  createdAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSek(cents: number): string {
  const kr = cents / 100;
  if (Math.abs(kr) >= 1000) return `${(kr / 1000).toFixed(1)}k`;
  return kr.toFixed(0);
}

function formatSekFull(cents: number): string {
  return `${(cents / 100).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr`;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useState<NodeJS.Timeout | null>(null);

  useMemo(() => {
    if (ref[0]) clearInterval(ref[0]);
    const steps = 30;
    const inc = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += inc;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, 20);
    ref[0] = timer;
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display.toLocaleString("sv-SE")}{suffix}</span>;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",     label: "Översikt",      icon: BarChart3 },
  { id: "optimization", label: "AI-optimering",  icon: Sparkles },
  { id: "roi",          label: "ROI & Payback",  icon: Target },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ runs }: { runs: OptRun[] }) {
  const totalSavings = runs.reduce((s, r) => s + r.netSavingsSek, 0);
  const totalArbitrage = runs.reduce((s, r) => s + r.arbitrageProfitSek, 0);
  const totalPeakShaving = runs.reduce((s, r) => s + r.peakShavingValueSek, 0);
  const avgSelfConsumption = runs.length > 0
    ? Math.round(runs.reduce((s, r) => s + r.selfConsumptionPct, 0) / runs.length)
    : 0;
  const totalBaselineCost = runs.reduce((s, r) => s + r.baselineCostSek, 0);
  const totalOptimizedCost = runs.reduce((s, r) => s + r.totalCostSek, 0);

  // Projected annual (based on daily average * 365)
  const daysTracked = runs.length || 1;
  const dailyAvgSavings = totalSavings / daysTracked;
  const annualProjection = Math.round(dailyAvgSavings * 365);

  // Savings breakdown for pie chart
  const pieData = [
    { name: "Arbitrage", value: Math.abs(totalArbitrage), color: "#d97706" },
    { name: "Peak Shaving", value: Math.abs(totalPeakShaving), color: "#0d9488" },
    { name: "Egenförbrukning", value: Math.max(0, totalSavings - Math.abs(totalArbitrage) - Math.abs(totalPeakShaving)), color: "#6366f1" },
  ].filter(d => d.value > 0);

  // Daily savings chart data
  const dailyData = runs.slice().reverse().map((r) => ({
    date: r.date,
    savings: r.netSavingsSek / 100,
    baseline: r.baselineCostSek / 100,
    optimized: r.totalCostSek / 100,
  }));

  return (
    <div className="space-y-5">
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total besparing",
            value: formatSekFull(totalSavings),
            sub: `${runs.length} optimeringar`,
            icon: PiggyBank,
            color: "text-emerald-600",
            bg: "bg-emerald-500/10",
            trend: totalSavings > 0 ? "up" : "neutral",
          },
          {
            label: "Årsprognos",
            value: formatSekFull(annualProjection),
            sub: `${formatSek(Math.round(dailyAvgSavings))} kr/dag snitt`,
            icon: TrendingUp,
            color: "text-amber-600",
            bg: "bg-amber-500/10",
            trend: "up",
          },
          {
            label: "Egenförbrukning",
            value: `${avgSelfConsumption}%`,
            sub: "Genomsnitt",
            icon: Sun,
            color: "text-blue-600",
            bg: "bg-blue-500/10",
            trend: avgSelfConsumption > 70 ? "up" : "neutral",
          },
          {
            label: "Kostnadsreduktion",
            value: totalBaselineCost > 0 ? `${Math.round((1 - totalOptimizedCost / totalBaselineCost) * 100)}%` : "–",
            sub: "vs utan optimering",
            icon: Shield,
            color: "text-violet-600",
            bg: "bg-violet-500/10",
            trend: "up",
          },
        ].map((kpi) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card className="border border-border shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  {kpi.trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5 tracking-tight">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Daily savings chart */}
      {dailyData.length > 0 && (
        <Card className="border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Daglig besparing</h3>
                <p className="text-xs text-muted-foreground mt-0.5">SEK per dag, baserat på AI-optimering</p>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Besparing</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted" />Baseline</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)} kr`, name === "savings" ? "Besparing" : name === "baseline" ? "Utan optimering" : "Med optimering"]}
                  labelFormatter={(l) => `Datum: ${l}`}
                />
                <Area type="monotone" dataKey="savings" fill="url(#savingsGrad)" stroke="#d97706" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="baseline" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Savings breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        {pieData.length > 0 && (
          <Card className="border border-border shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Besparingsfördelning</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Legend
                    formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    iconSize={8}
                  />
                  <Tooltip formatter={(value: number) => [`${(value / 100).toFixed(0)} kr`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Cost comparison */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Kostnadsjämförelse</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Utan AI-optimering</span>
                  <span className="text-xs font-bold text-foreground">{formatSekFull(totalBaselineCost)}</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Med CARE AI-optimering</span>
                  <span className="text-xs font-bold text-emerald-600">{formatSekFull(totalOptimizedCost)}</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: totalBaselineCost > 0 ? `${(totalOptimizedCost / totalBaselineCost) * 100}%` : "0%" }} />
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Du sparar</span>
                  <span className="text-lg font-bold text-emerald-600">{formatSekFull(totalSavings)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {runs.length === 0 && (
        <Card className="border border-amber-500/25 bg-gradient-to-br from-amber-500/10/50 to-white">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <p className="font-semibold text-foreground mb-1">Ingen optimeringsdata ännu</p>
            <p className="text-sm text-muted-foreground mb-4">Kör din första AI-optimering från Hem-sidan för att börja spåra besparingar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Optimization History Tab ─────────────────────────────────────────────────

function OptimizationTab({ runs, onRunOptimization, isRunning }: {
  runs: OptRun[];
  onRunOptimization: () => void;
  isRunning: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">AI-optimeringshistorik</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Varje körning optimerar batteriladdning baserat på spotpriser och solprognos</p>
        </div>
        <Button
          size="sm"
          onClick={onRunOptimization}
          disabled={isRunning}
          className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
        >
          {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Kör ny optimering
        </Button>
      </div>

      {/* Run list */}
      {runs.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-10 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Inga optimeringar körda</p>
            <p className="text-sm text-muted-foreground mb-4">Kör din första optimering för att se resultat.</p>
            <Button size="sm" onClick={onRunOptimization} disabled={isRunning} className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Kör optimering
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run, i) => {
            const savings = run.netSavingsSek / 100;
            const isPositive = savings > 0;
            return (
              <motion.div key={run.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border border-border shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-xl mt-0.5 ${isPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                          {isPositive ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{run.date}</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{run.zone}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Sun className="h-2.5 w-2.5" />{run.panelKwp} kWp</span>
                            <span className="flex items-center gap-1"><Battery className="h-2.5 w-2.5" />{run.batteryCapacityKwh} kWh</span>
                            <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5" />{run.selfConsumptionPct}% egenförbrukning</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[10px] flex-wrap">
                            <span className="text-amber-600 font-medium">Arbitrage: {(run.arbitrageProfitSek / 100).toFixed(1)} kr</span>
                            <span className="text-teal-600 font-medium">Peak shaving: {(run.peakShavingValueSek / 100).toFixed(1)} kr</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                          {isPositive ? "+" : ""}{savings.toFixed(1)} kr
                        </p>
                        <p className="text-[10px] text-muted-foreground">nettobesparing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ROI Tab ──────────────────────────────────────────────────────────────────

function ROITab({ runs }: { runs: OptRun[] }) {
  // Calculate projected ROI based on optimization data
  const totalSavings = runs.reduce((s, r) => s + r.netSavingsSek, 0);
  const daysTracked = runs.length || 1;
  const dailyAvg = totalSavings / daysTracked / 100; // kr/day
  const annualSavings = dailyAvg * 365;

  // Estimate system investment (based on panel + battery size from latest run)
  const latestRun = runs[0];
  const panelKwp = latestRun?.panelKwp ?? 10;
  const batteryKwh = latestRun?.batteryCapacityKwh ?? 15;
  const panelInvestment = panelKwp * 12000; // ~12k SEK/kWp installed
  const batteryInvestment = batteryKwh * 8000; // ~8k SEK/kWh
  const totalInvestment = panelInvestment + batteryInvestment;
  const paybackYears = annualSavings > 0 ? totalInvestment / annualSavings : 0;

  // 20-year projection
  const projectionData = Array.from({ length: 21 }, (_, year) => {
    const degradation = Math.pow(0.995, year); // 0.5% annual degradation
    const cumSavings = Array.from({ length: year }, (_, y) => annualSavings * Math.pow(0.995, y)).reduce((a, b) => a + b, 0);
    return {
      year,
      savings: Math.round(cumSavings),
      investment: totalInvestment,
      net: Math.round(cumSavings - totalInvestment),
    };
  });

  const breakEvenYear = projectionData.find(d => d.net >= 0)?.year;
  const roi20y = totalInvestment > 0 ? Math.round(((projectionData[20]?.savings ?? 0) / totalInvestment - 1) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ROI KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Investering", value: `${(totalInvestment / 1000).toFixed(0)}k kr`, icon: Wallet, color: "text-muted-foreground", bg: "bg-secondary" },
          { label: "Årsbesparing", value: `${annualSavings.toFixed(0)} kr`, icon: PiggyBank, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Payback", value: paybackYears > 0 ? `${paybackYears.toFixed(1)} år` : "–", icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "ROI 20 år", value: `${roi20y}%`, icon: Target, color: "text-violet-600", bg: "bg-violet-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-xl ${kpi.bg} mb-2`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5 tracking-tight">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 20-year projection chart */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">20-årig ROI-prognos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Kumulativ besparing vs investering, med 0.5% årlig degradering</p>
            </div>
            {breakEvenYear && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                Break-even: år {breakEvenYear}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={projectionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} label={{ value: "År", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString("sv-SE")} kr`,
                  name === "savings" ? "Kumulativ besparing" : name === "investment" ? "Investering" : "Nettoresultat"
                ]}
                labelFormatter={(l) => `År ${l}`}
              />
              <Area type="monotone" dataKey="savings" fill="url(#netGrad)" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="investment" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* System breakdown */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Systemkalkyl</h3>
          <div className="space-y-3">
            {[
              { label: "Solpaneler", detail: `${panelKwp} kWp`, cost: panelInvestment, icon: Sun, color: "text-amber-600" },
              { label: "Batteri", detail: `${batteryKwh} kWh`, cost: batteryInvestment, icon: Battery, color: "text-teal-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">{item.cost.toLocaleString("sv-SE")} kr</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <span className="text-sm font-semibold text-foreground">Total investering</span>
              <span className="text-lg font-bold text-amber-400">{totalInvestment.toLocaleString("sv-SE")} kr</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border border-blue-500/25 bg-blue-500/10/50">
        <CardContent className="p-4 flex items-start gap-3">
          <LineChart className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-blue-400">Beräkningsgrund</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Prognosen baseras på faktiska optimeringsresultat ({runs.length} körningar), aktuella spotpriser och 0.5% årlig degradering.
              Verkliga resultat varierar med väder, elprisutveckling och förbrukningsmönster.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Economy() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { isAuthenticated } = useAuth();

  const { data: optimizationRuns = [], isLoading } = trpc.optimization.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const runMutation = trpc.optimization.run.useMutation({
    onSuccess: () => {
      toast.success("Optimering klar");
      trpc.useUtils().optimization.list.invalidate();
    },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const runs = (optimizationRuns as OptRun[]);

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Ekonomi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Besparingar, ROI och AI-optimering</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.info("PDF-rapport kommer snart")}>
          <Download className="h-3.5 w-3.5" />Ladda ner rapport
        </Button>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "overview"     && <OverviewTab runs={runs} />}
            {activeTab === "optimization" && <OptimizationTab runs={runs} onRunOptimization={() => runMutation.mutate({})} isRunning={runMutation.isPending} />}
            {activeTab === "roi"          && <ROITab runs={runs} />}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Not logged in */}
      {!isAuthenticated && (
        <Card className="border border-amber-500/25 bg-amber-500/10/50">
          <CardContent className="p-6 text-center">
            <Wallet className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">Logga in för att se din ekonomi</p>
            <p className="text-xs text-muted-foreground">Dina besparingar och optimeringshistorik sparas per konto.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
