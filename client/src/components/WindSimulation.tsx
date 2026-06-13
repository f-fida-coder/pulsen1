import { useMemo } from "react";

interface Props {
  windSpeed: number; // m/s
  size?: number;
}

export default function WindSimulation({ windSpeed, size = 160 }: Props) {
  // RPM scales with wind speed (Betz limit approximation)
  const rpm = Math.min(windSpeed * 8, 80);
  const animDuration = rpm > 0 ? `${60 / rpm}s` : "999s";

  const powerKw = useMemo(() => {
    // P = 0.5 * rho * A * v^3 * Cp (simplified for 5kW turbine)
    const rho = 1.225;
    const r = 3; // rotor radius m
    const A = Math.PI * r * r;
    const Cp = 0.35;
    const p = 0.5 * rho * A * Math.pow(windSpeed, 3) * Cp;
    return Math.min(p / 1000, 5);
  }, [windSpeed]);

  const cx = size / 2;
  const cy = size * 0.55;
  const towerH = size * 0.38;
  const hubR = size * 0.04;
  const bladeL = size * 0.28;

  function windColor(ws: number): string {
    if (ws < 3) return "#94a3b8";
    if (ws < 6) return "#60a5fa";
    if (ws < 10) return "#3b82f6";
    if (ws < 15) return "#22c55e";
    return "#f59e0b";
  }

  const color = windColor(windSpeed);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#f0f9ff" />
          </linearGradient>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .rotor {
              transform-origin: ${cx}px ${cy - towerH}px;
              animation: spin ${animDuration} linear infinite;
            }
          `}</style>
        </defs>

        <rect width={size} height={size} fill="url(#skyGrad)" rx={8} />

        {/* Wind particles */}
        {windSpeed > 2 &&
          [0.15, 0.35, 0.55, 0.75, 0.9].map((y, i) => (
            <line
              key={i}
              x1={size * 0.05}
              y1={size * y}
              x2={size * (0.15 + (windSpeed / 20) * 0.2)}
              y2={size * y}
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              strokeDasharray="4 3"
            >
              <animate
                attributeName="x1"
                from={`${size * 0.05}`}
                to={`${size * 0.9}`}
                dur={`${1.5 - windSpeed * 0.05}s`}
                repeatCount="indefinite"
                begin={`${i * 0.3}s`}
              />
              <animate
                attributeName="x2"
                from={`${size * 0.15}`}
                to={`${size}`}
                dur={`${1.5 - windSpeed * 0.05}s`}
                repeatCount="indefinite"
                begin={`${i * 0.3}s`}
              />
            </line>
          ))}

        {/* Tower */}
        <polygon
          points={`${cx - size * 0.025},${cy} ${cx + size * 0.025},${cy} ${cx + size * 0.015},${cy - towerH} ${cx - size * 0.015},${cy - towerH}`}
          fill="#64748b"
        />

        {/* Base */}
        <ellipse cx={cx} cy={cy} rx={size * 0.06} ry={size * 0.02} fill="#475569" />

        {/* Rotating blades */}
        <g className="rotor">
          {[0, 120, 240].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const bx = cx + Math.sin(rad) * bladeL;
            const by = cy - towerH - Math.cos(rad) * bladeL;
            return (
              <path
                key={angle}
                d={`M ${cx} ${cy - towerH} Q ${cx + Math.sin(rad + 0.3) * bladeL * 0.5} ${cy - towerH - Math.cos(rad + 0.3) * bladeL * 0.5} ${bx} ${by}`}
                stroke={color}
                strokeWidth={size * 0.025}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
          {/* Hub */}
          <circle cx={cx} cy={cy - towerH} r={hubR} fill="#1e3a8a" />
        </g>
      </svg>

      {/* Stats */}
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color }}>
          {windSpeed.toFixed(1)} m/s
        </div>
        <div className="text-xs text-muted-foreground">
          {rpm.toFixed(0)} RPM · {powerKw.toFixed(2)} kW
        </div>
      </div>
    </div>
  );
}
