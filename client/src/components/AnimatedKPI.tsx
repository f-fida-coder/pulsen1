import { useEffect, useState, useRef, type ReactNode } from "react";

interface Props {
  label: string;
  value: number;
  suffix: string;
  trend?: number;
  icon: ReactNode;
  iconBg: string;
  valueColor?: string;
  decimals?: number;
}

function useCountUp(target: number, duration: number = 1200, decimals: number = 0) {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(Number(current.toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(tick);
      else prevTarget.current = target;
    }

    requestAnimationFrame(tick);
  }, [target, duration, decimals]);

  return display;
}

export default function AnimatedKPI({
  label,
  value,
  suffix,
  trend,
  icon,
  iconBg,
  valueColor = "text-foreground",
  decimals = 0,
}: Props) {
  const displayed = useCountUp(value, 1200, decimals);

  return (
    <div className="care-card p-4 flex items-center gap-4 group care-glow-hover">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold tabular-nums ${valueColor}`}>
            {decimals > 0
              ? displayed.toFixed(decimals)
              : displayed.toLocaleString("sv-SE")}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
          {trend !== undefined && trend !== 0 && (
            <span
              className={`text-xs font-semibold ml-1 px-1.5 py-0.5 rounded-full ${
                trend > 0
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-red-600 bg-red-500/10"
              }`}
            >
              {trend > 0 ? "+" : ""}
              {trend}% {trend > 0 ? "↑" : "↓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
