import { useState, useEffect, useCallback } from "react";
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

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-gray-100 text-gray-600", label: "Draft" },
  calculated: { bg: "bg-blue-100 text-blue-700", label: "Calculated" },
  approved: { bg: "bg-green-100 text-green-700", label: "Approved" },
  paid: { bg: "bg-emerald-100 text-emerald-700", label: "Paid" },
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

export function FnFDetailPage() {
  const { id: exitId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [fnf, setFnf] = useState<FnFSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);

  // Editable fields (in smallest currency units)
  const [basicSalaryDue, setBasicSalaryDue] = useState(0);
  const [leaveEncashment, setLeaveEncashment] = useState(0);
  const [gratuity, setGratuity] = useState(0);
  const [bonusDue, setBonusDue] = useState(0);
  const [otherEarnings, setOtherEarnings] = useState(0);
  const [noticePayRecovery, setNoticePayRecovery] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [remarks, setRemarks] = useState("");

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
  const isEditable = !isPaid;

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
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">INR</span>
        <input
          type="number"
          value={value / 100}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
          disabled={disabled || !isEditable}
          className="w-32 rounded border border-gray-300 px-2 py-1 text-right text-sm font-mono focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:bg-gray-50 disabled:text-gray-500"
          step="0.01"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    );
  }

  const statusInfo = fnf ? STATUS_CONFIG[fnf.status] || STATUS_CONFIG.draft : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-rose-600" />
            Full & Final Settlement
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Exit #{exitId?.slice(0, 8)}
          </p>
        </div>
        {statusInfo && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
              statusInfo.bg,
            )}
          >
            {statusInfo.label}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Calculate button if no FnF exists */}
      {!fnf && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Calculator className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">No FnF settlement yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Calculate the full and final settlement for this exit.
          </p>
          <button
            onClick={handleCalculate}
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            <Calculator className="h-4 w-4" />
            {saving ? "Calculating..." : "Calculate FnF"}
          </button>
        </div>
      )}

      {/* Two-column layout */}
      {fnf && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Earnings */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
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
              <div className="border-t border-gray-200 px-6 py-3 bg-green-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-800">Total Earnings</span>
                  <span className="text-sm font-bold font-mono text-green-800">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
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
              <div className="border-t border-gray-200 px-6 py-3 bg-red-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-800">Total Deductions</span>
                  <span className="text-sm font-bold font-mono text-red-800">
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
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50",
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Net Payable</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Earnings ({formatCurrency(totalEarnings)}) - Deductions (
                  {formatCurrency(totalDeductions)})
                </p>
              </div>
              <span
                className={cn(
                  "text-2xl font-bold font-mono",
                  netPayable >= 0 ? "text-green-700" : "text-red-700",
                )}
              >
                {formatCurrency(netPayable)}
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={!isEditable}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Optional remarks..."
            />
          </div>

          {/* Breakdown info */}
          {fnf.breakdown_json && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Calculation Details</h3>
              <pre className="text-xs text-gray-500 bg-gray-50 rounded p-3 overflow-x-auto">
                {JSON.stringify(JSON.parse(fnf.breakdown_json), null, 2)}
              </pre>
            </div>
          )}

          {/* Paid info */}
          {fnf.paid_date && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <Banknote className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Payment Completed</p>
                <p className="text-xs text-emerald-600">Paid on {formatDate(fnf.paid_date)}</p>
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
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recalculate
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark as Paid</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Reference
              </label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="e.g. TXN-12345 or bank reference"
              />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setPayRef("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
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
