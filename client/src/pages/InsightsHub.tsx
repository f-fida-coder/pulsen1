import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Newspaper, TrendingUp, Globe, RefreshCw, ExternalLink,
  Zap, Battery, Sun, Scale, Car, DollarSign,
  Lightbulb, AlertTriangle, ArrowUpRight, ShieldCheck,
  Loader2, Filter, Star, Wind, BatteryCharging, Eye,
  Activity, Play, CheckCircle, XCircle, Clock, Cog,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────

type TagFilter = "solar" | "battery" | "grid" | "electricity" | "ev" | "pricing" | "regulation" | "wind" | "heatpump" | "sverige" | "nordics" | "eu" | "global" | null;
type RegionFilter = "SE" | "NORDICS" | "EU" | "GLOBAL" | null;

const TAG_OPTIONS: { value: TagFilter; label: string; icon: typeof Sun }[] = [
  { value: "solar", label: "Sol", icon: Sun },
  { value: "battery", label: "Batteri", icon: Battery },
  { value: "electricity", label: "Elpris", icon: Zap },
  { value: "wind", label: "Vind", icon: Wind },
  { value: "regulation", label: "Regler", icon: Scale },
  { value: "ev", label: "EV/Laddning", icon: Car },
  { value: "grid", label: "Nät", icon: Globe },
  { value: "pricing", label: "Prissättning", icon: DollarSign },
];

const REGION_OPTIONS: { value: RegionFilter; label: string; flag: string }[] = [
  { value: "SE", label: "Sverige", flag: "\ud83c\uddf8\ud83c\uddea" },
  { value: "NORDICS", label: "Norden", flag: "\ud83c\uddf3\ud83c\uddf4" },
  { value: "EU", label: "EU", flag: "\ud83c\uddea\ud83c\uddfa" },
  { value: "GLOBAL", label: "Global", flag: "\ud83c\udf0d" },
];

const REGION_LABELS: Record<string, { label: string; flag: string; color: string }> = {
  SE: { label: "Sverige", flag: "\ud83c\uddf8\ud83c\uddea", color: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
  NORDICS: { label: "Norden", flag: "\ud83c\uddf3\ud83c\uddf4", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" },
  EU: { label: "EU", flag: "\ud83c\uddea\ud83c\uddfa", color: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
  GLOBAL: { label: "Global", flag: "\ud83c\udf0d", color: "bg-secondary text-muted-foreground border-border" },
};

const IMPACT_ICONS: Record<string, typeof Lightbulb> = {
  price: DollarSign,
  savings: TrendingUp,
  risk: AlertTriangle,
  opportunity: ArrowUpRight,
};

const IMPACT_COLORS: Record<string, string> = {
  price: "text-blue-600 bg-blue-500/10",
  savings: "text-emerald-600 bg-emerald-500/10",
  risk: "text-red-600 bg-red-500/10",
  opportunity: "text-amber-600 bg-amber-500/10",
};

const IMPACT_LABELS: Record<string, string> = {
  price: "Pris",
  savings: "Besparing",
  risk: "Risk",
  opportunity: "Möjlighet",
};

const ACTION_ICONS: Record<string, typeof Battery> = {
  optimize_battery: BatteryCharging,
  schedule_charging: Zap,
  view_forecast: Eye,
  monitor_risk: Activity,
};

const ACTION_LABELS: Record<string, string> = {
  optimize_battery: "Optimera batteri",
  schedule_charging: "Schemalagd laddning",
  view_forecast: "Visa prognos",
  monitor_risk: "Övervaka risk",
  adjust_load: "Justera last",
  sell_excess: "Sälj överskott",
  custom: "Åtgärd",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Väntar", color: "text-amber-600 bg-amber-500/10 border-amber-500/25", icon: Clock },
  approved: { label: "Godkänd", color: "text-blue-600 bg-blue-500/10 border-blue-500/25", icon: CheckCircle },
  executed: { label: "Utförd", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle },
  failed: { label: "Misslyckad", color: "text-red-600 bg-red-500/10 border-red-500/25", icon: XCircle },
  dismissed: { label: "Avvisad", color: "text-muted-foreground bg-secondary border-border", icon: XCircle },
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function InsightsHub() {
  const [selectedTag, setSelectedTag] = useState<TagFilter>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>(null);

  // Queries — use prioritized endpoint for default view (70/20/10 distribution)
  const { data: stats, isLoading: statsLoading } = trpc.news.stats.useQuery();

  // When region filter is active, use list endpoint; otherwise use prioritized
  const useFilteredQuery = selectedRegion !== null;

  const { data: prioritizedArticles, isLoading: prioritizedLoading, refetch: refetchPrioritized } = trpc.news.prioritized.useQuery(
    { limit: 30, tag: selectedTag ?? undefined },
    { enabled: !useFilteredQuery }
  );

  const { data: filteredArticles, isLoading: filteredLoading, refetch: refetchFiltered } = trpc.news.list.useQuery(
    { limit: 30, tag: selectedTag ?? undefined, region: selectedRegion ?? undefined, minRelevance: 20 },
    { enabled: useFilteredQuery }
  );

  const articles = useFilteredQuery ? filteredArticles : prioritizedArticles;
  const articlesLoading = useFilteredQuery ? filteredLoading : prioritizedLoading;

  const { data: topArticles } = trpc.news.top.useQuery({ limit: 5 });
  const { data: insightsWithArticles } = trpc.insights.withArticles.useQuery({ limit: 8 });

  // Action Engine queries
  const { data: userActions, refetch: refetchActions } = trpc.actions.user.useQuery({ limit: 20 });
  const [showActions, setShowActions] = useState(false);

  const approveMutation = trpc.actions.approve.useMutation({
    onSuccess: () => { toast.success("Åtgärd godkänd"); refetchActions(); },
    onError: (err) => toast.error(err.message),
  });

  const executeMutation = trpc.actions.execute.useMutation({
    onSuccess: (result) => {
      if (result.success) toast.success(`Åtgärd utförd: ${(result.result as any)?.message ?? "OK"}`);
      else toast.error(`Misslyckades: ${(result.result as any)?.error ?? "Okänt fel"}`);
      refetchActions();
    },
    onError: (err) => toast.error(err.message),
  });

  const dismissMutation = trpc.actions.dismiss.useMutation({
    onSuccess: () => { toast.success("Åtgärd avvisad"); refetchActions(); },
    onError: (err) => toast.error(err.message),
  });

  const createActionMutation = trpc.actions.create.useMutation({
    onSuccess: () => { toast.success("Åtgärd skapad"); refetchActions(); },
    onError: (err) => toast.error(err.message),
  });

  const autoTriggerMutation = trpc.actions.autoTrigger.useMutation({
    onSuccess: (result) => {
      if (result.triggered > 0) toast.success(`${result.triggered} åtgärder auto-skapade`);
      else toast.info("Inga nya åtgärder att skapa");
      refetchActions();
    },
    onError: (err) => toast.error(err.message),
  });

  const pendingActions = useMemo(() => (userActions ?? []).filter((a) => a.status === "pending"), [userActions]);
  const executedActions = useMemo(() => (userActions ?? []).filter((a) => a.status === "executed"), [userActions]);

  const refreshMutation = trpc.news.refresh.useMutation({
    onSuccess: (result) => {
      toast.success(`Hämtade ${result.newArticles} nya artiklar, bearbetade ${result.processed} med AI`);
      refetchPrioritized();
      refetchFiltered();
    },
    onError: () => toast.error("Kunde inte uppdatera nyheter"),
  });

  const clearFilters = () => {
    setSelectedTag(null);
    setSelectedRegion(null);
  };

  const hasFilters = selectedTag !== null || selectedRegion !== null;

  // Region distribution stats
  const regionCounts = useMemo(() => {
    if (!articles) return { SE: 0, NORDICS: 0, EU: 0, GLOBAL: 0 };
    const counts = { SE: 0, NORDICS: 0, EU: 0, GLOBAL: 0 };
    for (const a of articles) {
      const r = a.region as keyof typeof counts;
      if (r in counts) counts[r]++;
    }
    return counts;
  }, [articles]);

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Insights Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Nyheter och AI-analys för energimarknaden — Sverige/Norden först</p>
        </div>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
        >
          {refreshMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Uppdatera
        </Button>
      </div>

      {/* ─── Top Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Newspaper className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{statsLoading ? "..." : stats?.total ?? 0}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Artiklar</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-blue-500/10/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/15/80 flex items-center justify-center text-lg">
                {"\ud83c\uddf8\ud83c\uddea"}
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{regionCounts.SE + regionCounts.NORDICS}</p>
                <p className="text-[11px] text-muted-foreground font-medium">SE + Norden</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{statsLoading ? "..." : stats?.highRelevance ?? 0}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Hög relevans</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{statsLoading ? "..." : stats?.sources ?? 0}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Källor</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Region Distribution Bar ───────────────────────────────────── */}
      {articles && articles.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Regionfördelning</span>
              <span className="text-[10px] text-muted-foreground ml-auto">70% SE+Norden / 20% EU / 10% Global</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
              {regionCounts.SE > 0 && (
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${(regionCounts.SE / articles.length) * 100}%` }}
                  title={`Sverige: ${regionCounts.SE}`}
                />
              )}
              {regionCounts.NORDICS > 0 && (
                <div
                  className="bg-indigo-400 transition-all duration-500"
                  style={{ width: `${(regionCounts.NORDICS / articles.length) * 100}%` }}
                  title={`Norden: ${regionCounts.NORDICS}`}
                />
              )}
              {regionCounts.EU > 0 && (
                <div
                  className="bg-purple-400 transition-all duration-500"
                  style={{ width: `${(regionCounts.EU / articles.length) * 100}%` }}
                  title={`EU: ${regionCounts.EU}`}
                />
              )}
              {regionCounts.GLOBAL > 0 && (
                <div
                  className="bg-muted transition-all duration-500"
                  style={{ width: `${(regionCounts.GLOBAL / articles.length) * 100}%` }}
                  title={`Global: ${regionCounts.GLOBAL}`}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              {Object.entries(regionCounts).filter(([, c]) => c > 0).map(([region, count]) => {
                const info = REGION_LABELS[region];
                return (
                  <span key={region} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{info?.flag}</span>
                    <span className="font-medium">{info?.label}</span>
                    <span>({count})</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Filters ────────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Filter</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground ml-auto h-7">
                Rensa filter
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {/* Region filters with flags */}
            <div className="flex flex-wrap gap-2">
              {REGION_OPTIONS.map((region) => {
                const isActive = selectedRegion === region.value;
                const info = REGION_LABELS[region.value ?? ""];
                return (
                  <Button
                    key={region.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRegion(isActive ? null : region.value)}
                    className={`h-8 text-xs gap-1.5 ${isActive
                      ? "bg-slate-800 hover:bg-slate-900 text-white border-slate-800"
                      : `hover:border-border ${info?.color ?? ""}`
                    }`}
                  >
                    <span className="text-sm">{region.flag}</span>
                    {region.label}
                    {!isActive && regionCounts[region.value as keyof typeof regionCounts] > 0 && (
                      <span className="text-[10px] opacity-60">({regionCounts[region.value as keyof typeof regionCounts]})</span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Tag filters */}
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => {
                const Icon = tag.icon;
                const isActive = selectedTag === tag.value;
                return (
                  <Button
                    key={tag.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(isActive ? null : tag.value)}
                    className={`h-8 text-xs ${isActive
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                      : "hover:border-amber-300 hover:text-amber-400"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {tag.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

       {/* ─── Action Engine Panel ─────────────────────────────────────── */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-slate-900 to-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Cog className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Action Engine</h2>
                <p className="text-xs text-muted-foreground">AI-drivna åtgärder för ditt energisystem</p>
              </div>
              {pendingActions.length > 0 && (
                <Badge className="bg-amber-500 text-white text-xs h-6 px-2 ml-2">
                  {pendingActions.length} väntar
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => autoTriggerMutation.mutate({ userRegion: "SE3" })}
                disabled={autoTriggerMutation.isPending}
                className="h-8 text-xs border-slate-600 text-muted-foreground hover:bg-slate-700 hover:text-white"
              >
                {autoTriggerMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                Auto-skanna
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowActions(!showActions)}
                className="h-8 text-xs text-muted-foreground hover:text-white"
              >
                {showActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Pending actions quick-view */}
          {pendingActions.length > 0 && !showActions && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {pendingActions.slice(0, 4).map((action) => {
                const ActionIcon = ACTION_ICONS[action.actionType] ?? Cog;
                return (
                  <div key={action.id} className="flex-shrink-0 flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                    <ActionIcon className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-foreground max-w-[200px] truncate">
                      {ACTION_LABELS[action.actionType] ?? action.actionType}
                    </span>
                    <Button
                      size="sm"
                      className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => executeMutation.mutate({ actionId: action.id })}
                      disabled={executeMutation.isPending}
                    >
                      Kör
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-red-400"
                      onClick={() => dismissMutation.mutate({ actionId: action.id })}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expanded actions list */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-2">
                  {!userActions?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Inga åtgärder ännu. Klicka "Auto-skanna" eller godkänn åtgärder från insikter.
                    </p>
                  ) : (
                    userActions.map((action) => {
                      const ActionIcon = ACTION_ICONS[action.actionType] ?? Cog;
                      const statusCfg = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.pending;
                      const StatusIcon = statusCfg.icon;
                      return (
                        <div key={action.id} className="bg-slate-700/40 rounded-lg p-3 flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-600/50 flex items-center justify-center flex-shrink-0">
                            <ActionIcon className="h-4 w-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-white">
                                {ACTION_LABELS[action.actionType] ?? action.actionType}
                              </span>
                              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${statusCfg.color}`}>
                                <StatusIcon className="h-2.5 w-2.5" />
                                {statusCfg.label}
                              </Badge>
                              {action.autoTriggered && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-300 text-amber-400">
                                  Auto
                                </Badge>
                              )}
                            </div>
                            {action.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5">{action.description}</p>
                            )}
                            {action.triggerReason && (
                              <p className="text-[10px] text-muted-foreground">{action.triggerReason}</p>
                            )}
                            {action.executionResult && (
                              <p className="text-[10px] text-emerald-400 mt-1">
                                {(action.executionResult as any)?.message ?? "Utförd"}
                              </p>
                            )}
                          </div>
                          {action.status === "pending" && (
                            <div className="flex gap-1.5 flex-shrink-0">
                              <Button
                                size="sm"
                                className="h-7 text-[10px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => executeMutation.mutate({ actionId: action.id })}
                                disabled={executeMutation.isPending}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Kör
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 border-blue-500 text-blue-400 hover:bg-blue-500/20"
                                onClick={() => approveMutation.mutate({ actionId: action.id })}
                                disabled={approveMutation.isPending}
                              >
                                Godkänn
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] px-1.5 text-muted-foreground hover:text-red-400"
                                onClick={() => dismissMutation.mutate({ actionId: action.id })}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* ─── Main Content Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Article Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {hasFilters ? "Filtrerade artiklar" : "Sverige & Norden först"}
            <span className="text-sm font-normal text-muted-foreground ml-2">({articles?.length ?? 0} artiklar)</span>
          </h2>

          {articlesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span className="ml-3 text-sm text-muted-foreground">Laddar artiklar...</span>
            </div>
          ) : !articles?.length ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Inga artiklar ännu</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Klicka "Uppdatera" för att hämta nyheter från 13 energikällor och bearbeta dem med AI.
                </p>
                <Button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {refreshMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Hämta nyheter nu
                </Button>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {articles.map((article, i) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    index={i}
                    onCreateAction={(actionType: string) => {
                      createActionMutation.mutate({
                        articleId: article.id,
                        actionType: actionType as any,
                        description: article.actionText ?? article.summary ?? article.title,
                      });
                    }}
                    isCreatingAction={createActionMutation.isPending}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Right: AI Insights Panel */}
        <div className="space-y-4">
          {/* AI Insights */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500/10/80 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </div>
                AI Insikter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!insightsWithArticles?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Inga insikter ännu. Hämta nyheter för att generera AI-analys.
                </p>
              ) : (
                insightsWithArticles.map((item) => {
                  const ImpactIcon = IMPACT_ICONS[item.impactType] ?? Lightbulb;
                  const colorClass = IMPACT_COLORS[item.impactType] ?? "text-muted-foreground bg-secondary";
                  const ActionIcon = ACTION_ICONS[item.actionType ?? ""] ?? null;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg bg-card/80 border border-amber-500/25/50 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <ImpactIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground leading-relaxed">{item.insightText}</p>
                          {item.recommendation && (
                            <p className="text-xs text-amber-400 mt-1.5 flex items-start gap-1">
                              <ShieldCheck className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {item.recommendation}
                            </p>
                          )}
                          {/* Personalized insight */}
                          {(item as any).personalizedInsight && (
                            <p className="text-[11px] text-blue-400 mt-1.5 bg-blue-500/10/60 rounded px-2 py-1">
                              {"\ud83c\uddf8\ud83c\uddea"} {(item as any).personalizedInsight}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/25 text-amber-400">
                              {IMPACT_LABELS[item.impactType] ?? item.impactType}
                            </Badge>
                            {ActionIcon && item.actionType !== "none" && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-500/25 text-blue-600 gap-1">
                                <ActionIcon className="h-2.5 w-2.5" />
                                {ACTION_LABELS[item.actionType ?? ""] ?? ""}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {item.confidenceScore}% konfidens
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Top Articles */}
          {topArticles && topArticles.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  Mest relevanta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topArticles.map((article) => {
                  const regionInfo = REGION_LABELS[article.region] ?? REGION_LABELS.GLOBAL;
                  return (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2.5 rounded-lg hover:bg-secondary transition-colors group"
                    >
                      <p className="text-xs font-medium text-foreground group-hover:text-amber-400 transition-colors line-clamp-2">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{article.source}</span>
                        <Badge variant="outline" className={`text-[9px] h-4 px-1 ${regionInfo.color}`}>
                          {regionInfo.flag} {regionInfo.label}
                        </Badge>
                        <span className="text-[10px] text-amber-600 font-medium ml-auto">{article.relevanceScore}%</span>
                      </div>
                    </a>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Article Card Component ────────────────────────────────────────────────

function ArticleCard({ article, index, onCreateAction, isCreatingAction }: {
  article: any;
  index: number;
  onCreateAction: (actionType: string) => void;
  isCreatingAction: boolean;
}) {
  const tags = (article.tags as string[] | null) ?? [];
  const regionInfo = REGION_LABELS[article.region] ?? REGION_LABELS.GLOBAL;
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const relevanceColor =
    article.relevanceScore >= 80 ? "text-emerald-600 bg-emerald-500/10" :
    article.relevanceScore >= 60 ? "text-amber-600 bg-amber-500/10" :
    "text-muted-foreground bg-secondary";

  const ActionIcon = ACTION_ICONS[article.actionType ?? ""] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {/* Image */}
            {article.imageUrl && (
              <div className="w-40 min-h-[140px] flex-shrink-0 overflow-hidden hidden sm:block">
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 p-4">
              {/* Source + Region Badge + Date */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{article.source}</span>
                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${regionInfo.color}`}>
                  <span>{regionInfo.flag}</span>
                  {regionInfo.label}
                </Badge>
                {publishedDate && (
                  <span className="text-xs text-muted-foreground">{publishedDate}</span>
                )}
              </div>

              {/* Title */}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group/link"
              >
                <h3 className="text-sm font-semibold text-foreground group-hover/link:text-amber-400 transition-colors leading-snug line-clamp-2">
                  {article.title}
                  <ExternalLink className="h-3 w-3 inline-block ml-1.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </h3>
              </a>

              {/* Summary */}
              {article.summary && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{article.summary}</p>
              )}

              {/* Personalized insight */}
              {article.personalizedInsight && (
                <div className="mt-2 p-2 rounded-md bg-blue-500/10/60 border border-blue-500/25">
                  <p className="text-[11px] text-blue-400 leading-relaxed">
                    {"\ud83c\uddf8\ud83c\uddea"} {article.personalizedInsight}
                  </p>
                </div>
              )}

              {/* Action badge + Action buttons */}
              {article.actionType && article.actionType !== "none" && (
                <div className="mt-2 space-y-2">
                  {article.actionText && (
                    <Badge className="text-[10px] h-5 px-2 bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1">
                      {ActionIcon && <ActionIcon className="h-3 w-3" />}
                      {article.actionText}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-[10px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => onCreateAction(article.actionType)}
                      disabled={isCreatingAction}
                    >
                      {isCreatingAction ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Godkänn åtgärd
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-3 border-blue-500/25 text-blue-600 hover:bg-blue-500/10 gap-1"
                      onClick={() => {
                        onCreateAction(article.actionType);
                        // Auto-execute will be handled by the action engine
                      }}
                      disabled={isCreatingAction}
                    >
                      <Play className="h-3 w-3" />
                      Kör automatiskt
                    </Button>
                  </div>
                </div>
              )}

              {/* Tags + Relevance */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {tags.slice(0, 5).map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 border-border text-muted-foreground cursor-pointer hover:border-amber-300 hover:text-amber-400"
                    onClick={() => {/* could set filter */}}
                  >
                    {tag}
                  </Badge>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                  <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${relevanceColor}`}>
                    {article.relevanceScore}% relevans
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
