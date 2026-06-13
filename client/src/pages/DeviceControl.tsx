import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

type Protocol = "solarman" | "modbus_tcp" | "modbus_rtu" | "http" | "mqtt";
type DeviceType = "battery" | "inverter" | "charger" | "meter";
type BatteryCommandType = "start_charging" | "stop_charging" | "schedule_charging" | "set_soc_target" | "set_power_limit" | "get_status";

const PROTOCOL_LABELS: Record<Protocol, string> = {
  solarman: "Solarman OpenAPI",
  modbus_tcp: "Modbus TCP",
  modbus_rtu: "Modbus RTU",
  http: "HTTP REST",
  mqtt: "MQTT",
};

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  battery: "Batteri",
  inverter: "Inverter",
  charger: "Laddbox",
  meter: "Elmätare",
};

const COMMAND_LABELS: Record<BatteryCommandType, string> = {
  start_charging: "Starta laddning",
  stop_charging: "Stoppa laddning",
  schedule_charging: "Schemalägg laddning",
  set_soc_target: "Sätt SoC-mål",
  set_power_limit: "Sätt effektgräns",
  get_status: "Hämta status",
};

function AddDeviceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [protocol, setProtocol] = useState<Protocol>("solarman");
  const [deviceType, setDeviceType] = useState<DeviceType>("battery");
  const [form, setForm] = useState({
    deviceName: "",
    solarmanToken: "",
    deviceSn: "",
    loggerId: "",
    modbusHost: "",
    modbusPort: "502",
    modbusUnitId: "1",
    maxChargePower: "5000",
    maxDischargePower: "5000",
    maxSocPercent: "95",
    minSocPercent: "10",
  });

  const createDevice = trpc.deviceControl.createDevice.useMutation({
    onSuccess: () => { toast.success("Enhet tillagd"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(`Fel: ${e.message}`),
  });

  const handleSubmit = () => {
    if (!form.deviceName.trim()) { toast.error("Ange enhetsnamn"); return; }
    createDevice.mutate({
      deviceType, deviceName: form.deviceName, protocol,
      solarmanToken: form.solarmanToken || undefined,
      deviceSn: form.deviceSn || undefined,
      loggerId: form.loggerId || undefined,
      modbusHost: form.modbusHost || undefined,
      modbusPort: form.modbusPort ? parseInt(form.modbusPort) : undefined,
      modbusUnitId: form.modbusUnitId ? parseInt(form.modbusUnitId) : undefined,
      maxChargePower: parseInt(form.maxChargePower) || 5000,
      maxDischargePower: parseInt(form.maxDischargePower) || 5000,
      maxSocPercent: parseInt(form.maxSocPercent) || 95,
      minSocPercent: parseInt(form.minSocPercent) || 10,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Lägg till enhet</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konfigurera ny enhet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Enhetstyp</Label>
              <Select value={deviceType} onValueChange={(v) => setDeviceType(v as DeviceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map(t => (
                    <SelectItem key={t} value={t}>{DEVICE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Protokoll</Label>
              <Select value={protocol} onValueChange={(v) => setProtocol(v as Protocol)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROTOCOL_LABELS) as Protocol[]).map(p => (
                    <SelectItem key={p} value={p}>{PROTOCOL_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Enhetsnamn</Label>
            <Input placeholder="t.ex. Afore HV5K-10T" value={form.deviceName}
              onChange={e => setForm(f => ({ ...f, deviceName: e.target.value }))} />
          </div>
          {protocol === "solarman" && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Solarman API</p>
              <div>
                <Label>API Token</Label>
                <Input type="password" placeholder="Bearer token" value={form.solarmanToken}
                  onChange={e => setForm(f => ({ ...f, solarmanToken: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Device SN</Label>
                  <Input placeholder="Serienummer" value={form.deviceSn}
                    onChange={e => setForm(f => ({ ...f, deviceSn: e.target.value }))} />
                </div>
                <div>
                  <Label>Logger ID</Label>
                  <Input placeholder="Logger SN" value={form.loggerId}
                    onChange={e => setForm(f => ({ ...f, loggerId: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
          {(protocol === "modbus_tcp" || protocol === "modbus_rtu") && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modbus</p>
              <div>
                <Label>Host / IP</Label>
                <Input placeholder="192.168.1.100" value={form.modbusHost}
                  onChange={e => setForm(f => ({ ...f, modbusHost: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Port</Label><Input type="number" value={form.modbusPort} onChange={e => setForm(f => ({ ...f, modbusPort: e.target.value }))} /></div>
                <div><Label>Unit ID</Label><Input type="number" value={form.modbusUnitId} onChange={e => setForm(f => ({ ...f, modbusUnitId: e.target.value }))} /></div>
              </div>
            </div>
          )}
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Säkerhetsgränser</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max laddeffekt (W)</Label><Input type="number" value={form.maxChargePower} onChange={e => setForm(f => ({ ...f, maxChargePower: e.target.value }))} /></div>
              <div><Label>Max urladdning (W)</Label><Input type="number" value={form.maxDischargePower} onChange={e => setForm(f => ({ ...f, maxDischargePower: e.target.value }))} /></div>
              <div><Label>Max SoC (%)</Label><Input type="number" min={10} max={100} value={form.maxSocPercent} onChange={e => setForm(f => ({ ...f, maxSocPercent: e.target.value }))} /></div>
              <div><Label>Min SoC (%)</Label><Input type="number" min={0} max={90} value={form.minSocPercent} onChange={e => setForm(f => ({ ...f, minSocPercent: e.target.value }))} /></div>
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={createDevice.isPending}>
            {createDevice.isPending ? "Sparar..." : "Spara enhet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BatteryCommandPanel({ deviceId }: { deviceId: number }) {
  const [command, setCommand] = useState<BatteryCommandType>("get_status");
  const [params, setParams] = useState({ powerWatts: "3000", startTime: "02:00", endTime: "06:00", targetPercent: "80", chargeLimitWatts: "3000", dischargeLimitWatts: "3000" });
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  const execCmd = trpc.deviceControl.executeBatteryCommand.useMutation({
    onSuccess: (result) => {
      setLastResult(result as unknown as Record<string, unknown>);
      if ((result as any).success) toast.success(`Utfört: ${COMMAND_LABELS[command]}`);
      else toast.error(`Misslyckades: ${(result as any).errorMessage ?? "Okänt fel"}`);
    },
    onError: (e) => toast.error(`Fel: ${e.message}`),
  });

  const buildParams = () => {
    switch (command) {
      case "start_charging": return { powerWatts: parseInt(params.powerWatts) || undefined };
      case "stop_charging": return {};
      case "schedule_charging": return { startTime: params.startTime, endTime: params.endTime, powerWatts: parseInt(params.powerWatts) || undefined };
      case "set_soc_target": return { targetPercent: parseInt(params.targetPercent) };
      case "set_power_limit": return { chargeLimitWatts: parseInt(params.chargeLimitWatts) || undefined, dischargeLimitWatts: parseInt(params.dischargeLimitWatts) || undefined };
      case "get_status": return {};
    }
  };

  return (
    <div className="space-y-3 border-t pt-3 mt-3">
      <div>
        <Label className="text-xs">Kommando</Label>
        <Select value={command} onValueChange={(v) => setCommand(v as BatteryCommandType)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(COMMAND_LABELS) as BatteryCommandType[]).map(c => (
              <SelectItem key={c} value={c} className="text-xs">{COMMAND_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(command === "start_charging" || command === "schedule_charging") && (
        <div><Label className="text-xs">Effekt (W)</Label><Input className="h-8 text-xs" type="number" value={params.powerWatts} onChange={e => setParams(p => ({ ...p, powerWatts: e.target.value }))} /></div>
      )}
      {command === "schedule_charging" && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Start (HH:MM)</Label><Input className="h-8 text-xs" value={params.startTime} onChange={e => setParams(p => ({ ...p, startTime: e.target.value }))} /></div>
          <div><Label className="text-xs">Slut (HH:MM)</Label><Input className="h-8 text-xs" value={params.endTime} onChange={e => setParams(p => ({ ...p, endTime: e.target.value }))} /></div>
        </div>
      )}
      {command === "set_soc_target" && (
        <div><Label className="text-xs">SoC-mål (%)</Label><Input className="h-8 text-xs" type="number" min={10} max={95} value={params.targetPercent} onChange={e => setParams(p => ({ ...p, targetPercent: e.target.value }))} /></div>
      )}
      {command === "set_power_limit" && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Laddgräns (W)</Label><Input className="h-8 text-xs" type="number" value={params.chargeLimitWatts} onChange={e => setParams(p => ({ ...p, chargeLimitWatts: e.target.value }))} /></div>
          <div><Label className="text-xs">Urladdningsgräns (W)</Label><Input className="h-8 text-xs" type="number" value={params.dischargeLimitWatts} onChange={e => setParams(p => ({ ...p, dischargeLimitWatts: e.target.value }))} /></div>
        </div>
      )}
      <Button size="sm" className="w-full" onClick={() => execCmd.mutate({ deviceConfigId: deviceId, command, params: buildParams() })} disabled={execCmd.isPending}>
        {execCmd.isPending ? "Kör..." : `Kör: ${COMMAND_LABELS[command]}`}
      </Button>
      {lastResult && (
        <div className={`rounded p-2 text-xs font-mono border ${(lastResult as any).success ? "bg-green-950/30 border-green-800 text-green-300" : "bg-red-950/30 border-red-800 text-red-300"}`}>
          <p className="font-semibold">{(lastResult as any).success ? "OK" : "FEL"}: {(lastResult as any).errorMessage ?? (lastResult as any).message ?? ""}</p>
          {(lastResult as any).executionTimeMs && <p className="text-muted-foreground">{(lastResult as any).executionTimeMs}ms</p>}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device, onRefresh }: { device: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const updateDevice = trpc.deviceControl.updateDevice.useMutation({
    onSuccess: () => { toast.success("Uppdaterad"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteDevice = trpc.deviceControl.deleteDevice.useMutation({
    onSuccess: () => { toast.success("Enhet borttagen"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${device.isActive ? "bg-green-500" : "bg-gray-500"}`} />
            <CardTitle className="text-base">{device.deviceName}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{DEVICE_TYPE_LABELS[device.deviceType as DeviceType] ?? device.deviceType}</Badge>
            <Badge variant="secondary" className="text-xs">{PROTOCOL_LABELS[device.protocol as Protocol] ?? device.protocol}</Badge>
            <Switch checked={device.isActive} onCheckedChange={(v) => updateDevice.mutate({ id: device.id, isActive: v })} />
          </div>
        </div>
        {device.deviceSn && <p className="text-xs text-muted-foreground">SN: {device.deviceSn}</p>}
        {device.modbusHost && <p className="text-xs text-muted-foreground">{device.modbusHost}:{device.modbusPort ?? 502} / Unit {device.modbusUnitId ?? 1}</p>}
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Laddning: max {(device.maxChargePower ?? 5000).toLocaleString()} W</span>
          <span>|</span>
          <span>SoC: {device.minSocPercent ?? 10}–{device.maxSocPercent ?? 95}%</span>
        </div>
        {device.deviceType === "battery" && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Dölj kommandon" : "Skicka kommando"}
          </Button>
        )}
        {expanded && device.deviceType === "battery" && <BatteryCommandPanel deviceId={device.id} />}
        <Button variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs"
          onClick={() => { if (confirm(`Ta bort ${device.deviceName}?`)) deleteDevice.mutate({ id: device.id }); }}>
          Ta bort enhet
        </Button>
      </CardContent>
    </Card>
  );
}

function ExecutionLogs() {
  const { data: logs, isLoading } = trpc.deviceControl.getLogs.useQuery({ limit: 30 });
  if (isLoading) return <div className="text-sm text-muted-foreground">Laddar loggar...</div>;
  if (!logs || logs.length === 0) return (
    <div className="text-center py-8 text-muted-foreground">
      <p className="text-sm">Inga exekveringsloggar ännu.</p>
      <p className="text-xs mt-1">Loggar skapas automatiskt när kommandon skickas till enheter.</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className={`rounded-lg border p-3 text-xs ${log.success ? "border-green-800/40 bg-green-950/10" : "border-red-800/40 bg-red-950/10"}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${log.success ? "text-green-400" : "text-red-400"}`}>{log.success ? "OK" : "FEL"}</span>
              <span className="font-mono text-foreground">{log.command}</span>
              <Badge variant="outline" className="text-xs">{log.deviceType}</Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {log.executionTimeMs && <span>{log.executionTimeMs}ms</span>}
              <span>{new Date(log.createdAt).toLocaleString("sv-SE")}</span>
            </div>
          </div>
          {log.errorMessage && <p className="text-red-400 mt-1">{log.errorMessage}</p>}
        </div>
      ))}
    </div>
  );
}

export default function DeviceControl() {
  const { data: devices, isLoading, refetch } = trpc.deviceControl.listDevices.useQuery();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enhetsstyrning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direktkontroll via Solarman API eller Modbus TCP. Alla kommandon loggas och valideras mot säkerhetsgränser.
          </p>
        </div>
        <AddDeviceDialog onSuccess={() => refetch()} />
      </div>

      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices">Enheter ({devices?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="logs">Exekveringslogg</TabsTrigger>
        </TabsList>
        <TabsContent value="devices" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Laddar...</div>
          ) : !devices || devices.length === 0 ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Inga enheter konfigurerade.</p>
                <p className="text-sm text-muted-foreground mt-1">Lägg till Afore-inverter, Solarman-batteri eller Modbus-enhet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {devices.map((device) => (
                <DeviceCard key={device.id} device={device} onRefresh={() => refetch()} />
              ))}
            </div>
          )}
          <Card className="mt-4 border-amber-800/30 bg-amber-950/10">
            <CardContent className="py-3">
              <p className="text-xs text-amber-400 font-medium">Säkerhetsregler aktiva</p>
              <p className="text-xs text-muted-foreground mt-1">
                Kommandon som bryter mot konfigurerade gränser (max SoC 95%, max effekt) avvisas automatiskt och loggas med felkod.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <ExecutionLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
