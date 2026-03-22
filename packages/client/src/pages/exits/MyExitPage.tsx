import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  UserMinus,
  ClipboardCheck,
  Shield,
  CheckCircle,
  DollarSign,
  Calculator,
} from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

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

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  waived: "bg-amber-100 text-amber-700",
  na: "bg-gray-50 text-gray-400",
};

const CLEARANCE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  waived: "bg-amber-100 text-amber-700",
};

export function MyExitPage() {
  const [exit, setExit] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const exitRes = await apiGet<any>("/self-service/my-exit");
        if (cancelled) return;

        if (exitRes.data) {
          setExit(exitRes.data);

          // Load checklist
          try {
            const checklistRes = await apiGet<any>("/self-service/my-checklist");
            if (!cancelled) setChecklist(checklistRes.data);
          } catch {
            // no checklist
          }
        }
      } catch {
        // no exit
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!exit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Exit Status</h1>
          <p className="mt-1 text-sm text-gray-500">Track your exit process.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <UserMinus className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">You don't have an active exit request.</p>
          <Link
            to="/exits/resign"
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Submit Resignation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Exit Status</h1>
        <p className="mt-1 text-sm text-gray-500">Track your exit process and pending actions.</p>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Exit Request</h2>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_COLORS[exit.status],
                )}
              >
                {STATUS_LABELS[exit.status] || exit.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 capitalize">
              {exit.exit_type?.replace(/_/g, " ")} &middot; {exit.reason_category?.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Resignation Date</p>
            <p className="mt-0.5 text-sm text-gray-900">
              {exit.resignation_date ? formatDate(exit.resignation_date) : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Last Working Date</p>
            <p className="mt-0.5 text-sm text-gray-900">
              {exit.last_working_date ? formatDate(exit.last_working_date) : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Notice Period</p>
            <p className="mt-0.5 text-sm text-gray-900">
              {exit.notice_period_days} days
              {exit.notice_period_waived ? " (waived)" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Initiated On</p>
            <p className="mt-0.5 text-sm text-gray-900">{formatDate(exit.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Notice Buyout Card */}
      {exit && exit.status !== "completed" && exit.status !== "cancelled" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
                <Calculator className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Notice Period Buyout</h3>
                <p className="text-xs text-gray-500">Want to leave before your notice period ends?</p>
              </div>
            </div>
            <Link
              to="/buyout/calculator"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <Calculator className="h-4 w-4" />
              Calculate Buyout
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {exit.checklist_summary && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <ClipboardCheck className="h-5 w-5 text-rose-500" />
              Checklist Progress
            </div>
            <p className="text-3xl font-bold text-gray-900">{exit.checklist_summary.progress}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {exit.checklist_summary.completed} / {exit.checklist_summary.total} items done
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all"
                style={{ width: `${exit.checklist_summary.progress}%` }}
              />
            </div>
          </div>
        )}

        {exit.clearance_summary && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Shield className="h-5 w-5 text-rose-500" />
              Clearance Progress
            </div>
            <p className="text-3xl font-bold text-gray-900">{exit.clearance_summary.progress}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {exit.clearance_summary.approved} / {exit.clearance_summary.total} departments
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all"
                style={{ width: `${exit.clearance_summary.progress}%` }}
              />
            </div>
          </div>
        )}

        {exit.fnf_summary ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <DollarSign className="h-5 w-5 text-rose-500" />
              Full & Final
            </div>
            <p className="text-3xl font-bold text-gray-900 capitalize">{exit.fnf_summary.status}</p>
            <p className="text-xs text-gray-500 mt-1">
              Total: {exit.fnf_summary.total_payable}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <DollarSign className="h-5 w-5 text-gray-300" />
              Full & Final
            </div>
            <p className="text-sm text-gray-400 mt-2">Not yet initiated</p>
          </div>
        )}
      </div>

      {/* Checklist Items */}
      {checklist && checklist.items && checklist.items.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">My Checklist</h2>
          </div>
          <div className="divide-y divide-gray-50 px-6">
            {checklist.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {item.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      item.status === "completed" ? "text-gray-400 line-through" : "text-gray-900",
                    )}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    CHECKLIST_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600",
                  )}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
