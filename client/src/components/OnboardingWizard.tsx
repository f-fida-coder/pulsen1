/**
 * OnboardingWizard
 * Shows automatically on first login (when no progress exists and not dismissed).
 * 4 steps: Välkommen → Konfigurera system → Lägg till enhet → Välj CARE-tier
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Settings, Cpu, HeartHandshake, LayoutDashboard,
  ChevronRight, ChevronLeft, X, CheckCircle2, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Step definitions ─────────────────────────────────────────────────────────

type StepId = "configure_system" | "add_device" | "choose_care_tier" | "explore_dashboard";

interface Step {
  id: StepId;
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  path: string;
  color: string;
  bgGradient: string;
}

const STEPS: Step[] = [
  {
    id: "configure_system",
    icon: Settings,
    title: "Konfigurera ditt system",
    description: "Ange din anläggnings kapacitet — batteri, sol, vind och förbrukning. Det tar under 2 minuter och är grunden för all AI-optimering.",
    cta: "Gå till Inställningar",
    path: "/settings",
    color: "text-amber-600",
    bgGradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    id: "add_device",
    icon: Cpu,
    title: "Lägg till din första enhet",
    description: "Koppla upp din växelriktare, batteri eller laddbox. SolPulsen AI börjar direkt samla in data och optimera din energianvändning.",
    cta: "Gå till Enheter",
    path: "/devices",
    color: "text-blue-600",
    bgGradient: "from-blue-500/10 to-indigo-500/10",
  },
  {
    id: "choose_care_tier",
    icon: HeartHandshake,
    title: "Välj din CARE-nivå",
    description: "CARE är SolPulsens supportplattform. Basic ger 72h SLA, Plus 24h och Platinum 4h. Välj den nivå som passar din verksamhet.",
    cta: "Gå till CARE",
    path: "/care",
    color: "text-emerald-600",
    bgGradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    id: "explore_dashboard",
    icon: LayoutDashboard,
    title: "Utforska din dashboard",
    description: "Du är redo. Följ din energiproduktion i realtid, se AI-besparingar och håll koll på systemhälsa — allt på ett ställe.",
    cta: "Gå till Hem",
    path: "/",
    color: "text-violet-600",
    bgGradient: "from-violet-500/10 to-purple-500/10",
  },
];

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total, completed }: { current: number; total: number; completed: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const step = STEPS[i];
        const isDone = completed.includes(step.id);
        const isActive = i === current;
        return (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              isDone ? "h-2 w-6 bg-emerald-500" :
              isActive ? "h-2 w-6 bg-primary" :
              "h-2 w-2 bg-muted"
            }`}
          />
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const utils = trpc.useUtils();
  const { data: progress, isLoading } = trpc.onboarding.getProgress.useQuery(undefined, {
    staleTime: 60000,
  });

  const completeStepMutation = trpc.onboarding.completeStep.useMutation({
    onSuccess: () => utils.onboarding.getProgress.invalidate(),
  });

  const dismissMutation = trpc.onboarding.dismiss.useMutation({
    onSuccess: () => { utils.onboarding.getProgress.invalidate(); setVisible(false); },
  });

  useEffect(() => {
    // Local fallback: once dismissed on this device, never show again
    // (needed when there's no backend/DB to persist the dismissal).
    if (typeof window !== "undefined" && localStorage.getItem("onboarding-dismissed") === "1") {
      setVisible(false);
      return;
    }
    if (!isLoading && progress) {
      const shouldShow = !progress.dismissed && !progress.completedAt;
      setVisible(shouldShow);
      // Start from first incomplete step
      if (shouldShow) {
        const firstIncomplete = STEPS.findIndex(s => !progress.completedSteps.includes(s.id));
        setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
      }
    } else if (!isLoading && !progress) {
      // No record yet = brand new user
      setVisible(true);
      setCurrentStep(0);
    }
  }, [isLoading, progress]);

  const persistDismissal = () => {
    if (typeof window !== "undefined") localStorage.setItem("onboarding-dismissed", "1");
  };

  if (!visible || isLoading) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const completedSteps = (progress?.completedSteps as string[]) ?? [];
  const isStepDone = completedSteps.includes(step.id);
  const isLastStep = currentStep === STEPS.length - 1;

  function handleCta() {
    completeStepMutation.mutate({ step: step.id });
    navigate(step.path);
    if (isLastStep) {
      persistDismissal();
      setVisible(false);
    } else {
      setCurrentStep(s => s + 1);
    }
  }

  function handleSkip() {
    // "Hoppa över" dismisses the whole wizard for good.
    persistDismissal();
    setVisible(false);
    dismissMutation.mutate();
  }

  function handleDismiss() {
    persistDismissal();
    setVisible(false);
    dismissMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-muted-foreground hover:text-muted-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header gradient */}
        <div className={`bg-gradient-to-br ${step.bgGradient} px-6 pt-8 pb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground">SolPulsen CARE</span>
            </div>
            <span className="text-xs text-muted-foreground">— Välkommen</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-card shadow-sm mb-4 ${step.color}`}>
                <StepIcon className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2 leading-tight">{step.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-card">
          {/* Progress */}
          <div className="flex items-center justify-between mb-5">
            <ProgressDots current={currentStep} total={STEPS.length} completed={completedSteps} />
            <span className="text-xs text-muted-foreground">{currentStep + 1} / {STEPS.length}</span>
          </div>

          {/* Completed steps list */}
          {completedSteps.length > 0 && (
            <div className="mb-4 space-y-1">
              {STEPS.filter(s => completedSteps.includes(s.id)).map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(s => s - 1)}
                className="gap-1 text-muted-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />Tillbaka
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground text-xs"
            >
              {isLastStep ? "Stäng" : "Hoppa över"}
            </Button>
            <Button
              size="sm"
              onClick={handleCta}
              disabled={completeStepMutation.isPending}
              className={`gap-1.5 text-xs bg-primary hover:bg-slate-800 text-white ${isStepDone ? "opacity-70" : ""}`}
            >
              {isStepDone ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : null}
              {step.cta}
              {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
