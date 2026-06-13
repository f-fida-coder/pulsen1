import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, Zap, CheckCircle, Clock, XCircle, BarChart2,
  RefreshCw, Filter, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Download } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionStatus = "pending" | "approved" | "executed" | "failed" | "dismissed";
type ActionType = "optimize_battery" | "schedule_charging" | "view_forecast" | "monitor_risk" | "adjust_load" | "sell_excess" | "custom";

interface ActionRow {
  id: number;
  actionType: ActionType;
  status: ActionStatus;
  description: string | null;
  autoTriggered: boolean;
  savingsSek: number | null;
  savingsKwh: number | null;
  confidence: number | null;
  roiEstimated: boolean | null;
  baselineCostSek: number | null;
  actualCostSek: number | null;
  executedAt: Date | null;
  createdAt: Date;
  actionPayload: Record<string, unknown> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Väntar",    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",  icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Godkänd",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30",        icon: <CheckCircle className="w-3 h-3" /> },
  executed:  { label: "Utförd",    color: "bg-green-500/20 text-green-400 border-green-500/30",     icon: <CheckCircle className="w-3 h-3" /> },
  failed:    { label: "Misslyckad",color: "bg-red-500/20 text-red-400 border-red-500/30",           icon: <XCircle className="w-3 h-3" /> },
  dismissed: { label: "Avvisad",   color: "bg-zinc-500/20 text-muted-foreground border-zinc-500/30",        icon: <XCircle className="w-3 h-3" /> },
};

const ACTION_LABELS: Record<ActionType, string> = {
  optimize_battery:  "Optimera batteri",
  schedule_charging: "Schemalägg laddning",
  view_forecast:     "Visa prognos",
  monitor_risk:      "Övervaka risk",
  adjust_load:       "Justera last",
  sell_excess:       "Sälj överskott",
  custom:            "Anpassad",
};

function formatSek(oreValue: number | null): string {
  if (oreValue == null) return "—";
  const sek = oreValue / 100;
  if (sek >= 1000) return `${(sek / 1000).toFixed(1)} kSEK`;
  return `${sek.toFixed(2)} SEK`;
}

function formatKwh(whValue: number | null): string {
  if (whValue == null) return "—";
  const kwh = whValue / 1000;
  return `${kwh.toFixed(2)} kWh`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ConfidenceBadge({ confidence, estimated }: { confidence: number | null; estimated: boolean | null }) {
  if (confidence == null) return null;
  const color = confidence >= 70 ? "text-green-400" : confidence >= 40 ? "text-yellow-400" : "text-muted-foreground";
  return (
    <span className={`text-xs ${color} flex items-center gap-1`}>
      <Info className="w-3 h-3" />
      {confidence}% {estimated ? "(est.)" : "(mätt)"}
    </span>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon, color }: {
  title: string; value: string; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color.replace("text-", "bg-").replace("-400", "-500/10")}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActionsHistory() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [chartMode, setChartMode] = useState<"daily" | "monthly">("daily");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("self");

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Admin: fetch all users for customer selector
  const usersQuery = trpc.users.listAll.useQuery(undefined, { enabled: isAdmin });

  // Data fetching
  const historyQuery = trpc.actions.history.useQuery({
    status: statusFilter !== "all" ? (statusFilter as ActionStatus) : undefined,
    actionType: typeFilter !== "all" ? (typeFilter as ActionType) : undefined,
    limit: 200,
  });

  const roiSummary = trpc.actions.roiSummary.useQuery();
  const roiDaily = trpc.actions.roiDaily.useQuery();
  const roiMonthly = trpc.actions.roiMonthly.useQuery();

  const executeAction = trpc.actions.execute.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Åtgärd utförd");
      } else {
        toast.error(`Fel: ${(data.result as any)?.error ?? "Okänt fel"}`);
      }
      historyQuery.refetch();
      roiSummary.refetch();
      roiDaily.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const approveAction = trpc.actions.approve.useMutation({
    onSuccess: () => { toast.success("Åtgärd godkänd"); historyQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const dismissAction = trpc.actions.dismiss.useMutation({
    onSuccess: () => { toast.success("Åtgärd avvisad"); historyQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Summary stats from history
  const history = (historyQuery.data ?? []) as ActionRow[];

  const stats = useMemo(() => {
    const executed = history.filter(a => a.status === "executed");
    const pending = history.filter(a => a.status === "pending");
    const failed = history.filter(a => a.status === "failed");
    return { executed: executed.length, pending: pending.length, failed: failed.length };
  }, [history]);

  const chartData = useMemo(() => {
    if (chartMode === "daily") {
      return (roiDaily.data ?? []).map(d => ({
        label: d.date.slice(5), // MM-DD
        savings: parseFloat((d.savingsSek).toFixed(2)),
        kwh: parseFloat((d.savingsKwh).toFixed(2)),
        actions: d.actionCount,
      }));
    }
    return (roiMonthly.data ?? []).map(d => ({
      label: d.month,
      savings: parseFloat((d.savingsSek).toFixed(2)),
      kwh: parseFloat((d.savingsKwh).toFixed(2)),
      actions: d.actionCount,
    }));
  }, [chartMode, roiDaily.data, roiMonthly.data]);

  const summary = roiSummary.data;

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI ROI & Åtgärdshistorik</h1>
          <p className="text-muted-foreground text-sm mt-1">Alla AI-genererade åtgärder och deras ekonomiska utfall</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Admin customer selector */}
          {isAdmin && (
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="w-44 h-8 text-xs border-border bg-card text-muted-foreground">
                <SelectValue placeholder="Välj kund..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="self" className="text-muted-foreground text-xs">Min rapport</SelectItem>
                {(usersQuery.data ?? []).map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)} className="text-muted-foreground text-xs">
                    {u.name ?? u.email ?? `Kund #${u.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-green-700 text-green-400 hover:bg-green-900/30"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                const params = new URLSearchParams();
                if (isAdmin && selectedCustomerId !== "self") {
                  params.set("userId", selectedCustomerId);
                }
                // Admin can optionally specify userId; default = own report
                const resp = await fetch(`/api/reports/roi-pdf?${params.toString()}`, {
                  credentials: "include",
                });
                if (!resp.ok) {
                  const err = await resp.json().catch(() => ({ error: "Okänt fel" }));
                  toast.error(`PDF-fel: ${err.error ?? resp.statusText}`);
                  return;
                }
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const cd = resp.headers.get("Content-Disposition") ?? "";
                const match = cd.match(/filename="([^"]+)"/);
                a.download = match ? match[1] : "SolPulsen_ROI_rapport.pdf";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("ROI-rapport nedladdad");
              } catch (e: any) {
                toast.error(`PDF-fel: ${e.message}`);
              } finally {
                setPdfLoading(false);
              }
            }}
          >
            {pdfLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Ladda ner ROI-rapport
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:bg-secondary"
            onClick={() => { historyQuery.refetch(); roiSummary.refetch(); roiDaily.refetch(); }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total besparing"
          value={summary ? `${summary.totalSavingsSek.toFixed(0)} SEK` : "—"}
          sub={summary ? `${summary.totalSavingsKwh.toFixed(1)} kWh` : undefined}
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          color="text-green-400"
        />
        <KpiCard
          title="Utförda åtgärder"
          value={String(stats.executed)}
          sub={`${stats.pending} väntar`}
          icon={<CheckCircle className="w-5 h-5 text-blue-400" />}
          color="text-blue-400"
        />
        <KpiCard
          title="Snitt per åtgärd"
          value={summary ? `${summary.avgSavingsPerAction.toFixed(2)} SEK` : "—"}
          sub={summary ? `${summary.measuredActions} mätta / ${summary.estimatedActions} estimerade` : undefined}
          icon={<BarChart2 className="w-5 h-5 text-amber-400" />}
          color="text-amber-400"
        />
        <KpiCard
          title="Misslyckade"
          value={String(stats.failed)}
          sub="Kan köras om"
          icon={<Zap className="w-5 h-5 text-red-400" />}
          color="text-red-400"
        />
      </div>

      {/* ROI Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-base">Besparingar över tid</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartMode === "daily" ? "default" : "outline"}
              size="sm"
              className={chartMode === "daily" ? "bg-green-600 hover:bg-green-700 text-white" : "border-border text-muted-foreground hover:bg-secondary"}
              onClick={() => setChartMode("daily")}
            >
              Dag
            </Button>
            <Button
              variant={chartMode === "monthly" ? "default" : "outline"}
              size="sm"
              className={chartMode === "monthly" ? "bg-green-600 hover:bg-green-700 text-white" : "border-border text-muted-foreground hover:bg-secondary"}
              onClick={() => setChartMode("monthly")}
            >
              Månad
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Inga utförda åtgärder ännu. Kör åtgärder för att se ROI-data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(value: number, name: string) => [
                    name === "savings" ? `${value.toFixed(2)} SEK` : `${value.toFixed(2)} kWh`,
                    name === "savings" ? "Besparing (SEK)" : "Besparing (kWh)",
                  ]}
                />
                <Legend wrapperStyle={{ color: "#71717a", fontSize: 12 }} />
                <Bar dataKey="savings" name="Besparing (SEK)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="kwh" name="Besparing (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border text-foreground text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Alla statusar</SelectItem>
            <SelectItem value="pending">Väntar</SelectItem>
            <SelectItem value="approved">Godkänd</SelectItem>
            <SelectItem value="executed">Utförd</SelectItem>
            <SelectItem value="failed">Misslyckad</SelectItem>
            <SelectItem value="dismissed">Avvisad</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 bg-card border-border text-foreground text-sm">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="schedule_charging">Schemalägg laddning</SelectItem>
            <SelectItem value="optimize_battery">Optimera batteri</SelectItem>
            <SelectItem value="sell_excess">Sälj överskott</SelectItem>
            <SelectItem value="adjust_load">Justera last</SelectItem>
            <SelectItem value="monitor_risk">Övervaka risk</SelectItem>
            <SelectItem value="view_forecast">Visa prognos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm ml-auto">{history.length} åtgärder</span>
      </div>

      {/* Action Timeline */}
      <div className="space-y-3">
        {historyQuery.isLoading && (
          <div className="text-muted-foreground text-sm text-center py-8">Laddar historik...</div>
        )}
        {!historyQuery.isLoading && history.length === 0 && (
          <div className="text-muted-foreground text-sm text-center py-8">
            Inga åtgärder hittades. Kör åtgärder från Insights Hub för att se dem här.
          </div>
        )}
        {history.map((action) => {
          const statusCfg = STATUS_CONFIG[action.status];
          const isExpanded = expandedId === action.id;
          const hasSavings = action.savingsSek != null && action.savingsSek > 0;

          return (
            <Card key={action.id} className="bg-card border-border hover:border-border transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: type + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">
                        {ACTION_LABELS[action.actionType]}
                      </span>
                      <Badge className={`text-xs border ${statusCfg.color} flex items-center gap-1`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </Badge>
                      {action.autoTriggered && (
                        <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                          Auto-AI
                        </Badge>
                      )}
                    </div>
                    {action.description && (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{action.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-muted-foreground text-xs">{formatDate(action.createdAt)}</span>
                      {action.executedAt && (
                        <span className="text-muted-foreground text-xs">
                          Utförd: {formatDate(action.executedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: ROI + actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {hasSavings && (
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-sm">
                          +{formatSek(action.savingsSek)}
                        </div>
                        <div className="text-muted-foreground text-xs">{formatKwh(action.savingsKwh)}</div>
                        <ConfidenceBadge confidence={action.confidence} estimated={action.roiEstimated} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      {(action.status === "pending") && (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2"
                            onClick={() => approveAction.mutate({ actionId: action.id })}
                            disabled={approveAction.isPending}
                          >
                            Godkänn
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
                            onClick={() => executeAction.mutate({ actionId: action.id })}
                            disabled={executeAction.isPending}
                          >
                            Kör nu
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border text-muted-foreground hover:bg-secondary text-xs h-7 px-2"
                            onClick={() => dismissAction.mutate({ actionId: action.id })}
                            disabled={dismissAction.isPending}
                          >
                            Avvisa
                          </Button>
                        </>
                      )}
                      {(action.status === "approved") && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
                          onClick={() => executeAction.mutate({ actionId: action.id })}
                          disabled={executeAction.isPending}
                        >
                          Kör nu
                        </Button>
                      )}
                      {(action.status === "failed") && (
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2"
                          onClick={() => executeAction.mutate({ actionId: action.id })}
                          disabled={executeAction.isPending}
                        >
                          Försök igen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-muted-foreground text-xs h-7 px-2"
                        onClick={() => setExpandedId(isExpanded ? null : action.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {/* ROI breakdown */}
                    {(action.baselineCostSek != null || action.actualCostSek != null) && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <div className="text-muted-foreground text-xs mb-1">Utan AI</div>
                          <div className="text-white font-medium text-sm">{formatSek(action.baselineCostSek)}</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <div className="text-muted-foreground text-xs mb-1">Med AI</div>
                          <div className="text-white font-medium text-sm">{formatSek(action.actualCostSek)}</div>
                        </div>
                        <div className="bg-green-900/30 rounded-lg p-3 text-center">
                          <div className="text-green-400 text-xs mb-1">Besparing</div>
                          <div className="text-green-400 font-bold text-sm">{formatSek(action.savingsSek)}</div>
                        </div>
                      </div>
                    )}
                    {/* Payload */}
                    {action.actionPayload && Object.keys(action.actionPayload).length > 0 && (
                      <div>
                        <div className="text-muted-foreground text-xs mb-2">Åtgärdsparametrar</div>
                        <div className="bg-secondary/50 rounded-lg p-3 font-mono text-xs text-muted-foreground overflow-auto max-h-32">
                          {JSON.stringify(action.actionPayload, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
