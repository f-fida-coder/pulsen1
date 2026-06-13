import { useHistoricalPrices } from "@/hooks/useHistoricalPrices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ErrorBar,
} from "recharts";
import { History } from "lucide-react";

interface Props {
  area?: "SE1" | "SE2" | "SE3" | "SE4";
  days?: number;
}

export default function PriceHistory({ area = "SE3", days = 14 }: Props) {
  const { history, loading, error } = useHistoricalPrices(area, days);

  const chartData = history.map((d) => ({
    date: d.date.slice(5), // MM-DD
    average: Math.round(d.average),
    min: Math.round(d.min),
    max: Math.round(d.max),
    spread: [Math.round(d.min), Math.round(d.max)],
  }));

  const overallAvg =
    history.length > 0
      ? Math.round(history.reduce((a, b) => a + b.average, 0) / history.length)
      : null;

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          Prishistorik {days} dagar – {area}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Hämtar historik...
          </div>
        ) : (
          <>
            {overallAvg !== null && (
              <div className="text-sm text-muted-foreground mb-3">
                Periodssnitt: <span className="font-semibold text-foreground">{overallAvg} öre/kWh</span>
              </div>
            )}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `${v} öre/kWh`,
                      name === "average" ? "Snitt" : name,
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="average" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Snitt">
                    <ErrorBar dataKey="spread" width={4} strokeWidth={2} stroke="#1d4ed8" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
