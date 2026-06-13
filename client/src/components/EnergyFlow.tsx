import { useMemo } from "react";
import { Sun, Battery, Home, Zap, Wind } from "lucide-react";
import type { EnergyConfig } from "./SystemConfig";

interface Props {
  config: EnergyConfig;
  currentPrice?: number | null;
}

interface FlowNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  kw: number;
  color: string;
  bgClass: string;
  x: number;
  y: number;
}

interface FlowLine {
  from: string;
  to: string;
  kw: number;
  color: string;
  label: string;
}

function simulateFlows(config: EnergyConfig, hour: number, price: number | null) {
  const sunFactor = hour >= 6 && hour <= 20
    ? Math.sin(((hour - 6) / 14) * Math.PI)
    : 0;
  const solarKw = config.solarCapacity * sunFactor * 0.85 * (1 - config.shading / 100);
  const windKw = config.hasWind ? config.windCapacity * 0.35 : 0;
  const loadKw = (config.annualConsumption / 8760) * (1 + 0.3 * Math.sin(((hour - 8) / 16) * Math.PI));
  const generation = solarKw + windKw;
  const batteryKw = generation > loadKw
    ? Math.min(generation - loadKw, config.batteryCapacity * 0.2)
    : -Math.min(loadKw - generation, config.batteryCapacity * 0.15);
  const netLoad = loadKw - generation + batteryKw;
  const gridImport = Math.max(netLoad, 0);
  const gridExport = Math.max(-netLoad, 0);

  return { solarKw, windKw, batteryKw, loadKw, gridImport, gridExport };
}

export default function EnergyFlow({ config, currentPrice }: Props) {
  const hour = new Date().getHours();

  const flows = useMemo(
    () => simulateFlows(config, hour, currentPrice ?? null),
    [config, hour, currentPrice]
  );

  const nodes: FlowNode[] = [
    {
      id: "solar",
      label: "Sol",
      icon: <Sun className="w-5 h-5 text-amber-600" />,
      kw: flows.solarKw,
      color: "#C4A84C",
      bgClass: "bg-amber-500/10 border-amber-500/25/50",
      x: 40,
      y: 40,
    },
    ...(config.hasWind
      ? [
          {
            id: "wind",
            label: "Vind",
            icon: <Wind className="w-5 h-5 text-teal-600" />,
            kw: flows.windKw,
            color: "#14B8A6",
            bgClass: "bg-teal-500/10 border-teal-500/25/50",
            x: 40,
            y: 175,
          },
        ]
      : []),
    {
      id: "battery",
      label: "Batteri",
      icon: <Battery className="w-5 h-5 text-blue-600" />,
      kw: Math.abs(flows.batteryKw),
      color: "#3B82F6",
      bgClass: "bg-blue-500/10 border-blue-500/25/50",
      x: 220,
      y: 20,
    },
    {
      id: "home",
      label: "Hem",
      icon: <Home className="w-5 h-5 text-foreground" />,
      kw: flows.loadKw,
      color: "#64748B",
      bgClass: "bg-secondary border-border/50",
      x: 220,
      y: 175,
    },
    {
      id: "grid",
      label: "Nät",
      icon: <Zap className="w-5 h-5 text-cyan-600" />,
      kw: flows.gridImport > 0 ? flows.gridImport : flows.gridExport,
      color: "#06B6D4",
      bgClass: "bg-cyan-500/10 border-cyan-500/25/50",
      x: 420,
      y: 100,
    },
  ];

  const lines: FlowLine[] = [];

  if (flows.solarKw > 0.1) {
    lines.push({ from: "solar", to: "home", kw: flows.solarKw, color: "#C4A84C", label: "Sol" });
  }
  if (flows.windKw > 0.1) {
    lines.push({ from: "wind", to: "home", kw: flows.windKw, color: "#14B8A6", label: "Vind" });
  }
  if (flows.batteryKw > 0.05) {
    lines.push({ from: "solar", to: "battery", kw: flows.batteryKw, color: "#C4A84C", label: "Ladda" });
  } else if (flows.batteryKw < -0.05) {
    lines.push({ from: "battery", to: "home", kw: Math.abs(flows.batteryKw), color: "#3B82F6", label: "Urladda" });
  }
  if (flows.gridImport > 0.1) {
    lines.push({ from: "grid", to: "home", kw: flows.gridImport, color: "#06B6D4", label: "Import" });
  }
  if (flows.gridExport > 0.1) {
    lines.push({ from: "home", to: "grid", kw: flows.gridExport, color: "#10B981", label: "Export" });
  }

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  function getFlowClass(kw: number) {
    if (kw > 5) return "care-flow-line-fast";
    if (kw > 1) return "care-flow-line";
    return "care-flow-line-slow";
  }

  return (
    <div className="care-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Energy Flow</h3>
          <p className="text-xs text-muted-foreground">Live simulering baserat på konfiguration</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="care-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-600">Live</span>
        </div>
      </div>

      <div className="relative w-full" style={{ height: 260 }}>
        <svg
          viewBox="0 0 520 260"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        >
          {lines.map((line, i) => {
            const from = nodeMap[line.from];
            const to = nodeMap[line.to];
            if (!from || !to) return null;
            const x1 = from.x + 30;
            const y1 = from.y + 25;
            const x2 = to.x + 30;
            const y2 = to.y + 25;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            return (
              <g key={i}>
                {/* Background line */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={line.color}
                  strokeWidth={2}
                  strokeOpacity={0.12}
                />
                {/* Animated flow */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={line.color}
                  strokeWidth={2.5}
                  strokeOpacity={0.7}
                  className={getFlowClass(line.kw)}
                />
                {/* kW label */}
                <text
                  x={mx}
                  y={my - 6}
                  textAnchor="middle"
                  fill={line.color}
                  fontSize={10}
                  fontWeight={600}
                >
                  {line.kw.toFixed(1)} kW
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute flex flex-col items-center gap-1 transition-all duration-300`}
            style={{ left: node.x, top: node.y, width: 60, zIndex: 1 }}
          >
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-sm ${node.bgClass}`}
              style={{
                boxShadow: node.kw > 0.5
                  ? `0 0 12px ${node.color}20, 0 0 4px ${node.color}15`
                  : undefined,
              }}
            >
              {node.icon}
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">{node.label}</span>
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: node.color }}
            >
              {node.kw.toFixed(1)} kW
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
