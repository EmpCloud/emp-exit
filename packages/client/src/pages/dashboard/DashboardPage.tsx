import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserMinus, ClipboardCheck, Shield, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import type { ExitStatus, ExitType } from "@emp-exit/shared";

interface ExitListItem {
  id: string;
  status: ExitStatus;
  exit_type: ExitType;
  created_at: string;
  last_working_date: string | null;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    designation: string | null;
  } | null;
}

interface DashboardStats {
  activeExits: number;
  clearancePending: number;
  fnfPending: number;
  completedThisMonth: number;
}

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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExits, setRecentExits] = useState<ExitListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch recent exits
        const exitRes = await apiGet<any>("/exits", { perPage: 10 });
        if (cancelled) return;

        const exits: ExitListItem[] = exitRes.data?.data ?? [];
        setRecentExits(exits);

        // Compute stats from the full list
        const activeStatuses = ["initiated", "notice_period", "clearance_pending", "fnf_pending", "fnf_processed"];
        const activeExits = exits.filter((e) => activeStatuses.includes(e.status)).length;
        const clearancePending = exits.filter((e) => e.status === "clearance_pending").length;
        const fnfPending = exits.filter((e) => e.status === "fnf_pending").length;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const completedThisMonth = exits.filter(
          (e) => e.status === "completed" && e.created_at >= monthStart,
        ).length;

        setStats({ activeExits, clearancePending, fnfPending, completedThisMonth });
      } catch (err) {
        // silently fail for dashboard — data will show as 0
        if (!cancelled) {
          setStats({ activeExits: 0, clearancePending: 0, fnfPending: 0, completedThisMonth: 0 });
        }
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

  const statCards = [
    {
      label: "Active Exits",
      value: stats?.activeExits ?? 0,
      icon: UserMinus,
      color: "bg-rose-50 text-rose-600",
      iconBg: "bg-rose-100",
      link: "/exits?status=active",
    },
    {
      label: "Clearance Pending",
      value: stats?.clearancePending ?? 0,
      icon: Shield,
      color: "bg-amber-50 text-amber-600",
      iconBg: "bg-amber-100",
      link: "/clearance",
    },
    {
      label: "FnF Pending",
      value: stats?.fnfPending ?? 0,
      icon: DollarSign,
      color: "bg-purple-50 text-purple-600",
      iconBg: "bg-purple-100",
      link: "/fnf",
    },
    {
      label: "Completed (Month)",
      value: stats?.completedThisMonth ?? 0,
      icon: ClipboardCheck,
      color: "bg-green-50 text-green-600",
      iconBg: "bg-green-100",
      link: "/exits?status=completed",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Exit management overview and metrics.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", card.iconBg)}>
                <card.icon className={cn("h-6 w-6", card.color.split(" ")[1])} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Exits */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Exits</h2>
          <Link
            to="/exits"
            className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentExits.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No exit requests yet. Start by initiating an exit.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Last Working Date</th>
                  <th className="px-6 py-3">Initiated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentExits.map((exit) => (
                  <tr key={exit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link to={`/exits/${exit.id}`} className="font-medium text-gray-900 hover:text-rose-600">
                        {exit.employee
                          ? `${exit.employee.first_name} ${exit.employee.last_name}`
                          : `Employee #${exit.id.slice(0, 8)}`}
                      </Link>
                      {exit.employee?.designation && (
                        <p className="text-xs text-gray-500">{exit.employee.designation}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {TYPE_LABELS[exit.exit_type] || exit.exit_type}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_COLORS[exit.status] || "bg-gray-100 text-gray-600",
                        )}
                      >
                        {STATUS_LABELS[exit.status] || exit.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {exit.last_working_date ? formatDate(exit.last_working_date) : "--"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(exit.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
