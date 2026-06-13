import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload, FileText, Trash2, Bell, Eye, Calendar, Zap, AlertCircle,
  Brain, TrendingDown, TrendingUp, Lightbulb, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle, BarChart3, Loader2, Users, Filter
} from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December"
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

type BillAnalysis = {
  totalKwh: number | null;
  totalCostSek: number;
  networkFeesSek: number;
  energyCostSek: number;
  pricePerKwh: number | null;
  monthlyAvgSek: number;
  savingsPotentialSek: number;
  savingsPotentialPct: number;
  insights: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
  summary: string;
};

type Bill = {
  id: number;
  filename: string;
  fileKey: string;
  fileUrl: string;
  billMonth: number;
  billYear: number;
  amount: string | null;
  dueDate: Date | null;
  notes: string | null;
  analysisJson: string | null;
  analyzedAt: Date | null;
  createdAt: Date;
};

function parseAnalysis(json: string | null | undefined): BillAnalysis | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; className: string }> = {
    low: { label: "Låg risk", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    medium: { label: "Medel risk", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    high: { label: "Hög risk", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const { label, className } = map[level] ?? map.medium;
  return <Badge variant="outline" className={`text-xs ${className}`}>{label}</Badge>;
}

function AnalysisPanel({ analysis, billName }: { analysis: BillAnalysis; billName: string }) {
  const [expanded, setExpanded] = useState(false);
  const savingsPct = Math.min(100, Math.round(analysis.savingsPotentialPct));

  return (
    <div className="mt-3 border border-amber-500/20 rounded-xl bg-amber-500/5 overflow-hidden">
      {/* Summary row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-amber-500/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Brain className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-300">AI-analys klar</span>
          <RiskBadge level={analysis.riskLevel} />
          {analysis.savingsPotentialSek > 0 && (
            <span className="text-xs text-green-400 font-semibold">
              Sparpotential: {Math.round(analysis.savingsPotentialSek).toLocaleString("sv-SE")} kr/år
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-amber-500/20 pt-4">
          {/* Summary */}
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total kostnad",
                value: `${Math.round(analysis.totalCostSek).toLocaleString("sv-SE")} kr`,
                icon: <BarChart3 className="w-4 h-4 text-amber-400" />,
              },
              {
                label: "Nätavgift",
                value: `${Math.round(analysis.networkFeesSek).toLocaleString("sv-SE")} kr`,
                icon: <TrendingUp className="w-4 h-4 text-orange-400" />,
              },
              {
                label: "Energikostnad",
                value: `${Math.round(analysis.energyCostSek).toLocaleString("sv-SE")} kr`,
                icon: <Zap className="w-4 h-4 text-yellow-400" />,
              },
              {
                label: analysis.totalKwh ? "Förbrukning" : "Snittpris",
                value: analysis.totalKwh
                  ? `${Math.round(analysis.totalKwh).toLocaleString("sv-SE")} kWh`
                  : analysis.pricePerKwh
                  ? `${analysis.pricePerKwh.toFixed(2)} kr/kWh`
                  : "—",
                icon: <TrendingDown className="w-4 h-4 text-blue-400" />,
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-background/50 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">{kpi.icon}<span className="text-xs text-muted-foreground">{kpi.label}</span></div>
                <p className="text-sm font-bold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Savings potential bar */}
          {analysis.savingsPotentialSek > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-green-400" />
                  Sparpotential med sol + batteri
                </span>
                <span className="text-xs font-bold text-green-400">{savingsPct}%</span>
              </div>
              <Progress value={savingsPct} className="h-2 bg-muted [&>div]:bg-green-500" />
              <p className="text-xs text-muted-foreground">
                Uppskattad besparing: <span className="text-green-400 font-semibold">
                  {Math.round(analysis.savingsPotentialSek).toLocaleString("sv-SE")} kr/år
                </span>
              </p>
            </div>
          )}

          {/* Insights */}
          {analysis.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Insikter</p>
              <ul className="space-y-1.5">
                {analysis.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Rekommendationer</p>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ElectricityBills() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [billMonth, setBillMonth] = useState(String(new Date().getMonth() + 1));
  const [billYear, setBillYear] = useState(String(CURRENT_YEAR));
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderType, setReminderType] = useState<"email" | "sms">("email");
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [adminFilterUserId, setAdminFilterUserId] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'admin';

  const { data: adminUserList = [] } = trpc.adminUsers.list.useQuery(undefined, { enabled: !!isAdmin }) as { data: Array<{ id: number; name: string | null; email: string | null; careTier: string | null }> };
  const { data: bills = [], isLoading } = trpc.bills.list.useQuery({ userId: adminFilterUserId });

  const uploadMutation = trpc.bills.upload.useMutation({
    onSuccess: () => {
      utils.bills.list.invalidate();
      setShowUploadDialog(false);
      setPendingFile(null);
      setAmount("");
      setDueDate("");
      setNotes("");
      toast.success("Faktura uppladdad");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.bills.delete.useMutation({
    onSuccess: () => {
      utils.bills.list.invalidate();
      toast.success("Faktura borttagen");
    },
    onError: (e) => toast.error(e.message),
  });

  const reminderMutation = trpc.bills.setReminder.useMutation({
    onSuccess: () => {
      setShowReminderDialog(false);
      toast.success("Påminnelse inställd");
    },
    onError: (e) => toast.error(e.message),
  });

  const analyzeMutation = trpc.bills.analyze.useMutation({
    onSuccess: () => {
      utils.bills.list.invalidate();
      setAnalyzingId(null);
      toast.success("AI-analys klar");
    },
    onError: (e) => {
      setAnalyzingId(null);
      toast.error("Analys misslyckades: " + e.message);
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setPendingFile(file);
      setShowUploadDialog(true);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setShowUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      const res = await fetch("/api/bills/upload-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Uppladdning misslyckades");
      const { fileKey, fileUrl } = await res.json();
      await uploadMutation.mutateAsync({
        filename: pendingFile.name,
        fileKey,
        fileUrl,
        billMonth: parseInt(billMonth),
        billYear: parseInt(billYear),
        amount: amount ? parseFloat(amount) : undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });
    } catch (e: any) {
      toast.error(e.message || "Uppladdning misslyckades");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = (bill: Bill) => {
    setAnalyzingId(bill.id);
    analyzeMutation.mutate({ billId: bill.id });
  };

  const openReminder = (bill: Bill) => {
    setSelectedBill(bill);
    setReminderDate("");
    setReminderType("email");
    setShowReminderDialog(true);
  };

  const isPlus = user?.careTier === "plus" || user?.careTier === "platinum";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Elfakturor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'Administrera alla kunders elfakturor och AI-analyser.' : 'Ladda upp fakturor och låt AI analysera förbrukning, kostnader och besparingspotential.'}
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        >
          <Upload className="w-4 h-4 mr-2" />
          Ladda upp faktura
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Admin filter */}
      {isAdmin && adminUserList.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-foreground">Filtrera per kund:</span>
              </div>
              <Select
                value={adminFilterUserId ? String(adminFilterUserId) : 'all'}
                onValueChange={(v) => setAdminFilterUserId(v === 'all' ? undefined : Number(v))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Alla kunder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kunder</SelectItem>
                  {adminUserList.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.email || `Kund #${u.id}`} ({u.careTier || 'basic'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {adminFilterUserId && (
                <Button variant="ghost" size="sm" onClick={() => setAdminFilterUserId(undefined)}>
                  Visa alla
                </Button>
              )}
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 ml-auto">
                <Users className="w-3 h-3 mr-1" />
                {bills.length} fakturor
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-amber-400 bg-amber-500/10"
            : "border-border hover:border-amber-500/50 hover:bg-muted/30"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isDragging ? "bg-amber-500/20" : "bg-muted"
          }`}>
            <Zap className={`w-7 h-7 ${isDragging ? "text-amber-400" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {isDragging ? "Släpp filen här" : "Dra och släpp din elfaktura här"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">PDF, JPG eller PNG — max 10 MB</p>
          </div>
        </div>
      </div>

      {/* Bills list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Inga fakturor uppladdade</p>
            <p className="text-sm text-muted-foreground mt-1">Ladda upp din första elfaktura ovan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(bills as Bill[]).map((bill) => {
            const analysis = parseAnalysis(bill.analysisJson);
            const isAnalyzing = analyzingId === bill.id;

            return (
              <Card key={bill.id} className="border-border/50 hover:border-amber-500/30 transition-colors">
                <CardContent className="p-4">
                  {/* Bill row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{bill.filename}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {MONTHS[bill.billMonth - 1]} {bill.billYear}
                          </span>
                          {bill.amount && (
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                              {parseFloat(bill.amount).toLocaleString("sv-SE")} kr
                            </Badge>
                          )}
                          {bill.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Förfaller {new Date(bill.dueDate).toLocaleDateString("sv-SE")}
                            </span>
                          )}
                          {analysis && (
                            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                              <Brain className="w-3 h-3 mr-1" />
                              Analyserad
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* AI Analyze button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAnalyze(bill)}
                        disabled={isAnalyzing}
                        className={`text-xs gap-1.5 ${analysis ? "text-muted-foreground hover:text-amber-400" : "text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"}`}
                        title={analysis ? "Kör ny analys" : "AI-analysera faktura"}
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Brain className="w-3.5 h-3.5" />
                        )}
                        {isAnalyzing ? "Analyserar..." : analysis ? "Uppdatera" : "Analysera"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(bill.fileUrl, "_blank")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Visa faktura"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReminder(bill)}
                        className="text-muted-foreground hover:text-amber-400"
                        title="Ställ in påminnelse"
                      >
                        <Bell className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Ta bort faktura?")) deleteMutation.mutate({ id: bill.id });
                        }}
                        className="text-muted-foreground hover:text-red-400"
                        title="Ta bort"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* AI Analysis panel */}
                  {isAnalyzing && (
                    <div className="mt-3 border border-amber-500/20 rounded-xl bg-amber-500/5 px-4 py-3 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      <span className="text-sm text-amber-300">AI analyserar fakturan — detta tar 10–20 sekunder...</span>
                    </div>
                  )}
                  {!isAnalyzing && analysis && (
                    <AnalysisPanel analysis={analysis} billName={bill.filename} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ladda upp elfaktura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {pendingFile && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium truncate">{pendingFile.name}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Månad</Label>
                <Select value={billMonth} onValueChange={setBillMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>År</Label>
                <Select value={billYear} onValueChange={setBillYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Belopp (kr, valfritt)</Label>
              <Input
                type="number"
                placeholder="t.ex. 1250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Förfallodatum (valfritt)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Anteckningar (valfritt)</Label>
              <Textarea
                placeholder="Eventuella kommentarer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowUploadDialog(false)}>
                Avbryt
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                onClick={handleUpload}
                disabled={uploading || !pendingFile}
              >
                {uploading ? "Laddar upp..." : "Ladda upp"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ställ in påminnelse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedBill && (
              <p className="text-sm text-muted-foreground">
                Faktura: <span className="text-foreground font-medium">{MONTHS[selectedBill.billMonth - 1]} {selectedBill.billYear}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Påminnelsedatum</Label>
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={reminderType} onValueChange={(v) => setReminderType(v as "email" | "sms")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">E-post</SelectItem>
                  <SelectItem value="sms" disabled={!isPlus}>
                    SMS {!isPlus && "(kräver CARE Plus/Platinum)"}
                  </SelectItem>
                </SelectContent>
              </Select>
              {!isPlus && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  SMS-påminnelser ingår i CARE Plus och Platinum
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReminderDialog(false)}>
                Avbryt
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                disabled={!reminderDate || reminderMutation.isPending}
                onClick={() => {
                  if (!selectedBill || !reminderDate) return;
                  reminderMutation.mutate({
                    billId: selectedBill.id,
                    reminderDate,
                    reminderType,
                  });
                }}
              >
                {reminderMutation.isPending ? "Sparar..." : "Spara påminnelse"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
