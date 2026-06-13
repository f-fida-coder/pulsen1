import { useVielhandlareAPI } from "@/hooks/useVielhandlareAPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";

interface Props {
  area?: "SE1" | "SE2" | "SE3" | "SE4";
}

function formatHour(timeStr: string): string {
  try {
    return new Date(timeStr).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

function priceColor(price: number, avg: number): string {
  if (price < avg * 0.7) return "#22c55e";
  if (price < avg) return "#84cc16";
  if (price < avg * 1.3) return "#f59e0b";
  return "#ef4444";
}

export default function SpotPricePanel({ area = "SE3" }: Props) {
  const { priceData, loading, error, refetch, optimalChargeHour, optimalDischargeHour } =
    useVielhandlareAPI(area);

  const now = new Date().getHours();
  const currentPrice = priceData?.data[now]?.price ?? null;

  const chartData = priceData?.data.map((d, i) => ({
    hour: formatHour(d.time),
    price: Math.round(d.price * 10) / 10,
    index: i,
  })) ?? [];

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Spotpris idag – {area}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 rounded p-2 mb-3">{error}</div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-secondary rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Nu ({now}:00)</div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "–" : currentPrice !== null ? `${Math.round(currentPrice)}` : "–"}
            </div>
            <div className="text-xs text-muted-foreground">öre/kWh</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-xs text-green-600 mb-1 flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3" /> Lägst
            </div>
            <div className="text-2xl font-bold text-green-400">
              {loading ? "–" : priceData ? Math.round(priceData.min.price) : "–"}
            </div>
            <div className="text-xs text-green-500">
              {priceData ? formatHour(priceData.min.time) : ""}
            </div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 text-center">
            <div className="text-xs text-red-600 mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Högst
            </div>
            <div className="text-2xl font-bold text-red-400">
              {loading ? "–" : priceData ? Math.round(priceData.max.price) : "–"}
            </div>
            <div className="text-xs text-red-500">
              {priceData ? formatHour(priceData.max.time) : ""}
            </div>
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Hämtar priser...
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  interval={3}
                />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: number) => [`${v} öre/kWh`, "Spotpris"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                {priceData && (
                  <ReferenceLine
                    y={Math.round(priceData.average)}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{ value: "Snitt", fontSize: 10, fill: "#94a3b8" }}
                  />
                )}
                {optimalChargeHour !== null && (
                  <ReferenceLine
                    x={chartData[optimalChargeHour]?.hour}
                    stroke="#22c55e"
                    strokeWidth={2}
                    label={{ value: "Ladda", fontSize: 10, fill: "#22c55e" }}
                  />
                )}
                {optimalDischargeHour !== null && (
                  <ReferenceLine
                    x={chartData[optimalDischargeHour]?.hour}
                    stroke="#ef4444"
                    strokeWidth={2}
                    label={{ value: "Urladdning", fontSize: 10, fill: "#ef4444" }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Optimal timing badges */}
        {priceData && optimalChargeHour !== null && optimalDischargeHour !== null && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <Badge className="bg-green-500/15 text-green-400 border-green-500/25">
              Optimal laddning: {formatHour(priceData.data[optimalChargeHour]?.time ?? "")}–
              {formatHour(priceData.data[optimalChargeHour + 2]?.time ?? "")}
            </Badge>
            <Badge className="bg-red-500/15 text-red-400 border-red-500/25">
              Optimal urladdning: {formatHour(priceData.data[optimalDischargeHour]?.time ?? "")}
            </Badge>
            <Badge className="bg-secondary text-muted-foreground">
              Snitt: {Math.round(priceData.average)} öre/kWh
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { priceColor };
