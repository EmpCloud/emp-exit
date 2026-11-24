import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Loader2, Settings, X } from "lucide-react";
import { apiGet, apiPut } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

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

  useEffect(() => {
    loadClearances();
  }, []);

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
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600 dark:text-rose-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("clearance.recordsTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("clearance.recordsSubtitle")}
          </p>
        </div>
        <Link
          to="/clearance/departments"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          {t("clearance.manageDepartments")}
        </Link>
      </div>

      {clearances.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("clearance.noPending")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">{t("clearance.colDepartment")}</th>
                <th className="px-6 py-3">{t("clearance.colEmployee")}</th>
                <th className="px-6 py-3">{t("common.status")}</th>
                <th className="px-6 py-3">{t("clearance.colPendingAmount")}</th>
                <th className="px-6 py-3 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clearances.map((c) => (
                <tr key={c.id} className="hover:bg-muted/50">
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
                    {c.pending_amount > 0 ? formatINR(c.pending_amount) : "--"}
                  </td>
                  <td className="px-6 py-4">
                    {c.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(c.id)}
                          disabled={actionLoading === c.id}
                          className="rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/40 disabled:opacity-50"
                        >
                          {t("clearance.approve")}
                        </button>
                        <button
                          onClick={() => { setRejectTarget(c); setRejectReason(""); }}
                          disabled={actionLoading === c.id}
                          className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40 disabled:opacity-50"
                        >
                          {t("clearance.reject")}
                        </button>
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
          </table>
        </div>
      )}

      {/* Reject dialog (replaces the native prompt) */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t("clearance.rejectTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rejectTarget.department?.name || "Department"}
                  {rejectTarget.employee ? ` · ${rejectTarget.employee.first_name} ${rejectTarget.employee.last_name}` : ""}
                </p>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("clearance.reasonLabel")}</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder={t("clearance.reasonPlaceholder")}
              className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={actionLoading === rejectTarget.id}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim() || actionLoading === rejectTarget.id}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectTarget.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("clearance.reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
