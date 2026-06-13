import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

const CARE_LOGO = "https://d27fp2dlv8ro8k.cloudfront.net/o_1jbhqmcjr1a1d1iqk1u5u1p6l1ld3a.webp";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      if (data.user.mustChangePassword) {
        navigate("/settings?changePassword=1");
      } else {
        navigate("/");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Inloggning misslyckades");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    // Local demo bypass — sign in as admin without a backend/DB.
    if (email.trim().toLowerCase() === "admin" && password === "admin123") {
      localStorage.setItem("fake-admin", "1");
      window.location.href = "/dashboard";
      return;
    }
    loginMutation.mutate({ email, password, rememberMe });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(900px 500px at 50% 0%, rgba(47,211,165,0.10), transparent 60%), #05090A" }}>
      <div className="w-full max-w-md">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <img
            src={CARE_LOGO}
            alt="SolPulsen CARE"
            className="h-20 mx-auto mb-4"
          />
          <p className="text-sm" style={{ color: "#8499A0" }}>
            Energiövervakning, optimering och support
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: "#0A1411", border: "1px solid #19302A", boxShadow: "0 0 60px rgba(47,211,165,0.08), 0 24px 60px rgba(0,0,0,0.5)" }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: "#F4F8F6", fontFamily: "'Playfair Display', serif" }}>
            Logga in
          </h2>
          <p className="text-sm mb-6" style={{ color: "#8499A0" }}>
            Ange dina uppgifter för att komma åt CARE-portalen
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#F4F8F6" }}>
                E-postadress
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="namn@foretag.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="h-11"
                style={{
                  background: "#0E1A16",
                  border: "1px solid #19302A",
                  color: "#F4F8F6",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#F4F8F6" }}>
                Lösenord
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-10"
                  style={{
                    background: "#0E1A16",
                    border: "1px solid #19302A",
                    color: "#F4F8F6",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#8499A0" }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(Boolean(v))}
                style={{ borderColor: "#19302A" }}
              />
              <Label htmlFor="rememberMe" className="text-sm cursor-pointer" style={{ color: "#8499A0" }}>
                Håll mig inloggad i 30 dagar
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending || !email || !password}
              className="w-full h-11 font-semibold transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #2FD3A5, #23B68C)",
                color: "#04130E",
                boxShadow: "0 8px 24px rgba(47,211,165,0.30)",
              }}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loggar in...
                </>
              ) : (
                "Logga in"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 text-center space-y-2" style={{ borderTop: "1px solid #19302A" }}>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm underline underline-offset-2 transition-colors"
              style={{ color: "#2FD3A5" }}
            >
              Glömt lösenordet?
            </button>
            <p className="text-xs" style={{ color: "#8499A0" }}>
              Har du inget konto? Kontakta din SolPulsen-administratör.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <button
            type="button"
            onClick={() => navigate("/care-public")}
            className="text-sm underline underline-offset-2 transition-colors"
            style={{ color: "#2FD3A5" }}
          >
            Tillbaka till CARE-sidan
          </button>
          <p className="text-xs" style={{ color: "#8499A0" }}>
            &copy; {new Date().getFullYear()} SolPulsen Energy Norden AB
          </p>
        </div>
      </div>
    </div>
  );
}
