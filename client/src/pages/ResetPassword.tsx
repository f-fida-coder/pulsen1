import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, KeyRound } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/logo_web_300px_02452a28.png";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  const passwordStrength = (): { label: string; color: string; pct: number } => {
    const p = password;
    if (!p) return { label: "", color: "#374151", pct: 0 };
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Svagt", color: "#EF4444", pct: 20 };
    if (score <= 2) return { label: "Godkänt", color: "#F59E0B", pct: 50 };
    if (score <= 3) return { label: "Bra", color: "#3B82F6", pct: 70 };
    return { label: "Starkt", color: "#10B981", pct: 100 };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (!token) {
      setError("Ogiltig återställningslänk. Begär en ny.");
      return;
    }
    resetMutation.mutate({ token, newPassword: password });
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md bg-[#111827] border-[#1F2937] shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2 pt-8">
          <img src={LOGO_URL} alt="Solpulsen" className="h-10 mx-auto mb-6 object-contain" />
          <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent mb-6" />

          {done ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h1 className="text-xl font-bold text-white">Lösenord uppdaterat</h1>
              <p className="text-sm text-muted-foreground">Ditt lösenord är nu ändrat. Du kan logga in.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <h1 className="text-xl font-bold text-white">Välj nytt lösenord</h1>
              </div>
              <p className="text-sm text-muted-foreground">Ange ditt nya lösenord nedan</p>
            </>
          )}
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {done ? (
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11 mt-4"
            >
              Logga in →
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground text-sm font-medium">
                  Nytt lösenord
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minst 8 tecken"
                    className="bg-[#0D1117] border-[#374151] text-white placeholder:text-muted-foreground h-11 pr-10 focus:border-amber-500 focus:ring-amber-500/20"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground text-sm font-medium">
                  Bekräfta lösenord
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Upprepa lösenordet"
                    className="bg-[#0D1117] border-[#374151] text-white placeholder:text-muted-foreground h-11 pr-10 focus:border-amber-500 focus:ring-amber-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <div className="flex items-center gap-1.5 text-red-400 text-xs">
                    <XCircle className="w-3.5 h-3.5" />
                    Lösenorden matchar inte
                  </div>
                )}
                {confirmPassword && password === confirmPassword && password.length >= 8 && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Lösenorden matchar
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={resetMutation.isPending || !token}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11 mt-2"
              >
                {resetMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sparar...
                  </span>
                ) : (
                  "Spara nytt lösenord →"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-amber-600 hover:text-amber-500 underline"
                >
                  Tillbaka till inloggning
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
