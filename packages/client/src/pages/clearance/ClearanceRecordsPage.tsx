import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Loader2, Settings, X } from "lucide-react";
import { apiGet, apiPut } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { Page, PageActions, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { FieldLabel, Textarea } from "@/components/ui/Field";
import { Table, TableScroll, TableShell } from "@/components/ui/Table";

const CLEARANCE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  rejected: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  waived: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
};

interface MyClearance {
  id: string;
  exit_request_id: string;
  department_id: string;
  status: string;
  approved_by: number | null;
  approved_at: string | null;
  remarks: string | null;
  pending_amount: number;
  department?: { id: string; name: string } | null;
  employee?: { first_name: string; last_name: string; designation: string | null } | null;
}

// pending_amount is stored in paise.
function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

export function ClearanceRecordsPage() {
  const { t } = useTranslation();
  const [clearances, setClearances] = useState<MyClearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject dialog (replaces the native prompt)
  const [rejectTarget, setRejectTarget] = useState<MyClearance | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const rejectDialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const rejectBusyRef = useRef(false);
  const rejectOpen = rejectTarget !== null;
  rejectBusyRef.current = Boolean(rejectTarget && actionLoading === rejectTarget.id);

  useEffect(() => {
    loadClearances();
  }, []);

  useEffect(() => {
    if (!rejectOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => document.getElementById("clearance-reject-reason")?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !rejectBusyRef.current) {
        event.preventDefault();
        setRejectTarget(null);
        return;
      }
      if (event.key !== "Tab" || !rejectDialogRef.current) return;
      const focusable = Array.from(rejectDialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [rejectOpen]);

  async function loadClearances() {
    setLoading(true);
    try {
      const res = await apiGet<MyClearance[]>("/clearance/my");
      setClearances(res.data ?? []);
    } catch {
      setClearances([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(clearanceId: string) {
    setActionLoading(clearanceId);
    try {
      await apiPut(`/clearance/${clearanceId}`, { status: "approved" });
      await loadClearances();
    } catch {
      // handled
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error(t("clearance.reasonRequired"));
      return;
    }
    const id = rejectTarget.id;
    setActionLoading(id);
    try {
      await apiPut(`/clearance/${id}`, { status: "rejected", remarks: rejectReason.trim() });
      toast.success(t("clearance.rejected"));
      setRejectTarget(null);
      setRejectReason("");
      await loadClearances();
    } catch {
      toast.error(t("clearance.rejectFailed"));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="surface-card"><LoadingState label={t("common.loading")} /></div>;
  }

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>{t("clearance.recordsTitle")}</PageTitle>
          <PageDescription>{t("clearance.recordsSubtitle")}</PageDescription>
        </PageHeaderContent>
        <PageActions>
        <ButtonLink
          to="/clearance/departments"
          variant="secondary"
        >
          <Settings aria-hidden="true" className="size-4" />
          {t("clearance.manageDepartments")}
        </ButtonLink>
        </PageActions>
      </PageHeader>

      {clearances.length === 0 ? (
        <div className="surface-card"><EmptyState icon={Shield} title={t("clearance.noPending")} /></div>
      ) : (
        <TableShell>
          <TableScroll>
          <Table>
            <thead>
              <tr>
                <th scope="col">{t("clearance.colDepartment")}</th>
                <th scope="col">{t("clearance.colEmployee")}</th>
                <th scope="col">{t("common.status")}</th>
                <th scope="col">{t("clearance.colPendingAmount")}</th>
                <th scope="col" className="text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {clearances.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {c.department?.name || t("clearance.unknown")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/exits/${c.exit_request_id}`}
                      className="text-sm font-medium text-foreground hover:text-rose-600 dark:text-rose-400"
                    >
                      {c.employee
                        ? `${c.employee.first_name} ${c.employee.last_name}`
                        : "—"}
                    </Link>
                    {c.employee?.designation && (
                      <p className="text-xs text-muted-foreground">{c.employee.designation}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        CLEARANCE_STATUS_COLORS[c.status] || "bg-muted text-muted-foreground",
                      )}
                    >
                      {t(`clearance.status.${c.status}`, { defaultValue: c.status })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {c.pending_amount > 0 ? formatINR(c.pending_amount) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {c.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleApprove(c.id)}
                          disabled={actionLoading === c.id}
                          variant="secondary"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                        >
                          {t("clearance.approve")}
                        </Button>
                        <Button
                          onClick={() => { setRejectTarget(c); setRejectReason(""); }}
                          disabled={actionLoading === c.id}
                          variant="ghost"
                          className="text-danger hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          {t("clearance.reject")}
                        </Button>
                      </div>
                    )}
                    {c.status !== "pending" && c.approved_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.approved_at)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </TableScroll>
        </TableShell>
      )}

      {/* Reject dialog (replaces the native prompt) */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !rejectBusyRef.current) setRejectTarget(null);
          }}
        >
          <div ref={rejectDialogRef} className="surface-card w-full max-w-md p-6 shadow-floating" role="dialog" aria-modal="true" aria-labelledby="reject-clearance-title" tabIndex={-1}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 id="reject-clearance-title" className="text-lg font-semibold text-foreground">{t("clearance.rejectTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rejectTarget.department?.name || "Department"}
                  {rejectTarget.employee ? ` · ${rejectTarget.employee.first_name} ${rejectTarget.employee.last_name}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("common.cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FieldLabel htmlFor="clearance-reject-reason">{t("clearance.reasonLabel")}</FieldLabel>
            <Textarea
              id="clearance-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder={t("clearance.reasonPlaceholder")}
            />
            <div className="mt-5 flex justify-end gap-3">
              <Button
                onClick={() => setRejectTarget(null)}
                disabled={actionLoading === rejectTarget.id}
                variant="secondary"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim() || actionLoading === rejectTarget.id}
                variant="danger"
              >
                {actionLoading === rejectTarget.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("clearance.reject")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
