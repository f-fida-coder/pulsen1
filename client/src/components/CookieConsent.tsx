import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";

const CONSENT_KEY = "solpulsen-cookie-consent";

type ConsentState = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
};

function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeConsent(consent: ConsentState) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent: ConsentState = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    setVisible(false);
  };

  const handleAcceptSelected = () => {
    const consent: ConsentState = {
      necessary: true,
      analytics,
      marketing,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    setVisible(false);
  };

  const handleRejectAll = () => {
    const consent: ConsentState = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" />

      {/* Banner */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
        <div
          className="mx-auto max-w-3xl mb-6 mx-4 sm:mx-auto rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#E7E1D6",
            animation: "cookieSlideUp 0.5s ease-out",
          }}
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#C7A64A20" }}
              >
                <Shield className="w-5 h-5" style={{ color: "#C7A64A" }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: "#171717" }}>
                  Din integritet
                </h3>
                <p className="text-xs" style={{ color: "#6E6A63" }}>
                  SolPulsen CARE
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectAll}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" style={{ color: "#6E6A63" }} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 pb-4">
            <p className="text-sm leading-relaxed" style={{ color: "#6E6A63" }}>
              Vi använder cookies för att säkerställa att webbplatsen fungerar korrekt och för att
              förbättra din upplevelse. Nödvändiga cookies krävs alltid. Du kan välja att godkänna
              eller avvisa valfria cookies.
            </p>

            {/* Details toggle */}
            {showDetails && (
              <div className="mt-4 space-y-3">
                {/* Necessary */}
                <div
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: "#F7F5F0" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#171717" }}>
                      Nödvändiga
                    </p>
                    <p className="text-xs" style={{ color: "#6E6A63" }}>
                      Krävs för inloggning och grundläggande funktionalitet
                    </p>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: "#2F8F7220", color: "#2F8F72" }}
                  >
                    Alltid aktiv
                  </div>
                </div>

                {/* Analytics */}
                <label
                  className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-secondary transition-colors"
                  style={{ backgroundColor: "#F7F5F0" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#171717" }}>
                      Analys
                    </p>
                    <p className="text-xs" style={{ color: "#6E6A63" }}>
                      Hjälper oss förstå hur webbplatsen används
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="w-5 h-5 rounded accent-amber-600"
                  />
                </label>

                {/* Marketing */}
                <label
                  className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-secondary transition-colors"
                  style={{ backgroundColor: "#F7F5F0" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#171717" }}>
                      Marknadsföring
                    </p>
                    <p className="text-xs" style={{ color: "#6E6A63" }}>
                      Används för att visa relevanta erbjudanden
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="w-5 h-5 rounded accent-amber-600"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className="px-6 py-4 flex items-center gap-3 flex-wrap"
            style={{ borderTop: "1px solid #E7E1D6" }}
          >
            <Button
              onClick={handleAcceptAll}
              className="text-sm font-semibold px-6"
              style={{ backgroundColor: "#C7A64A", color: "#FFFFFF" }}
            >
              Godkänn alla
            </Button>
            {showDetails ? (
              <Button
                onClick={handleAcceptSelected}
                variant="outline"
                className="text-sm font-medium px-6"
                style={{ borderColor: "#E7E1D6", color: "#171717" }}
              >
                Spara val
              </Button>
            ) : (
              <Button
                onClick={() => setShowDetails(true)}
                variant="outline"
                className="text-sm font-medium px-6"
                style={{ borderColor: "#E7E1D6", color: "#171717" }}
              >
                Anpassa
              </Button>
            )}
            <button
              onClick={handleRejectAll}
              className="text-sm ml-auto hover:underline"
              style={{ color: "#6E6A63" }}
            >
              Avvisa valfria
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cookieSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
