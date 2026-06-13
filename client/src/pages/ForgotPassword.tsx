import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/logo_web_300px_02452a28.png";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    forgotMutation.mutate({ email, origin: window.location.origin });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md bg-[#111827] border-[#1F2937] shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2 pt-8">
          <img src={LOGO_URL} alt="Solpulsen" className="h-10 mx-auto mb-6 object-contain" />
          <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent mb-6" />

          {sent ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h1 className="text-xl font-bold text-white">Mail skickat</h1>
              <p className="text-sm text-muted-foreground max-w-xs">
                Om e-postadressen finns i systemet har vi skickat ett återställningsmail.
                Kontrollera din inkorg (och skräppost).
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-amber-500" />
                <h1 className="text-xl font-bold text-white">Glömt lösenordet?</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Ange din e-postadress så skickar vi en återställningslänk
              </p>
            </>
          )}
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {sent ? (
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11 mt-4"
            >
              Tillbaka till inloggning
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground text-sm font-medium">
                  E-postadress
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.se"
                  className="bg-[#0D1117] border-[#374151] text-white placeholder:text-muted-foreground h-11 focus:border-amber-500 focus:ring-amber-500/20"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={forgotMutation.isPending || !email}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11"
              >
                {forgotMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Skickar...
                  </span>
                ) : (
                  "Skicka återställningslänk →"
                )}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-1.5 text-muted-foreground hover:text-muted-foreground text-sm transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Tillbaka till inloggning
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
