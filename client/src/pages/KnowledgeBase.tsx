import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import TiptapEditor from "@/components/TiptapEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen, Search, Plus, Edit2, Trash2, Eye, EyeOff,
  ChevronRight, ArrowLeft, Tag, Calendar, Loader2, Zap,
  Shield, Smartphone, Cpu, Newspaper, HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "products" | "regulations" | "apps_services" | "technology" | "news" | "other";

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  category: Category;
  tags?: string | null;
  imageUrl?: string | null;
  published: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: Record<Category | "all", { label: string; icon: React.ElementType; color: string; bg: string }> = {
  all:           { label: "Alla",           icon: BookOpen,   color: "text-muted-foreground",   bg: "bg-secondary" },
  products:      { label: "Produkter",      icon: Zap,        color: "text-amber-600",   bg: "bg-amber-500/10" },
  regulations:   { label: "Lagar & regler", icon: Shield,     color: "text-blue-600",    bg: "bg-blue-500/10" },
  apps_services: { label: "Appar & tjänster", icon: Smartphone, color: "text-violet-600", bg: "bg-violet-500/10" },
  technology:    { label: "Teknik",         icon: Cpu,        color: "text-emerald-600", bg: "bg-emerald-500/10" },
  news:          { label: "Nyheter",        icon: Newspaper,  color: "text-rose-600",    bg: "bg-rose-500/10" },
  other:         { label: "Övrigt",         icon: HelpCircle, color: "text-muted-foreground",   bg: "bg-secondary" },
};

// ─── Slug generator ───────────────────────────────────────────────────────────
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({
  article, isAdmin, onOpen, onEdit, onTogglePublish, onDelete,
}: {
  article: Article;
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORIES[article.category] ?? CATEGORIES.other;
  const CatIcon = cat.icon;
  const tags = article.tags ? article.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={`border shadow-sm hover:shadow-md transition-all cursor-pointer group ${!article.published ? "opacity-60 border-dashed" : "border-border"}`}
        onClick={onOpen}
      >
        {article.imageUrl && (
          <div className="h-36 overflow-hidden rounded-t-xl">
            <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${cat.bg} ${cat.color}`}>
              <CatIcon className="h-3 w-3" />{cat.label}
            </div>
            {isAdmin && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit} title="Redigera">
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onTogglePublish} title={article.published ? "Avpublicera" : "Publicera"}>
                  {article.published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3 text-emerald-600" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={onDelete} title="Radera">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <h3 className="font-semibold text-foreground text-sm leading-snug mb-1 line-clamp-2">{article.title}</h3>
          {article.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{article.excerpt}</p>}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.slice(0, 3).map(t => (
                <span key={t} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>
              ))}
              {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("sv-SE")
                : new Date(article.createdAt).toLocaleDateString("sv-SE")}
            </span>
            {!article.published && <span className="text-[10px] text-amber-600 font-medium">Utkast</span>}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Article View ─────────────────────────────────────────────────────────────

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  const cat = CATEGORIES[article.category] ?? CATEGORIES.other;
  const CatIcon = cat.icon;
  const tags = article.tags ? article.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground -ml-1">
        <ArrowLeft className="h-4 w-4" />Tillbaka
      </Button>

      {article.imageUrl && (
        <div className="h-56 overflow-hidden rounded-xl mb-6">
          <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cat.bg} ${cat.color}`}>
          <CatIcon className="h-3 w-3" />{cat.label}
        </div>
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
            <Tag className="h-2.5 w-2.5" />{t}
          </span>
        ))}
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">{article.title}</h1>

      {article.excerpt && (
        <p className="text-base text-muted-foreground mb-4 leading-relaxed border-l-4 border-emerald-400 pl-4 italic">{article.excerpt}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Calendar className="h-3 w-3" />
        {article.publishedAt
          ? `Publicerad ${new Date(article.publishedAt).toLocaleDateString("sv-SE")}`
          : `Skapad ${new Date(article.createdAt).toLocaleDateString("sv-SE")}`}
      </div>

      {/* Content rendered as HTML from Tiptap editor */}
      <div
        className="prose prose-slate max-w-none text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </motion.div>
  );
}

// ─── Article Editor Dialog ────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "", slug: "", excerpt: "", content: "",
  category: "other" as Category, tags: "", imageUrl: "", published: false,
};

function ArticleEditorDialog({
  open, onClose, editArticle,
}: {
  open: boolean;
  onClose: () => void;
  editArticle: Article | null;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState(EMPTY_FORM);

  // Sync form when editArticle changes
  useState(() => {
    if (editArticle) {
      setForm({
        title: editArticle.title,
        slug: editArticle.slug,
        excerpt: editArticle.excerpt ?? "",
        content: editArticle.content,
        category: editArticle.category,
        tags: editArticle.tags ?? "",
        imageUrl: editArticle.imageUrl ?? "",
        published: editArticle.published,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  });

  const createMutation = trpc.knowledge.create.useMutation({
    onSuccess: () => { utils.knowledge.list.invalidate(); toast.success("Artikel skapad"); onClose(); },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const updateMutation = trpc.knowledge.update.useMutation({
    onSuccess: () => { utils.knowledge.list.invalidate(); toast.success("Artikel uppdaterad"); onClose(); },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const isEditing = !!editArticle;
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleTitleChange(title: string) {
    setForm(f => ({ ...f, title, slug: isEditing ? f.slug : toSlug(title) }));
  }

  function handleSubmit() {
    if (!form.title.trim()) { toast.error("Titel krävs"); return; }
    if (!form.content.trim()) { toast.error("Innehåll krävs"); return; }
    if (!form.slug.trim()) { toast.error("Slug krävs"); return; }

    if (isEditing) {
      updateMutation.mutate({ id: editArticle!.id, ...form, imageUrl: form.imageUrl || undefined });
    } else {
      createMutation.mutate({ ...form, imageUrl: form.imageUrl || undefined });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEditing ? "Redigera artikel" : "Ny artikel"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-medium text-foreground">Titel *</Label>
            <Input className="mt-1.5" placeholder="Artikelns titel" value={form.title} onChange={e => handleTitleChange(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-medium text-foreground">Slug (URL-del) *</Label>
            <Input className="mt-1.5 font-mono text-xs" placeholder="min-artikel-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-foreground">Kategori</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as Category }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORIES) as [string, any][]).filter(([k]) => k !== "all").map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-foreground">Taggar (kommaseparerade)</Label>
              <Input className="mt-1.5" placeholder="batteri, sol, lagstiftning" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-foreground">Ingress (kort sammanfattning)</Label>
            <Input className="mt-1.5" placeholder="En kort beskrivning som visas i kortlistan..." value={form.excerpt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, excerpt: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs font-medium text-foreground mb-1.5 block">Innehåll *</Label>
            <TiptapEditor
              value={form.content}
              onChange={(html) => setForm(f => ({ ...f, content: html }))}
              placeholder="Skriv artikelns fullständiga innehåll här..."
              minHeight={280}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-foreground">Bild-URL (valfri)</Label>
            <Input className="mt-1.5" placeholder="https://..." value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="h-4 w-4 rounded border-border" />
            <Label htmlFor="published" className="text-xs font-medium text-foreground cursor-pointer">Publicera direkt</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Avbryt</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="text-sm bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? "Spara ändringar" : "Skapa artikel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KnowledgeBase() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<Article | null>(null);

  const utils = trpc.useUtils();

  const { data: articles = [], isLoading } = trpc.knowledge.list.useQuery({
    category: activeCategory !== "all" ? activeCategory : undefined,
    adminAll: isAdmin,
    limit: 100,
  }, { staleTime: 30000 });

  const publishMutation = trpc.knowledge.publish.useMutation({
    onSuccess: () => { utils.knowledge.list.invalidate(); toast.success("Status uppdaterad"); },
  });

  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => { utils.knowledge.list.invalidate(); toast.success("Artikel raderad"); },
  });

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return articles as Article[];
    const q = search.toLowerCase();
    return (articles as Article[]).filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.excerpt ?? "").toLowerCase().includes(q) ||
      (a.tags ?? "").toLowerCase().includes(q)
    );
  }, [articles, search]);

  function openEditor(article?: Article) {
    setEditArticle(article ?? null);
    setEditorOpen(true);
  }

  function handleDelete(article: Article) {
    if (!confirm(`Radera "${article.title}"?`)) return;
    deleteMutation.mutate({ id: article.id });
  }

  if (selectedArticle) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <ArticleView
            key={selectedArticle.id}
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
          />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kunskapsbas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Produktguider, lagar, appar och nyheter från SolPulsen</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => openEditor()} className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0">
            <Plus className="h-3.5 w-3.5" />Ny artikel
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 bg-card border-border"
          placeholder="Sök artiklar, taggar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(CATEGORIES) as [string, any][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const active = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-card text-muted-foreground border-border hover:border-border"
              }`}
            >
              <Icon className="h-3 w-3" />{cfg.label}
            </button>
          );
        })}
      </div>

      {/* Article grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse border border-border">
              <div className="h-36 bg-secondary rounded-t-xl" />
              <CardContent className="p-4 space-y-2">
                <div className="h-3 bg-secondary rounded w-1/3" />
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-3 bg-secondary rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-10 w-10 text-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">
              {search ? "Inga artiklar matchar sökningen" : "Inga artiklar publicerade ännu"}
            </p>
            {isAdmin && !search && (
              <Button size="sm" onClick={() => openEditor()} className="mt-3 gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
                <Plus className="h-3.5 w-3.5" />Skapa första artikeln
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                isAdmin={isAdmin}
                onOpen={() => setSelectedArticle(article)}
                onEdit={() => openEditor(article)}
                onTogglePublish={() => publishMutation.mutate({ id: article.id, publish: !article.published })}
                onDelete={() => handleDelete(article)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Stats bar */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} artikel{filtered.length !== 1 ? "ar" : ""}
          {isAdmin && ` · ${(articles as Article[]).filter(a => !a.published).length} utkast`}
        </p>
      )}

      {/* Editor dialog */}
      <ArticleEditorDialog
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditArticle(null); }}
        editArticle={editArticle}
      />
    </div>
  );
}
