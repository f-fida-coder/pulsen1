import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Home,
  Zap,
  Cpu,
  HeartHandshake,
  TrendingUp,
  Newspaper,
  Settings,
  LogOut,
  PanelLeft,
  Bell,
  Terminal,
  History,
  FileText,
  ShieldCheck,
  BookOpen,
  UserCheck,
  Receipt,
  UserCircle,
  Inbox,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";


const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/107016592/8kqYZvaGCpcSjyuXQ9yrCo/logo_web_300px_02452a28.png";

const menuItems = [
  { icon: Home, label: "Hem", path: "/dashboard" },
  { icon: Zap, label: "Energi", path: "/energy" },
  { icon: Cpu, label: "Enheter", path: "/devices" },
  { icon: HeartHandshake, label: "CARE", path: "/care" },
  { icon: TrendingUp, label: "Ekonomi", path: "/economy" },
  { icon: Newspaper, label: "Insights", path: "/insights" },
  { icon: Terminal, label: "Enhetsstyrning", path: "/device-control" },
  { icon: History, label: "AI ROI", path: "/actions-history" },
  { icon: ShieldCheck, label: "Systemhälsa", path: "/system-health" },
  { icon: FileText, label: "Dokument", path: "/documents" },
  { icon: BookOpen, label: "Kunskapsbas", path: "/knowledge" },
  { icon: UserCheck, label: "Användare", path: "/users", adminOnly: true as const },
  { icon: Inbox, label: "E-post Inbox", path: "/email-inbox", adminOnly: true as const },
  { icon: Receipt, label: "Elfaktura", path: "/bills" },
  { icon: UserCircle, label: "Min profil", path: "/profile" },
  { icon: Settings, label: "Inställningar", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    // Redirect unauthenticated users to the public CARE landing page
    window.location.replace("/care-public");
    return null;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar"
          disableTransition={isResizing}
        >
          {/* ─── Logo Header ─── */}
          <SidebarHeader className="h-20 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={LOGO_URL}
                    alt="Solpulsen CARE"
                    className="h-8 w-auto"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* ─── Navigation ─── */}
          <SidebarContent className="gap-0 pt-2">
            <SidebarMenu className="px-2 py-1 space-y-0.5">
              {menuItems.filter(item => !('adminOnly' in item && item.adminOnly) || user?.role === 'admin').map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal rounded-lg ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-[3px] border-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${
                          isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground"
                        }`}
                      />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* ─── User Footer ─── */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Avatar className="h-9 w-9 border border-primary/40 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-sidebar-accent text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-accent-foreground">
                      {user?.name || "Användare"}
                    </p>
                    <p className="text-xs text-sidebar-foreground truncate mt-1">
                      {user?.email || ""}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logga ut</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-background">
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg text-foreground" />
              <span className="text-sm font-medium text-foreground">
                {activeMenuItem?.label ?? "Meny"}
              </span>
            </div>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 page-enter">{children}</main>
      </SidebarInset>
    </>
  );
}
