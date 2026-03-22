import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Loader2, UserMinus } from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "initiated", label: "Initiated" },
  { value: "notice_period", label: "Notice Period" },
  { value: "clearance_pending", label: "Clearance Pending" },
  { value: "fnf_pending", label: "FnF Pending" },
  { value: "fnf_processed", label: "FnF Processed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-700",
  notice_period: "bg-amber-100 text-amber-700",
  clearance_pending: "bg-orange-100 text-orange-700",
  fnf_pending: "bg-purple-100 text-purple-700",
  fnf_processed: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
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

const TYPE_LABELS: Record<string, string> = {
  resignation: "Resignation",
  termination: "Termination",
  retirement: "Retirement",
  end_of_contract: "End of Contract",
  mutual_separation: "Mutual Separation",
};

interface ExitListItem {
  id: string;
  status: string;
  exit_type: string;
  created_at: string;
  last_working_date: string | null;
  resignation_date: string | null;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    designation: string | null;
    emp_code: string | null;
  } | null;
}

export function ExitListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [exits, setExits] = useState<ExitListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const params: Record<string, any> = { page, perPage: 20 };
        if (statusFilter) params.status = statusFilter;

        const res = await apiGet<any>("/exits", params);
        if (cancelled) return;

        setExits(res.data?.data ?? []);
        setTotal(res.data?.total ?? 0);
      } catch {
        if (!cancelled) {
          setExits([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, statusFilter]);

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
    if (value) {
      setSearchParams({ status: value });
    } else {
      setSearchParams({});
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exit Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all employee exit requests.
          </p>
        </div>
        <Link
          to="/exits/new"
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Initiate Exit
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="text-sm text-gray-500">
          {total} exit request{total !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
          </div>
        ) : exits.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <UserMinus className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No exit requests found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Resignation Date</th>
                    <th className="px-6 py-3">Last Working Date</th>
                    <th className="px-6 py-3">Initiated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exits.map((exit) => (
                    <tr key={exit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/exits/${exit.id}`}
                          className="font-medium text-gray-900 hover:text-rose-600"
                        >
                          {exit.employee
                            ? `${exit.employee.first_name} ${exit.employee.last_name}`
                            : `Employee #${exit.id.slice(0, 8)}`}
                        </Link>
                        {exit.employee?.designation && (
                          <p className="text-xs text-gray-500">{exit.employee.designation}</p>
                        )}
                        {exit.employee?.emp_code && (
                          <p className="text-xs text-gray-400">{exit.employee.emp_code}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {TYPE_LABELS[exit.exit_type] || exit.exit_type}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            STATUS_COLORS[exit.status] || "bg-gray-100 text-gray-600",
                          )}
                        >
                          {STATUS_LABELS[exit.status] || exit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {exit.resignation_date ? formatDate(exit.resignation_date) : "--"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {exit.last_working_date ? formatDate(exit.last_working_date) : "--"}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(exit.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
