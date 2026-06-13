import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, ArrowRight, Crown, MessageSquare, Loader2 } from "lucide-react";

const TIER_DETAILS = {
  basic: {
    label: "CARE Basic",
    color: "text-foreground",
    bg: "bg-secondary",
    border: "border-border",
    features: [
      "Fjärrövervakning",
      "E-postsupport",
      "Årsrapport",
      "SLA 72 timmar",
    ],
  },
  plus: {
    label: "CARE Plus",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    features: [
      "Allt i Basic",
      "24/7 AI-larm",
      "Prioritetssupport",
      "Kvartalsrapport",
      "SLA 24 timmar",
      "SMS-påminnelser",
    ],
  },
  platinum: {
    label: "CARE Platinum",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    features: [
      "Allt i Plus",
      "Dedikerad tekniker",
      "SLA 4 timmar",
      "Månadsrapport",
      "Proaktiv optimering",
      "Prioriterad onsite-service",
    ],
  },
} as const;

type TierKey = keyof typeof TIER_DETAILS;

interface Props {
  currentTier: TierKey;
}

export function CareUpgradeSection({ currentTier }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();

  const nextTierMap: Record<TierKey, TierKey | null> = {
    basic: "plus",
    plus: "platinum",
    platinum: null,
  };
  const nextTier = nextTierMap[currentTier];

  const upgradeMutation = trpc.care.requestUpgrade.useMutation({
    onSuccess: (data) => {
      toast.success(`Uppgraderingsförfrågan skickad — ärende ${data.ticketNumber}`);
      setShowDialog(false);
      setMessage("");
      utils.tickets.list.invalidate();
    },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const current = TIER_DETAILS[currentTier];
  const next = nextTier ? TIER_DETAILS[nextTier] : null;

  if (!next) {
    return (
      <Card className="border border-amber-500/25 bg-gradient-to-br from-amber-500/10/60 to-white">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <Crown className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-400">CARE Platinum</p>
            <p className="text-xs text-amber-600 mt-0.5">Du har vår högsta supportnivå. Tack för ditt förtroende.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-white">Uppgradera din CARE-nivå</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Current tier */}
              <div className={`rounded-xl p-3 border ${current.border} ${current.bg}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Nuvarande</p>
                <p className={`text-sm font-bold mb-2 ${current.color}`}>{current.label}</p>
                <ul className="space-y-1">
                  {current.features.map((f) => (
                    <li key={f} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Next tier */}
              <div className={`rounded-xl p-3 border-2 relative ${nextTier === "platinum" ? "border-amber-400 bg-amber-500/10" : "border-blue-400 bg-blue-500/10"}`}>
                <div className={`absolute -top-2 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${nextTier === "platinum" ? "bg-amber-400 text-white" : "bg-blue-500 text-white"}`}>
                  Nästa nivå
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 mt-1">Uppgradera till</p>
                <p className={`text-sm font-bold mb-2 ${next.color}`}>{next.label}</p>
                <ul className="space-y-1">
                  {next.features.map((f) => (
                    <li key={f} className={`text-[11px] flex items-center gap-1.5 ${f.startsWith("Allt") ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                      <CheckCircle2 className={`h-2.5 w-2.5 shrink-0 ${f.startsWith("Allt") ? "text-muted-foreground" : "text-emerald-500"}`} />{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              className={`w-full gap-2 font-semibold ${nextTier === "platinum" ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
            >
              <ArrowRight className="h-4 w-4" />
              Uppgradera till {next.label}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Uppgradera till {next.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className={`rounded-lg p-3 ${next.bg} border ${next.border}`}>
              <p className="text-xs font-semibold text-foreground mb-1.5">{next.label} inkluderar:</p>
              <ul className="space-y-1">
                {next.features.filter((f) => !f.startsWith("Allt")).map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Kommentar (valfritt)
              </label>
              <Textarea
                placeholder="Berätta varför du vill uppgradera eller ställ en fråga..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              En uppgraderingsförfrågan skickas som ett supportärende. Vår säljare kontaktar dig inom 24 timmar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="text-sm">Avbryt</Button>
            <Button
              onClick={() => {
                if (!nextTier) return;
                upgradeMutation.mutate({
                  currentTier,
                  targetTier: nextTier as "plus" | "platinum",
                  message: message || undefined,
                });
              }}
              disabled={upgradeMutation.isPending}
              className={`text-sm gap-1.5 ${nextTier === "platinum" ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
            >
              {upgradeMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Skicka förfrågan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
