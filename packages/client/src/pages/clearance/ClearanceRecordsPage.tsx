import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Loader2, Settings } from "lucide-react";
import { apiGet, apiPut } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

const CLEARANCE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  waived: "bg-amber-100 text-amber-700",
};

interface MyClearance {
  id: string;
  exit_request_id: string;
  department_id: string;
  status: string;
  approved_by: number | null;
  approved_at: string | null;
  remarks: string | null;
  pending_amount: number;
  department?: { id: string; name: string } | null;
}

export function ClearanceRecordsPage() {
  const [clearances, setClearances] = useState<MyClearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadClearances();
  }, []);

  async function loadClearances() {
    setLoading(true);
    try {
      const res = await apiGet<MyClearance[]>("/clearance/my");
      setClearances(res.data ?? []);
    } catch {
      setClearances([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(clearanceId: string) {
    setActionLoading(clearanceId);
    try {
      await apiPut(`/clearance/${clearanceId}`, { status: "approved" });
      await loadClearances();
    } catch {
      // handled
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(clearanceId: string) {
    const remarks = prompt("Reason for rejection:");
    if (remarks === null) return;
    setActionLoading(clearanceId);
    try {
      await apiPut(`/clearance/${clearanceId}`, { status: "rejected", remarks });
      await loadClearances();
    } catch {
      // handled
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clearance Records</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pending clearance approvals assigned to you.
          </p>
        </div>
        <Link
          to="/clearance/departments"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Manage Departments
        </Link>
      </div>

      {clearances.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No pending clearances assigned to you.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Exit Request</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Pending Amount</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clearances.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {c.department?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/exits/${c.exit_request_id}`}
                      className="text-rose-600 hover:text-rose-700 text-sm"
                    >
                      {c.exit_request_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        CLEARANCE_STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600",
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {c.pending_amount > 0 ? c.pending_amount : "--"}
                  </td>
                  <td className="px-6 py-4">
                    {c.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(c.id)}
                          disabled={actionLoading === c.id}
                          className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(c.id)}
                          disabled={actionLoading === c.id}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {c.status !== "pending" && c.approved_at && (
                      <span className="text-xs text-gray-400">
                        {formatDate(c.approved_at)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
