import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Calculator,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { Page, PageActions, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Table, TableFooter, TableScroll, TableShell } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function formatINR(amountPaise: number): string {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  approved: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900",
  rejected: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export function BuyoutListPage() {
  const [buyouts, setBuyouts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const rejectDialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const rejectBusyRef = useRef(false);
  const rejectOpen = rejectId !== null;
  rejectBusyRef.current = Boolean(rejectId && actionLoading === rejectId);

  useEffect(() => {
    loadBuyouts();
  }, [statusFilter]);

  useEffect(() => {
    if (!rejectOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => document.getElementById("buyout-reject-reason")?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !rejectBusyRef.current) {
        event.preventDefault();
        setRejectId(null);
        setRejectReason("");
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

  async function loadBuyouts() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiGet<any>("/buyout", params);
      setBuyouts(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch {
      setBuyouts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await apiPost(`/buyout/${id}/approve`);
      await loadBuyouts();
    } catch {
      // handled
    } finally {
      setActionLoading(null);
      setApproveId(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    setActionLoading(id);
    try {
      await apiPost(`/buyout/${id}/reject`, { reason: rejectReason });
      setRejectId(null);
      setRejectReason("");
      await loadBuyouts();
    } catch {
      // handled
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Notice Buyout Requests</PageTitle>
          <PageDescription>
            Review and manage employee notice period buyout requests.
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="min-w-44"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </PageActions>
      </PageHeader>

      {loading ? (
        <LoadingState label="Loading buyout requests" className="surface-card" />
      ) : buyouts.length === 0 ? (
        <EmptyState title="No buyout requests found." icon={Calculator} className="surface-card" />
      ) : (
        <TableShell>
          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <th scope="col">
                    Employee
                  </th>
                  <th scope="col">
                    Original Date
                  </th>
                  <th scope="col">
                    Requested Date
                  </th>
                  <th scope="col">
                    Days Bought Out
                  </th>
                  <th scope="col">
                    Amount
                  </th>
                  <th scope="col">
                    Status
                  </th>
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {buyouts.map((b: any) => {
                  const StatusIcon = STATUS_ICONS[b.status] || Clock;
                  return (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap">
                        <p className="text-sm font-medium text-foreground">
                          {b.employee
                            ? `${b.employee.first_name} ${b.employee.last_name}`
                            : `Employee #${b.employee_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">Exit: {b.exit_request_id?.slice(0, 8)}...</p>
                      </td>
                      <td className="whitespace-nowrap text-muted-foreground">
                        {formatDate(b.original_last_date)}
                      </td>
                      <td className="whitespace-nowrap text-muted-foreground">
                        {formatDate(b.requested_last_date)}
                      </td>
                      <td className="whitespace-nowrap font-medium text-foreground">
                        {b.remaining_days} days
                      </td>
                      <td className="whitespace-nowrap font-semibold text-foreground">
                        {formatINR(b.buyout_amount)}
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={cn(
                            "status-pill capitalize",
                            STATUS_COLORS[b.status],
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {b.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-end">
                        {b.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => setApproveId(b.id)}
                              disabled={actionLoading === b.id}
                              variant="ghost"
                              className="min-h-9 px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                            >
                              {actionLoading === b.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              Approve
                            </Button>
                            <Button
                              onClick={() => setRejectId(b.id)}
                              disabled={actionLoading === b.id}
                              variant="ghost"
                              className="min-h-9 px-2.5 text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {b.status === "rejected" && b.rejected_reason && (
                          <p className="text-xs text-muted-foreground italic max-w-[200px] truncate" title={b.rejected_reason}>
                            {b.rejected_reason}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableScroll>

          {total > buyouts.length && (
            <TableFooter>
              Showing {buyouts.length} of {total} requests
            </TableFooter>
          )}
        </TableShell>
      )}

      {/* Rejection Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !rejectBusyRef.current) { setRejectId(null); setRejectReason(""); } }}>
          <div ref={rejectDialogRef} className="surface-card w-full max-w-md p-6 shadow-floating" role="dialog" aria-modal="true" aria-labelledby="reject-buyout-title" tabIndex={-1}>
            <h2 id="reject-buyout-title" className="mb-2 text-lg font-semibold text-foreground">Reject Buyout Request</h2>
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              Please provide a reason for rejecting this buyout request. The employee will be notified.
            </p>
            <Textarea
              id="buyout-reject-reason"
              aria-label="Rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              autoFocus
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleReject(rejectId)}
                disabled={!rejectReason.trim() || actionLoading === rejectId}
                variant="danger"
              >
                {actionLoading === rejectId && <Loader2 className="h-4 w-4 animate-spin" />}
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(approveId)}
        title="Approve buyout request?"
        message="The employee's last working date will be updated when this request is approved."
        confirmLabel="Approve request"
        loading={Boolean(approveId && actionLoading === approveId)}
        onCancel={() => setApproveId(null)}
        onConfirm={() => {
          if (approveId) void handleApprove(approveId);
        }}
      />
    </Page>
  );
}
