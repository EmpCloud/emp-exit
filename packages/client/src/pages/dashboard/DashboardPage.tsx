import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserMinus, ClipboardCheck, Shield, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import type { ExitStatus, ExitType } from "@emp-exit/shared";

interface ExitListItem {
  id: string;
  status: ExitStatus;
  exit_type: ExitType;
  created_at: string;
  last_working_date: string | null;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    designation: string | null;
  } | null;
}

interface DashboardStats {
  activeExits: number;
  clearancePending: number;
  fnfPending: number;
  completedThisMonth: number;
}

const STATUS_COLORS: Record<string, string> = {
  initiated: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  notice_period: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  clearance_pending: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
  fnf_pending: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
  fnf_processed: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300",
  completed: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground",
};

// i18n keys under the shared `exitStatus` / `exitType` namespaces, resolved
// via t() at render time (see the exit status/type cells below).
const STATUS_LABEL_KEYS: Record<string, string> = {
  initiated: "exitStatus.initiated",
  notice_period: "exitStatus.notice_period",
  clearance_pending: "exitStatus.clearance_pending",
  fnf_pending: "exitStatus.fnf_pending",
  fnf_processed: "exitStatus.fnf_processed",
  completed: "exitStatus.completed",
  cancelled: "exitStatus.cancelled",
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  resignation: "exitType.resignation",
  termination: "exitType.termination",
  retirement: "exitType.retirement",
  end_of_contract: "exitType.end_of_contract",
  mutual_separation: "exitType.mutual_separation",
  absconding: "exitType.absconding",
};

export function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExits, setRecentExits] = useState<ExitListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Recent exits for the table (top 10) + a full fetch for accurate
        // counts (computing stats from only 10 rows undercounts everything).
        const [recentRes, allRes, clearanceRes] = await Promise.all([
          apiGet<any>("/exits", { perPage: 10 }),
          apiGet<any>("/exits", { perPage: 1000 }),
          apiGet<any[]>("/clearance/my").catch(() => ({ data: [] as any[] })),
        ]);
        if (cancelled) return;

        setRecentExits(recentRes.data?.data ?? []);

        const exits: ExitListItem[] = allRes.data?.data ?? [];
        const activeStatuses = ["initiated", "notice_period", "clearance_pending", "fnf_pending", "fnf_processed"];
        const activeExits = exits.filter((e) => activeStatuses.includes(e.status)).length;
        const fnfPending = exits.filter((e) => e.status === "fnf_pending").length;

        // Clearance Pending = distinct exits with at least one pending clearance
        // record (matches the Clearance page, which lists clearance records — an
        // exit's *status* may have moved on while clearances are still open).
        const clearanceRecords: any[] = clearanceRes.data ?? [];
        const clearancePending = new Set(clearanceRecords.map((c) => c.exit_request_id)).size;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const completedThisMonth = exits.filter(
          (e) => e.status === "completed" && e.created_at >= monthStart,
        ).length;

        setStats({ activeExits, clearancePending, fnfPending, completedThisMonth });
      } catch (err) {
        // silently fail for dashboard — data will show as 0
        if (!cancelled) {
          setStats({ activeExits: 0, clearancePending: 0, fnfPending: 0, completedThisMonth: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600 dark:text-rose-400" />
      </div>
    );
  }

  const statCards = [
    {
      label: t("dashboard.statActiveExits"),
      value: stats?.activeExits ?? 0,
      icon: UserMinus,
      color: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-100 dark:bg-rose-950/40",
      link: "/exits?status=active",
    },
    {
      label: t("dashboard.statClearancePending"),
      value: stats?.clearancePending ?? 0,
      icon: Shield,
      color: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-950/40",
      link: "/clearance",
    },
    {
      label: t("dashboard.statFnfPending"),
      value: stats?.fnfPending ?? 0,
      icon: DollarSign,
      color: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-100 dark:bg-purple-950/40",
      link: "/fnf",
    },
    {
      label: t("dashboard.statCompletedMonth"),
      value: stats?.completedThisMonth ?? 0,
      icon: ClipboardCheck,
      color: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-950/40",
      link: "/exits?status=completed",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:border-brand-400"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{card.value}</p>
              </div>
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", card.iconBg)}>
                <card.icon className={cn("h-6 w-6", card.color.split(" ")[1])} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Exits */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{t("dashboard.recentExits")}</h2>
          <Link
            to="/exits"
            className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300"
          >
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentExits.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {t("dashboard.emptyExits")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">{t("dashboard.colEmployee")}</th>
                  <th className="px-6 py-3">{t("dashboard.colType")}</th>
                  <th className="px-6 py-3">{t("common.status")}</th>
                  <th className="px-6 py-3">{t("dashboard.colLastWorkingDate")}</th>
                  <th className="px-6 py-3">{t("dashboard.colInitiated")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentExits.map((exit) => (
                  <tr key={exit.id} className="hover:bg-muted/50">
                    <td className="px-6 py-3">
                      <Link to={`/exits/${exit.id}`} className="font-medium text-foreground hover:text-rose-600 dark:text-rose-400">
                        {exit.employee
                          ? `${exit.employee.first_name} ${exit.employee.last_name}`
                          : t("dashboard.employeeFallback", { id: exit.id.slice(0, 8) })}
                      </Link>
                      {exit.employee?.designation && (
                        <p className="text-xs text-muted-foreground">{exit.employee.designation}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {TYPE_LABEL_KEYS[exit.exit_type] ? t(TYPE_LABEL_KEYS[exit.exit_type]) : exit.exit_type}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_COLORS[exit.status] || "bg-muted text-muted-foreground",
                        )}
                      >
                        {STATUS_LABEL_KEYS[exit.status] ? t(STATUS_LABEL_KEYS[exit.status]) : exit.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {exit.last_working_date ? formatDate(exit.last_working_date) : "--"}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{formatDate(exit.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
