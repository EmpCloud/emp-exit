import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  UserMinus,
  ClipboardCheck,
  Shield,
  CheckCircle,
  DollarSign,
  Calculator,
  FileSignature,
  Download,
} from "lucide-react";
import { apiGet, api } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Page, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { EmptyState, LoadingState } from "@/components/ui/States";

const LETTER_TYPES: Record<string, string> = {
  experience: "Experience Letter",
  relieving: "Relieving Letter",
  service_certificate: "Service Certificate",
  noc: "NOC",
};

const STATUS_TONES: Record<string, BadgeTone> = {
  initiated: "info",
  notice_period: "warning",
  clearance_pending: "warning",
  fnf_pending: "brand",
  fnf_processed: "info",
  completed: "success",
  cancelled: "neutral",
};

const STATUS_LABELS: Record<string, string> = {
  initiated: "Initiated",
  notice_period: "Notice Period",
  clearance_pending: "Clearance Pending",
  fnf_pending: "FnF Pending",
  fnf_processed: "FnF Processed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  completed: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  waived: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  na: "bg-muted/50 text-muted-foreground",
};

export function MyExitPage() {
  const [exit, setExit] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [letters, setLetters] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const exitRes = await apiGet<any>("/self-service/my-exit");
        if (cancelled) return;

        if (exitRes.data) {
          setExit(exitRes.data);

          // Load checklist
          try {
            const checklistRes = await apiGet<any>("/self-service/my-checklist");
            if (!cancelled) setChecklist(checklistRes.data);
          } catch {
            // no checklist
          }

          // Load my documents (generated letters)
          try {
            const lettersRes = await apiGet<any[]>("/self-service/my-letters");
            if (!cancelled) setLetters(lettersRes.data ?? []);
          } catch {
            // no letters
          }
        }
      } catch {
        // no exit
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // The download endpoint returns raw HTML as an attachment, so fetch it as a
  // blob and trigger a browser download.
  async function handleDownload(letterId: string, letterType: string) {
    setDownloadingId(letterId);
    try {
      const response = await api.get(`/self-service/my-letters/${letterId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${letterType}_letter.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      const res = await api.post("/self-service/my-exit/withdraw");
      setExit(res.data?.data ?? null);
      toast.success("Resignation withdrawn");
      setConfirmWithdraw(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to withdraw resignation");
    } finally {
      setWithdrawing(false);
    }
  }

  // Employees can withdraw their own resignation only while it's still early.
  const canWithdraw = exit && (exit.status === "initiated" || exit.status === "notice_period");

  if (loading) {
    return <LoadingState />;
  }

  if (!exit) {
    return (
      <Page>
        <PageHeader><PageHeaderContent><PageTitle>My Exit Status</PageTitle><PageDescription>Track your exit process.</PageDescription></PageHeaderContent></PageHeader>
        <div className="surface-card">
          <EmptyState title="You don't have an active exit request." icon={UserMinus} action={<ButtonLink to="/exits/resign">Submit Resignation</ButtonLink>} />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader><PageHeaderContent><PageTitle>My Exit Status</PageTitle><PageDescription>Track your exit process and pending actions.</PageDescription></PageHeaderContent></PageHeader>

      {/* Status Card */}
      <div className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Exit Request</h2>
              <Badge tone={STATUS_TONES[exit.status] || "neutral"}>
                {STATUS_LABELS[exit.status] || exit.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground capitalize">
              {exit.exit_type?.replace(/_/g, " ")} &middot; {exit.reason_category?.replace(/_/g, " ")}
            </p>
          </div>
          {canWithdraw && (
            <Button
              onClick={() => setConfirmWithdraw(true)}
              className="self-start"
              variant="danger"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Withdraw Resignation
            </Button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resignation Date</p>
            <p className="mt-0.5 text-sm text-foreground">
              {exit.resignation_date ? formatDate(exit.resignation_date) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Working Date</p>
            <p className="mt-0.5 text-sm text-foreground">
              {exit.last_working_date ? formatDate(exit.last_working_date) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notice Period</p>
            <p className="mt-0.5 text-sm text-foreground">
              {exit.notice_period_days} days
              {exit.notice_period_waived ? " (waived)" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Initiated On</p>
            <p className="mt-0.5 text-sm text-foreground">{formatDate(exit.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Notice Buyout Card */}
      {exit && exit.status !== "completed" && exit.status !== "cancelled" && (
        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/40">
                <Calculator className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Notice Period Buyout</h3>
                <p className="text-xs text-muted-foreground">Want to leave before your notice period ends?</p>
              </div>
            </div>
            <Link
              to="/buyout/calculator"
              className="button-primary"
            >
              <Calculator className="h-4 w-4" />
              Calculate Buyout
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {exit.checklist_summary && (
          <div className="surface-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <ClipboardCheck className="h-5 w-5 text-rose-500" />
              Checklist Progress
            </div>
            <p className="text-3xl font-bold text-foreground">{exit.checklist_summary.progress}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {exit.checklist_summary.completed} / {exit.checklist_summary.total} items done
            </p>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-[width]"
                style={{ width: `${exit.checklist_summary.progress}%` }}
              />
            </div>
          </div>
        )}

        {exit.clearance_summary && (
          <div className="surface-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <Shield className="h-5 w-5 text-rose-500" />
              Clearance Progress
            </div>
            <p className="text-3xl font-bold text-foreground">{exit.clearance_summary.progress}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {exit.clearance_summary.approved} / {exit.clearance_summary.total} departments
            </p>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-[width]"
                style={{ width: `${exit.clearance_summary.progress}%` }}
              />
            </div>
          </div>
        )}

        {exit.fnf_summary ? (
          <div className="surface-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <DollarSign className="h-5 w-5 text-rose-500" />
              Full & Final
            </div>
            <p className="text-3xl font-bold text-foreground capitalize">{exit.fnf_summary.status}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {exit.fnf_summary.total_payable}
            </p>
          </div>
        ) : (
          <div className="surface-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <DollarSign className="h-5 w-5 text-muted-foreground/50" />
              Full & Final
            </div>
            <p className="text-sm text-muted-foreground mt-2">Not yet initiated</p>
          </div>
        )}
      </div>

      {/* Checklist Items */}
      {checklist && checklist.items && checklist.items.length > 0 && (
        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">My Checklist</h2>
          </div>
          <div className="divide-y divide-border px-6">
            {checklist.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {item.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-border" />
                  )}
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      item.status === "completed" ? "text-muted-foreground line-through" : "text-foreground",
                    )}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    CHECKLIST_STATUS_COLORS[item.status] || "bg-muted text-muted-foreground",
                  )}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Documents */}
      {letters.length > 0 && (
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <FileSignature className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-foreground">My Documents</h2>
          </div>
          <div className="divide-y divide-border px-6">
            {letters.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {LETTER_TYPES[l.letter_type] || l.letter_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Issued: {l.issued_date ? formatDate(l.issued_date) : "—"}
                  </p>
                </div>
                <Button
                  onClick={() => handleDownload(l.id, l.letter_type)}
                  disabled={downloadingId === l.id}
                  variant="secondary"
                  className="min-h-10 px-3 text-xs"
                >
                  {downloadingId === l.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw confirmation */}
      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw Resignation?"
        message="This cancels your exit request. Your manager and HR will be notified. You can submit a new resignation later if needed."
        confirmLabel="Withdraw"
        cancelLabel="Keep Resignation"
        tone="danger"
        loading={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </Page>
  );
}
