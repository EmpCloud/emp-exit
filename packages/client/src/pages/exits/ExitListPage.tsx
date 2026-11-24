import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, UserMinus } from "lucide-react";
import { apiGet } from "@/api/client";
import { formatDate } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Page, PageActions, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Table, TableFooter, TableScroll, TableShell, TableToolbar } from "@/components/ui/Table";
import type { ExitStatus, ExitType } from "@emp-exit/shared";

const STATUS_FILTER_OPTIONS = [
  { value: "", labelKey: "exitList.allStatuses" },
  { value: "active", labelKey: "exitList.activeStatus" },
  { value: "initiated", labelKey: "exitStatuses.initiated" },
  { value: "notice_period", labelKey: "exitStatuses.noticePeriod" },
  { value: "clearance_pending", labelKey: "exitStatuses.clearancePending" },
  { value: "fnf_pending", labelKey: "exitStatuses.fnfPending" },
  { value: "fnf_processed", labelKey: "exitStatuses.fnfProcessed" },
  { value: "completed", labelKey: "exitStatuses.completed" },
  { value: "cancelled", labelKey: "exitStatuses.cancelled" },
] as const;

const STATUS_TONES: Record<string, BadgeTone> = {
  initiated: "info",
  notice_period: "warning",
  clearance_pending: "warning",
  fnf_pending: "brand",
  fnf_processed: "info",
  completed: "success",
  cancelled: "neutral",
};

const STATUS_TRANSLATION_KEYS: Record<ExitStatus, string> = {
  initiated: "exitStatuses.initiated",
  notice_period: "exitStatuses.noticePeriod",
  clearance_pending: "exitStatuses.clearancePending",
  fnf_pending: "exitStatuses.fnfPending",
  fnf_processed: "exitStatuses.fnfProcessed",
  completed: "exitStatuses.completed",
  cancelled: "exitStatuses.cancelled",
};

const TYPE_TRANSLATION_KEYS: Record<ExitType, string> = {
  resignation: "exitTypes.resignation",
  termination: "exitTypes.termination",
  retirement: "exitTypes.retirement",
  end_of_contract: "exitTypes.endOfContract",
  mutual_separation: "exitTypes.mutualSeparation",
  absconding: "exitTypes.absconding",
};

interface ExitListItem {
  id: string;
  status: ExitStatus;
  exit_type: ExitType;
  created_at: string;
  last_working_date: string | null;
  resignation_date: string | null;
  // Always present on the API response (lives directly on exit_requests). We
  // need it for the "deleted employee" fallback when the join into empcloud
  // returns null because the underlying user was hard-deleted.
  employee_id: number;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    designation: string | null;
    emp_code: string | null;
  } | null;
}

export function ExitListPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exits, setExits] = useState<ExitListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const params: Record<string, any> = { page, perPage: 20 };
        if (statusFilter) params.status = statusFilter;

        const res = await apiGet<any>("/exits", params);
        if (cancelled) return;

        setExits(res.data?.data ?? []);
        setTotal(res.data?.total ?? 0);
      } catch {
        if (!cancelled) {
          setExits([]);
          setTotal(0);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, reloadKey, statusFilter]);

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
    if (value) {
      setSearchParams({ status: value });
    } else {
      setSearchParams({});
    }
  }

  const totalPages = Math.ceil(total / 20);
  const locale = i18n.resolvedLanguage || i18n.language;

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>{t("exitList.title")}</PageTitle>
          <PageDescription>{t("exitList.subtitle")}</PageDescription>
        </PageHeaderContent>
        <PageActions>
          <ButtonLink to="/exits/new">
            <Plus aria-hidden="true" className="size-4" />
            {t("exitList.initiateExit")}
          </ButtonLink>
        </PageActions>
      </PageHeader>

      {/* Filters */}
      <TableShell>
        <TableToolbar>
          <Select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          aria-label={t("exitList.statusFilterLabel")}
          className="w-full sm:w-60"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
          </Select>
          <div className="text-sm text-muted-foreground sm:ms-auto" role="status" aria-live="polite">
          {t("exitList.resultCount", { count: total })}
          </div>
        </TableToolbar>

      {/* Table */}
        {loading ? (
          <LoadingState label={t("common.loading")} />
        ) : error ? (
          <ErrorState
            title={t("common.error")}
            description={t("common.noData")}
            action={<Button onClick={() => setReloadKey((value) => value + 1)} variant="secondary">{t("common.retry")}</Button>}
          />
        ) : exits.length === 0 ? (
          <EmptyState
            title={t("exitList.emptyState")}
            icon={UserMinus}
            action={<ButtonLink to="/exits/new" variant="secondary"><Plus aria-hidden="true" className="size-4" />{t("exitList.initiateExit")}</ButtonLink>}
          />
        ) : (
          <>
            <TableScroll>
              <Table aria-label={t("exitList.tableLabel")}>
                <thead>
                  <tr>
                    <th scope="col">{t("exitList.table.employee")}</th>
                    <th scope="col">{t("exitList.table.type")}</th>
                    <th scope="col">{t("exitList.table.status")}</th>
                    <th scope="col">{t("exitList.table.resignationDate")}</th>
                    <th scope="col">{t("exitList.table.lastWorkingDate")}</th>
                    <th scope="col">{t("exitList.table.initiated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {exits.map((exit) => (
                    <tr key={exit.id}>
                      <td>
                        <Link
                          to={`/exits/${exit.id}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {exit.employee
                            ? `${exit.employee.first_name} ${exit.employee.last_name}`
                            : t("exitList.deletedEmployee", { id: exit.employee_id })}
                        </Link>
                        {exit.employee?.designation && (
                          <p className="text-xs text-muted-foreground">{exit.employee.designation}</p>
                        )}
                        {exit.employee?.emp_code && (
                          <p className="text-xs text-muted-foreground">{exit.employee.emp_code}</p>
                        )}
                      </td>
                      <td className="text-muted-foreground">
                        {t(TYPE_TRANSLATION_KEYS[exit.exit_type] ?? "common.unknown")}
                      </td>
                      <td>
                        <Badge tone={STATUS_TONES[exit.status] || "neutral"}>
                          {t(STATUS_TRANSLATION_KEYS[exit.status] ?? "common.unknown")}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground">
                        {exit.resignation_date ? formatDate(exit.resignation_date, locale) : "—"}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <TableFooter role="navigation" aria-label={t("exitList.pagination.label")}>
                <p className="text-sm text-muted-foreground">
                  {t("exitList.pagination.page", { page, totalPages })}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="secondary"
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="secondary"
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </TableFooter>
            )}
          </>
        )}
      </TableShell>
    </Page>
  );
}
