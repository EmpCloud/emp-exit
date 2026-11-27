import { useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Outlet, Navigate, NavLink, useLocation } from "react-router-dom";
import { DoorOpen, LogOut as LogOutIcon, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isLoggedIn, getUser, useAuthStore, isAdmin } from "@/lib/auth-store";
import { cn, getInitials } from "@/lib/utils";
import { BackToDashboard, hasEmpCloudReturnLink } from "@/components/BackToDashboard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ADMIN_NAV_GROUPS, EMPLOYEE_NAV_GROUPS, isNavItemActive, type NavGroup } from "@/components/layout/nav-config";

// Full management console — shown to admin / HR roles.
// Self-service hub — shown to the employee role. Every link points at a
// "my own" page; no org-wide management views.
interface SidebarProps {
  navGroups: NavGroup[];
  pathname: string;
  displayName: string;
  roleLabel: string;
  onLogout: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}

function AppSidebar({ navGroups, pathname, displayName, roleLabel, onLogout, onNavigate, onClose }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex h-full w-[17.5rem] flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/20">
          <DoorOpen className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold tracking-tight">{t("nav.brand")}</p>
          <p className="truncate text-[0.6875rem] text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground lg:hidden" aria-label={t("common.closeNavigationMenu")}>
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-5" aria-label={t("nav.brand")}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
              {t(group.label)}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-[background-color,color] focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-950/45 dark:text-brand-300"
                        : "text-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground",
                    )}
                  >
                    <span aria-hidden="true" className={cn("absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary opacity-0", active && "opacity-100")} />
                    <item.icon className={cn("size-[1.125rem] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} aria-hidden="true" />
                    <span className="truncate">{t(item.label)}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-muted/70 p-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
            {getInitials(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <button type="button" onClick={onLogout} className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-danger" title={t("nav.logout")} aria-label={t("nav.logout")}>
            <LogOutIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function DashboardLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const shellContentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = getUser();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    shellContentRef.current?.setAttribute("inert", "");
    window.requestAnimationFrame(() => {
      mobilePanelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      shellContentRef.current?.removeAttribute("inert");
      mobileTriggerRef.current?.focus();
    };
  }, [mobileOpen]);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const displayName = user ? `${user.firstName} ${user.lastName}` : t("common.user");
  const showEmpCloudReturn = hasEmpCloudReturnLink();
  const ROLE_KEYS: Record<string, string> = {
    super_admin: "roles.superAdmin",
    org_admin: "roles.orgAdmin",
    hr_admin: "roles.hrAdmin",
    hr_manager: "roles.hrManager",
    employee: "roles.employee",
  };
  const roleLabel = t(ROLE_KEYS[user?.role || "employee"] || "roles.employee");
  const navGroups = isAdmin(user) ? ADMIN_NAV_GROUPS : EMPLOYEE_NAV_GROUPS;

  const handleMobileNavigationKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileOpen(false);
      return;
    }
    if (event.key !== "Tab" || !mobilePanelRef.current) return;

    const focusable = Array.from(
      mobilePanelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  function SidebarContent({ mobile = false }: { mobile?: boolean }) {
    return (
      <AppSidebar
        navGroups={navGroups}
        pathname={location.pathname}
        displayName={displayName}
        roleLabel={roleLabel}
        onLogout={logout}
        onNavigate={mobile ? () => setMobileOpen(false) : undefined}
        onClose={mobile ? () => setMobileOpen(false) : undefined}
      />
    );
  }

  const activeNavItem = navGroups.flatMap((group) => group.items).find((item) => isNavItemActive(location.pathname, item));
  const activeLabel = activeNavItem ? t(activeNavItem.label) : t("nav.brand");

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <a href="#main-content" className="skip-link">{t("common.skipToMainContent")}</a>
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 lg:block">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.brand")} onKeyDown={handleMobileNavigationKeyDown}>
          <button
            type="button"
            className="fixed inset-0 cursor-default bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label={t("common.closeNavigationMenu")}
          />
          <div ref={mobilePanelRef} id="mobile-navigation" className="fixed inset-y-0 start-0 z-50 h-full shadow-floating">
            <SidebarContent mobile />
          </div>
        </div>
      )}

      <div ref={shellContentRef} className="app-shell-main flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="relative z-30 flex min-h-16 shrink-0 items-center justify-between border-b border-border bg-card/90 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={t("common.openNavigationMenu")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="ms-1 hidden min-w-0 items-center gap-3 sm:flex lg:ms-0">
            {showEmpCloudReturn && (
              <>
                <BackToDashboard />
                <span aria-hidden="true" className="h-5 w-px bg-border" />
              </>
            )}
            <p className="truncate text-sm font-semibold text-foreground">{activeLabel}</p>
          </div>
          <div className="flex-1 sm:hidden" />
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border md:block" />
            <div className="hidden min-w-0 items-center gap-2.5 md:flex">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                {getInitials(displayName)}
              </span>
              <div className="min-w-0">
                <p className="max-w-40 truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-[0.6875rem] text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
