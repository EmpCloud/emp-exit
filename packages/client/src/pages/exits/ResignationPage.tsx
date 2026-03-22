import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserMinus, Loader2 } from "lucide-react";
import { apiPost } from "@/api/client";

const REASON_CATEGORIES = [
  { value: "better_opportunity", label: "Better Opportunity" },
  { value: "compensation", label: "Compensation" },
  { value: "relocation", label: "Relocation" },
  { value: "personal", label: "Personal Reasons" },
  { value: "health", label: "Health" },
  { value: "higher_education", label: "Higher Education" },
  { value: "other", label: "Other" },
];

export function ResignationPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [reasonCategory, setReasonCategory] = useState("better_opportunity");
  const [reasonDetail, setReasonDetail] = useState("");
  const [resignationDate, setResignationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [lastWorkingDate, setLastWorkingDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const body: Record<string, any> = {
        reason_category: reasonCategory,
        resignation_date: resignationDate,
      };
      if (reasonDetail) body.reason_detail = reasonDetail;
      if (lastWorkingDate) body.last_working_date = lastWorkingDate;

      await apiPost("/self-service/resign", body);
      setSuccess(true);
      setTimeout(() => navigate("/exits/my"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to submit resignation");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Resignation</h1>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <UserMinus className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-lg font-semibold text-green-800">Resignation Submitted</h2>
          <p className="mt-2 text-sm text-green-700">
            Your resignation has been submitted successfully. Redirecting to your exit status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Resignation</h1>
        <p className="mt-1 text-sm text-gray-500">Submit your resignation request.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Reason Category */}
          <div>
            <label htmlFor="reason_category" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Leaving <span className="text-red-500">*</span>
            </label>
            <select
              id="reason_category"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {REASON_CATEGORIES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Reason Detail */}
          <div>
            <label htmlFor="reason_detail" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details
            </label>
            <textarea
              id="reason_detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={4}
              placeholder="Please share any additional details about your decision..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="resignation_date" className="block text-sm font-medium text-gray-700 mb-1">
                Resignation Date <span className="text-red-500">*</span>
              </label>
              <input
                id="resignation_date"
                type="date"
                required
                value={resignationDate}
                onChange={(e) => setResignationDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label htmlFor="last_working_date" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Last Working Date
              </label>
              <input
                id="last_working_date"
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Subject to notice period requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !resignationDate}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            Submit Resignation
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
