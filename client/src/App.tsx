import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import OnboardingWizard from "./components/OnboardingWizard";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./_core/hooks/useAuth";
import CookieConsent from "./components/CookieConsent";

// Lazy load pages for performance
const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const Energy = lazy(() => import("./pages/Energy"));
const Devices = lazy(() => import("./pages/Devices"));
const Care = lazy(() => import("./pages/Care"));
const Economy = lazy(() => import("./pages/Economy"));
const Settings = lazy(() => import("./pages/Settings"));
const InsightsHub = lazy(() => import("./pages/InsightsHub"));
const DeviceControl = lazy(() => import("./pages/DeviceControl"));
const ActionsHistory = lazy(() => import("./pages/ActionsHistory"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const DocumentCenter = lazy(() => import("./pages/DocumentCenter"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const EmailInbox = lazy(() => import("./pages/EmailInbox"));
const ElectricityBills = lazy(() => import("./pages/ElectricityBills"));
const Profile = lazy(() => import("./pages/Profile"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CarePublic = lazy(() => import("./pages/CarePublic"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
    </div>
  );
}

/** Root route: redirect based on auth state */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#06120F" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#2FD3A5" }} />
      </div>
    );
  }
  if (user) {
    return <Redirect to="/dashboard" />;
  }
  return <Redirect to="/care-public" />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Root: smart redirect based on auth */}
        <Route path="/" component={RootRedirect} />

        {/* Public routes — no auth required */}
        <Route path="/care-public" component={CarePublic} />
        <Route path="/login" component={Login} />
        <Route path="/invite" component={InviteAccept} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Protected routes — wrapped in DashboardLayout (handles auth redirect) */}
        <Route>
          <DashboardLayout>
            <OnboardingWizard />
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/dashboard" component={Home} />
                <Route path="/energy" component={Energy} />
                <Route path="/devices" component={Devices} />
                <Route path="/care" component={Care} />
                <Route path="/economy" component={Economy} />
                <Route path="/insights" component={InsightsHub} />
                <Route path="/device-control" component={DeviceControl} />
                <Route path="/actions-history" component={ActionsHistory} />
                <Route path="/system-health" component={SystemHealth} />
                <Route path="/documents" component={DocumentCenter} />
                <Route path="/knowledge" component={KnowledgeBase} />
                <Route path="/users" component={UserManagement} />
                <Route path="/email-inbox" component={EmailInbox} />
                <Route path="/bills" component={ElectricityBills} />
                <Route path="/profile" component={Profile} />
                <Route path="/settings" component={Settings} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </DashboardLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
