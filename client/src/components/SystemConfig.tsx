import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings, Sun, Battery, Wind, Zap } from "lucide-react";

export interface EnergyConfig {
  name: string;
  solarCapacity: number;
  batteryCapacity: number;
  batteryDoD: number;
  batteryEfficiency: number;
  windCapacity: number;
  hasWind: boolean;
  annualConsumption: number;
  hasEV: boolean;
  evConsumption: number;
  heatingType: "heatpump" | "direct" | "district" | "other";
  electricityArea: "SE1" | "SE2" | "SE3" | "SE4";
  roofTilt: number;
  roofOrientation: number;
  shading: number;
}

interface Props {
  value: EnergyConfig;
  onChange: (cfg: EnergyConfig) => void;
  onSave?: () => void;
  saving?: boolean;
}

const DEMO_SCENARIOS: Record<string, EnergyConfig> = {
  villa: {
    name: "Villa SE3 – Typisk villa",
    solarCapacity: 10,
    batteryCapacity: 10,
    batteryDoD: 80,
    batteryEfficiency: 92,
    windCapacity: 0,
    hasWind: false,
    annualConsumption: 20000,
    hasEV: true,
    evConsumption: 3000,
    heatingType: "heatpump",
    electricityArea: "SE3",
    roofTilt: 30,
    roofOrientation: 180,
    shading: 5,
  },
  brf: {
    name: "BRF SE4 – Flerbostadshus",
    solarCapacity: 50,
    batteryCapacity: 30,
    batteryDoD: 85,
    batteryEfficiency: 94,
    windCapacity: 0,
    hasWind: false,
    annualConsumption: 120000,
    hasEV: true,
    evConsumption: 15000,
    heatingType: "district",
    electricityArea: "SE4",
    roofTilt: 15,
    roofOrientation: 180,
    shading: 10,
  },
  industri: {
    name: "Industri SE2 – Industrianläggning",
    solarCapacity: 200,
    batteryCapacity: 100,
    batteryDoD: 90,
    batteryEfficiency: 95,
    windCapacity: 50,
    hasWind: true,
    annualConsumption: 500000,
    hasEV: false,
    evConsumption: 0,
    heatingType: "other",
    electricityArea: "SE2",
    roofTilt: 10,
    roofOrientation: 180,
    shading: 0,
  },
};

export default function SystemConfig({ value, onChange, onSave, saving }: Props) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  function loadScenario(key: string) {
    setActiveScenario(key);
    onChange(DEMO_SCENARIOS[key]);
  }

  function update<K extends keyof EnergyConfig>(key: K, val: EnergyConfig[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          Systemkonfiguration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Demo scenarios */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Demo-scenarion</Label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(DEMO_SCENARIOS).map(([key, s]) => (
              <Button
                key={key}
                size="sm"
                variant={activeScenario === key ? "default" : "outline"}
                onClick={() => loadScenario(key)}
                className="text-xs"
              >
                {key === "villa" ? "🏠" : key === "brf" ? "🏢" : "🏭"} {s.electricityArea}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Namn</Label>
          <Input
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Elområde</Label>
            <Select
              value={value.electricityArea}
              onValueChange={(v) => update("electricityArea", v as EnergyConfig["electricityArea"])}
            >
              <SelectTrigger className="mt-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SE1">SE1 – Norrland</SelectItem>
                <SelectItem value="SE2">SE2 – Mellannorrland</SelectItem>
                <SelectItem value="SE3">SE3 – Svealand</SelectItem>
                <SelectItem value="SE4">SE4 – Sydsverige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Uppvärmning</Label>
            <Select
              value={value.heatingType}
              onValueChange={(v) => update("heatingType", v as EnergyConfig["heatingType"])}
            >
              <SelectTrigger className="mt-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heatpump">Värmepump</SelectItem>
                <SelectItem value="direct">Direktel</SelectItem>
                <SelectItem value="district">Fjärrvärme</SelectItem>
                <SelectItem value="other">Annat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Solar */}
        <div className="bg-amber-500/10 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
            <Sun className="w-4 h-4" /> Solceller
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Kapacitet</span>
              <Badge className="bg-amber-500/15 text-amber-400 text-xs">{value.solarCapacity} kWp</Badge>
            </div>
            <Slider
              value={[value.solarCapacity]}
              min={0}
              max={500}
              step={1}
              onValueChange={([v]) => update("solarCapacity", v)}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Lutning (°)</Label>
              <Input
                type="number"
                value={value.roofTilt}
                onChange={(e) => update("roofTilt", parseInt(e.target.value) || 0)}
                className="mt-1 text-xs h-8"
                min={0}
                max={90}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Orientering (°)</Label>
              <Input
                type="number"
                value={value.roofOrientation}
                onChange={(e) => update("roofOrientation", parseInt(e.target.value) || 0)}
                className="mt-1 text-xs h-8"
                min={0}
                max={360}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Skuggning (%)</Label>
              <Input
                type="number"
                value={value.shading}
                onChange={(e) => update("shading", parseInt(e.target.value) || 0)}
                className="mt-1 text-xs h-8"
                min={0}
                max={100}
              />
            </div>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-blue-500/10 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-medium text-sm">
            <Battery className="w-4 h-4" /> Batteri
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Kapacitet</span>
              <Badge className="bg-blue-500/15 text-blue-400 text-xs">{value.batteryCapacity} kWh</Badge>
            </div>
            <Slider
              value={[value.batteryCapacity]}
              min={0}
              max={500}
              step={1}
              onValueChange={([v]) => update("batteryCapacity", v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>DoD</span>
                <span>{value.batteryDoD}%</span>
              </div>
              <Slider
                value={[value.batteryDoD]}
                min={50}
                max={100}
                step={1}
                onValueChange={([v]) => update("batteryDoD", v)}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Verkningsgrad</span>
                <span>{value.batteryEfficiency}%</span>
              </div>
              <Slider
                value={[value.batteryEfficiency]}
                min={70}
                max={100}
                step={1}
                onValueChange={([v]) => update("batteryEfficiency", v)}
              />
            </div>
          </div>
        </div>

        {/* Wind */}
        <div className="bg-indigo-500/10 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm">
              <Wind className="w-4 h-4" /> Vindkraft
            </div>
            <Button
              size="sm"
              variant={value.hasWind ? "default" : "outline"}
              onClick={() => update("hasWind", !value.hasWind)}
              className="text-xs h-7"
            >
              {value.hasWind ? "Aktivt" : "Inaktivt"}
            </Button>
          </div>
          {value.hasWind && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Kapacitet</span>
                <Badge className="bg-indigo-500/15 text-indigo-400 text-xs">{value.windCapacity} kW</Badge>
              </div>
              <Slider
                value={[value.windCapacity]}
                min={0}
                max={1000}
                step={5}
                onValueChange={([v]) => update("windCapacity", v)}
              />
            </div>
          )}
        </div>

        {/* Consumption */}
        <div className="bg-secondary rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-medium text-sm">
            <Zap className="w-4 h-4" /> Förbrukning
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Årsförbrukning</span>
              <Badge className="bg-muted text-muted-foreground text-xs">
                {value.annualConsumption.toLocaleString("sv-SE")} kWh/år
              </Badge>
            </div>
            <Slider
              value={[value.annualConsumption]}
              min={5000}
              max={1000000}
              step={1000}
              onValueChange={([v]) => update("annualConsumption", v)}
            />
          </div>
        </div>

        {onSave && (
          <Button onClick={onSave} disabled={saving} className="w-full">
            {saving ? "Sparar..." : "Spara konfiguration"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { DEMO_SCENARIOS };
