import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserMinus, Loader2, Search, X } from "lucide-react";
import { apiPost, apiGet } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Page, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";

const EXIT_TYPES = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "end_of_contract", label: "End of Contract" },
  { value: "mutual_separation", label: "Mutual Separation" },
  { value: "absconding", label: "Absconding" },
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
  // Tracks whether the admin has manually overridden the auto-suggested LWD,
  // so we stop recomputing it from resignation date + notice period.
  const [lwdManuallySet, setLwdManuallySet] = useState(false);
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);

  // Auto-suggest Last Working Date = Resignation Date + Notice Period.
  // This is the normal flow (resign → serve notice → leave) and stops admins
  // from typing an LWD that's before the resignation date. The admin can still
  // override it; once they do, we leave their value alone.
  useEffect(() => {
    if (lwdManuallySet || !resignationDate) return;
    const days = noticePeriodWaived ? 0 : Number(noticePeriodDays) || 0;
    const d = new Date(resignationDate);
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + days);
    setLastWorkingDate(d.toISOString().split("T")[0]);
  }, [resignationDate, noticePeriodDays, noticePeriodWaived, lwdManuallySet]);

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

  // Date sanity check — last working day must not be before the resignation
  // date. Surfaced both inline below the date inputs and as a submit guard.
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
    <Page>
      <PageHeader><PageHeaderContent><PageTitle>Initiate Exit</PageTitle><PageDescription>Start a new exit process for an employee.</PageDescription></PageHeaderContent></PageHeader>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
        <Card><CardContent className="space-y-5 pt-6">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Employee picker — #4 — search by name / email / emp_code,
              resolves to the underlying user.id on selection. */}
          <div className="relative">
            <label htmlFor="employee_search" className="field-label">
              Employee <span className="text-red-500">*</span>
            </label>
            {selectedEmployee ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedEmployee.emp_code ? `${selectedEmployee.emp_code} · ` : ""}
                    {selectedEmployee.email}
                    {selectedEmployee.designation ? ` · ${selectedEmployee.designation}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearEmployee}
                  aria-label="Clear selection"
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="employee_search"
                    type="text"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showResults && !!employeeQuery.trim()}
                    aria-controls="employee-search-results"
                    value={employeeQuery}
                    onChange={(e) => {
                      setEmployeeQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 150)}
                    placeholder="Search by name, email, or employee code (e.g. E-101)..."
                    className="control ps-9 pe-3"
                  />
                </div>
                {showResults && employeeQuery.trim() && (
                  <div id="employee-search-results" role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-floating">
                    {searchingEmployees ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> Searching…
                      </div>
                    ) : employeeResults.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No matching employees.</p>
                    ) : (
                      employeeResults.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onMouseDown={(e) => {
                            // onMouseDown so it fires before the input's onBlur
                            // closes the dropdown.
                            e.preventDefault();
                            setSelectedEmployee(emp);
                            setEmployeeQuery("");
                            setEmployeeResults([]);
                            setShowResults(false);
                          }}
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeQuery("");
                            setEmployeeResults([]);
                            setShowResults(false);
                          }}
                          className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-start hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {emp.emp_code ? `${emp.emp_code} · ` : ""}{emp.email}
                            </p>
                          </div>
                          {emp.designation && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
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
            <label htmlFor="exit_type" className="field-label">
              Exit Type <span className="text-red-500">*</span>
            </label>
            <select
              id="exit_type"
              value={exitType}
              onChange={(e) => setExitType(e.target.value)}
              className="control"
            >
              {EXIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Reason Category */}
          <div>
            <label htmlFor="reason_category" className="field-label">
              Reason Category <span className="text-red-500">*</span>
            </label>
            <select
              id="reason_category"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="control"
            >
              {REASON_CATEGORIES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Reason Detail */}
          <div>
            <label htmlFor="reason_detail" className="field-label">
              Reason Notes
            </label>
            <textarea
              id="reason_detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={3}
              placeholder="Additional details about the reason for exit..."
              className="control min-h-28 py-3"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="resignation_date" className="field-label">
                Resignation Date
              </label>
              <input
                id="resignation_date"
                type="date"
                value={resignationDate}
                onChange={(e) => setResignationDate(e.target.value)}
                className="control"
              />
            </div>
            <div>
              <label htmlFor="last_working_date" className="field-label">
                Last Working Date
              </label>
              <input
                id="last_working_date"
                type="date"
                value={lastWorkingDate}
                onChange={(e) => { setLastWorkingDate(e.target.value); setLwdManuallySet(true); }}
                min={resignationDate || undefined}
                className="control"
              />
              {resignationDate && !lwdManuallySet && lastWorkingDate && !dateError && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Suggested from resignation date + {noticePeriodWaived ? "0 (waived)" : `${noticePeriodDays || 0}`} day notice.
                </p>
              )}
            </div>
          </div>

          {dateError && (
            <div role="alert" className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {dateError}
            </div>
          )}

          {/* Notice Period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="notice_period_days" className="field-label">
                Notice Period (days)
              </label>
              <input
                id="notice_period_days"
                type="number"
                min={0}
                value={noticePeriodDays}
                onChange={(e) => setNoticePeriodDays(e.target.value)}
                className="control"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noticePeriodWaived}
                  onChange={(e) => setNoticePeriodWaived(e.target.checked)}
                  className="size-5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">Waive notice period</span>
              </label>
            </div>
          </div>
        </CardContent></Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting || !selectedEmployee || !!dateError}
          >
            {submitting ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus aria-hidden="true" className="h-4 w-4" />
            )}
            Initiate Exit
          </Button>
          <Button
            type="button"
            onClick={() => navigate("/exits")}
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Page>
  );
}
