import { useMemo } from "react";
import { Lightbulb, TrendingDown, Battery, Sun, Zap } from "lucide-react";
import type { EnergyConfig } from "./SystemConfig";

interface Insight {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "gold" | "teal" | "info";
}

interface Props {
  config: EnergyConfig;
  currentPrice?: number | null;
  windSpeed?: number | null;
}

export default function AIInsights({ config, currentPrice, windSpeed }: Props) {
  const insights = useMemo(() => {
    const list: Insight[] = [];
    const hour = new Date().getHours();

    // Price-based insight
    if (currentPrice !== null && currentPrice !== undefined) {
      if (currentPrice < 30) {
        list.push({
          icon: <Battery className="w-4 h-4" />,
          title: "Optimal laddningstid",
          description: `Spotpriset är ${Math.round(currentPrice)} öre/kWh – under 30 öre. AI rekommenderar att ladda batteri till ${config.batteryDoD}% nu.`,
          type: "gold",
        });
      } else if (currentPrice > 150) {
        list.push({
          icon: <TrendingDown className="w-4 h-4" />,
          title: "Högt elpris – urladdning aktiv",
          description: `Priset är ${Math.round(currentPrice)} öre/kWh. AI säljer batterikapacitet till nätet för maximal arbitragevinst.`,
          type: "teal",
        });
      }
    }

    // Solar insight
    if (hour >= 10 && hour <= 15 && config.solarCapacity > 0) {
      list.push({
        icon: <Sun className="w-4 h-4" />,
        title: "Peak solproduktion",
        description: `Solpanelerna producerar nära max kapacitet (${config.solarCapacity} kWp). Överskott lagras i batteri eller exporteras.`,
        type: "gold",
      });
    }

    // Wind insight
    if (windSpeed !== null && windSpeed !== undefined && config.hasWind) {
      if (windSpeed > 8) {
        list.push({
          icon: <Zap className="w-4 h-4" />,
          title: "Stark vindproduktion",
          description: `Vindstyrka ${windSpeed.toFixed(1)} m/s ger hög produktion. Vindturbinerna levererar uppskattningsvis ${(config.windCapacity * 0.6).toFixed(0)} kW.`,
          type: "teal",
        });
      }
    }

    // General insight
    list.push({
      icon: <Lightbulb className="w-4 h-4" />,
      title: "AI-rekommendation",
      description: `Baserat på din konfiguration (${config.solarCapacity} kWp sol, ${config.batteryCapacity} kWh batteri) optimerar AI kontinuerligt laddschema, egenförbrukning och nätexport.`,
      type: "info",
    });

    return list;
  }, [config, currentPrice, windSpeed]);

  const borderMap = {
    gold: "border-l-[#C4A84C]",
    teal: "border-l-teal-400",
    info: "border-l-slate-300",
  };

  const bgMap = {
    gold: "bg-gradient-to-r from-[#C4A84C]/5 to-transparent",
    teal: "bg-gradient-to-r from-teal-500/10/80 to-transparent",
    info: "bg-gradient-to-r from-slate-50/80 to-transparent",
  };

  const iconColorMap = {
    gold: "text-[#C4A84C]",
    teal: "text-teal-500",
    info: "text-muted-foreground",
  };

  return (
    <div className="care-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C4A84C]/10 to-[#D4B85C]/20 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-[#C4A84C]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">AI Insights</h3>
          <p className="text-xs text-muted-foreground">Realtidsanalys och rekommendationer</p>
        </div>
      </div>

      <div className="space-y-3 care-stagger">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`
              border-l-3 rounded-r-lg p-3.5 transition-all duration-300
              hover:shadow-sm
              ${borderMap[insight.type]}
              ${bgMap[insight.type]}
            `}
            style={{ borderLeftWidth: 3 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={iconColorMap[insight.type]}>{insight.icon}</span>
              <span className="text-sm font-semibold text-foreground">{insight.title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
