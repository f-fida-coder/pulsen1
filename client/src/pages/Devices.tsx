import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sun, Battery, Zap, Thermometer, Car, Wind,
  Plus, RefreshCw, AlertTriangle, CheckCircle2,
  WifiOff, Loader2, Settings, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceType = "solar" | "battery" | "inverter" | "heat_pump" | "ev_charger" | "wind";
type DeviceStatus = "online" | "offline" | "warning" | "error";

interface Device {
  id: number;
  name: string;
  deviceType: DeviceType;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: DeviceStatus;
  capacityKw?: string | null;
  lastReading?: any;
  lastSeenAt?: Date | null;
  installedAt?: Date | null;
  notes?: string | null;
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const DEVICE_CONFIG: Record<DeviceType, {
  label: string; icon: React.ElementType;
  color: string; bg: string; unit: string;
}> = {
  solar:      { label: "Solpaneler",   icon: Sun,        color: "text-amber-600",   bg: "bg-amber-500/10",   unit: "kWp" },
  battery:    { label: "Batteri",      icon: Battery,    color: "text-emerald-600", bg: "bg-emerald-500/10", unit: "kWh" },
  inverter:   { label: "Växelriktare", icon: Zap,        color: "text-blue-600",    bg: "bg-blue-500/10",    unit: "kW"  },
  heat_pump:  { label: "Värmepump",   icon: Thermometer, color: "text-rose-600",    bg: "bg-rose-500/10",    unit: "kW"  },
  ev_charger: { label: "EV-laddare",  icon: Car,         color: "text-violet-600",  bg: "bg-violet-500/10",  unit: "kW"  },
  wind:       { label: "Vindkraft",   icon: Wind,        color: "text-cyan-600",    bg: "bg-cyan-500/10",    unit: "kW"  },
};

const STATUS_CONFIG: Record<DeviceStatus, {
  label: string; color: string; bg: string; icon: React.ElementType;
}> = {
  online:  { label: "Online",  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle2 },
  offline: { label: "Offline", color: "text-muted-foreground",   bg: "bg-secondary border-border",     icon: WifiOff      },
  warning: { label: "Varning", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25",     icon: AlertTriangle },
  error:   { label: "Fel",     color: "text-red-400",     bg: "bg-red-500/10 border-red-500/25",         icon: AlertTriangle },
};

// ─── Simulated real-time metrics ──────────────────────────────────────────────

function simulateMetrics(device: Device, forecast: any): Record<string, string> {
  const now = new Date().getHours();
  const solar = forecast?.solar?.find((s: any) => s.hour === now);
  const cap = parseFloat(device.capacityKw ?? "5");

  switch (device.deviceType) {
    case "solar": {
      const prod = (solar?.production_kw ?? 0) * (cap / 10);
      return {
        Produktion: `${prod.toFixed(2)} kW`,
        Effektivitet: `${prod > 0 ? Math.min(100, (prod / cap) * 100).toFixed(0) : 0}%`,
        Temperatur: `${(35 + Math.random() * 10).toFixed(1)}°C`,
      };
    }
    case "battery": {
      const soc = 65 + Math.sin(now / 4) * 15;
      const charge = solar ? (solar.production_kw > 2 ? 2.5 : -1.5) : 0;
      return {
        SOC: `${soc.toFixed(0)}%`,
        Laddeffekt: `${charge > 0 ? "+" : ""}${charge.toFixed(1)} kW`,
        Cykler: "342",
      };
    }
    case "inverter": {
      const power = (solar?.production_kw ?? 0) * 0.97;
      return { Effekt: `${power.toFixed(2)} kW`, Spänning: "230 V", Frekvens: "50.0 Hz" };
    }
    case "heat_pump": {
      const cop = (3.2 + Math.random() * 0.4).toFixed(1);
      return { COP: cop, Framledning: `${(45 + Math.random() * 5).toFixed(1)}°C`, Effekt: `${(cap * 0.3).toFixed(1)} kW` };
    }
    case "ev_charger": {
      const charging = now >= 22 || now <= 6;
      return {
        Laddeffekt: charging ? `${cap.toFixed(1)} kW` : "0.0 kW",
        "Session kWh": charging ? `${(cap * 1.5).toFixed(1)} kWh` : "–",
        Status: charging ? "Laddar" : "Standby",
      };
    }
    case "wind": {
      const ws = 5 + Math.sin(now / 3) * 3;
      const prod = Math.min(cap, Math.pow(ws / 12, 3) * cap);
      return { Produktion: `${prod.toFixed(2)} kW`, Vindhastighet: `${ws.toFixed(1)} m/s`, RPM: `${(ws * 8).toFixed(0)}` };
    }
    default:
      return {};
  }
}

// ─── Default demo devices ─────────────────────────────────────────────────────

const DEFAULT_DEVICES = [
  { name: "Solpaneler Tak Syd", deviceType: "solar" as DeviceType, manufacturer: "Jinko Solar", model: "Tiger Neo 420W", capacityKw: 10.5 },
  { name: "Batteri HVS 10.2", deviceType: "battery" as DeviceType, manufacturer: "BYD", model: "Battery-Box Premium HVS 10.2", capacityKw: 10.2 },
  { name: "Växelriktare Fronius", deviceType: "inverter" as DeviceType, manufacturer: "Fronius", model: "Symo GEN24 10.0 Plus", capacityKw: 10 },
  { name: "Värmepump NIBE", deviceType: "heat_pump" as DeviceType, manufacturer: "NIBE", model: "F2120-12", capacityKw: 12 },
  { name: "EV-laddare Garage", deviceType: "ev_charger" as DeviceType, manufacturer: "Easee", model: "Home", capacityKw: 22 },
];

// ─── Device Card ──────────────────────────────────────────────────────────────

function DeviceCard({ device, forecast, onDelete, onStatusChange }: {
  device: Device; forecast: any;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: DeviceStatus) => void;
}) {
  const cfg = DEVICE_CONFIG[device.deviceType];
  const statusCfg = STATUS_CONFIG[device.status];
  const Icon = cfg.icon;
  const StatusIcon = statusCfg.icon;
  const metrics = device.status === "online" ? simulateMetrics(device, forecast) : {};
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Card className="border border-border shadow-sm hover:shadow-md transition-all group">
        <CardContent className="p-4">
          {/* Top */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${cfg.bg}`}>
                <Icon className={`h-5 w-5 ${cfg.color}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">{device.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </span>
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 rounded-md text-muted-foreground hover:text-muted-foreground hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Manufacturer/model */}
          {(device.manufacturer || device.model) && (
            <p className="text-xs text-muted-foreground mb-3">
              {[device.manufacturer, device.model].filter(Boolean).join(" · ")}
              {device.capacityKw && (
                <span className="ml-1 text-muted-foreground font-medium">
                  · {parseFloat(device.capacityKw).toFixed(1)} {cfg.unit}
                </span>
              )}
            </p>
          )}

          {/* Metrics */}
          {device.status === "online" && Object.keys(metrics).length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {Object.entries(metrics).map(([key, val]) => (
                <div key={key} className="bg-secondary rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{key}</p>
                  <p className="text-xs font-semibold text-foreground">{val}</p>
                </div>
              ))}
            </div>
          )}

          {device.status === "offline" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg p-2 mb-3">
              <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Ingen kontakt. Kontrollera anslutning.</span>
            </div>
          )}

          {(device.status === "warning" || device.status === "error") && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Prestanda under förväntan. Kontrollera enheten.</span>
            </div>
          )}

          {/* Quick actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border pt-3 flex flex-wrap gap-1.5">
                  {device.status !== "online" && (
                    <button
                      onClick={() => { onStatusChange(device.id, "online"); setShowActions(false); }}
                      className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 font-medium"
                    >
                      Sätt Online
                    </button>
                  )}
                  {device.status === "online" && (
                    <button
                      onClick={() => { onStatusChange(device.id, "offline"); setShowActions(false); }}
                      className="text-xs px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:bg-muted font-medium"
                    >
                      Sätt Offline
                    </button>
                  )}
                  <button
                    onClick={() => { onStatusChange(device.id, "warning"); setShowActions(false); }}
                    className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 font-medium"
                  >
                    Markera Varning
                  </button>
                  <button
                    onClick={() => { onDelete(device.id); setShowActions(false); }}
                    className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/15 font-medium ml-auto"
                  >
                    Ta bort
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Add Device Dialog ────────────────────────────────────────────────────────

function AddDeviceDialog({ open, onClose, onAdded }: {
  open: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: "", deviceType: "solar" as DeviceType,
    manufacturer: "", model: "", capacityKw: "",
  });

  const createMutation = trpc.devices.create.useMutation({
    onSuccess: () => {
      toast.success("Enhet tillagd");
      onAdded();
      onClose();
      setForm({ name: "", deviceType: "solar", manufacturer: "", model: "", capacityKw: "" });
    },
    onError: (e) => toast.error("Kunde inte lägga till: " + e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Lägg till enhet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-medium text-foreground">Namn *</Label>
            <Input className="mt-1.5" placeholder="t.ex. Solpaneler Tak Syd" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs font-medium text-foreground">Enhetstyp *</Label>
            <Select value={form.deviceType} onValueChange={(v) => setForm({ ...form, deviceType: v as DeviceType })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEVICE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-foreground">Tillverkare</Label>
              <Input className="mt-1.5" placeholder="t.ex. BYD" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-medium text-foreground">Modell</Label>
              <Input className="mt-1.5" placeholder="t.ex. HVS 10.2" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-foreground">Kapacitet ({DEVICE_CONFIG[form.deviceType].unit})</Label>
            <Input className="mt-1.5" type="number" placeholder="t.ex. 10.5" value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Avbryt</Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) { toast.error("Namn krävs"); return; }
              createMutation.mutate({
                name: form.name, deviceType: form.deviceType,
                manufacturer: form.manufacturer || undefined,
                model: form.model || undefined,
                capacityKw: form.capacityKw ? parseFloat(form.capacityKw) : undefined,
              });
            }}
            disabled={createMutation.isPending}
            className="text-sm bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
          >
            {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lägg till
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Devices() {
  const [addOpen, setAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<DeviceType | "all">("all");
  const utils = trpc.useUtils();

  const { data: devices = [], isLoading, refetch } = trpc.devices.list.useQuery(undefined, {
    staleTime: 30 * 1000,
  });

  const { data: forecast } = trpc.energy.forecast.useQuery(
    { zone: "SE3", lat: 59.3293, lon: 18.0686, panelKwp: 10 },
    { staleTime: 5 * 60 * 1000 }
  );

  const createMutation = trpc.devices.create.useMutation({
    onSuccess: () => utils.devices.list.invalidate(),
  });

  const deleteMutation = trpc.devices.delete.useMutation({
    onSuccess: () => { utils.devices.list.invalidate(); toast.success("Enhet borttagen"); },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const updateMutation = trpc.devices.update.useMutation({
    onSuccess: () => utils.devices.list.invalidate(),
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const handleSeedDefaults = async () => {
    for (const d of DEFAULT_DEVICES) {
      await createMutation.mutateAsync(d);
    }
    toast.success("Demo-enheter tillagda");
  };

  const filteredDevices = useMemo(() =>
    filterType === "all" ? devices : devices.filter((d: Device) => d.deviceType === filterType),
    [devices, filterType]
  );

  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter((d: Device) => d.status === "online").length,
    warnings: devices.filter((d: Device) => d.status === "warning" || d.status === "error").length,
    totalKw: devices.reduce((s: number, d: Device) => s + parseFloat(d.capacityKw ?? "0"), 0),
  }), [devices]);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Enheter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Anslutna energisystem och realtidsstatus</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />Uppdatera
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
            <Plus className="h-3.5 w-3.5" />Lägg till enhet
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totalt enheter",    value: stats.total,                    icon: Activity,      color: "text-foreground",   bg: "bg-secondary"   },
          { label: "Online",            value: stats.online,                   icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Varningar / Fel",   value: stats.warnings,                 icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-500/10"   },
          { label: "Total kapacitet",   value: `${stats.totalKw.toFixed(1)} kW`, icon: Zap,         color: "text-blue-600",    bg: "bg-blue-500/10"    },
        ].map((s) => (
          <Card key={s.label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit flex-wrap">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Alla
        </button>
        {Object.entries(DEVICE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterType(key as DeviceType)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Device grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border border-border animate-pulse"><CardContent className="p-4 h-40" /></Card>
          ))}
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card className="border border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-secondary mb-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium mb-1">
              {filterType === "all" ? "Inga enheter tillagda" : `Inga ${DEVICE_CONFIG[filterType as DeviceType]?.label ?? ""} tillagda`}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {filterType === "all" ? "Lägg till dina energisystem för att se realtidsdata." : "Byt filter eller lägg till en enhet."}
            </p>
            {filterType === "all" && devices.length === 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
                  <Plus className="h-3.5 w-3.5" />Lägg till manuellt
                </Button>
                <Button size="sm" variant="outline" onClick={handleSeedDefaults} disabled={createMutation.isPending} className="gap-1.5 text-xs">
                  {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Lägg till demo-enheter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredDevices.map((device: Device) => (
              <DeviceCard
                key={device.id}
                device={device}
                forecast={forecast}
                onDelete={(id) => deleteMutation.mutate({ id })}
                onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AddDeviceDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => utils.devices.list.invalidate()} />
    </div>
  );
}
