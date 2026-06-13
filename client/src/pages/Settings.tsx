import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Settings as SettingsIcon,
  Clock,
  Bell,
  Save,
  Plus,
  Trash2,
  Zap,
  Sun,
  Wind,
  Battery,
  Home,
  Car,
  Thermometer,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Edit2,
} from "lucide-react";

/* ─── Types ─── */
interface Config {
  id: number;
  name: string;
  isDefault: boolean | null;
  batteryCapacity: string | null;
  batteryDoD: number | null;
  batteryEfficiency: number | null;
  solarCapacity: string | null;
  roofTilt: number | null;
  roofOrientation: number | null;
  shading: number | null;
  hasWind: boolean | null;
  windCapacity: string | null;
  hubHeight: number | null;
  annualConsumption: number | null;
  hasEV: boolean | null;
  evConsumption: number | null;
  heatingType: string | null;
  electricityArea: string | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
}

interface SchedulerConfig {
  enabled: boolean;
  zone: string;
  batteryCapacityKwh: number;
  batteryMaxPowerKw: number;
  panelKwp: number;
  hasHeatPump: boolean;
  hasEv: boolean;
  peakShavingEnabled: boolean;
  peakLimitKw: number;
}

/* ─── System Config Tab ─── */
function SystemConfigTab() {
  const { data: configs, isLoading } = trpc.configs.list.useQuery();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Systemkonfigurationer</h3>
          <p className="text-sm text-muted-foreground mt-1">Hantera dina energisystem – sol, batteri, vind och förbrukning</p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Ny konfiguration
        </Button>
      </div>

      {showNew && (
        <ConfigForm
          onCancel={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); utils.configs.list.invalidate(); }}
        />
      )}

      {(!configs || configs.length === 0) && !showNew && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sun className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Inga konfigurationer ännu</p>
            <p className="text-sm text-muted-foreground mt-1">Skapa din första systemkonfiguration ovan</p>
          </CardContent>
        </Card>
      )}

      {configs?.map((c: Config) => (
        <Card key={c.id} className="border border-border hover:border-amber-500/25 transition-colors">
          {editingId === c.id ? (
            <ConfigForm
              config={c}
              onCancel={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); utils.configs.list.invalidate(); }}
            />
          ) : (
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">{c.electricityArea ?? "–"} · {c.address || "Ingen adress"}</p>
                  </div>
                  {c.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-400 rounded-full">Standard</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(c.id)}>Redigera</Button>
                  <DeleteConfigButton id={c.id} onDeleted={() => utils.configs.list.invalidate()} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBox icon={<Sun className="w-4 h-4 text-amber-500" />} label="Sol" value={`${c.solarCapacity} kWp`} />
                <StatBox icon={<Battery className="w-4 h-4 text-teal-500" />} label="Batteri" value={`${c.batteryCapacity} kWh`} />
                <StatBox icon={<Wind className="w-4 h-4 text-blue-500" />} label="Vind" value={c.hasWind ? `${c.windCapacity} kW` : "Ej aktiv"} />
                <StatBox icon={<Home className="w-4 h-4 text-muted-foreground" />} label="Förbrukning" value={`${((c.annualConsumption ?? 0) / 1000).toFixed(0)}k kWh/år`} />
              </div>

              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                {c.hasEV && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> EV</span>}
                {c.heatingType === "heatpump" && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Värmepump</span>}
                {c.latitude && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {Number(c.latitude).toFixed(2)}, {Number(c.longitude).toFixed(2)}</span>}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DeleteConfigButton({ id, onDeleted }: { id: number; onDeleted: () => void }) {
  const del = trpc.configs.delete.useMutation({
    onSuccess: () => { toast.success("Konfiguration borttagen"); onDeleted(); },
    onError: () => toast.error("Kunde inte ta bort"),
  });
  return (
    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-400 hover:border-red-300" onClick={() => del.mutate({ id })} disabled={del.isPending}>
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

/* ─── Config Form ─── */
function ConfigForm({ config, onCancel, onSaved }: { config?: Config; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(config?.name ?? "");
  const [zone, setZone] = useState(config?.electricityArea ?? "SE3");
  const [solar, setSolar] = useState(config ? Number(config.solarCapacity) : 10);
  const [battery, setBattery] = useState(config ? Number(config.batteryCapacity) : 15);
  const [consumption, setConsumption] = useState(config?.annualConsumption ?? 15000);
  const [hasWind, setHasWind] = useState(config?.hasWind ?? false);
  const [windCap, setWindCap] = useState(config?.windCapacity ? Number(config.windCapacity) : 0);
  const [hasEV, setHasEV] = useState(config?.hasEV ?? false);
  const [evCons, setEvCons] = useState(config?.evConsumption ?? 5000);
  const [heating, setHeating] = useState(config?.heatingType ?? "heatpump");
  const [isDefault, setIsDefault] = useState(config?.isDefault ?? false);
  const [address, setAddress] = useState(config?.address ?? "");

  const create = trpc.configs.create.useMutation({
    onSuccess: () => { toast.success("Konfiguration skapad"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.configs.update.useMutation({
    onSuccess: () => { toast.success("Konfiguration uppdaterad"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  const saving = create.isPending || update.isPending;

  function handleSave() {
    const data = {
      name,
      electricityArea: zone as "SE1" | "SE2" | "SE3" | "SE4",
      solarCapacity: solar,
      batteryCapacity: battery,
      annualConsumption: consumption,
      hasWind,
      windCapacity: hasWind ? windCap : 0,
      hasEV,
      evConsumption: hasEV ? evCons : 0,
      heatingType: heating as "heatpump" | "direct" | "district" | "other",
      isDefault,
      address,
    };
    if (config) {
      update.mutate({ id: config.id, data });
    } else {
      create.mutate(data);
    }
  }

  return (
    <CardContent className="pt-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5">Namn</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Min villa" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5">Elområde</Label>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SE1">SE1 – Luleå</SelectItem>
              <SelectItem value="SE2">SE2 – Sundsvall</SelectItem>
              <SelectItem value="SE3">SE3 – Stockholm</SelectItem>
              <SelectItem value="SE4">SE4 – Malmö</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5">Adress</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Storgatan 1, Stockholm" />
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Sun className="w-3 h-3" /> Solpaneler</Label>
            <span className="text-sm font-semibold text-amber-600">{solar} kWp</span>
          </div>
          <Slider value={[solar]} onValueChange={([v]) => setSolar(v)} min={0} max={50} step={0.5} />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Battery className="w-3 h-3" /> Batteri</Label>
            <span className="text-sm font-semibold text-teal-600">{battery} kWh</span>
          </div>
          <Slider value={[battery]} onValueChange={([v]) => setBattery(v)} min={0} max={100} step={1} />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Home className="w-3 h-3" /> Årsförbrukning</Label>
            <span className="text-sm font-semibold text-foreground">{(consumption / 1000).toFixed(0)}k kWh</span>
          </div>
          <Slider value={[consumption]} onValueChange={([v]) => setConsumption(v)} min={1000} max={100000} step={500} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
          <Label className="text-sm text-foreground flex items-center gap-2"><Wind className="w-4 h-4 text-blue-500" /> Vindkraft</Label>
          <Switch checked={hasWind} onCheckedChange={setHasWind} />
        </div>
        {hasWind && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5">Vindkapacitet (kW)</Label>
            <Input type="number" value={windCap} onChange={(e) => setWindCap(Number(e.target.value))} />
          </div>
        )}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
          <Label className="text-sm text-foreground flex items-center gap-2"><Car className="w-4 h-4 text-purple-500" /> Elbil</Label>
          <Switch checked={hasEV} onCheckedChange={setHasEV} />
        </div>
        {hasEV && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5">EV-förbrukning (kWh/år)</Label>
            <Input type="number" value={evCons} onChange={(e) => setEvCons(Number(e.target.value))} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5">Uppvärmning</Label>
          <Select value={heating} onValueChange={setHeating}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="heatpump">Värmepump</SelectItem>
              <SelectItem value="direct">Direktel</SelectItem>
              <SelectItem value="district">Fjärrvärme</SelectItem>
              <SelectItem value="other">Annat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
          <Label className="text-sm text-foreground">Standardkonfiguration</Label>
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving || !name} className="bg-amber-500 hover:bg-amber-600 text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {config ? "Spara ändringar" : "Skapa konfiguration"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Avbryt</Button>
      </div>
    </CardContent>
  );
}

/* ─── Scheduler Tab ─── */
function SchedulerTab() {
  const { data: scheduler, isLoading } = trpc.scheduler.get.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.scheduler.update.useMutation({
    onSuccess: () => { toast.success("Schemaläggare uppdaterad"); utils.scheduler.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<SchedulerConfig>({
    enabled: false,
    zone: "SE3",
    batteryCapacityKwh: 15,
    batteryMaxPowerKw: 5,
    panelKwp: 10,
    hasHeatPump: false,
    hasEv: false,
    peakShavingEnabled: false,
    peakLimitKw: 11,
  });

  useEffect(() => {
    if (scheduler) {
      setForm({
        enabled: scheduler.enabled ?? false,
        zone: scheduler.zone ?? "SE3",
        batteryCapacityKwh: scheduler.batteryCapacityKwh ?? 15,
        batteryMaxPowerKw: scheduler.batteryMaxPowerKw ?? 5,
        panelKwp: scheduler.panelKwp ?? 10,
        hasHeatPump: scheduler.hasHeatPump ?? false,
        hasEv: scheduler.hasEv ?? false,
        peakShavingEnabled: scheduler.peakShavingEnabled ?? false,
        peakLimitKw: scheduler.peakLimitKw ?? 11,
      });
    }
  }, [scheduler]);

  function handleSave() {
    update.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={`border-2 transition-colors ${form.enabled ? "border-amber-300 bg-amber-500/10/30" : "border-border"}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${form.enabled ? "bg-amber-500/15" : "bg-secondary"}`}>
                <Clock className={`w-6 h-6 ${form.enabled ? "text-amber-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Daglig AI-optimering</h3>
                <p className="text-sm text-muted-foreground">
                  {form.enabled
                    ? "Aktiv – kör automatisk batterioptimering varje morgon kl 06:00"
                    : "Inaktiv – ingen automatisk optimering körs"}
                </p>
              </div>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>
          {form.enabled && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-400 bg-amber-500/15/60 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              Nästa körning: imorgon 06:00 ({form.zone})
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base">Optimeringsparametrar</CardTitle>
          <CardDescription>Dessa värden används vid varje automatisk körning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Elområde</Label>
              <Select value={form.zone} onValueChange={(v) => setForm((f) => ({ ...f, zone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SE1">SE1 – Luleå</SelectItem>
                  <SelectItem value="SE2">SE2 – Sundsvall</SelectItem>
                  <SelectItem value="SE3">SE3 – Stockholm</SelectItem>
                  <SelectItem value="SE4">SE4 – Malmö</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Solpaneler</Label>
                <span className="text-sm font-semibold text-amber-600">{form.panelKwp} kWp</span>
              </div>
              <Slider value={[form.panelKwp]} onValueChange={([v]) => setForm((f) => ({ ...f, panelKwp: v }))} min={0} max={50} step={0.5} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Batterikapacitet</Label>
                <span className="text-sm font-semibold text-teal-600">{form.batteryCapacityKwh} kWh</span>
              </div>
              <Slider value={[form.batteryCapacityKwh]} onValueChange={([v]) => setForm((f) => ({ ...f, batteryCapacityKwh: v }))} min={0} max={100} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Max laddeffekt</Label>
                <span className="text-sm font-semibold text-teal-600">{form.batteryMaxPowerKw} kW</span>
              </div>
              <Slider value={[form.batteryMaxPowerKw]} onValueChange={([v]) => setForm((f) => ({ ...f, batteryMaxPowerKw: v }))} min={1} max={25} step={0.5} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <Label className="text-sm text-foreground flex items-center gap-2"><Thermometer className="w-4 h-4 text-red-400" /> Värmepump</Label>
              <Switch checked={form.hasHeatPump} onCheckedChange={(v) => setForm((f) => ({ ...f, hasHeatPump: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <Label className="text-sm text-foreground flex items-center gap-2"><Car className="w-4 h-4 text-purple-500" /> Elbil</Label>
              <Switch checked={form.hasEv} onCheckedChange={(v) => setForm((f) => ({ ...f, hasEv: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <Label className="text-sm text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500" /> Peak shaving</Label>
              <Switch checked={form.peakShavingEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, peakShavingEnabled: v }))} />
            </div>
          </div>

          {form.peakShavingEnabled && (
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Effekttak (kW)</Label>
                <span className="text-sm font-semibold text-orange-600">{form.peakLimitKw} kW</span>
              </div>
              <Slider value={[form.peakLimitKw]} onValueChange={([v]) => setForm((f) => ({ ...f, peakLimitKw: v }))} min={1} max={50} step={0.5} />
            </div>
          )}

          <Button onClick={handleSave} disabled={update.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
            {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Spara inställningar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Alert Rules Tab ─── */
const METRIC_OPTIONS = [
  { value: "battery_soc", label: "Batteri SoC (%)" },
  { value: "production_kwh", label: "Solproduktion (kWh)" },
  { value: "consumption_kwh", label: "Förbrukning (kWh)" },
  { value: "grid_export_kwh", label: "Nätexport (kWh)" },
  { value: "grid_import_kwh", label: "Nätimport (kWh)" },
  { value: "battery_temp", label: "Batteritemperatur (°C)" },
  { value: "inverter_temp", label: "Invertertemperatur (°C)" },
  { value: "voltage", label: "Spänning (V)" },
];

const OPERATOR_OPTIONS = [
  { value: "lt", label: "< Mindre än" },
  { value: "lte", label: "≤ Mindre än eller lika" },
  { value: "gt", label: "> Större än" },
  { value: "gte", label: "≥ Större än eller lika" },
  { value: "eq", label: "= Lika med" },
  { value: "neq", label: "≠ Inte lika med" },
];

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  info:     { label: "Info",     color: "text-blue-600",  bg: "bg-blue-500/10" },
  warning:  { label: "Varning",  color: "text-amber-600", bg: "bg-amber-500/10" },
  critical: { label: "Kritisk",  color: "text-red-600",   bg: "bg-red-500/10" },
};

type AlertRule = {
  id: number;
  name: string;
  metricKey: string;
  operator: string;
  threshold: string;
  severity: string;
  message: string | null;
  isActive: boolean;
  cooldownMinutes: number | null;
  lastTriggeredAt: Date | null;
};

function AlertRuleForm({
  rule,
  onClose,
  onSaved,
}: {
  rule?: AlertRule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [metricKey, setMetricKey] = useState(rule?.metricKey ?? "battery_soc");
  const [operator, setOperator] = useState(rule?.operator ?? "lt");
  const [threshold, setThreshold] = useState(rule?.threshold ?? "20");
  const [severity, setSeverity] = useState(rule?.severity ?? "warning");
  const [message, setMessage] = useState(rule?.message ?? "");
  const [cooldown, setCooldown] = useState(rule?.cooldownMinutes ?? 60);

  const utils = trpc.useUtils();
  const create = trpc.systemHealth.createRule.useMutation({
    onSuccess: () => { toast.success("Larmregel skapad"); utils.systemHealth.getRules.invalidate(); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.systemHealth.updateRule.useMutation({
    onSuccess: () => { toast.success("Larmregel uppdaterad"); utils.systemHealth.getRules.invalidate(); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  const saving = create.isPending || update.isPending;

  function handleSave() {
    if (!name.trim()) { toast.error("Namn krävs"); return; }
    if (!threshold.trim()) { toast.error("Tröskelvärde krävs"); return; }
    const payload = { name, metricKey, operator: operator as any, threshold, severity: severity as any, message: message || undefined, cooldownMinutes: cooldown };
    if (rule) {
      update.mutate({ id: rule.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Redigera larmregel" : "Ny larmregel"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5">Namn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Låg batterinivå" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Mätvärde</Label>
              <Select value={metricKey} onValueChange={setMetricKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Operator</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Tröskelvärde</Label>
              <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="20" type="number" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Allvarlighetsgrad</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Varning</SelectItem>
                  <SelectItem value="critical">Kritisk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5">Anpassat meddelande (valfritt)</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Batterinivån är för låg – ladda nu" />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <Label className="text-xs text-muted-foreground">Cooldown (minuter mellan upprepade larm)</Label>
              <span className="text-xs font-semibold text-teal-600">{cooldown} min</span>
            </div>
            <Slider value={[cooldown]} onValueChange={([v]) => setCooldown(v)} min={5} max={1440} step={5} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {rule ? "Spara ändringar" : "Skapa regel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AlertRulesTab() {
  const { data: rules, isLoading } = trpc.systemHealth.getRules.useQuery();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const deleteRule = trpc.systemHealth.deleteRule.useMutation({
    onSuccess: () => { toast.success("Larmregel borttagen"); utils.systemHealth.getRules.invalidate(); },
    onError: () => toast.error("Kunde inte ta bort"),
  });
  const toggleRule = trpc.systemHealth.updateRule.useMutation({
    onSuccess: () => utils.systemHealth.getRules.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(showForm || editingRule) && (
        <AlertRuleForm
          rule={editingRule ?? undefined}
          onClose={() => { setShowForm(false); setEditingRule(null); }}
          onSaved={() => { setShowForm(false); setEditingRule(null); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Larmregler</h3>
          <p className="text-sm text-muted-foreground mt-1">Automatiska larm när mätvärden passerar trösklar</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700 text-white" size="sm">
          <Plus className="w-4 h-4 mr-2" /> Ny larmregel
        </Button>
      </div>

      {(!rules || rules.length === 0) && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Inga larmregler konfigurerade</p>
            <p className="text-sm text-muted-foreground mt-1">Skapa din första larmregel för att övervaka systemet</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rules?.map((rule: AlertRule) => {
          const sc = SEVERITY_CONFIG[rule.severity] ?? SEVERITY_CONFIG.warning;
          const metricLabel = METRIC_OPTIONS.find(m => m.value === rule.metricKey)?.label ?? rule.metricKey;
          const operatorLabel = OPERATOR_OPTIONS.find(o => o.value === rule.operator)?.label ?? rule.operator;
          return (
            <Card key={rule.id} className={`border transition-all ${rule.isActive ? "border-border hover:border-teal-500/25" : "border-border opacity-60"}` }>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${sc.bg} ${sc.color}`}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">{rule.name}</h4>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.color} border-current`}>{sc.label}</Badge>
                        {!rule.isActive && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Inaktiv</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metricLabel} {operatorLabel.split(" ")[0]} <strong>{rule.threshold}</strong>
                      </p>
                      {rule.message && <p className="text-xs text-muted-foreground mt-0.5 italic">"{rule.message}"</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">Cooldown: {rule.cooldownMinutes} min{rule.lastTriggeredAt ? ` · Senast utlöst: ${new Date(rule.lastTriggeredAt).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule.mutate({ id: rule.id, isActive: !rule.isActive })}
                      className="text-muted-foreground hover:text-teal-600 transition-colors"
                      title={rule.isActive ? "Inaktivera" : "Aktivera"}
                    >
                      {rule.isActive
                        ? <ToggleRight className="w-6 h-6 text-teal-500" />
                        : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="text-muted-foreground hover:text-amber-600 transition-colors"
                      title="Redigera"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRule.mutate({ id: rule.id })}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      title="Ta bort"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Notifications Tab ─── */
function NotificationsTab() {
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { toast.success("Alla markerade som lästa"); utils.notifications.list.invalidate(); },
  });

  const unreadCount = useMemo(() =>
    notifications?.filter((n: any) => !n.readAt).length ?? 0,
    [notifications]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  const typeConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    ai: { color: "text-amber-600", bg: "bg-amber-500/10", icon: <Zap className="w-4 h-4" /> },
    energy: { color: "text-teal-600", bg: "bg-teal-500/10", icon: <Sun className="w-4 h-4" /> },
    system: { color: "text-blue-600", bg: "bg-blue-500/10", icon: <SettingsIcon className="w-4 h-4" /> },
    alert: { color: "text-red-600", bg: "bg-red-500/10", icon: <AlertCircle className="w-4 h-4" /> },
    ticket: { color: "text-purple-600", bg: "bg-purple-500/10", icon: <Bell className="w-4 h-4" /> },
    info: { color: "text-muted-foreground", bg: "bg-secondary", icon: <Bell className="w-4 h-4" /> },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Notifieringar</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} olästa` : "Alla lästa"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Markera alla som lästa
          </Button>
        )}
      </div>

      {(!notifications || notifications.length === 0) && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Inga notifieringar</p>
            <p className="text-sm text-muted-foreground mt-1">Du får notifieringar när systemet har uppdateringar</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {notifications?.map((n: any) => {
          const tc = typeConfig[n.type] ?? typeConfig.info;
          const isUnread = !n.readAt;
          return (
            <Card
              key={n.id}
              className={`border transition-all cursor-pointer hover:border-amber-500/25 ${isUnread ? "border-amber-500/25 bg-amber-500/10/20" : "border-border"}`}
              onClick={() => { if (isUnread) markRead.mutate({ id: n.id }); }}
            >
              <CardContent className="py-4 flex items-start gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tc.bg} ${tc.color}`}>
                  {tc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-medium ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</h4>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                    {n.priority === "high" && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-600 rounded">HÖG</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Settings Page ─── */
export default function Settings() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Inställningar</h1>
        <p className="text-muted-foreground mt-1">Systemkonfiguration, schemaläggare och notifieringar</p>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="bg-secondary/80 p-1">
          <TabsTrigger value="system" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <SettingsIcon className="w-4 h-4" /> System
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <Clock className="w-4 h-4" /> Schemaläggare
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <ShieldAlert className="w-4 h-4" /> Larmregler
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <Bell className="w-4 h-4" /> Notifieringar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <SystemConfigTab />
        </TabsContent>
        <TabsContent value="scheduler">
          <SchedulerTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertRulesTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
