import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CareUpgradeSection } from "@/components/CareUpgradeSection";
import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  LifeBuoy, Shield, FileText, Users, Plus, Copy, Check,
  Clock, AlertTriangle, CheckCircle2, ChevronRight, Gift,
  TrendingUp, Star, Share2, Calendar, Loader2, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";
type TicketCategory = "technical" | "billing" | "installation" | "general" | "warranty";

interface Ticket {
  id: number;
  ticketNumber: string;
  subject: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  careTier?: string | null;
  slaDeadline?: Date | null;
  source?: string | null;
  senderEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
}

// ─── SLA Countdown Component ──────────────────────────────────────────────────

function useSlaCountdown(deadline: Date | null | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  const calc = useCallback(() => {
    if (!deadline) { setRemaining(null); return; }
    setRemaining(new Date(deadline).getTime() - Date.now());
  }, [deadline]);

  useEffect(() => {
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [calc]);

  return remaining;
}

function SlaCountdown({ deadline, status }: { deadline?: Date | null; status: string }) {
  const remaining = useSlaCountdown(deadline);

  if (!deadline || ["resolved", "closed"].includes(status)) return null;

  if (remaining === null) return null;

  const isBreached = remaining <= 0;
  const hoursLeft = remaining / 3600000;
  const isRed    = isBreached || hoursLeft < 1;
  const isYellow = !isRed && hoursLeft < 4;
  const isGreen  = !isRed && !isYellow;

  const colorClass = isRed
    ? "text-red-600 bg-red-500/10 border-red-500/25"
    : isYellow
    ? "text-amber-600 bg-amber-500/10 border-amber-500/25"
    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";

  const dot = isRed ? "bg-red-500" : isYellow ? "bg-amber-400" : "bg-emerald-500";

  let label: string;
  if (isBreached) {
    label = "SLA BRUTEN";
  } else {
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) label = `SLA ${h}h ${m}m`;
    else label = `SLA ${m}m ${s}s`;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full border ${colorClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${isRed && !isBreached ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

interface Contract {
  id: number;
  customerId: number;
  contractType: string;
  title: string;
  startDate?: Date | null;
  endDate?: Date | null;
  status: string;
  monthlyCost?: number | null;
  notes?: string | null;
  documentUrl?: string | null;
}

interface Warranty {
  id: number;
  customerId: number;
  productName: string;
  productType: string;
  serialNumber?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: string;
  provider?: string | null;
  notes?: string | null;
}

interface Referral {
  id: number;
  referralCode: string;
  status: string;
  rewardAmount?: number | null;
  createdAt: Date;
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const TICKET_STATUS: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  open:        { label: "Öppen",     color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/25",      icon: Clock },
  in_progress: { label: "Pågår",     color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25",    icon: RefreshCw },
  waiting:     { label: "Väntar",    color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/25",  icon: Clock },
  resolved:    { label: "Löst",      color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25",icon: CheckCircle2 },
  closed:      { label: "Stängd",    color: "text-muted-foreground",   bg: "bg-secondary border-border",    icon: CheckCircle2 },
};

const TICKET_PRIORITY: Record<TicketPriority, { label: string; dot: string }> = {
  low:    { label: "Låg",        dot: "bg-slate-400" },
  medium: { label: "Medium",     dot: "bg-amber-400" },
  high:   { label: "Hög",        dot: "bg-orange-500" },
  urgent: { label: "Brådskande", dot: "bg-red-500" },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical:    "Teknisk",
  billing:      "Fakturering",
  installation: "Installation",
  general:      "Allmänt",
  warranty:     "Garanti",
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  care_basic:    "CARE Basic",
  care_plus:     "CARE Plus",
  care_platinum: "CARE Platinum",
  installation:  "Installation",
  maintenance:   "Underhåll",
  lease:         "Leasing",
  other:         "Övrigt",
};

const WARRANTY_TYPE_LABELS: Record<string, string> = {
  manufacturer: "Tillverkare",
  extended:     "Förlängd",
  installation: "Installation",
  performance:  "Prestanda",
  other:        "Övrigt",
};

const REFERRAL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Väntande",    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25" },
  registered: { label: "Registrerad",color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/25" },
  converted:  { label: "Konverterad",color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
  rewarded:   { label: "Belönad",    color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/25" },
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "support",    label: "Support",   icon: LifeBuoy },
  { id: "warranties", label: "Garantier", icon: Shield },
  { id: "contracts",  label: "Avtal",     icon: FileText },
  { id: "referral",   label: "Referral",  icon: Users },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── Support Tab ──────────────────────────────────────────────────────────────

function SupportTab() {
  const { user } = useAuth();
  const [newOpen, setNewOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [form, setForm] = useState({
    subject: "", description: "",
    priority: "medium" as TicketPriority,
    category: "technical" as TicketCategory,
  });

  const utils = trpc.useUtils();
  const { data: tickets = [], isLoading } = trpc.tickets.list.useQuery(undefined, { staleTime: 30000 });

  const createMutation = trpc.tickets.create.useMutation({
    onSuccess: () => {
      toast.success("Ärende skapat");
      utils.tickets.list.invalidate();
      setNewOpen(false);
      setForm({ subject: "", description: "", priority: "medium", category: "technical" });
    },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const updateMutation = trpc.tickets.update.useMutation({
    onSuccess: () => { utils.tickets.list.invalidate(); toast.success("Ärende uppdaterat"); },
  });

  const openTickets = (tickets as Ticket[]).filter((t) => ["open","in_progress","waiting"].includes(t.status));
  const closedTickets = (tickets as Ticket[]).filter((t) => ["resolved","closed"].includes(t.status));
  const urgentTickets = (tickets as Ticket[]).filter((t) => t.priority === "urgent");

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totalt",     value: (tickets as Ticket[]).length, icon: LifeBuoy,      bg: "bg-secondary",   color: "text-muted-foreground" },
          { label: "Öppna",      value: openTickets.length,           icon: Clock,          bg: "bg-blue-500/10",    color: "text-blue-600" },
          { label: "Lösta",      value: closedTickets.length,         icon: CheckCircle2,   bg: "bg-emerald-500/10", color: "text-emerald-600" },
          { label: "Brådskande", value: urgentTickets.length,         icon: AlertTriangle,  bg: "bg-red-500/10",     color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Ärenden</h3>
        <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="h-3.5 w-3.5" />Nytt ärende
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse border border-border"><CardContent className="p-4 h-16" /></Card>)}</div>
      ) : (tickets as Ticket[]).length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-10 text-center">
            <LifeBuoy className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Inga ärenden</p>
            <p className="text-sm text-muted-foreground mb-4">Skapa ett ärende om du behöver support.</p>
            <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="h-3.5 w-3.5" />Skapa ärende
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(tickets as Ticket[]).map((ticket) => {
            const sc = TICKET_STATUS[ticket.status];
            const pc = TICKET_PRIORITY[ticket.priority];
            const SIcon = sc.icon;
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border border-border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                            <SIcon className="h-2.5 w-2.5" />{sc.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className={`h-1.5 w-1.5 rounded-full ${pc.dot}`} />{pc.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{CATEGORY_LABELS[ticket.category]}</span>
                          {ticket.source === "email" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/25" title={ticket.senderEmail ?? "Via e-post"}>
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              E-post
                            </span>
                          )}
                          <SlaCountdown deadline={ticket.slaDeadline} status={ticket.status} />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                        {ticket.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString("sv-SE")}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New ticket dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-foreground">Nytt supportärende</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-foreground">Ämne *</Label>
              <Input className="mt-1.5" placeholder="Beskriv problemet kort" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-foreground">Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TicketCategory })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-foreground">Prioritet</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TICKET_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-foreground">Beskrivning</Label>
              <Textarea className="mt-1.5 resize-none" rows={4} placeholder="Beskriv problemet i detalj..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} className="text-sm">Avbryt</Button>
            <Button
              onClick={() => { if (!form.subject.trim()) { toast.error("Ämne krävs"); return; } createMutation.mutate(form); }}
              disabled={createMutation.isPending}
              className="text-sm bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Skicka ärende
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground text-base">{selectedTicket.subject}</DialogTitle>
                <p className="text-xs text-muted-foreground font-mono">{selectedTicket.ticketNumber}</p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${TICKET_STATUS[selectedTicket.status].bg} ${TICKET_STATUS[selectedTicket.status].color}`}>
                    {TICKET_STATUS[selectedTicket.status].label}
                  </span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">{TICKET_PRIORITY[selectedTicket.priority].label}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">{CATEGORY_LABELS[selectedTicket.category]}</span>
                </div>
                {selectedTicket.description && <p className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">{selectedTicket.description}</p>}
                <p className="text-xs text-muted-foreground">Skapad: {new Date(selectedTicket.createdAt).toLocaleString("sv-SE")}</p>
                {selectedTicket.slaDeadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">SLA-deadline:</span>
                    <span className="text-xs text-muted-foreground">{new Date(selectedTicket.slaDeadline).toLocaleString("sv-SE")}</span>
                    <SlaCountdown deadline={selectedTicket.slaDeadline} status={selectedTicket.status} />
                  </div>
                )}
                {["open","in_progress"].includes(selectedTicket.status) && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { updateMutation.mutate({ id: selectedTicket.id, status: "resolved" }); setSelectedTicket(null); }}>Markera löst</Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { updateMutation.mutate({ id: selectedTicket.id, status: "closed" }); setSelectedTicket(null); }}>Stäng ärende</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* CARE Upgrade */}
      <CareUpgradeSection currentTier={(user?.careTier as "basic" | "plus" | "platinum") ?? "basic"} />
    </div>
  );
}

// ─── Warranties Tab ───────────────────────────────────────────────────────────

function WarrantiesTab() {
  const { data: warranties = [], isLoading } = trpc.warranties.list.useQuery(undefined, { staleTime: 60000 });
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Garantier</h3>
        <span className="text-xs text-muted-foreground">{(warranties as Warranty[]).length} registrerade</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse border border-border"><CardContent className="p-4 h-20" /></Card>)}</div>
      ) : (warranties as Warranty[]).length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-10 text-center">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Inga garantier registrerade</p>
            <p className="text-sm text-muted-foreground">Kontakta Solpulsen för att registrera dina produktgarantier.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(warranties as Warranty[]).map((w) => {
            const daysLeft = w.endDate ? Math.ceil((new Date(w.endDate).getTime() - now.getTime()) / 86400000) : null;
            const isExpiring = daysLeft !== null && daysLeft <= 90 && daysLeft > 0;
            const isExpired = w.status === "expired" || (daysLeft !== null && daysLeft <= 0);
            return (
              <Card key={w.id} className={`border shadow-sm ${isExpired ? "border-red-500/25" : isExpiring ? "border-amber-500/25" : "border-border"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${isExpired ? "bg-red-500/10" : isExpiring ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                        <Shield className={`h-4 w-4 ${isExpired ? "text-red-500" : isExpiring ? "text-amber-500" : "text-emerald-600"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{w.productName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {WARRANTY_TYPE_LABELS[w.productType] ?? w.productType}
                          {w.provider && ` · ${w.provider}`}
                          {w.serialNumber && ` · S/N: ${w.serialNumber}`}
                        </p>
                        {(w.startDate || w.endDate) && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {w.startDate && new Date(w.startDate).toLocaleDateString("sv-SE")}
                            {w.startDate && w.endDate && " → "}
                            {w.endDate && new Date(w.endDate).toLocaleDateString("sv-SE")}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      isExpired ? "bg-red-500/10 text-red-400 border-red-500/25" :
                      isExpiring ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                    }`}>
                      {isExpired ? "Utgången" : isExpiring ? `${daysLeft}d kvar` : "Aktiv"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border border-blue-500/25 bg-blue-500/10/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-blue-400">Saknar du en garanti?</p>
            <p className="text-xs text-blue-600 mt-0.5">Kontakta oss via support. Alla Solpulsen-installationer inkluderar 5 års arbetsgaranti.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Contracts Tab ────────────────────────────────────────────────────────────

function ContractsTab() {
  const { data: contracts = [], isLoading } = trpc.contracts.list.useQuery(undefined, { staleTime: 60000 });

  const TIER_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    care_basic:    { bg: "bg-secondary",   color: "text-foreground",   border: "border-border" },
    care_plus:     { bg: "bg-blue-500/10",    color: "text-blue-400",    border: "border-blue-500/25" },
    care_platinum: { bg: "bg-amber-500/10",   color: "text-amber-400",   border: "border-amber-500/25" },
    installation:  { bg: "bg-emerald-500/10", color: "text-emerald-400", border: "border-emerald-500/25" },
    maintenance:   { bg: "bg-violet-500/10",  color: "text-violet-400",  border: "border-violet-500/25" },
    lease:         { bg: "bg-cyan-500/10",    color: "text-cyan-400",    border: "border-cyan-500/25" },
    other:         { bg: "bg-secondary",   color: "text-muted-foreground",   border: "border-border" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Avtal</h3>
        <span className="text-xs text-muted-foreground">{(contracts as Contract[]).length} aktiva</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <Card key={i} className="animate-pulse border border-border"><CardContent className="p-4 h-24" /></Card>)}</div>
      ) : (contracts as Contract[]).length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Inga avtal registrerade</p>
            <p className="text-sm text-muted-foreground">Dina CARE-avtal och serviceavtal visas här.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(contracts as Contract[]).map((c) => {
            const tier = TIER_COLORS[c.contractType] ?? TIER_COLORS.other;
            const isActive = c.status === "active";
            return (
              <Card key={c.id} className={`border shadow-sm ${isActive ? "border-border" : "border-border opacity-70"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${tier.bg}`}>
                        <FileText className={`h-4 w-4 ${tier.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-medium text-foreground text-sm">{c.title}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${tier.bg} ${tier.color} ${tier.border}`}>
                            {CONTRACT_TYPE_LABELS[c.contractType] ?? c.contractType}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">ID: {c.id}</p>
                        {(c.startDate || c.endDate) && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {c.startDate && new Date(c.startDate).toLocaleDateString("sv-SE")}
                            {c.startDate && c.endDate && " → "}
                            {c.endDate && new Date(c.endDate).toLocaleDateString("sv-SE")}
                          </p>
                        )}
                        {c.monthlyCost && <p className="text-xs text-muted-foreground mt-1 font-medium">{c.monthlyCost / 100} kr/mån</p>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                      c.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                      "bg-secondary text-muted-foreground border-border"
                    }`}>
                      {isActive ? "Aktivt" : c.status === "pending" ? "Väntar" : "Inaktivt"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CARE tiers */}
      <Card className="border border-amber-500/25 bg-gradient-to-br from-amber-500/10/50 to-white">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-600" />CARE-nivåer
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: "Basic",    features: ["Fjärrövervakning","E-postsupport","Årsrapport"],       color: "text-foreground" },
              { name: "Plus",     features: ["24/7 AI-larm","Prioritetssupport","Kvartalsrapport"],  color: "text-blue-400" },
              { name: "Platinum", features: ["Dedikerad tekniker","SLA 4h","Månadsrapport"],         color: "text-amber-400" },
            ].map((tier) => (
              <div key={tier.name} className="bg-card rounded-lg p-2.5 border border-border">
                <p className={`text-xs font-bold mb-1.5 ${tier.color}`}>{tier.name}</p>
                {tier.features.map((f) => (
                  <p key={f} className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />{f}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Referral Tab ─────────────────────────────────────────────────────────────

function ReferralTab() {
  const [copied, setCopied] = useState(false);

  const { data: codeData, isLoading: codeLoading } = trpc.referrals.getCode.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const { data: stats, isLoading: statsLoading } = trpc.referrals.stats.useQuery(undefined, { staleTime: 30000 });
  const { data: referrals = [], isLoading: listLoading } = trpc.referrals.list.useQuery(undefined, { staleTime: 30000 });

  const referralLink = codeData?.code ? `${window.location.origin}?ref=${codeData.code}` : "";

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <Card className="border border-amber-500/25 overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-foreground">Referral-program</h3>
              </div>
              <p className="text-sm text-muted-foreground">Bjud in vänner och tjäna belöningar för varje konverterad kund.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Totalt intjänat</p>
              <p className="text-2xl font-bold text-amber-600">
                {statsLoading ? "–" : `${((stats?.totalRewards ?? 0) / 100).toFixed(0)} kr`}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Inbjudna",     value: stats?.total ?? 0,     icon: Users },
              { label: "Konverterade", value: stats?.converted ?? 0, icon: TrendingUp },
              { label: "Väntande",     value: stats?.pending ?? 0,   icon: Clock },
            ].map((s) => (
              <div key={s.label} className="bg-card/80 rounded-xl p-3 text-center border border-white shadow-sm">
                <s.icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{statsLoading ? "–" : s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Code + copy */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Din unika referral-länk</p>
            {codeLoading ? (
              <div className="h-10 bg-card/60 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-amber-600 font-bold flex-shrink-0">{codeData?.code}</span>
                  <span className="text-xs text-muted-foreground truncate">{referralLink.replace(window.location.origin, "")}</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className={`gap-1.5 text-xs flex-shrink-0 transition-all ${copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"} text-white`}
                >
                  {copied ? <><Check className="h-3.5 w-3.5" />Kopierad</> : <><Copy className="h-3.5 w-3.5" />Kopiera</>}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Reward structure */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-500" />Belöningsstruktur
          </p>
          <div className="space-y-2">
            {[
              { step: "Registrering", reward: "500 kr",   desc: "När din vän skapar ett konto",       color: "bg-blue-500/10 text-blue-400" },
              { step: "Konvertering", reward: "1 500 kr", desc: "När din vän köper ett system",        color: "bg-emerald-500/10 text-emerald-400" },
              { step: "Installation", reward: "500 kr",   desc: "Bonus vid slutförd installation",     color: "bg-amber-500/10 text-amber-400" },
            ].map((r) => (
              <div key={r.step} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.step}</span>
                  <span className="text-xs text-muted-foreground">{r.desc}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{r.reward}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {!listLoading && (referrals as Referral[]).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Historik</h4>
          <div className="space-y-2">
            {(referrals as Referral[]).map((r) => {
              const sc = REFERRAL_STATUS[r.status] ?? REFERRAL_STATUS.pending;
              return (
                <Card key={r.id} className="border border-border shadow-sm">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-secondary"><Users className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Referral #{r.id}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("sv-SE")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.rewardAmount && r.rewardAmount > 0 && (
                        <span className="text-xs font-bold text-emerald-600">+{(r.rewardAmount / 100).toFixed(0)} kr</span>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Share CTA */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Dela med vänner</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dela din länk via WhatsApp, e-post eller sociala medier.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" />Dela länk
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Care() {
  const [activeTab, setActiveTab] = useState<TabId>("support");

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">CARE</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Support, garantier, avtal och referral-program</p>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "support"    && <SupportTab />}
          {activeTab === "warranties" && <WarrantiesTab />}
          {activeTab === "contracts"  && <ContractsTab />}
          {activeTab === "referral"   && <ReferralTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
