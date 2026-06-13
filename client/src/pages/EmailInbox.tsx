import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, MailOpen, Search, ChevronRight, ChevronDown, Clock,
  AlertCircle, CheckCircle2, Loader2, RefreshCw, User, Filter,
  Inbox, TrendingUp, Users, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EmailTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  description?: string | null;
  status: string;
  priority: string;
  category: string;
  source: string;
  senderEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
  slaDeadline?: Date | null;
}

interface SenderGroup {
  email: string;
  tickets: EmailTicket[];
  latestAt: Date;
  openCount: number;
  resolvedCount: number;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open:        { label: "Öppen",       color: "bg-blue-500/15 text-blue-400 border-blue-500/25",   icon: Clock },
  in_progress: { label: "Pågår",       color: "bg-amber-500/15 text-amber-400 border-amber-500/25", icon: TrendingUp },
  waiting:     { label: "Väntar",      color: "bg-purple-500/15 text-purple-400 border-purple-500/25", icon: Clock },
  resolved:    { label: "Löst",        color: "bg-green-500/15 text-green-400 border-green-500/25", icon: CheckCircle2 },
  closed:      { label: "Stängd",      color: "bg-secondary text-muted-foreground border-border", icon: CheckCircle2 },
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400", medium: "bg-blue-400", high: "bg-amber-400", urgent: "bg-red-500",
};

// ─── Ticket Row ────────────────────────────────────────────────────────────────

function TicketRow({ ticket }: { ticket: EmailTicket }) {
  const sc = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
  const StatusIcon = sc.icon;
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-secondary transition-colors group">
      <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${sc.color}`}>
            <StatusIcon className="h-2.5 w-2.5" />{sc.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[ticket.priority] ?? "bg-slate-400"}`} />
            {ticket.priority}
          </span>
        </div>
        <p className="text-sm text-foreground truncate mt-0.5">{ticket.subject}</p>
        {ticket.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.description}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-muted-foreground">
          {new Date(ticket.createdAt).toLocaleDateString("sv-SE")}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(ticket.createdAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── Sender Card ───────────────────────────────────────────────────────────────

function SenderCard({ group }: { group: SenderGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hasOpen = group.openCount > 0;

  return (
    <Card className={`border transition-all ${hasOpen ? "border-blue-500/25 shadow-sm" : "border-border"}`}>
      <CardContent className="p-0">
        {/* Header row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 hover:bg-secondary transition-colors rounded-t-lg text-left"
        >
          <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${hasOpen ? "bg-blue-500/15" : "bg-secondary"}`}>
            <User className={`h-4 w-4 ${hasOpen ? "text-blue-600" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground truncate">{group.email}</p>
              {hasOpen && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  {group.openCount} öppen{group.openCount > 1 ? "a" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground">{group.tickets.length} ärende{group.tickets.length !== 1 ? "n" : ""} totalt</span>
              {group.resolvedCount > 0 && (
                <span className="text-xs text-green-600">{group.resolvedCount} lösta</span>
              )}
              <span className="text-xs text-muted-foreground">
                Senast {new Date(group.latestAt).toLocaleDateString("sv-SE")}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </button>

        {/* Expanded tickets */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-2 pb-2">
                {group.tickets.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EmailInbox() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: allTickets, isLoading, refetch, isFetching } = trpc.tickets.listAll.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min (sync with IMAP poller)
  });

  // Filter to email-only tickets
  const emailTickets = useMemo(() => {
    if (!allTickets) return [];
    return (allTickets as EmailTicket[]).filter((t) => t.source === "email" && !!t.senderEmail);
  }, [allTickets]);

  // Apply status filter
  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return emailTickets;
    if (statusFilter === "open") return emailTickets.filter((t) => ["open", "in_progress", "waiting"].includes(t.status));
    if (statusFilter === "resolved") return emailTickets.filter((t) => ["resolved", "closed"].includes(t.status));
    return emailTickets.filter((t) => t.status === statusFilter);
  }, [emailTickets, statusFilter]);

  // Group by sender email
  const senderGroups = useMemo((): SenderGroup[] => {
    const map = new Map<string, EmailTicket[]>();
    for (const ticket of filteredTickets) {
      const email = ticket.senderEmail!;
      if (!map.has(email)) map.set(email, []);
      map.get(email)!.push(ticket);
    }
    return Array.from(map.entries())
      .map(([email, tickets]) => ({
        email,
        tickets: tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        latestAt: new Date(Math.max(...tickets.map((t) => new Date(t.createdAt).getTime()))),
        openCount: tickets.filter((t) => ["open", "in_progress", "waiting"].includes(t.status)).length,
        resolvedCount: tickets.filter((t) => ["resolved", "closed"].includes(t.status)).length,
      }))
      .filter((g) => !search || g.email.toLowerCase().includes(search.toLowerCase()) ||
        g.tickets.some((t) => t.subject.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        // Open tickets first, then by latest date
        if (a.openCount > 0 && b.openCount === 0) return -1;
        if (b.openCount > 0 && a.openCount === 0) return 1;
        return b.latestAt.getTime() - a.latestAt.getTime();
      });
  }, [filteredTickets, search]);

  // Stats
  const stats = useMemo(() => ({
    total: emailTickets.length,
    open: emailTickets.filter((t) => ["open", "in_progress", "waiting"].includes(t.status)).length,
    senders: new Set(emailTickets.map((t) => t.senderEmail)).size,
    today: emailTickets.filter((t) => {
      const d = new Date(t.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  }), [emailTickets]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Åtkomst nekad — kräver admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Inbox className="h-6 w-6 text-blue-600" />
            E-post Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inkommande mejl från <span className="font-mono text-foreground">care@solpulsen.se</span> — uppdateras var 5 min
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetch(); toast.success("Uppdaterar..."); }}
          disabled={isFetching}
          className="gap-2"
        >
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Uppdatera
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Mail, label: "Totalt", value: stats.total, color: "text-muted-foreground" },
          { icon: MessageSquare, label: "Öppna", value: stats.open, color: stats.open > 0 ? "text-blue-600" : "text-muted-foreground" },
          { icon: Users, label: "Avsändare", value: stats.senders, color: "text-muted-foreground" },
          { icon: TrendingUp, label: "Idag", value: stats.today, color: stats.today > 0 ? "text-green-600" : "text-muted-foreground" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök avsändare eller ämne..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            <SelectItem value="open">Öppna / Pågår</SelectItem>
            <SelectItem value="resolved">Lösta / Stängda</SelectItem>
            <SelectItem value="open">Öppen</SelectItem>
            <SelectItem value="in_progress">Pågår</SelectItem>
            <SelectItem value="waiting">Väntar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sender groups */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : senderGroups.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-foreground mb-3" />
            <p className="text-muted-foreground font-medium">
              {emailTickets.length === 0 ? "Inga mejl-ärenden ännu" : "Inga ärenden matchar filtret"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {emailTickets.length === 0
                ? "Mejl till care@solpulsen.se skapar automatiskt ärenden här"
                : "Prova att ändra sök eller statusfilter"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {senderGroups.map((group) => (
            <motion.div
              key={group.email}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SenderCard group={group} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        IMAP-pollern läser <span className="font-mono">care@solpulsen.se</span> automatiskt var 5:e minut.
        Svar via CARE-portalen skickas tillbaka till avsändaren.
      </p>
    </div>
  );
}
