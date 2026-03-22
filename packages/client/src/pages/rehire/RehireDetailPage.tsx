import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  UserPlus,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  Calendar,
  DollarSign,
} from "lucide-react";
import { apiGet, apiPut, apiPost } from "@/api/client";
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

export function RehireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/rehire/${id}`);
      if (res.success) {
        setData(res.data);
      }
    } catch {
      toast.error("Failed to load rehire request");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  async function handleStatusUpdate(status: string) {
    setActionLoading(true);
    try {
      const res = await apiPut<any>(`/rehire/${id}/status`, { status, notes: notes || undefined });
      if (res.success) {
        toast.success(`Status updated to ${status}`);
        setNotes("");
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!confirm("This will reactivate the employee in the system. Continue?")) return;
    setActionLoading(true);
    try {
      const res = await apiPost<any>(`/rehire/${id}/complete`);
      if (res.success) {
        toast.success("Rehire completed — employee reactivated");
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to complete rehire");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 py-12">Rehire request not found.</div>
    );
  }

  const employeeName = data.employee
    ? `${data.employee.first_name} ${data.employee.last_name}`
    : `Employee #${data.employee_id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/rehire")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rehire: {employeeName}</h1>
          <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[data.status] || "bg-gray-100 text-gray-700"}`}>
            {data.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Old profile */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Previous Employment
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-gray-900">{employeeName}</dd>
            </div>
            {data.employee?.emp_code && (
              <div>
                <dt className="text-xs text-gray-500">Employee Code</dt>
                <dd className="text-sm text-gray-700">{data.employee.emp_code}</dd>
              </div>
            )}
            {data.employee?.designation && (
              <div>
                <dt className="text-xs text-gray-500">Last Designation</dt>
                <dd className="text-sm text-gray-700">{data.employee.designation}</dd>
              </div>
            )}
            {data.original_exit && (
              <>
                <div>
                  <dt className="text-xs text-gray-500">Exit Type</dt>
                  <dd className="text-sm text-gray-700 capitalize">{data.original_exit.exit_type?.replace("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Exit Reason</dt>
                  <dd className="text-sm text-gray-700">
                    {REASON_LABELS[data.original_exit.reason_category] || data.original_exit.reason_category}
                  </dd>
                </div>
                {data.original_exit.reason_detail && (
                  <div>
                    <dt className="text-xs text-gray-500">Reason Detail</dt>
                    <dd className="text-sm text-gray-700">{data.original_exit.reason_detail}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500">Exit Date</dt>
                  <dd className="text-sm text-gray-700">
                    {data.original_exit.actual_exit_date || data.original_exit.last_working_date || "N/A"}
                  </dd>
                </div>
              </>
            )}
            {data.employee?.date_of_joining && (
              <div>
                <dt className="text-xs text-gray-500">Original Joining Date</dt>
                <dd className="text-sm text-gray-700">{data.employee.date_of_joining}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Right: Proposed position */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-gray-400" />
            Proposed New Position
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500">Position</dt>
              <dd className="text-sm font-medium text-gray-900">{data.position}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Department</dt>
              <dd className="text-sm text-gray-700">{data.department || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Proposed Salary</dt>
              <dd className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                {(data.proposed_salary / 100).toLocaleString("en-IN")}
              </dd>
            </div>
            {data.original_exit_date && (
              <div>
                <dt className="text-xs text-gray-500">Original Exit Date</dt>
                <dd className="text-sm text-gray-700">{data.original_exit_date}</dd>
              </div>
            )}
            {data.rehire_date && (
              <div>
                <dt className="text-xs text-gray-500">Rehire Date</dt>
                <dd className="text-sm text-gray-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {data.rehire_date}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Proposed On</dt>
              <dd className="text-sm text-gray-700">{new Date(data.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>

          {data.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {data.status !== "hired" && data.status !== "rejected" && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>

          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Add Note (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="Reason for status change..."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {data.status === "proposed" && (
              <button
                onClick={() => handleStatusUpdate("screening")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                Move to Screening
              </button>
            )}
            {(data.status === "proposed" || data.status === "screening") && (
              <>
                <button
                  onClick={() => handleStatusUpdate("approved")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
            {data.status === "approved" && (
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Complete Rehire & Reactivate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
