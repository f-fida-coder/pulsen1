import { useZoneComparison } from "@/hooks/useZoneComparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { MapPin } from "lucide-react";

const ZONE_COLORS: Record<string, string> = {
  SE1: "#6366f1",
  SE2: "#3b82f6",
  SE3: "#22c55e",
  SE4: "#f59e0b",
};

const ZONE_NAMES: Record<string, string> = {
  SE1: "Norrland",
  SE2: "Mellannorrland",
  SE3: "Svealand",
  SE4: "Sydsverige",
};

export default function ZoneComparison() {
  const zones = useZoneComparison();

  const chartData = zones.map((z) => ({
    area: z.area,
    average: z.loading ? 0 : Math.round(z.average),
    name: ZONE_NAMES[z.area],
  }));

  const sorted = [...zones].sort((a, b) => a.average - b.average);
  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-500" />
          Elpriser per elområde – idag
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-44 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="area" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                formatter={(v: number) => [`${v} öre/kWh`, "Snitt idag"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.area} fill={ZONE_COLORS[entry.area]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {zones.map((z) => (
            <div
              key={z.area}
              className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
            >
              <div>
                <span
                  className="text-xs font-bold mr-1"
                  style={{ color: ZONE_COLORS[z.area] }}
                >
                  {z.area}
                </span>
                <span className="text-xs text-muted-foreground">{ZONE_NAMES[z.area]}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {z.loading ? "–" : z.error ? "Fel" : `${Math.round(z.average)} öre`}
              </span>
            </div>
          ))}
        </div>

        {!zones.some((z) => z.loading) && (
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-green-500/15 text-green-400 border-green-500/25 text-xs">
              Billigast: {cheapest.area} ({Math.round(cheapest.average)} öre)
            </Badge>
            <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-xs">
              Dyrast: {mostExpensive.area} ({Math.round(mostExpensive.average)} öre)
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
