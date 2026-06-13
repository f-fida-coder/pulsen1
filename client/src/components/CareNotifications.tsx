import { useState, useEffect } from "react";
import { Bell, X, Battery, Sun, Zap, AlertTriangle, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "gold";
  title: string;
  message: string;
  time: Date;
  icon: React.ReactNode;
}

function generateNotifications(): Notification[] {
  const now = new Date();
  return [
    {
      id: "1",
      type: "gold",
      title: "AI Optimering aktiv",
      message: "Batteriladdning schemalagd till 02:00–05:00 baserat på morgondagens spotpriser.",
      time: new Date(now.getTime() - 5 * 60000),
      icon: <Battery className="w-4 h-4" />,
    },
    {
      id: "2",
      type: "success",
      title: "Solproduktion över förväntan",
      message: "Dagens produktion överträffar prognos med 12%. Överskott exporteras till nätet.",
      time: new Date(now.getTime() - 25 * 60000),
      icon: <Sun className="w-4 h-4" />,
    },
    {
      id: "3",
      type: "warning",
      title: "Högt elpris detekterat",
      message: "Spotpriset i SE3 överstiger 200 öre/kWh kl 17–19. Urladdning aktiverad.",
      time: new Date(now.getTime() - 45 * 60000),
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "4",
      type: "info",
      title: "Systemuppdatering klar",
      message: "CARE firmware v2.4.1 installerad. Förbättrad batteristyrning och nya AI-modeller.",
      time: new Date(now.getTime() - 120 * 60000),
      icon: <CheckCircle className="w-4 h-4" />,
    },
  ];
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return "Just nu";
  if (diff < 60) return `${diff} min sedan`;
  const hours = Math.floor(diff / 60);
  return `${hours}h sedan`;
}

export default function CareNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setNotifications(generateNotifications());
  }, []);

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const barColorMap = {
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    info: "bg-sky-400",
    gold: "bg-gradient-to-b from-[#C4A84C] to-[#D4B85C]",
  };

  const iconBgMap = {
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    info: "bg-sky-500/10 text-sky-600",
    gold: "bg-[#C4A84C]/10 text-[#C4A84C]",
  };

  const visible = expanded ? notifications : notifications.slice(0, 2);

  return (
    <div className="care-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#C4A84C] rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-foreground">Notiser</h3>
        </div>
        {notifications.length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-[#C4A84C] hover:text-[#B09840] transition-colors"
          >
            {expanded ? "Visa färre" : `Visa alla (${notifications.length})`}
          </button>
        )}
      </div>

      <div className="space-y-2.5 care-stagger">
        {visible.map((n) => (
          <div
            key={n.id}
            className="flex items-start gap-0 rounded-lg overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow group"
          >
            {/* Color bar */}
            <div className={`w-1 self-stretch shrink-0 ${barColorMap[n.type]}`} />

            <div className="flex items-start gap-3 p-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBgMap[n.type]}`}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{n.title}</span>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-muted-foreground" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{n.message}</p>
                <span className="text-[10px] text-muted-foreground mt-1 block">{timeAgo(n.time)}</span>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">Inga notiser</div>
        )}
      </div>
    </div>
  );
}
