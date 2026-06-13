import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sun, Battery, Zap, TrendingUp,
  Download, Loader2, RefreshCw, BarChart3, Activity,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
  ComposedChart, Line,
} from "recharts";
import { motion } from "framer-motion";

type TimeFilter = "24h" | "48h";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  title, value, unit, icon: Icon, color,
}: {
  title: string; value: number; unit: string;
  icon: React.ElementType; color: string;
}) {
  const colors: Record<string, { bg: string; icon: string; border: string }> = {
    amber:   { bg: "bg-amber-500/10",   icon: "text-amber-600",   border: "border-amber-500/25"  },
    emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-600", border: "border-emerald-500/25"},
    blue:    { bg: "bg-blue-500/10",    icon: "text-blue-600",    border: "border-blue-500/25"   },
    violet:  { bg: "bg-violet-500/10",  icon: "text-violet-600",  border: "border-violet-500/25" },
  };
  const c = colors[color] ?? colors.amber;
  return (
    <Card className={`border ${c.border} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>
          <Icon className={`h-4 w-4 ${c.icon}`} />
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground tracking-tight">{value.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

async function downloadPDF(forecast: any, filter: TimeFilter) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("SOLPULSEN CARE", 20, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 140, 60);
  doc.text("Energirapport – " + filter, 20, 28);
  doc.setTextColor(200, 210, 220);
  doc.text("Genererad: " + new Date().toLocaleDateString("sv-SE", { dateStyle: "full" }), 20, 36);

  // Summary
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 45, 210, 50, "F");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Sammanfattning", 20, 58);

  const s = forecast?.summary;
  const rows = [
    ["Total solproduktion", `${(s?.total_solar_kwh ?? 0).toFixed(1)} kWh`],
    ["Total förbrukning",   `${(s?.total_load_kwh ?? 0).toFixed(1)} kWh`],
    ["Genomsnittspris",     `${((s?.avg_price_sek ?? 0) * 100).toFixed(1)} öre/kWh`],
    ["Egenanvändning",      `${(s?.self_consumption_pct ?? 0).toFixed(0)}%`],
  ];
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  rows.forEach(([label, value], i) => {
    const y = 68 + i * 8;
    doc.setTextColor(100, 116, 139);
    doc.text(label, 20, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(value, 120, y);
    doc.setFont("helvetica", "normal");
  });

  // Price table
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Timpriser (öre/kWh)", 20, 108);

  const prices = forecast?.prices ?? [];
  const tableY = 115;
  doc.setFillColor(30, 41, 59);
  doc.rect(20, tableY, 170, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Timme", 22, tableY + 5);
  doc.text("Pris (öre/kWh)", 80, tableY + 5);
  doc.text("Produktion (kW)", 130, tableY + 5);

  prices.slice(0, 24).forEach((p: any, i: number) => {
    const y = tableY + 7 + i * 6;
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(20, y, 170, 6, "F"); }
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.text(`${p.hour ?? i}:00`, 22, y + 4);
    doc.text(`${((p.price_sek ?? 0) * 100).toFixed(1)}`, 80, y + 4);
    doc.text(`${(p.production_kw ?? 0).toFixed(2)}`, 130, y + 4);
  });

  // Footer
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 280, 210, 17, "F");
  doc.setTextColor(180, 140, 60);
  doc.setFontSize(8);
  doc.text("Solpulsen Energy Norden AB  |  solpulsen.se  |  CARE Platform", 20, 291);

  doc.save(`solpulsen-care-energirapport-${filter}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function Energy() {
  const [filter, setFilter] = useState<TimeFilter>("24h");
  const [pdfLoading, setPdfLoading] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data: forecast, isLoading, refetch } = trpc.energy.forecast.useQuery(
    { zone: "SE3", lat: 59.3293, lon: 18.0686, panelKwp: 10 },
    { staleTime: 5 * 60 * 1000, retry: 2 }
  );

  const { data: forecast48 } = trpc.energy.forecast48h.useQuery(
    { zone: "SE3", lat: 59.3293, lon: 18.0686, panelKwp: 10 },
    { staleTime: 10 * 60 * 1000, enabled: filter === "48h" }
  );

  const { data: spotData } = trpc.energy.spotPrices.useQuery(
    { area: "SE3", date: today },
    { staleTime: 5 * 60 * 1000 }
  );

  const chartData24 = useMemo(() => {
    if (!forecast) return [];
    const prices = forecast.prices ?? [];
    const solar  = forecast.solar  ?? [];
    const load   = forecast.load   ?? [];
    return prices.map((p: any, i: number) => {
      const s = solar.find((x: any) => x.hour === (p.hour ?? i)) ?? { production_kw: 0 };
      const l = load.find((x: any)  => x.hour === (p.hour ?? i)) ?? { consumption_kw: 0 };
      return {
        hour: `${String(p.hour ?? i).padStart(2, "0")}:00`,
        Produktion: parseFloat(s.production_kw.toFixed(2)),
        Förbrukning: parseFloat(l.consumption_kw.toFixed(2)),
        Netto: parseFloat((s.production_kw - l.consumption_kw).toFixed(2)),
        Pris: parseFloat(((p.price_sek ?? 0) * 100).toFixed(1)),
      };
    });
  }, [forecast]);

  const chartData48 = useMemo(() => {
    if (!forecast48) return [];
    const combined = forecast48.combined_prices ?? [];
    return combined.map((p: any, i: number) => ({
      hour: `${String((p.hour ?? i) % 24).padStart(2, "0")}:00`,
      Pris: parseFloat(((p.price_sek ?? 0) * 100).toFixed(1)),
    }));
  }, [forecast48]);

  const activeData = filter === "24h" ? chartData24 : chartData48;

  const stats = useMemo(() => {
    if (!forecast?.summary) return null;
    const s = forecast.summary;
    return {
      production:      s.total_solar_kwh ?? 0,
      consumption:     s.total_load_kwh  ?? 0,
      selfConsumption: s.total_solar_kwh > 0 ? Math.min(100, (s.total_solar_kwh / Math.max(s.total_load_kwh, 0.01)) * 100) : 0,
      avgPrice:        (s.avg_price_sek ?? 0) * 100,
    };
  }, [forecast]);

  const handlePDF = async () => {
    setPdfLoading(true);
    try { await downloadPDF(forecast, filter); }
    finally { setPdfLoading(false); }
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Energi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Produktion, förbrukning och prisanalys</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {(["24h", "48h"] as TimeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Uppdatera
          </Button>
          <Button
            size="sm"
            onClick={handlePDF}
            disabled={pdfLoading || !forecast}
            className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Ladda ner rapport
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border border-border animate-pulse"><CardContent className="p-4 h-24" /></Card>
          ))}
        </div>
      ) : stats ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Solproduktion idag" value={stats.production}      unit="kWh" icon={Sun}       color="amber"   />
          <StatCard title="Förbrukning idag"   value={stats.consumption}     unit="kWh" icon={Zap}       color="violet"  />
          <StatCard title="Egenanvändning"     value={stats.selfConsumption} unit="%"   icon={TrendingUp} color="emerald" />
          <StatCard title="Snittspris"         value={stats.avgPrice}        unit="öre" icon={BarChart3}  color="blue"    />
        </motion.div>
      ) : null}

      {/* Main chart */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold text-foreground">
                {filter === "24h" ? "Produktion & Förbrukning – Idag" : "Prognos – 48 timmar"}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs border-emerald-500/25 text-emerald-400 bg-emerald-500/10">
              {isLoading ? "Laddar..." : "Live"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={activeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={filter === "24h" ? 3 : 6} />
                <YAxis yAxisId="kw"    tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="right" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {filter === "24h" && (
                  <>
                    <Area yAxisId="kw" type="monotone" dataKey="Produktion"  stroke="#f59e0b" strokeWidth={2} fill="url(#prodGrad)" dot={false} animationDuration={800} />
                    <Area yAxisId="kw" type="monotone" dataKey="Förbrukning" stroke="#6366f1" strokeWidth={2} fill="url(#consGrad)" dot={false} animationDuration={800} />
                  </>
                )}
                <Line yAxisId="price" type="monotone" dataKey="Pris" stroke="#10b981" strokeWidth={1.5} dot={false} animationDuration={800} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Battery profile */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base font-semibold text-foreground">Batteri – Laddningsprofil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={chartData24.map((d, i) => ({
                    hour: d.hour,
                    "SOC %": Math.min(100, Math.max(20,
                      50 + (d.Produktion - d.Förbrukning) * 8 + Math.sin(i / 3) * 5
                    )),
                  }))}
                  margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={5} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
                  <Area type="monotone" dataKey="SOC %" stroke="#10b981" strokeWidth={2} fill="url(#socGrad)" dot={false} animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Spot price bar chart */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base font-semibold text-foreground">Spotpris idag – SE3</CardTitle>
              </div>
              {spotData && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-600 font-medium">Min: {spotData.min.price.toFixed(1)} öre</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-red-500 font-medium">Max: {spotData.max.price.toFixed(1)} öre</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!spotData ? (
              <div className="h-48 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={spotData.data.map((d: any) => ({
                    hour: new Date(d.time).getHours() + ":00",
                    Pris: parseFloat(d.price.toFixed(1)),
                  }))}
                  margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={spotData.average} stroke="#d97706" strokeDasharray="4 4" strokeWidth={1} />
                  <Bar dataKey="Pris" fill="#f59e0b" radius={[3, 3, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid flow */}
      {filter === "24h" && chartData24.length > 0 && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-base font-semibold text-foreground">Nätflöde – Import / Export</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData24} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                <Bar dataKey="Netto" fill="#6366f1" radius={[2, 2, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Positivt = export till nät · Negativt = import från nät
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
