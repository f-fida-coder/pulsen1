import { useState } from "react";
import { Brain, Zap, BarChart3, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ActionItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
}

const ACTIONS: ActionItem[] = [
  {
    id: "optimize",
    label: "Optimera Laddning",
    description: "AI analyserar spotpriser och schemalägger optimal batteriladdning",
    icon: <Zap className="w-5 h-5" />,
    gradient: "from-amber-500/10 to-yellow-500/10",
    borderColor: "border-amber-500/25/40",
  },
  {
    id: "forecast",
    label: "Prognos 48h",
    description: "Generera AI-driven produktions- och förbrukningsprognos",
    icon: <BarChart3 className="w-5 h-5" />,
    gradient: "from-sky-500/10 to-blue-500/10",
    borderColor: "border-sky-500/25/40",
  },
  {
    id: "diagnose",
    label: "Systemdiagnos",
    description: "Kör fullständig hälsokontroll av alla energikomponenter",
    icon: <Shield className="w-5 h-5" />,
    gradient: "from-emerald-500/10 to-teal-500/10",
    borderColor: "border-emerald-500/25/40",
  },
  {
    id: "report",
    label: "Generera Rapport",
    description: "Skapa PDF-rapport med ROI, besparingar och rekommendationer",
    icon: <Brain className="w-5 h-5" />,
    gradient: "from-violet-500/10 to-purple-500/10",
    borderColor: "border-violet-500/25/40",
  },
];

export default function AIActionPanel() {
  const [loading, setLoading] = useState<string | null>(null);

  function handleAction(action: ActionItem) {
    setLoading(action.id);
    setTimeout(() => {
      setLoading(null);
      toast.success(`${action.label}`, {
        description: "AI-åtgärd slutförd. Resultat tillgängligt.",
      });
    }, 1500);
  }

  return (
    <div className="care-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C4A84C]/10 to-[#D4B85C]/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-[#C4A84C]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">AI Actions</h3>
          <p className="text-xs text-muted-foreground">Intelligent energistyrning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 care-stagger">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={loading !== null}
            className={`
              care-btn group relative text-left p-4 rounded-xl border
              bg-gradient-to-br ${action.gradient} ${action.borderColor}
              hover:shadow-md hover:shadow-[#C4A84C]/5
              transition-all duration-300
              disabled:opacity-60
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-muted-foreground group-hover:text-[#C4A84C] transition-colors">
                {action.icon}
              </div>
              {loading === action.id ? (
                <div className="w-4 h-4 border-2 border-[#C4A84C]/30 border-t-[#C4A84C] rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#C4A84C] group-hover:translate-x-0.5 transition-all" />
              )}
            </div>
            <div className="text-sm font-semibold text-foreground mb-0.5">{action.label}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{action.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
