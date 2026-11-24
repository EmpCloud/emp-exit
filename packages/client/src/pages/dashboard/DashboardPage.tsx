import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserMinus, ClipboardCheck, Shield, DollarSign, ArrowRight, Plus } from "lucide-react";
import { apiGet } from "@/api/client";
import { formatDate } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { Page, PageActions, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Table, TableScroll, TableShell, TableToolbar } from "@/components/ui/Table";
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

const STATUS_TONES: Record<string, BadgeTone> = {
  initiated: "info",
  notice_period: "warning",
  clearance_pending: "warning",
  fnf_pending: "brand",
  fnf_processed: "info",
  completed: "success",
  cancelled: "neutral",
};

// i18n keys under the shared `exitStatus` / `exitType` namespaces, resolved
// via t() at render time (see the exit status/type cells below).
const STATUS_LABEL_KEYS: Record<ExitStatus, string> = {
  initiated: "exitStatus.initiated",
  notice_period: "exitStatus.notice_period",
  clearance_pending: "exitStatus.clearance_pending",
  fnf_pending: "exitStatus.fnf_pending",
  fnf_processed: "exitStatus.fnf_processed",
  completed: "exitStatus.completed",
  cancelled: "exitStatus.cancelled",
};

const TYPE_LABEL_KEYS: Record<ExitType, string> = {
  resignation: "exitType.resignation",
  termination: "exitType.termination",
  retirement: "exitType.retirement",
  end_of_contract: "exitType.end_of_contract",
  mutual_separation: "exitType.mutual_separation",
  absconding: "exitType.absconding",
};

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExits, setRecentExits] = useState<ExitListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
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
          setStats(null);
          setRecentExits([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  if (loading) {
    return <LoadingState label={t("common.loading")} />;
  }

  if (error) {
    return (
      <Page>
        <PageHeader>
          <PageHeaderContent>
            <PageTitle>{t("dashboard.title")}</PageTitle>
            <PageDescription>{t("dashboard.subtitle")}</PageDescription>
          </PageHeaderContent>
        </PageHeader>
        <TableShell>
          <ErrorState
            title={t("common.error")}
            description={t("common.noData")}
            action={<Button onClick={() => setReloadKey((value) => value + 1)} variant="secondary">{t("common.retry")}</Button>}
          />
        </TableShell>
      </Page>
    );
  }

  const locale = i18n.resolvedLanguage || i18n.language;
  const statCards = [
    {
      id: "active-exits",
      label: t("dashboard.statActiveExits"),
      value: stats?.activeExits ?? 0,
      icon: UserMinus,
      tone: "brand" as const,
      link: "/exits?status=active",
    },
    {
      id: "clearance-pending",
      label: t("dashboard.statClearancePending"),
      value: stats?.clearancePending ?? 0,
      icon: Shield,
      tone: "amber" as const,
      link: "/clearance",
    },
    {
      id: "fnf-pending",
      label: t("dashboard.statFnfPending"),
      value: stats?.fnfPending ?? 0,
      icon: DollarSign,
      tone: "violet" as const,
      link: "/fnf",
    },
    {
      id: "completed-this-month",
      label: t("dashboard.statCompletedMonth"),
      value: stats?.completedThisMonth ?? 0,
      icon: ClipboardCheck,
      tone: "emerald" as const,
      link: "/exits?status=completed",
    },
  ];

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>{t("dashboard.title")}</PageTitle>
          <PageDescription>{t("dashboard.subtitle")}</PageDescription>
        </PageHeaderContent>
        <PageActions>
          <ButtonLink to="/exits/new">
            <Plus aria-hidden="true" className="size-4" />
            {t("exitList.initiateExit")}
          </ButtonLink>
        </PageActions>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard
            key={card.id}
            to={card.link}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      {/* Recent Exits */}
      <TableShell>
        <TableToolbar>
          <h2 id="recent-exits-heading" className="text-lg font-semibold text-foreground">
            {t("dashboard.recentExits")}
          </h2>
          <Link
            to="/exits"
            className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-brand-50 dark:hover:bg-brand-950/40"
          >
            {t("common.viewAll")} <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </TableToolbar>

        {recentExits.length === 0 ? (
          <EmptyState
            title={t("dashboard.emptyExits")}
            icon={UserMinus}
            action={<ButtonLink to="/exits/new" variant="secondary"><Plus aria-hidden="true" className="size-4" />{t("exitList.initiateExit")}</ButtonLink>}
          />
        ) : (
          <TableScroll>
            <Table aria-labelledby="recent-exits-heading">
              <thead>
                <tr>
                  <th scope="col">{t("dashboard.colEmployee")}</th>
                  <th scope="col">{t("dashboard.colType")}</th>
                  <th scope="col">{t("common.status")}</th>
                  <th scope="col">{t("dashboard.colLastWorkingDate")}</th>
                  <th scope="col">{t("dashboard.colInitiated")}</th>
                </tr>
              </thead>
              <tbody>
                {recentExits.map((exit) => (
                  <tr key={exit.id}>
                    <td>
                      <Link to={`/exits/${exit.id}`} className="font-semibold text-foreground hover:text-primary">
                        {exit.employee
                          ? `${exit.employee.first_name} ${exit.employee.last_name}`
                          : t("dashboard.employeeFallback", { id: exit.id.slice(0, 8) })}
                      </Link>
                      {exit.employee?.designation && (
                        <p className="text-xs text-muted-foreground">{exit.employee.designation}</p>
                      )}
                    </td>
                    <td className="text-muted-foreground">
                      {t(TYPE_LABEL_KEYS[exit.exit_type] ?? "common.unknown")}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONES[exit.status] || "neutral"}>
                        {t(STATUS_LABEL_KEYS[exit.status] ?? "common.unknown")}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">
                      {exit.last_working_date ? formatDate(exit.last_working_date, locale) : "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {formatDate(exit.created_at, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </TableShell>
    </Page>
  );
}
