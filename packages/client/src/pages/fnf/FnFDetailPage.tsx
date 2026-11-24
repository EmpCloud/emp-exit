import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calculator,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Banknote,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import type { FnFSettlement, FnFStatus } from "@emp-exit/shared";
import { EmptyState, LoadingState } from "@/components/ui/States";

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-muted text-muted-foreground", label: "Draft" },
  calculated: { bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", label: "Calculated" },
  approved: { bg: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300", label: "Approved" },
  paid: { bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", label: "Paid" },
};

function formatCurrency(amount: number): string {
  // Amount is in smallest currency unit (paise), convert to rupees
  const rupees = amount / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(rupees);
}

// Renders the FnF breakdown_json as a friendly label/value list instead of a
// raw JSON dump. Known keys get a human label + typed formatting; anything
// unrecognized still shows, so nothing is hidden.
const BREAKDOWN_FIELDS: { key: string; label: string; type: "money" | "date" | "days" | "bool" }[] = [
  { key: "last_basic_salary", label: "Last Basic Salary", type: "money" },
  { key: "date_of_joining", label: "Date of Joining", type: "date" },
  { key: "lwd", label: "Last Working Date", type: "date" },
  { key: "notice_start_date", label: "Notice Period Start", type: "date" },
  { key: "notice_days", label: "Notice Period", type: "days" },
  { key: "notice_waived", label: "Notice Waived", type: "bool" },
  { key: "calculated_at", label: "Calculated On", type: "date" },
];

function CalculationDetails({ raw }: { raw: string }) {
  let data: Record<string, any>;
  try {
    data = JSON.parse(raw);
  } catch {
    return <p className="text-xs text-muted-foreground">No calculation details available.</p>;
  }

  const fmt = (type: string, value: any): string => {
    if (value === null || value === undefined || value === "") return "—";
    switch (type) {
      case "money":
        return formatCurrency(Number(value) || 0);
      case "date":
        return formatDate(value);
      case "days":
        return `${value} days`;
      case "bool":
        return value === 1 || value === true || value === "1" ? "Yes" : "No";
      default:
        return String(value);
    }
  };

  const known = new Set(BREAKDOWN_FIELDS.map((f) => f.key));
  const extras = Object.keys(data).filter((k) => !known.has(k));

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {BREAKDOWN_FIELDS.filter((f) => f.key in data).map((f) => (
        <div key={f.key} className="flex items-center justify-between border-b border-border py-1">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="text-sm font-medium text-foreground">{fmt(f.type, data[f.key])}</dd>
        </div>
      ))}
      {extras.map((k) => (
        <div key={k} className="flex items-center justify-between border-b border-border py-1">
          <dt className="text-xs text-muted-foreground">{k.replace(/_/g, " ")}</dt>
          <dd className="text-sm font-medium text-foreground">{String(data[k])}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FnFDetailPage() {
  const { id: exitId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [fnf, setFnf] = useState<FnFSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);
  const payDialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const payBusyRef = useRef(false);
  payBusyRef.current = saving;

  // Editable fields (in smallest currency units)
  const [basicSalaryDue, setBasicSalaryDue] = useState(0);
  const [leaveEncashment, setLeaveEncashment] = useState(0);
  const [gratuity, setGratuity] = useState(0);
  const [bonusDue, setBonusDue] = useState(0);
  const [otherEarnings, setOtherEarnings] = useState(0);
  const [noticePayRecovery, setNoticePayRecovery] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!showPayModal) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => document.getElementById("payment-reference")?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !payBusyRef.current) {
        event.preventDefault();
        setShowPayModal(false);
        setPayRef("");
        return;
      }
      if (event.key !== "Tab" || !payDialogRef.current) return;
      const focusable = Array.from(payDialogRef.current.querySelectorAll<HTMLElement>(
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
  }, [showPayModal]);

  const fetchFnF = useCallback(async () => {
    if (!exitId) return;
    try {
      const res = await apiGet<FnFSettlement>(`/fnf/exit/${exitId}`);
      const data = res.data;
      setFnf(data || null);
      if (data) {
        setBasicSalaryDue(data.basic_salary_due);
        setLeaveEncashment(data.leave_encashment);
        setGratuity(data.gratuity);
        setBonusDue(data.bonus_due);
        setOtherEarnings(data.other_earnings);
        setNoticePayRecovery(data.notice_pay_recovery);
        setOtherDeductions(data.other_deductions);
        setRemarks(data.remarks || "");
      }
    } catch {
      // FnF might not exist yet, that's OK
    } finally {
      setLoading(false);
    }
  }, [exitId]);

  useEffect(() => {
    fetchFnF();
  }, [fetchFnF]);

  const totalEarnings = basicSalaryDue + leaveEncashment + gratuity + bonusDue + otherEarnings;
  const totalDeductions = noticePayRecovery + otherDeductions;
  const netPayable = totalEarnings - totalDeductions;

  const isPaid = fnf?.status === "paid";
  const isApproved = fnf?.status === "approved";
  // Once approved or paid, the settlement is locked — amounts shouldn't change.
  const isEditable = !isPaid && !isApproved;

  const handleCalculate = async () => {
    if (!exitId) return;
    setSaving(true);
    try {
      await apiPost(`/fnf/exit/${exitId}/calculate`);
      await fetchFnF();
    } catch {
      setError("Failed to calculate FnF");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!exitId) return;
    setSaving(true);
    try {
      await apiPut(`/fnf/exit/${exitId}`, {
        basic_salary_due: basicSalaryDue,
        leave_encashment: leaveEncashment,
        gratuity,
        bonus_due: bonusDue,
        other_earnings: otherEarnings,
        notice_pay_recovery: noticePayRecovery,
        other_deductions: otherDeductions,
        remarks: remarks || undefined,
      });
      await fetchFnF();
    } catch {
      setError("Failed to save FnF");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!exitId) return;
    setSaving(true);
    try {
      await apiPost(`/fnf/exit/${exitId}/approve`);
      await fetchFnF();
    } catch {
      setError("Failed to approve FnF");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!exitId || !payRef.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/fnf/exit/${exitId}/mark-paid`, {
        payment_reference: payRef.trim(),
      });
      setShowPayModal(false);
      setPayRef("");
      await fetchFnF();
    } catch {
      setError("Failed to mark as paid");
    } finally {
      setSaving(false);
    }
  };

  const AmountField = ({
    label,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">INR</span>
        <input
          type="number"
          value={value / 100}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
          disabled={disabled || !isEditable}
          readOnly={!isEditable}
          className="control w-32 text-right font-mono disabled:bg-muted/50 disabled:text-muted-foreground read-only:bg-muted/50 read-only:text-muted-foreground"
          step="0.01"
        />
      </div>
    </div>
  );

  if (loading) {
    return <div className="surface-card"><LoadingState /></div>;
  }

  const statusInfo = fnf ? STATUS_CONFIG[fnf.status] || STATUS_CONFIG.draft : null;

  return (
    <div className="app-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__content">
          <button
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="page-title flex items-center gap-2">
            <Calculator className="size-6 text-primary" />
            Full & Final Settlement
          </h1>
          <p className="page-subtitle">
            Exit #{exitId?.slice(0, 8)}
          </p>
        </div>
        {statusInfo && (
          <span
            className={cn(
              "status-pill",
              statusInfo.bg,
            )}
          >
            {statusInfo.label}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ms-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Calculate button if no FnF exists */}
      {!fnf && (
        <div className="surface-card">
          <EmptyState
            icon={Calculator}
            title="No FnF settlement yet"
            description="Calculate the full and final settlement for this exit."
            action={(
              <button onClick={handleCalculate} disabled={saving} className="button-primary">
                <Calculator className="h-4 w-4" />
                {saving ? "Calculating..." : "Calculate FnF"}
              </button>
            )}
          />
        </div>
      )}

      {/* Two-column layout */}
      {fnf && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Earnings */}
            <div className="surface-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Earnings
                </h2>
              </div>
              <div className="px-6 py-3">
                <AmountField
                  label="Pending Salary (Pro-rata)"
                  value={basicSalaryDue}
                  onChange={setBasicSalaryDue}
                />
                <AmountField
                  label="Leave Encashment"
                  value={leaveEncashment}
                  onChange={setLeaveEncashment}
                />
                <AmountField
                  label="Gratuity"
                  value={gratuity}
                  onChange={setGratuity}
                />
                <AmountField
                  label="Bonus"
                  value={bonusDue}
                  onChange={setBonusDue}
                />
                <AmountField
                  label="Other Earnings"
                  value={otherEarnings}
                  onChange={setOtherEarnings}
                />
              </div>
              <div className="border-t border-border px-6 py-3 bg-green-50 dark:bg-green-950/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-800 dark:text-green-300">Total Earnings</span>
                  <span className="text-sm font-bold font-mono text-green-800 dark:text-green-300">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="surface-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Deductions
                </h2>
              </div>
              <div className="px-6 py-3">
                <AmountField
                  label="Notice Period Recovery"
                  value={noticePayRecovery}
                  onChange={setNoticePayRecovery}
                />
                <AmountField
                  label="Other Deductions"
                  value={otherDeductions}
                  onChange={setOtherDeductions}
                />
              </div>
              <div className="border-t border-border px-6 py-3 bg-red-50 dark:bg-red-950/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-800 dark:text-red-300">Total Deductions</span>
                  <span className="text-sm font-bold font-mono text-red-800 dark:text-red-300">
                    {formatCurrency(totalDeductions)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Payable */}
          <div
            className={cn(
              "rounded-lg border-2 p-6",
              netPayable >= 0
                ? "border-green-300 bg-green-50 dark:bg-green-950/40"
                : "border-red-300 bg-red-50 dark:bg-red-950/40",
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Payable</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Earnings ({formatCurrency(totalEarnings)}) - Deductions (
                  {formatCurrency(totalDeductions)})
                </p>
              </div>
              <span
                className={cn(
                  "text-2xl font-bold font-mono",
                  netPayable >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300",
                )}
              >
                {formatCurrency(netPayable)}
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div className="surface-card p-5">
            <label className="block text-sm font-medium text-muted-foreground mb-2">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={!isEditable}
              rows={3}
              className="control min-h-24 resize-y py-3 disabled:bg-muted/50 disabled:text-muted-foreground"
              placeholder="Optional remarks..."
            />
          </div>

          {/* Breakdown info */}
          {fnf.breakdown_json && (
            <div className="surface-card p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Calculation Details</h3>
              <CalculationDetails raw={fnf.breakdown_json} />
            </div>
          )}

          {/* Paid info */}
          {fnf.paid_date && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex items-center gap-3">
              <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Payment Completed</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Paid on {formatDate(fnf.paid_date)}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {isEditable && (
              <>
                <button
                  onClick={handleCalculate}
                  disabled={saving}
                  className="button-secondary"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recalculate
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="button-primary"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
            {fnf.status === "calculated" && (
              <button
                onClick={handleApprove}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </button>
            )}
            {isApproved && !isPaid && (
              <button
                onClick={() => setShowPayModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <Banknote className="h-4 w-4" />
                Mark Paid
              </button>
            )}
          </div>
        </>
      )}

      {/* Mark Paid Modal */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !payBusyRef.current) {
              setShowPayModal(false);
              setPayRef("");
            }
          }}
        >
          <div ref={payDialogRef} className="surface-card max-h-[90dvh] w-full max-w-md overflow-y-auto p-6 shadow-floating" role="dialog" aria-modal="true" aria-labelledby="mark-paid-title" tabIndex={-1}>
            <h3 id="mark-paid-title" className="text-lg font-semibold text-foreground mb-4">Mark as Paid</h3>
            <div>
              <label htmlFor="payment-reference" className="block text-sm font-medium text-muted-foreground mb-1">
                Payment Reference
              </label>
              <input
                id="payment-reference"
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="control"
                placeholder="e.g. TXN-12345 or bank reference"
              />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPayModal(false);
                  setPayRef("");
                }}
                className="button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={!payRef.trim() || saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
