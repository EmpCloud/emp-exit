import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserMinus, Loader2, Search, X } from "lucide-react";
import { apiPost, apiGet } from "@/api/client";

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
  full_name: string;
  email: string;
  emp_code: string | null;
  designation: string | null;
}

export function InitiateExitPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Employee picker
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const [exitType, setExitType] = useState("resignation");
  const [reasonCategory, setReasonCategory] = useState("better_opportunity");
  const [reasonDetail, setReasonDetail] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [lastWorkingDate, setLastWorkingDate] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<Employee[]>("/users");
        if (!cancelled) setEmployees(res.data ?? []);
      } catch {
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees.slice(0, 50);
    return employees
      .filter((e) => {
        const hay = `${e.full_name} ${e.email} ${e.emp_code ?? ""} ${e.designation ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [employees, employeeSearch]);

  const dateError =
    resignationDate && lastWorkingDate && lastWorkingDate < resignationDate
      ? "Last working day cannot be earlier than the resignation date"
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedEmployee) {
      setError("Pick an employee to initiate exit for");
      return;
    }
    if (dateError) {
      setError(dateError);
      return;
    }
    setSubmitting(true);

    try {
      const body: Record<string, any> = {
        employee_id: selectedEmployee.id,
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

          {/* Employee picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            {selectedEmployee ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedEmployee.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedEmployee.email}
                    {selectedEmployee.emp_code ? ` · ${selectedEmployee.emp_code}` : ""}
                    {selectedEmployee.designation ? ` · ${selectedEmployee.designation}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployee(null);
                    setEmployeeSearch("");
                    setShowEmployeeDropdown(true);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  title="Change employee"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setShowEmployeeDropdown(true);
                  }}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  placeholder={
                    loadingEmployees
                      ? "Loading employees..."
                      : "Search by name, email, employee code, or designation"
                  }
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                {showEmployeeDropdown && !loadingEmployees && (
                  <div className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        {employees.length === 0
                          ? "No employees available. All active employees may already have an open exit."
                          : "No matches."}
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setShowEmployeeDropdown(false);
                            setEmployeeSearch("");
                          }}
                          className="block w-full text-left px-3 py-2 hover:bg-rose-50"
                        >
                          <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {emp.email}
                            {emp.emp_code ? ` · ${emp.emp_code}` : ""}
                            {emp.designation ? ` · ${emp.designation}` : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {!loadingEmployees && employees.length === 0 && !selectedEmployee && (
              <p className="mt-2 text-xs text-amber-700">
                No employees are available. Add employees in EmpCloud or close any open exits before initiating a new one.
              </p>
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
                min={resignationDate || undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {dateError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {dateError}
            </div>
          )}

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
            disabled={submitting || !selectedEmployee || !!dateError}
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
