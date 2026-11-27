import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { apiGet } from "@/api/client";
import toast from "react-hot-toast";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

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

export function RehireListPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const perPage = 20;

  async function fetchRequests() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>("/rehire", {
        page,
        perPage,
        status: statusFilter || undefined,
      });
      if (res.success) {
        const payload = res.data;
        setRequests(payload?.data || []);
        setTotal(payload?.total || 0);
        setTotalPages(payload?.totalPages || 0);
      }
    } catch {
      setError("We couldn't load the rehire proposals. Check your connection and try again.");
      toast.error("Failed to load rehire requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  return (
    <div className="app-page">
      <header className="page-header">
        <div className="page-header__content">
          <p className="page-header__eyebrow">Alumni & Insights</p>
          <h1 className="page-title">Rehire Proposals</h1>
          <p className="page-subtitle">
            Review and manage rehire requests for former employees.
          </p>
        </div>
        <Link
          to="/alumni"
          className="button-primary"
        >
          <UserPlus className="h-4 w-4" />
          Browse Alumni
        </Link>
      </header>

      {/* Filters */}
      <div className="surface-card flex flex-wrap gap-3 p-4">
        <label htmlFor="rehire-status-filter" className="sr-only">Filter rehire proposals by status</label>
        <select
          id="rehire-status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="control max-w-xs"
        >
          <option value="">All Statuses</option>
          <option value="proposed">Proposed</option>
          <option value="screening">Screening</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      {loading ? (
        <LoadingState label="Loading rehire proposals" />
      ) : error ? (
        <div className="surface-card">
          <ErrorState
            title="Rehire proposals unavailable"
            description={error}
            action={<Button onClick={fetchRequests}>Try again</Button>}
          />
        </div>
      ) : requests.length === 0 ? (
        <div className="surface-card"><EmptyState icon={UserPlus} title="No rehire requests found." /></div>
      ) : (
        <>
          <div className="data-table-shell data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Employee</th>
                  <th scope="col">Position</th>
                  <th scope="col">Department</th>
                  <th scope="col">Exit Reason</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any) => {
                  const name = req.employee
                    ? `${req.employee.first_name} ${req.employee.last_name}`
                    : `Employee #${req.employee_id}`;
                  return (
                    <tr key={req.id}>
                      <td>
                        <div>
                          <p className="text-sm font-medium text-foreground">{name}</p>
                          {req.employee?.emp_code && (
                            <p className="text-xs text-muted-foreground">{req.employee.emp_code}</p>
                          )}
                        </div>
                      </td>
                      <td className="text-muted-foreground">{req.position}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{req.department || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {REASON_LABELS[req.exit_reason] || req.exit_reason || "—"}
                      </td>
                      <td>
                        <span className={`status-pill border-transparent capitalize ${STATUS_COLORS[req.status] || "bg-muted text-muted-foreground"}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground" data-numeric>
                        {formatDate(req.created_at)}
                      </td>
                      <td>
                        <Link
                          to={`/rehire/${req.id}`}
                          className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="button-secondary size-11 p-0"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="button-secondary size-11 p-0"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
