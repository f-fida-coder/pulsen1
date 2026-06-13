import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Sun, Battery, Wind, Calculator } from "lucide-react";
import type { EnergyConfig } from "./SystemConfig";

interface ROIResult {
  solarSavings: number;
  windSavings: number;
  batterySavings: number;
  arbitrageSavings: number;
  totalAnnualSavings: number;
  investmentCost: number;
  paybackYears: number;
  roi10yr: number;
  roi20yr: number;
}

const AREA_MULTIPLIERS: Record<string, number> = {
  SE1: 0.6,
  SE2: 0.8,
  SE3: 1.0,
  SE4: 1.2,
};

function orientationFactor(deg: number): number {
  // South = 180 = 1.0, North = 0/360 = 0.6
  const diff = Math.abs(deg - 180);
  return 1.0 - (diff / 180) * 0.4;
}

export function calculateROI(cfg: EnergyConfig): ROIResult {
  const am = AREA_MULTIPLIERS[cfg.electricityArea] ?? 1.0;
  const of = orientationFactor(cfg.roofOrientation);
  const dod = cfg.batteryDoD / 100;
  const eff = cfg.batteryEfficiency / 100;
  const shading = 1 - cfg.shading / 100;

  // Solar: 120 kr/kWp/år baseline × area × orientation × shading
  const solarSavings = cfg.solarCapacity * 1200 * am * of * shading;

  // Wind: 200 kr/kW/år × area
  const windSavings = cfg.hasWind ? cfg.windCapacity * 2000 * am : 0;

  // Battery: 50 kr/kWh/år × DoD × efficiency × area
  const batterySavings = cfg.batteryCapacity * 500 * am * dod * eff;

  // Arbitrage: 30 kr/kWh/yr × area
  const arbitrageSavings = cfg.batteryCapacity * 300 * am;

  const totalAnnualSavings = solarSavings + windSavings + batterySavings + arbitrageSavings;

  // Investment cost estimates (kr)
  const solarCost = cfg.solarCapacity * 12000; // 12 kr/Wp
  const batteryCost = cfg.batteryCapacity * 8000; // 8 kr/kWh
  const windCost = cfg.hasWind ? cfg.windCapacity * 25000 : 0; // 25 kr/W
  const investmentCost = solarCost + batteryCost + windCost;

  const paybackYears = investmentCost > 0 ? investmentCost / totalAnnualSavings : 0;
  const roi10yr = investmentCost > 0 ? ((totalAnnualSavings * 10 - investmentCost) / investmentCost) * 100 : 0;
  const roi20yr = investmentCost > 0 ? ((totalAnnualSavings * 20 - investmentCost) / investmentCost) * 100 : 0;

  return {
    solarSavings,
    windSavings,
    batterySavings,
    arbitrageSavings,
    totalAnnualSavings,
    investmentCost,
    paybackYears,
    roi10yr,
    roi20yr,
  };
}

interface Props {
  config: EnergyConfig;
}

function fmt(n: number): string {
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

export default function ROIPanel({ config }: Props) {
  const roi = useMemo(() => calculateROI(config), [config]);

  const chartData = [
    { name: "Sol", value: Math.round(roi.solarSavings), color: "#f59e0b" },
    { name: "Batteri", value: Math.round(roi.batterySavings), color: "#3b82f6" },
    { name: "Arbitrage", value: Math.round(roi.arbitrageSavings), color: "#8b5cf6" },
    ...(config.hasWind ? [{ name: "Vind", value: Math.round(roi.windSavings), color: "#6366f1" }] : []),
  ];

  const maxSavings = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-500" />
          ROI-kalkyl – {config.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 rounded-lg p-3">
            <div className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Årsbesparing
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {fmt(roi.totalAnnualSavings)} kr
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Investering</div>
            <div className="text-2xl font-bold text-foreground">
              {fmt(roi.investmentCost)} kr
            </div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3">
            <div className="text-xs text-blue-600 mb-1">Återbetalningstid</div>
            <div className="text-2xl font-bold text-blue-400">
              {roi.paybackYears > 0 ? `${roi.paybackYears.toFixed(1)} år` : "–"}
            </div>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-3">
            <div className="text-xs text-purple-600 mb-1">ROI 20 år</div>
            <div className="text-2xl font-bold text-purple-400">
              {roi.roi20yr > 0 ? `${Math.round(roi.roi20yr)}%` : "–"}
            </div>
          </div>
        </div>

        {/* Savings breakdown */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Besparing per komponent (kr/år)</div>
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-16 text-xs text-muted-foreground">{d.name}</div>
              <div className="flex-1">
                <Progress
                  value={(d.value / maxSavings) * 100}
                  className="h-2"
                  style={{ "--progress-color": d.color } as React.CSSProperties}
                />
              </div>
              <div className="w-20 text-xs font-semibold text-right text-foreground">
                {fmt(d.value)} kr
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                formatter={(v: number) => [`${fmt(v)} kr/år`, "Besparing"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ROI timeline */}
        <div className="bg-secondary rounded-lg p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">ROI-tidslinje</div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">5 år</div>
              <div
                className={`text-sm font-bold ${roi.roi10yr / 2 > 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {Math.round(roi.roi10yr / 2)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">10 år</div>
              <div
                className={`text-sm font-bold ${roi.roi10yr > 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {Math.round(roi.roi10yr)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">20 år</div>
              <div
                className={`text-sm font-bold ${roi.roi20yr > 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {Math.round(roi.roi20yr)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Payback</div>
              <div className="text-sm font-bold text-blue-600">
                {roi.paybackYears > 0 ? `${roi.paybackYears.toFixed(1)}y` : "–"}
              </div>
            </div>
          </div>
        </div>

        {/* Component badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-amber-500/15 text-amber-400 text-xs gap-1">
            <Sun className="w-3 h-3" /> {config.solarCapacity} kWp
          </Badge>
          <Badge className="bg-blue-500/15 text-blue-400 text-xs gap-1">
            <Battery className="w-3 h-3" /> {config.batteryCapacity} kWh
          </Badge>
          {config.hasWind && (
            <Badge className="bg-indigo-500/15 text-indigo-400 text-xs gap-1">
              <Wind className="w-3 h-3" /> {config.windCapacity} kW
            </Badge>
          )}
          <Badge className="bg-secondary text-muted-foreground text-xs">
            {config.electricityArea}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
