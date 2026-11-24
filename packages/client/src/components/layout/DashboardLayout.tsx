import { useState, useEffect } from "react";
import { Outlet, Navigate, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut as LogOutIcon,
  DoorOpen,
  ClipboardCheck,
  ShieldCheck,
  MessageSquare,
  Calculator,
  DollarSign,
  Package,
  BookOpen,
  FileSignature,
  GraduationCap,
  BarChart3,
  AlertTriangle,
  Settings,
  Menu,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { isLoggedIn, getUser, useAuthStore, isAdmin } from "@/lib/auth-store";
import { cn, getInitials } from "@/lib/utils";
import { BackToDashboard } from "@/components/BackToDashboard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface NavItem {
  to: string;
  // i18n key under the `nav` namespace, resolved via t() at render time.
  label: string;
  icon: any;
}

// Full management console — shown to admin / HR roles.
const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { to: "/exits", label: "nav.exits", icon: DoorOpen },
  { to: "/checklists", label: "nav.checklists", icon: ClipboardCheck },
  { to: "/clearance", label: "nav.clearance", icon: ShieldCheck },
  { to: "/interviews", label: "nav.interviews", icon: MessageSquare },
  { to: "/fnf", label: "nav.fnf", icon: Calculator },
  { to: "/buyout", label: "nav.buyout", icon: DollarSign },
  { to: "/assets", label: "nav.assets", icon: Package },
  { to: "/kt", label: "nav.kt", icon: BookOpen },
  { to: "/letters", label: "nav.letters", icon: FileSignature },
  { to: "/alumni", label: "nav.alumni", icon: GraduationCap },
  { to: "/rehire", label: "nav.rehire", icon: UserPlus },
  { to: "/analytics", label: "nav.analytics", icon: BarChart3 },
  { to: "/analytics/flight-risk", label: "nav.flightRisk", icon: AlertTriangle },
  { to: "/settings", label: "nav.settings", icon: Settings },
];

// Self-service hub — shown to the employee role. Every link points at a
// "my own" page; no org-wide management views.
const EMPLOYEE_NAV: NavItem[] = [
  { to: "/exits/my", label: "nav.myExit", icon: UserMinus },
  { to: "/interviews/my", label: "nav.myInterview", icon: MessageSquare },
  { to: "/kt/my", label: "nav.myKt", icon: BookOpen },
  { to: "/alumni/my", label: "nav.alumni", icon: GraduationCap },
];

export function DashboardLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = getUser();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const displayName = user ? `${user.firstName} ${user.lastName}` : t("common.user");
  const ROLE_KEYS: Record<string, string> = {
    super_admin: "roles.superAdmin",
    org_admin: "roles.orgAdmin",
    hr_admin: "roles.hrAdmin",
    hr_manager: "roles.hrManager",
    employee: "roles.employee",
  };
  const roleLabel = t(ROLE_KEYS[user?.role || "employee"] || "roles.employee");
  const navItems = isAdmin(user) ? ADMIN_NAV : EMPLOYEE_NAV;

  function SidebarContent() {
    return (
      <div className="flex h-full w-64 flex-col bg-card border-r border-border">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <DoorOpen className="h-5 w-5 text-white" aria-hidden="true" focusable="false" />
          </div>
          <span className="text-lg font-bold text-foreground">{t("nav.brand")}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              // `end` forces exact-path matching. Without this, NavLink uses
              // prefix-match, so visiting /analytics/flight-risk highlights
              // both "Analytics" (/analytics) and "Flight Risk"
              // (/analytics/flight-risk) at the same time.
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" focusable="false" />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-sm font-semibold">
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              title={t("nav.logout")}
              aria-label={t("nav.logout")}
            >
              <LogOutIcon className="h-4 w-4" aria-hidden="true" focusable="false" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-muted/50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label={t("common.closeNavigationMenu")}
          />
          <div id="mobile-navigation" className="fixed left-0 top-0 z-50 h-full">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label={t("common.openNavigationMenu")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" focusable="false" />
          </button>
          <BackToDashboard />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs font-semibold">
              {getInitials(displayName)}
            </div>
            <span className="hidden md:block text-sm font-medium text-muted-foreground">{displayName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
