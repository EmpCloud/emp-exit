import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
} from "lucide-react";
import { apiGet } from "@/api/client";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-blue-100 text-blue-700",
  screening: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  hired: "bg-emerald-100 text-emerald-800",
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const perPage = 20;

  async function fetchRequests() {
    setLoading(true);
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
      toast.error("Failed to load rehire requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rehire Proposals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage rehire requests for former employees.
          </p>
        </div>
        <Link
          to="/alumni"
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
        >
          <UserPlus className="h-4 w-4" />
          Browse Alumni
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
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
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <UserPlus className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          No rehire requests found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Exit Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req: any) => {
                  const name = req.employee
                    ? `${req.employee.first_name} ${req.employee.last_name}`
                    : `Employee #${req.employee_id}`;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{name}</p>
                          {req.employee?.emp_code && (
                            <p className="text-xs text-gray-500">{req.employee.emp_code}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{req.position}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{req.department || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {REASON_LABELS[req.exit_reason] || req.exit_reason || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[req.status] || "bg-gray-100 text-gray-700"}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/rehire/${req.id}`}
                          className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700"
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
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
