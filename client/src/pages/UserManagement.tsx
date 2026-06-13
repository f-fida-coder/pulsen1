import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, RefreshCw, Power, Key, Users, CheckCircle2, Clock, XCircle } from "lucide-react";

type CareTier = "basic" | "plus" | "platinum";

const TIER_COLORS: Record<CareTier, string> = {
  basic: "bg-slate-700 text-foreground",
  plus: "bg-blue-900 text-blue-200",
  platinum: "bg-amber-900 text-amber-200",
};

const INV_STATUS_ICON = {
  pending: <Clock className="h-3.5 w-3.5 text-yellow-400" />,
  accepted: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
  expired: <XCircle className="h-3.5 w-3.5 text-red-400" />,
};

export default function UserManagement() {
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", careTier: "basic" as CareTier });

  const invitationsQuery = trpc.invitations.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const usersQuery = trpc.adminUsers.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const utils = trpc.useUtils();

  const sendInvite = trpc.invitations.send.useMutation({
    onSuccess: (data) => {
      toast.success(`Inbjudan skickad${data.smsSent ? " via SMS" : " (SMS misslyckades)"}`);
      setInviteOpen(false);
      setForm({ name: "", email: "", phone: "", careTier: "basic" });
      utils.invitations.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resendInvite = trpc.invitations.resend.useMutation({
    onSuccess: (data) => {
      toast.success(data.smsSent ? "Ny inbjudan skickad via SMS" : "Inbjudan uppdaterad (SMS misslyckades)");
      utils.invitations.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setActive = trpc.adminUsers.setActive.useMutation({
    onSuccess: () => { toast.success("Kontostatus uppdaterad"); utils.adminUsers.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const resetPassword = trpc.adminUsers.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(`Nytt lösenord: ${data.newPassword} (skickat via SMS om telefon finns)`);
      utils.adminUsers.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Åtkomst nekad — endast administratörer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-400" />
            Användarhantering
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Bjud in kunder och hantera konton</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-400 text-white gap-2">
              <UserPlus className="h-4 w-4" />
              Bjud in kund
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Bjud in ny kund</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendInvite.mutate({ ...form, origin: window.location.origin });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Namn</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Anna Svensson"
                  required
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">E-postadress</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="anna@foretag.se"
                  required
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Mobilnummer</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0701234567"
                  required
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">CARE-nivå</Label>
                <Select value={form.careTier} onValueChange={(v) => setForm(f => ({ ...f, careTier: v as CareTier }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="plus">Plus</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={sendInvite.isPending}
                className="w-full bg-amber-500 hover:bg-amber-400 text-white"
              >
                {sendInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Skicka inbjudan via SMS
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invitations table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-foreground">Inbjudningar</h2>
        </div>
        {invitationsQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>
        ) : (invitationsQuery.data?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Inga inbjudningar ännu</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-slate-700/50">
                <th className="text-left px-5 py-3">Namn</th>
                <th className="text-left px-5 py-3">E-post</th>
                <th className="text-left px-5 py-3">Telefon</th>
                <th className="text-left px-5 py-3">CARE</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">SMS</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invitationsQuery.data?.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{inv.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{inv.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{inv.phone ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[inv.careTier as CareTier] ?? "bg-slate-700 text-foreground"}`}>
                      {inv.careTier}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {INV_STATUS_ICON[inv.status as keyof typeof INV_STATUS_ICON]}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{inv.smsSent ? "Skickat" : "Ej skickat"}</td>
                  <td className="px-5 py-3">
                    {inv.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resendInvite.mutate({ id: inv.id, origin: window.location.origin })}
                        disabled={resendInvite.isPending}
                        className="text-amber-400 hover:text-amber-300 hover:bg-slate-700 gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Skicka om
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Users table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-foreground">Registrerade användare</h2>
        </div>
        {usersQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>
        ) : (usersQuery.data?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Inga användare ännu</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-slate-700/50">
                <th className="text-left px-5 py-3">Namn</th>
                <th className="text-left px-5 py-3">E-post</th>
                <th className="text-left px-5 py-3">Roll</th>
                <th className="text-left px-5 py-3">CARE</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.map((u) => (
                <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[(u.careTier ?? "basic") as CareTier]}`}>
                      {u.careTier ?? "basic"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${u.isActive ? "text-green-400" : "text-red-400"}`}>
                      {u.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActive.mutate({ userId: u.id, isActive: !u.isActive })}
                        disabled={setActive.isPending}
                        className={`gap-1 text-xs ${u.isActive ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"} hover:bg-slate-700`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {u.isActive ? "Inaktivera" : "Aktivera"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Återställ lösenord för ${u.name}?`)) {
                            resetPassword.mutate({ userId: u.id });
                          }
                        }}
                        disabled={resetPassword.isPending}
                        className="gap-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-700"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Återställ lösen
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
