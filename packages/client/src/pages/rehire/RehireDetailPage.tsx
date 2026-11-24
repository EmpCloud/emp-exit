import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  UserPlus,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  Calendar,
  DollarSign,
} from "lucide-react";
import { apiGet, apiPut, apiPost } from "@/api/client";
import toast from "react-hot-toast";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  screening: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300",
  approved: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  rejected: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  hired: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300",
};

const REASON_LABELS: Record<string, string> = {
  better_opportunity: "Better Opportunity",
  compensation: "Compensation",
  relocation: "Relocation",
  personal: "Personal",
  health: "Health",
  higher_education: "Higher Education",
  retirement: "Retirement",
  performance: "Performance",
  misconduct: "Misconduct",
  redundancy: "Redundancy",
  other: "Other",
};

export function RehireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/rehire/${id}`);
      if (res.success) {
        setData(res.data);
      }
    } catch {
      toast.error("Failed to load rehire request");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  async function handleStatusUpdate(status: string) {
    setActionLoading(true);
    try {
      const res = await apiPut<any>(`/rehire/${id}/status`, { status, notes: notes || undefined });
      if (res.success) {
        toast.success(`Status updated to ${status}`);
        setNotes("");
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  function handleComplete() {
    setShowCompleteConfirm(true);
  }

  async function confirmComplete() {
    setActionLoading(true);
    try {
      const res = await apiPost<any>(`/rehire/${id}/complete`);
      if (res.success) {
        toast.success("Rehire completed — employee reactivated");
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to complete rehire");
    } finally {
      setActionLoading(false);
      setShowCompleteConfirm(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading rehire request" />;
  }

  if (!data) {
    return (
      <div className="surface-card"><EmptyState icon={UserPlus} title="Rehire request not found." /></div>
    );
  }

  const employeeName = data.employee
    ? `${data.employee.first_name} ${data.employee.last_name}`
    : `Employee #${data.employee_id}`;
  const activeLocale = document.documentElement.lang || navigator.language;

  return (
    <div className="app-page">
      <header className="page-header">
        <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/rehire")}
          className="button-secondary size-11 shrink-0 p-0"
          aria-label="Back to rehire proposals"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="page-header__content">
          <p className="page-header__eyebrow">Rehire workflow</p>
          <h1 className="page-title">Rehire: {employeeName}</h1>
          <span className={`status-pill mt-2 border-transparent capitalize ${STATUS_COLORS[data.status] || "bg-muted text-muted-foreground"}`}>
            {data.status}
          </span>
        </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Old profile */}
        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Previous Employment
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="text-sm font-medium text-foreground">{employeeName}</dd>
            </div>
            {data.employee?.emp_code && (
              <div>
                <dt className="text-xs text-muted-foreground">Employee Code</dt>
                <dd className="text-sm text-muted-foreground">{data.employee.emp_code}</dd>
              </div>
            )}
            {data.employee?.designation && (
              <div>
                <dt className="text-xs text-muted-foreground">Last Designation</dt>
                <dd className="text-sm text-muted-foreground">{data.employee.designation}</dd>
              </div>
            )}
            {data.original_exit && (
              <>
                <div>
                  <dt className="text-xs text-muted-foreground">Exit Type</dt>
                  <dd className="text-sm text-muted-foreground capitalize">{data.original_exit.exit_type?.replace("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Exit Reason</dt>
                  <dd className="text-sm text-muted-foreground">
                    {REASON_LABELS[data.original_exit.reason_category] || data.original_exit.reason_category}
                  </dd>
                </div>
                {data.original_exit.reason_detail && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Reason Detail</dt>
                    <dd className="text-sm text-muted-foreground">{data.original_exit.reason_detail}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Exit Date</dt>
                  <dd className="text-sm text-muted-foreground">
                    {data.original_exit.actual_exit_date || data.original_exit.last_working_date || "N/A"}
                  </dd>
                </div>
              </>
            )}
            {data.employee?.date_of_joining && (
              <div>
                <dt className="text-xs text-muted-foreground">Original Joining Date</dt>
                <dd className="text-sm text-muted-foreground">{data.employee.date_of_joining}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Right: Proposed position */}
        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Proposed New Position
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-muted-foreground">Position</dt>
              <dd className="text-sm font-medium text-foreground">{data.position}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Department</dt>
              <dd className="text-sm text-muted-foreground">{data.department || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Proposed Salary</dt>
              <dd className="text-sm font-semibold text-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {new Intl.NumberFormat(activeLocale).format(data.proposed_salary / 100)}
              </dd>
            </div>
            {data.original_exit_date && (
              <div>
                <dt className="text-xs text-muted-foreground">Original Exit Date</dt>
                <dd className="text-sm text-muted-foreground">{data.original_exit_date}</dd>
              </div>
            )}
            {data.rehire_date && (
              <div>
                <dt className="text-xs text-muted-foreground">Rehire Date</dt>
                <dd className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {data.rehire_date}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">Proposed On</dt>
              <dd className="text-sm text-muted-foreground">{formatDate(data.created_at, activeLocale)}</dd>
            </div>
          </dl>

          {data.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{data.notes}</p>
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      {data.status !== "hired" && data.status !== "rejected" && (
        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Actions</h2>

          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">Add Note (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="control min-h-24 py-3"
              placeholder="Reason for status change..."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {data.status === "proposed" && (
              <button
                onClick={() => handleStatusUpdate("screening")}
                disabled={actionLoading}
                className="button-base border border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
              >
                Move to Screening
              </button>
            )}
            {(data.status === "proposed" || data.status === "screening") && (
              <>
                <button
                  onClick={() => handleStatusUpdate("approved")}
                  disabled={actionLoading}
                  className="button-base border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={actionLoading}
                  className="button-danger"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
            {data.status === "approved" && (
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="button-base border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <UserPlus className="h-4 w-4" />
                Complete Rehire & Reactivate
              </button>
            )}
          </div>
        </section>
      )}
      <ConfirmDialog
        open={showCompleteConfirm}
        title="Complete rehire?"
        message="This will reactivate the employee in the system and complete the rehire workflow."
        confirmLabel="Complete rehire"
        cancelLabel="Cancel"
        tone="primary"
        loading={actionLoading}
        onConfirm={confirmComplete}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </div>
  );
}
