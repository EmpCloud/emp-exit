import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserMinus, Loader2, Search, X } from "lucide-react";
import { apiPost, apiGet } from "@/api/client";
import { cn } from "@/lib/utils";

const EXIT_TYPES = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "end_of_contract", label: "End of Contract" },
  { value: "mutual_separation", label: "Mutual Separation" },
];

const REASON_CATEGORIES = [
  { value: "better_opportunity", label: "Better Opportunity" },
  { value: "compensation", label: "Compensation" },
  { value: "relocation", label: "Relocation" },
  { value: "personal", label: "Personal Reasons" },
  { value: "health", label: "Health" },
  { value: "higher_education", label: "Higher Education" },
  { value: "retirement", label: "Retirement" },
  { value: "performance", label: "Performance" },
  { value: "misconduct", label: "Misconduct" },
  { value: "redundancy", label: "Redundancy" },
  { value: "other", label: "Other" },
];

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  emp_code: string | null;
  designation: string | null;
}

export function InitiateExitPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // #4 — instead of asking the user to type a numeric DB id (which broke
  // when they typed "E-101" because the field was type="number"), present
  // a search-and-select picker that resolves any of name / email / emp_code
  // to the underlying user.id.
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeResults, setEmployeeResults] = useState<Employee[]>([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const employeeId = selectedEmployee ? String(selectedEmployee.id) : "";
  const [exitType, setExitType] = useState("resignation");
  const [reasonCategory, setReasonCategory] = useState("better_opportunity");
  const [reasonDetail, setReasonDetail] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [lastWorkingDate, setLastWorkingDate] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);

  // Debounced employee search (300ms). Discards stale responses by
  // comparing against the latest query at resolve time.
  useEffect(() => {
    if (selectedEmployee) return; // user already picked someone
    const q = employeeQuery.trim();
    if (!q) {
      setEmployeeResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearchingEmployees(true);
      try {
        const res = await apiGet<Employee[]>("/users/search", { q });
        // Only keep this response if the query hasn't changed in the meantime.
        if (employeeQuery.trim() === q) {
          setEmployeeResults(res.data ?? []);
        }
      } catch {
        // ignore network errors during typing
      } finally {
        setSearchingEmployees(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [employeeQuery, selectedEmployee]);

  function clearEmployee() {
    setSelectedEmployee(null);
    setEmployeeQuery("");
    setEmployeeResults([]);
    setShowResults(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const body: Record<string, any> = {
        employee_id: Number(employeeId),
        exit_type: exitType,
        reason_category: reasonCategory,
      };
      if (reasonDetail) body.reason_detail = reasonDetail;
      if (resignationDate) body.resignation_date = resignationDate;
      if (lastWorkingDate) body.last_working_date = lastWorkingDate;
      if (noticePeriodDays) body.notice_period_days = Number(noticePeriodDays);
      body.notice_period_waived = noticePeriodWaived;

      const res = await apiPost<any>("/exits", body);
      navigate(`/exits/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to initiate exit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Initiate Exit</h1>
        <p className="mt-1 text-sm text-gray-500">Start a new exit process for an employee.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Employee picker — #4 — search by name / email / emp_code,
              resolves to the underlying user.id on selection. */}
          <div className="relative">
            <label htmlFor="employee_search" className="block text-sm font-medium text-gray-700 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            {selectedEmployee ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {selectedEmployee.emp_code ? `${selectedEmployee.emp_code} · ` : ""}
                    {selectedEmployee.email}
                    {selectedEmployee.designation ? ` · ${selectedEmployee.designation}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearEmployee}
                  aria-label="Clear selection"
                  className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="employee_search"
                    type="text"
                    autoComplete="off"
                    value={employeeQuery}
                    onChange={(e) => {
                      setEmployeeQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 150)}
                    placeholder="Search by name, email, or employee code (e.g. E-101)..."
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                {showResults && employeeQuery.trim() && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    {searchingEmployees ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
                      </div>
                    ) : employeeResults.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-500">No matching employees.</p>
                    ) : (
                      employeeResults.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onMouseDown={(e) => {
                            // onMouseDown so it fires before the input's onBlur
                            // closes the dropdown.
                            e.preventDefault();
                            setSelectedEmployee(emp);
                            setEmployeeQuery("");
                            setEmployeeResults([]);
                            setShowResults(false);
                          }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {emp.emp_code ? `${emp.emp_code} · ` : ""}{emp.email}
                            </p>
                          </div>
                          {emp.designation && (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                              {emp.designation}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Exit Type */}
          <div>
            <label htmlFor="exit_type" className="block text-sm font-medium text-gray-700 mb-1">
              Exit Type <span className="text-red-500">*</span>
            </label>
            <select
              id="exit_type"
              value={exitType}
              onChange={(e) => setExitType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {EXIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Reason Category */}
          <div>
            <label htmlFor="reason_category" className="block text-sm font-medium text-gray-700 mb-1">
              Reason Category <span className="text-red-500">*</span>
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
              Reason Notes
            </label>
            <textarea
              id="reason_detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={3}
              placeholder="Additional details about the reason for exit..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="resignation_date" className="block text-sm font-medium text-gray-700 mb-1">
                Resignation Date
              </label>
              <input
                id="resignation_date"
                type="date"
                value={resignationDate}
                onChange={(e) => setResignationDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label htmlFor="last_working_date" className="block text-sm font-medium text-gray-700 mb-1">
                Last Working Date
              </label>
              <input
                id="last_working_date"
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Notice Period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="notice_period_days" className="block text-sm font-medium text-gray-700 mb-1">
                Notice Period (days)
              </label>
              <input
                id="notice_period_days"
                type="number"
                min={0}
                value={noticePeriodDays}
                onChange={(e) => setNoticePeriodDays(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noticePeriodWaived}
                  onChange={(e) => setNoticePeriodWaived(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700">Waive notice period</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !employeeId}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            Initiate Exit
          </button>
          <button
            type="button"
            onClick={() => navigate("/exits")}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
