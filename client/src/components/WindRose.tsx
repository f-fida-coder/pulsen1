import { useMemo } from "react";
import { WeatherPoint } from "@/hooks/useSMHIWeather";

interface Props {
  forecast: WeatherPoint[];
  size?: number;
}

const DIRECTIONS = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"];
const NUM_SECTORS = 16;

export default function WindRose({ forecast, size = 200 }: Props) {
  const sectors = useMemo(() => {
    const counts = new Array(NUM_SECTORS).fill(0);
    const speeds = new Array(NUM_SECTORS).fill(0);

    for (const p of forecast) {
      const sector = Math.round(p.windDirection / (360 / NUM_SECTORS)) % NUM_SECTORS;
      counts[sector]++;
      speeds[sector] += p.windSpeed;
    }

    const maxCount = Math.max(...counts, 1);
    return counts.map((count, i) => ({
      direction: DIRECTIONS[i],
      count,
      avgSpeed: count > 0 ? speeds[i] / count : 0,
      ratio: count / maxCount,
    }));
  }, [forecast]);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.4;

  function getColor(speed: number): string {
    if (speed < 3) return "#93c5fd";
    if (speed < 6) return "#3b82f6";
    if (speed < 10) return "#1d4ed8";
    return "#1e3a8a";
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circles */}
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={maxR * r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {[0, 45, 90, 135].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={cx - Math.sin(rad) * maxR}
            y1={cy - Math.cos(rad) * maxR}
            x2={cx + Math.sin(rad) * maxR}
            y2={cy + Math.cos(rad) * maxR}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}

      {/* Petals */}
      {sectors.map((s, i) => {
        const angle = (i * 360) / NUM_SECTORS;
        const rad = (angle * Math.PI) / 180;
        const r = maxR * s.ratio;
        const halfAngle = (Math.PI * 2) / NUM_SECTORS / 2;

        const x1 = cx + Math.sin(rad - halfAngle) * r * 0.3;
        const y1 = cy - Math.cos(rad - halfAngle) * r * 0.3;
        const x2 = cx + Math.sin(rad) * r;
        const y2 = cy - Math.cos(rad) * r;
        const x3 = cx + Math.sin(rad + halfAngle) * r * 0.3;
        const y3 = cy - Math.cos(rad + halfAngle) * r * 0.3;

        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3} Z`}
            fill={getColor(s.avgSpeed)}
            fillOpacity={0.8}
            stroke="white"
            strokeWidth={0.5}
          >
            <title>
              {s.direction}: {s.count} obs, snitt {s.avgSpeed.toFixed(1)} m/s
            </title>
          </path>
        );
      })}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={4} fill="#1e3a8a" />

      {/* Cardinal labels */}
      {[
        { label: "N", x: cx, y: cy - maxR - 10 },
        { label: "S", x: cx, y: cy + maxR + 16 },
        { label: "O", x: cx + maxR + 10, y: cy + 4 },
        { label: "V", x: cx - maxR - 10, y: cy + 4 },
      ].map((l) => (
        <text
          key={l.label}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fontSize={11}
          fontWeight="600"
          fill="#475569"
        >
          {l.label}
        </text>
      ))}
    </svg>
  );
}
