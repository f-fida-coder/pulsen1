import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Download, Shield, BookOpen, BarChart3, FileCheck,
  Search, ExternalLink, Clock, Star, ChevronRight, Upload,
  Users, Trash2, Plus, X, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ─── Static public documents (CDN-hosted) ─────────────────────────────────────
interface StaticDoc {
  id: string;
  title: string;
  description: string;
  category: "care" | "garanti" | "rapport" | "avtal" | "guide";
  url: string;
  fileSize: string;
  updatedAt: string;
  featured?: boolean;
}

const STATIC_DOCS: StaticDoc[] = [
  {
    id: "care-premium",
    title: "SolPulsen CARE Premium Guide",
    description: "Komplett guide till CARE Premium-programmet. Täcker alla tre nivåer (Basic, Plus, Platinum), vad som ingår, priser och hur du aktiverar din CARE-portal.",
    category: "care",
    url: "https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/SolPulsen_CARE_Premium_v3_fa509c52.pdf",
    fileSize: "5.0 MB",
    updatedAt: "2026",
    featured: true,
  },
  {
    id: "garantivillkor",
    title: "Garantivillkor — Batterisystem",
    description: "Fullständiga garantivillkor för Solpulsen batterisystem. 10-årig garanti, LiFePO4-teknik, täckning, undantag och hur du aktiverar ett garantiärende.",
    category: "garanti",
    url: "https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/garantivillkor_Solpulsencare_a4b8a42c.pdf",
    fileSize: "157 KB",
    updatedAt: "2026",
  },
];

const CATEGORY_CONFIG = {
  care:    { label: "CARE",    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",   icon: Star },
  garanti: { label: "Garanti", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: Shield },
  rapport: { label: "Rapport", color: "bg-blue-500/20 text-blue-400 border-blue-500/30",     icon: BarChart3 },
  avtal:   { label: "Avtal",   color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: FileCheck },
  guide:   { label: "Guide",   color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",     icon: BookOpen },
  contract:             { label: "Avtal",        color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: FileCheck },
  warranty:             { label: "Garanti",      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: Shield },
  invoice:              { label: "Faktura",      color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: FileText },
  service_report:       { label: "Servicerapport", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: BarChart3 },
  installation_report:  { label: "Installationsrapport", color: "bg-teal-500/20 text-teal-400 border-teal-500/30", icon: FileCheck },
  certificate:          { label: "Certifikat",  color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Star },
  other:                { label: "Övrigt",       color: "bg-slate-500/20 text-muted-foreground border-slate-500/30", icon: FileText },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Static Document Card ─────────────────────────────────────────────────────
function StaticDocCard({ doc }: { doc: StaticDoc }) {
  const [downloading, setDownloading] = useState(false);
  const cat = CATEGORY_CONFIG[doc.category];
  const CatIcon = cat.icon;

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement("a");
    link.href = doc.url;
    link.download = doc.title + ".pdf";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <Card className={`relative flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5 ${doc.featured ? "border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-slate-900" : "border-slate-700/50 bg-slate-900"}`} style={{backgroundColor: '#424242'}}>
      {doc.featured && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-medium">
            <Star className="w-3 h-3 mr-1" />Populärast
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg border ${cat.color} flex-shrink-0`}><CatIcon className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0 pr-16">
            <Badge variant="outline" className={`text-xs border ${cat.color} mb-1`}>{cat.label}</Badge>
            <CardTitle className="text-base text-foreground leading-snug">{doc.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        <CardDescription className="text-muted-foreground text-sm leading-relaxed flex-1">{doc.description}</CardDescription>
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-slate-700/50 pt-3">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />PDF</span>
            <span>{doc.fileSize}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doc.updatedAt}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-amber-500 hover:bg-amber-400 text-foreground font-semibold" onClick={handleDownload} disabled={downloading}>
            {downloading ? <><Download className="w-4 h-4 mr-2 animate-bounce" />Laddar ner...</> : <><Download className="w-4 h-4 mr-2" />Ladda ner PDF</>}
          </Button>
          <Button variant="outline" size="icon" className="border-slate-600 text-muted-foreground hover:text-foreground bg-transparent" onClick={() => window.open(doc.url, "_blank")}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Customer Document Card ───────────────────────────────────────────────────
function CustomerDocCard({ doc, isAdmin, onDelete }: { doc: any; isAdmin: boolean; onDelete: (id: number) => void }) {
  const catKey = doc.docType as keyof typeof CATEGORY_CONFIG;
  const cat = CATEGORY_CONFIG[catKey] ?? CATEGORY_CONFIG.other;
  const CatIcon = cat.icon;

  return (
    <Card className="flex flex-col border-slate-700/50 bg-slate-900 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg border ${cat.color} flex-shrink-0`}><CatIcon className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <Badge variant="outline" className={`text-xs border ${cat.color} mb-1`}>{cat.label}</Badge>
            <CardTitle className="text-base text-foreground leading-snug truncate">{doc.filename}</CardTitle>
            {doc.description && <CardDescription className="text-muted-foreground text-xs mt-1">{doc.description}</CardDescription>}
          </div>
          {isAdmin && (
            <button onClick={() => onDelete(doc.id)} className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-slate-700/50 pt-3">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />PDF</span>
            {doc.fileSizeBytes > 0 && <span>{formatBytes(doc.fileSizeBytes)}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(doc.createdAt).toLocaleDateString("sv-SE")}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold" onClick={() => { const a = document.createElement("a"); a.href = doc.fileUrl; a.download = doc.filename; a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}>
            <Download className="w-4 h-4 mr-2" />Ladda ner
          </Button>
          <Button variant="outline" size="icon" className="border-slate-600 text-muted-foreground hover:text-foreground bg-transparent" onClick={() => window.open(doc.fileUrl, "_blank")}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Admin Upload Panel ───────────────────────────────────────────────────────
function AdminUploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "saving" | "done" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ targetUserId: "", docType: "contract", description: "", filename: "" });
  const [selectedFileName, setSelectedFileName] = useState("");

  const usersQuery = trpc.documents.listUsers.useQuery(undefined, { enabled: open });

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      setUploadProgress("done");
      toast.success("Dokument uppladdat och sparat");
      setTimeout(() => { setOpen(false); setUploadProgress("idle"); setForm({ targetUserId: "", docType: "contract", description: "", filename: "" }); setSelectedFileName(""); if (fileRef.current) fileRef.current.value = ""; onUploaded(); }, 1200);
    },
    onError: (e) => { setUploadProgress("error"); toast.error("Uppladdning misslyckades: " + e.message); },
  });

  const handleSubmit = async () => {
    if (!fileRef.current?.files?.[0]) { toast.error("Välj en fil"); return; }
    if (!form.targetUserId) { toast.error("Välj kund"); return; }
    const file = fileRef.current.files[0];
    if (file.type !== "application/pdf") { toast.error("Endast PDF-filer stöds"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Filen är för stor (max 50 MB)"); return; }

    setUploading(true);
    setUploadProgress("uploading");

    try {
      // Upload file to S3 via server proxy
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetUserId", form.targetUserId);

      const res = await fetch("/api/upload-document", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed: " + res.statusText);
      const { fileKey, fileUrl } = await res.json();

      setUploadProgress("saving");
      await uploadMutation.mutateAsync({
        targetUserId: parseInt(form.targetUserId),
        filename: form.filename || file.name,
        fileKey,
        fileUrl,
        docType: form.docType as any,
        description: form.description || undefined,
        fileSizeBytes: file.size,
      });
    } catch (e: any) {
      setUploadProgress("error");
      toast.error("Fel: " + (e.message || "Okänt fel"));
    } finally {
      setUploading(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-500 text-white font-semibold">
        <Plus className="w-4 h-4 mr-2" />Ladda upp kundavtal
      </Button>
    );
  }

  return (
    <Card className="border-teal-500/40 bg-gradient-to-br from-teal-950/20 to-slate-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-400" />Ladda upp dokument för kund
          </CardTitle>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm">Kund *</Label>
            <Select value={form.targetUserId} onValueChange={(v) => setForm(f => ({ ...f, targetUserId: v }))}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-foreground">
                <SelectValue placeholder={usersQuery.isLoading ? "Laddar kunder..." : "Välj kund"} />
              </SelectTrigger>
              <SelectContent>
                {(usersQuery.data ?? []).map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    <span className="font-medium">{u.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {usersQuery.data?.length === 0 && <p className="text-xs text-muted-foreground">Inga kunder hittades</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm">Dokumenttyp *</Label>
            <Select value={form.docType} onValueChange={(v) => setForm(f => ({ ...f, docType: v }))}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Avtal / Kontrakt</SelectItem>
                <SelectItem value="warranty">Garantibevis</SelectItem>
                <SelectItem value="invoice">Faktura</SelectItem>
                <SelectItem value="service_report">Servicerapport</SelectItem>
                <SelectItem value="installation_report">Installationsrapport</SelectItem>
                <SelectItem value="certificate">Certifikat</SelectItem>
                <SelectItem value="other">Övrigt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-sm">Filnamn (valfritt)</Label>
          <Input
            placeholder="Lämna tomt för att använda originalfilnamnet"
            value={form.filename}
            onChange={(e) => setForm(f => ({ ...f, filename: e.target.value }))}
            className="bg-slate-800/50 border-slate-600 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-sm">Beskrivning (valfritt)</Label>
          <Textarea
            placeholder="T.ex. 'Installationsavtal 2026-04-11, system 10 kWp + 10 kWh batteri'"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            className="bg-slate-800/50 border-slate-600 text-foreground placeholder:text-muted-foreground resize-none"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-sm">PDF-fil *</Label>
          <div
            className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-teal-500/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Klicka för att välja PDF-fil</p>
            <p className="text-xs text-muted-foreground mt-1">Max 50 MB · Endast PDF</p>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelectedFileName(f.name); if (!form.filename) setForm(prev => ({ ...prev, filename: f.name })); } }} />
          </div>
          {selectedFileName && (
            <p className="text-xs text-teal-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{selectedFileName}{fileRef.current?.files?.[0] ? ` (${formatBytes(fileRef.current.files[0].size)})` : ""}</p>
          )}
        </div>

        {uploadProgress === "error" && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Uppladdning misslyckades. Kontrollera att filen är en giltig PDF och försök igen.</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold"
            onClick={handleSubmit}
            disabled={uploading || uploadProgress === "done"}
          >
            {uploadProgress === "uploading" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Laddar upp fil...</>}
            {uploadProgress === "saving" && <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar i databas...</>}
            {uploadProgress === "done" && <><CheckCircle2 className="w-4 h-4 mr-2" />Klart!</>}
            {(uploadProgress === "idle" || uploadProgress === "error") && <><Upload className="w-4 h-4 mr-2" />Ladda upp</>}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-muted-foreground bg-transparent">Avbryt</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main DocumentCenter ──────────────────────────────────────────────────────
export default function DocumentCenter() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const myDocsQuery = trpc.documents.listMine.useQuery(undefined, { enabled: !!user });
  const allDocsQuery = trpc.documents.listAll.useQuery(undefined, { enabled: isAdmin });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => { toast.success("Dokument borttaget"); setRefreshKey(k => k + 1); myDocsQuery.refetch(); if (isAdmin) allDocsQuery.refetch(); },
    onError: (e) => toast.error("Kunde inte ta bort: " + e.message),
  });

  const customerDocs = isAdmin ? (allDocsQuery.data ?? []) : (myDocsQuery.data ?? []);

  const categories = [
    { id: "all", label: "Alla dokument" },
    { id: "care", label: "CARE" },
    { id: "garanti", label: "Garanti" },
    { id: "avtal", label: "Avtal" },
    { id: "rapport", label: "Rapporter" },
  ];

  const filteredStatic = STATIC_DOCS.filter((doc) => {
    const matchSearch = search === "" || doc.title.toLowerCase().includes(search.toLowerCase()) || doc.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || doc.category === activeCategory;
    return matchSearch && matchCat;
  });

  const filteredCustomer = customerDocs.filter((doc: any) => {
    const matchSearch = search === "" || doc.filename.toLowerCase().includes(search.toLowerCase()) || (doc.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || doc.docType === activeCategory || (activeCategory === "garanti" && doc.docType === "warranty") || (activeCategory === "avtal" && doc.docType === "contract") || (activeCategory === "rapport" && (doc.docType === "service_report" || doc.docType === "installation_report"));
    return matchSearch && matchCat;
  });

  const totalCount = STATIC_DOCS.length + customerDocs.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dokumentcenter</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin ? "Alla kundavtal, garantibevis, rapporter och CARE-dokument" : "Dina avtal, garantibevis och CARE-dokument"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>{totalCount} dokument</span>
          </div>
          {isAdmin && <AdminUploadPanel onUploaded={() => { myDocsQuery.refetch(); allDocsQuery.refetch(); }} />}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sök dokument..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700 text-foreground placeholder:text-muted-foreground focus:border-amber-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${activeCategory === cat.id ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "text-muted-foreground border-slate-700/50 hover:text-foreground hover:border-slate-500"}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access */}
      <Card className="border-slate-700/50 bg-slate-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />Snabbåtkomst
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STATIC_DOCS.map((doc) => {
              const cat = CATEGORY_CONFIG[doc.category];
              const CatIcon = cat.icon;
              return (
                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group">
                  <div className={`p-2 rounded-md border ${cat.color} flex-shrink-0`}><CatIcon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">{doc.fileSize} · PDF</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customer Documents Section */}
      {(customerDocs.length > 0 || isAdmin) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-muted-foreground">
              {isAdmin ? `Kundspecifika dokument (${customerDocs.length})` : `Dina dokument (${customerDocs.length})`}
            </h2>
          </div>
          {(myDocsQuery.isLoading || allDocsQuery.isLoading) ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" />Laddar dokument...</div>
          ) : filteredCustomer.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-slate-700/50 rounded-lg">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{isAdmin ? "Inga kundspecifika dokument uppladdade ännu" : "Inga dokument tillgängliga"}</p>
              {isAdmin && <p className="text-xs mt-1 text-muted-foreground">Klicka på "Ladda upp kundavtal" för att lägga till</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomer.map((doc: any) => (
                <CustomerDocCard
                  key={doc.id}
                  doc={doc}
                  isAdmin={isAdmin}
                  onDelete={(id) => deleteMutation.mutate({ id })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Static Documents Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-muted-foreground">CARE-dokument & Guider</h2>
        </div>
        {filteredStatic.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Inga dokument matchar sökningen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStatic.map((doc) => <StaticDocCard key={doc.id} doc={doc} />)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-2 border-t border-slate-800">
        SolPulsen Energy Norden AB · CARE Department · care@solpulsen.se ·{" "}
        <a href="https://www.solpulsen.se" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground">www.solpulsen.se</a>
      </div>
    </div>
  );
}
