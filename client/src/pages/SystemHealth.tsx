import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Bell, BellOff,
  RefreshCw, Plus, Trash2, ShieldCheck, Zap, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity = "info" | "warning" | "critical";
type EventType = "heartbeat" | "offline" | "online" | "anomaly" | "alert_triggered" | "alert_resolved" | "threshold_breach";

const SEVERITY_CONFIG: Record<Severity, { color: string; icon: React.ReactNode; label: string }> = {
  info:     { color: "text-sky-400 border-sky-500/30 bg-sky-500/10",     icon: <Info className="w-3.5 h-3.5" />,          label: "Info" },
  warning:  { color: "text-amber-400 border-amber-500/30 bg-amber-500/10", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Varning" },
  critical: { color: "text-red-400 border-red-500/30 bg-red-500/10",     icon: <XCircle className="w-3.5 h-3.5" />,       label: "Kritisk" },
};

const EVENT_ICON: Record<EventType, React.ReactNode> = {
  heartbeat:        <Activity className="w-4 h-4 text-emerald-400" />,
  offline:          <XCircle className="w-4 h-4 text-red-400" />,
  online:           <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  anomaly:          <AlertTriangle className="w-4 h-4 text-amber-400" />,
  alert_triggered:  <Bell className="w-4 h-4 text-red-400" />,
  alert_resolved:   <BellOff className="w-4 h-4 text-sky-400" />,
  threshold_breach: <Zap className="w-4 h-4 text-orange-400" />,
};

const METRIC_OPTIONS = [
  { value: "battery_soc", label: "Batteri SoC (%)" },
  { value: "production_kwh", label: "Solproduktion (kWh)" },
  { value: "consumption_kwh", label: "Förbrukning (kWh)" },
  { value: "grid_import_kwh", label: "Nätimport (kWh)" },
  { value: "spot_price_ore", label: "Spotpris (öre/kWh)" },
  { value: "battery_temp_c", label: "Batteritemperatur (°C)" },
];

const OPERATOR_LABELS: Record<string, string> = {
  lt: "<", lte: "≤", gt: ">", gte: "≥", eq: "=", neq: "≠",
};

// ─── Alert Rule Form ──────────────────────────────────────────────────────────
function AlertRuleForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [metricKey, setMetricKey] = useState("battery_soc");
  const [operator, setOperator] = useState<"lt"|"gt"|"lte"|"gte"|"eq"|"neq">("lt");
  const [threshold, setThreshold] = useState("");
  const [severity, setSeverity] = useState<Severity>("warning");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState("60");

  const createRule = trpc.systemHealth.createRule.useMutation({
    onSuccess: () => {
      toast.success("Larmregel skapad");
      setName(""); setThreshold(""); setMessage("");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          Ny larmregel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Regelnamn (t.ex. Batteri under 10%)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-secondary border-slate-600 text-foreground text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger className="bg-secondary border-slate-600 text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-secondary border-border">
              {METRIC_OPTIONS.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-foreground text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={operator} onValueChange={v => setOperator(v as typeof operator)}>
            <SelectTrigger className="bg-secondary border-slate-600 text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-secondary border-border">
              {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-foreground text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Tröskelvärde"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
            className="bg-secondary border-slate-600 text-foreground text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={severity} onValueChange={v => setSeverity(v as Severity)}>
            <SelectTrigger className="bg-secondary border-slate-600 text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-secondary border-border">
              <SelectItem value="info" className="text-sky-400 text-xs">Info</SelectItem>
              <SelectItem value="warning" className="text-amber-400 text-xs">Varning</SelectItem>
              <SelectItem value="critical" className="text-red-400 text-xs">Kritisk</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Cooldown (min, standard 60)"
            value={cooldown}
            onChange={e => setCooldown(e.target.value)}
            className="bg-secondary border-slate-600 text-foreground text-xs"
          />
        </div>
        <Input
          placeholder="Meddelande (valfritt)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="bg-secondary border-slate-600 text-foreground text-sm"
        />
        <Button
          size="sm"
          onClick={() => createRule.mutate({
            name, metricKey, operator, threshold, severity,
            message: message || undefined,
            cooldownMinutes: parseInt(cooldown) || 60,
          })}
          disabled={!name || !threshold || createRule.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
        >
          {createRule.isPending ? "Sparar..." : "Skapa larmregel"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SystemHealth() {
  const [showRuleForm, setShowRuleForm] = useState(false);
  const utils = trpc.useUtils();

  const { data: events = [], isLoading: eventsLoading } = trpc.systemHealth.events.useQuery({ limit: 100 });
  const { data: alerts = [] } = trpc.systemHealth.alerts.useQuery();
  const { data: rules = [], refetch: refetchRules } = trpc.systemHealth.getRules.useQuery();

  const heartbeat = trpc.systemHealth.heartbeat.useMutation({
    onSuccess: (data) => {
      toast.success(`Heartbeat OK — ${data.triggeredAlerts} larm utlösta`);
      utils.systemHealth.events.invalidate();
      utils.systemHealth.alerts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resolveAlert = trpc.systemHealth.resolve.useMutation({
    onSuccess: () => {
      toast.success("Larm markerat som löst");
      utils.systemHealth.alerts.invalidate();
      utils.systemHealth.events.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRule = trpc.systemHealth.deleteRule.useMutation({
    onSuccess: () => { toast.success("Regel borttagen"); refetchRules(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleRule = trpc.systemHealth.updateRule.useMutation({
    onSuccess: () => refetchRules(),
    onError: (e) => toast.error(e.message),
  });

  // KPI summary
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount  = alerts.filter(a => a.severity === "warning").length;
  const totalEvents   = events.length;
  const lastHeartbeat = events.find(e => e.eventType === "heartbeat");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Systemhälsa
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Realtidsövervakning, larmregler och avvikelsedetektering</p>
        </div>
        <Button
          onClick={() => heartbeat.mutate({})}
          disabled={heartbeat.isPending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${heartbeat.isPending ? "animate-spin" : ""}`} />
          {heartbeat.isPending ? "Kontrollerar..." : "Kör heartbeat"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Aktiva larm</div>
            <div className={`text-3xl font-bold ${alerts.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {alerts.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">olösta</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Kritiska</div>
            <div className={`text-3xl font-bold ${criticalCount > 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {criticalCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">kräver åtgärd</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Varningar</div>
            <div className={`text-3xl font-bold ${warningCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
              {warningCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">övervaka</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Senaste heartbeat</div>
            <div className="text-sm font-semibold text-emerald-400 mt-1">
              {lastHeartbeat
                ? new Date(lastHeartbeat.createdAt).toLocaleTimeString("sv-SE")
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{totalEvents} händelser totalt</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Alerts */}
          {alerts.length > 0 && (
            <Card className="border-red-500/30 bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Aktiva larm ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.map(alert => {
                  const cfg = SEVERITY_CONFIG[alert.severity as Severity] ?? SEVERITY_CONFIG.info;
                  return (
                    <div key={alert.id} className={`flex items-start justify-between p-3 rounded-lg border ${cfg.color}`}>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {EVENT_ICON[alert.eventType as EventType] ?? <Activity className="w-4 h-4" />}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{alert.title}</div>
                          {alert.message && <div className="text-xs opacity-70 mt-0.5 line-clamp-2">{alert.message}</div>}
                          <div className="text-xs opacity-50 mt-1">
                            {new Date(alert.createdAt).toLocaleString("sv-SE")}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resolveAlert.mutate({ id: alert.id })}
                        disabled={resolveAlert.isPending}
                        className="ml-2 text-xs text-muted-foreground hover:text-white shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Lös
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Event Timeline */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Händelselogg
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Laddar...</div>
              ) : events.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Inga händelser ännu. Kör ett heartbeat för att starta.
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                  {events.map(event => {
                    const cfg = SEVERITY_CONFIG[event.severity as Severity] ?? SEVERITY_CONFIG.info;
                    return (
                      <div key={event.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className="mt-0.5 shrink-0">
                          {EVENT_ICON[event.eventType as EventType] ?? <Activity className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-foreground font-medium">{event.title}</span>
                            <Badge className={`text-xs border ${cfg.color} px-1.5 py-0`}>
                              {cfg.icon}
                              <span className="ml-1">{cfg.label}</span>
                            </Badge>
                            {event.resolved && (
                              <Badge className="text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-1.5 py-0">
                                Löst
                              </Badge>
                            )}
                          </div>
                          {event.message && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.message}</div>
                          )}
                          {event.metricKey && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {event.metricKey}: {event.metricValue} {event.metricUnit}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 mt-0.5">
                          {new Date(event.createdAt).toLocaleTimeString("sv-SE")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alert Rules Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Larmregler ({rules.length})</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRuleForm(v => !v)}
              className="text-xs border-slate-600 text-muted-foreground hover:text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ny regel
            </Button>
          </div>

          {showRuleForm && (
            <AlertRuleForm onCreated={() => { refetchRules(); setShowRuleForm(false); }} />
          )}

          {rules.length === 0 && !showRuleForm ? (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Inga larmregler konfigurerade.</p>
                <p className="text-xs text-muted-foreground mt-1">Klicka "Ny regel" för att börja.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => {
                const cfg = SEVERITY_CONFIG[rule.severity as Severity] ?? SEVERITY_CONFIG.info;
                const metricLabel = METRIC_OPTIONS.find(m => m.value === rule.metricKey)?.label ?? rule.metricKey;
                return (
                  <Card key={rule.id} className={`border-border/50 ${rule.isActive ? "bg-card/60" : "bg-card/30 opacity-60"}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">{rule.name}</span>
                            <Badge className={`text-xs border ${cfg.color} px-1.5 py-0`}>
                              {cfg.icon}
                              <span className="ml-1">{cfg.label}</span>
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {metricLabel} {OPERATOR_LABELS[rule.operator]} {rule.threshold}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Cooldown: {rule.cooldownMinutes} min
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleRule.mutate({ id: rule.id, isActive: !rule.isActive })}
                            className={`text-xs px-2 ${rule.isActive ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-muted-foreground"}`}
                          >
                            {rule.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRule.mutate({ id: rule.id })}
                            className="text-xs px-2 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
