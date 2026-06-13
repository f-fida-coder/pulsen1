import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Shield, Lock, Phone, Mail, Star, Zap, Crown } from "lucide-react";

const CARE_TIERS = {
  basic: {
    label: "CARE Basic",
    color: "text-muted-foreground",
    bg: "bg-slate-500/10 border-slate-500/20",
    icon: Shield,
    description: "Grundläggande support med 72h SLA",
    features: ["E-postsupport", "Portaltillgång", "Grundläggande ROI-rapport"],
  },
  plus: {
    label: "CARE Plus",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: Star,
    description: "Utökad support med 24h SLA",
    features: ["Prioriterad e-postsupport", "SMS-påminnelser", "Fullständig ROI-analys", "AI-optimering"],
  },
  platinum: {
    label: "CARE Platinum",
    color: "text-yellow-300",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: Crown,
    description: "Premium support med 4h SLA",
    features: ["Dedikerad kontaktperson", "SMS + e-postpåminnelser", "Avancerad AI-styrning", "Månadsrapporter", "Garantibevakning"],
  },
};

export default function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState((user as any)?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil uppdaterad");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Lösenord ändrat");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tier = (user as any)?.careTier ?? "basic";
  const tierInfo = CARE_TIERS[tier as keyof typeof CARE_TIERS] ?? CARE_TIERS.basic;
  const TierIcon = tierInfo.icon;

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ name: name.trim(), phone: phone.trim() });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Lösenorden matchar inte");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Lösenordet måste vara minst 8 tecken");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Min profil</h1>
        <p className="text-muted-foreground text-sm mt-1">Hantera dina kontaktuppgifter och säkerhetsinställningar</p>
      </div>

      {/* CARE Tier Card */}
      <Card className={`border ${tierInfo.bg}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tierInfo.bg}`}>
              <TierIcon className={`w-6 h-6 ${tierInfo.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold text-lg ${tierInfo.color}`}>{tierInfo.label}</span>
                <Badge variant="outline" className={`text-xs ${tierInfo.color} border-current`}>Aktiv</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{tierInfo.description}</p>
              <div className="flex flex-wrap gap-2">
                {tierInfo.features.map((f) => (
                  <span key={f} className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-md">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            Kontaktuppgifter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Namn</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt namn"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              E-post
            </Label>
            <Input
              value={user?.email ?? ""}
              disabled
              className="opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">E-post kan inte ändras. Kontakta care@solpulsen.se.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Telefon
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+46 70 000 00 00"
              type="tel"
            />
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            {updateProfileMutation.isPending ? "Sparar..." : "Spara ändringar"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            Ändra lösenord
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nuvarande lösenord</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Nytt lösenord</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minst 8 tecken"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bekräfta nytt lösenord</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Upprepa lösenordet"
            />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400">Lösenorden matchar inte</p>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
            variant="outline"
            className="border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10"
          >
            {changePasswordMutation.isPending ? "Ändrar..." : "Ändra lösenord"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
