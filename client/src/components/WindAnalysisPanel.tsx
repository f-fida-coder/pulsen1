import { useState } from "react";
import { useSMHIWeather } from "@/hooks/useSMHIWeather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WindRose from "./WindRose";
import WindSimulation from "./WindSimulation";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Wind, RefreshCw, Thermometer, Cloud } from "lucide-react";

// Swedish city coordinates
const LOCATIONS: Record<string, { lat: number; lon: number; name: string }> = {
  stockholm: { lat: 59.3293, lon: 18.0686, name: "Stockholm" },
  goteborg: { lat: 57.7089, lon: 11.9746, name: "Göteborg" },
  malmo: { lat: 55.605, lon: 13.0038, name: "Malmö" },
  sundsvall: { lat: 62.3908, lon: 17.3069, name: "Sundsvall" },
  umea: { lat: 63.8258, lon: 20.2630, name: "Umeå" },
};

interface Props {
  defaultLocation?: string;
}

export default function WindAnalysisPanel({ defaultLocation = "stockholm" }: Props) {
  const [location, setLocation] = useState(defaultLocation);
  const loc = LOCATIONS[location];
  const { forecast, current, loading, error, refetch } = useSMHIWeather(loc.lat, loc.lon);

  const chartData = forecast.slice(0, 24).map((p) => ({
    time: new Date(p.time).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }),
    windSpeed: Math.round(p.windSpeed * 10) / 10,
    gust: Math.round(p.windGust * 10) / 10,
    temp: Math.round(p.temperature * 10) / 10,
  }));

  function windBeaufort(ws: number): string {
    if (ws < 0.3) return "Stiltje";
    if (ws < 1.6) return "Svag vind";
    if (ws < 3.4) return "Lätt bris";
    if (ws < 5.5) return "God bris";
    if (ws < 8.0) return "Frisk bris";
    if (ws < 10.8) return "Frisk vind";
    if (ws < 13.9) return "Hård vind";
    if (ws < 17.2) return "Stormvind";
    return "Storm";
  }

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wind className="w-5 h-5 text-blue-500" />
            Vindanalys – SMHI
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {/* Location selector */}
        <div className="flex gap-1 flex-wrap mt-2">
          {Object.entries(LOCATIONS).map(([key, l]) => (
            <Button
              key={key}
              size="sm"
              variant={location === key ? "default" : "outline"}
              onClick={() => setLocation(key)}
              className="text-xs h-7"
            >
              {l.name}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-red-500 bg-red-500/10 rounded p-2 mb-3">{error}</div>}

        {/* Current conditions */}
        {current && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
              <div className="text-xs text-blue-500 mb-1">Vind nu</div>
              <div className="text-xl font-bold text-blue-400">{current.windSpeed.toFixed(1)} m/s</div>
              <div className="text-xs text-blue-400">{windBeaufort(current.windSpeed)}</div>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Thermometer className="w-3 h-3" /> Temp
              </div>
              <div className="text-xl font-bold text-foreground">{current.temperature.toFixed(1)}°C</div>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Cloud className="w-3 h-3" /> Moln
              </div>
              <div className="text-xl font-bold text-foreground">{current.cloudCover}%</div>
            </div>
          </div>
        )}

        {/* Turbine + WindRose */}
        <div className="flex gap-4 justify-center mb-4">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Hämtar vinddata...
            </div>
          ) : (
            <>
              <WindSimulation windSpeed={current?.windSpeed ?? 0} size={140} />
              {forecast.length > 0 && <WindRose forecast={forecast} size={140} />}
            </>
          )}
        </div>

        {/* 24h wind chart */}
        {!loading && chartData.length > 0 && (
          <div className="h-40">
            <div className="text-xs text-muted-foreground mb-1">Vindprognos 24h (m/s)</div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${v} m/s`,
                    name === "windSpeed" ? "Vind" : "Byar",
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <ReferenceLine y={3} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "Start 3m/s", fontSize: 9, fill: "#22c55e" }} />
                <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Märkvind 12m/s", fontSize: 9, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="windSpeed" stroke="#3b82f6" strokeWidth={2} dot={false} name="windSpeed" />
                <Line type="monotone" dataKey="gust" stroke="#93c5fd" strokeWidth={1} dot={false} strokeDasharray="3 3" name="gust" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Wind power potential badges */}
        {current && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <Badge
              className={`text-xs ${current.windSpeed >= 3 ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}
            >
              {current.windSpeed >= 3 ? "Turbindrift möjlig" : "Under startvindhastighet"}
            </Badge>
            {current.windSpeed >= 12 && (
              <Badge className="bg-amber-500/15 text-amber-400 text-xs">Märkvind – maxeffekt</Badge>
            )}
            {current.windGust > current.windSpeed * 1.5 && (
              <Badge className="bg-red-500/15 text-red-400 text-xs">
                Kraftiga byar {current.windGust.toFixed(1)} m/s
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
