import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  UserMinus,
  ClipboardCheck,
  Shield,
  CheckCircle,
  XCircle,
  MessageSquare,
  DollarSign,
  Package,
  BookOpen,
  FileSignature,
  ArrowLeft,
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-700 border-blue-200",
  notice_period: "bg-amber-100 text-amber-700 border-amber-200",
  clearance_pending: "bg-orange-100 text-orange-700 border-orange-200",
  fnf_pending: "bg-purple-100 text-purple-700 border-purple-200",
  fnf_processed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
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

type Tab = "overview" | "checklist" | "clearance" | "interview" | "fnf" | "assets" | "kt" | "letters";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: UserMinus },
  { key: "checklist", label: "Checklist", icon: ClipboardCheck },
  { key: "clearance", label: "Clearance", icon: Shield },
  { key: "interview", label: "Interview", icon: MessageSquare },
  { key: "fnf", label: "FnF", icon: DollarSign },
  { key: "assets", label: "Assets", icon: Package },
  { key: "kt", label: "KT", icon: BookOpen },
  { key: "letters", label: "Letters", icon: FileSignature },
];

export function ExitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exit, setExit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [checklist, setChecklist] = useState<any>(null);
  const [clearance, setClearance] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadExit();
  }, [id]);

  useEffect(() => {
    if (!id || !exit) return;
    if (activeTab === "checklist") loadChecklist();
    if (activeTab === "clearance") loadClearance();
  }, [activeTab, id, exit]);

  async function loadExit() {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/exits/${id}`);
      setExit(res.data);
    } catch {
      setExit(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadChecklist() {
    try {
      const res = await apiGet<any>(`/checklists/exit/${id}`);
      setChecklist(res.data);
    } catch {
      setChecklist(null);
    }
  }

  async function loadClearance() {
    try {
      const res = await apiGet<any>(`/clearance/exit/${id}`);
      setClearance(res.data);
    } catch {
      setClearance(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this exit request?")) return;
    setActionLoading(true);
    try {
      await apiPost(`/exits/${id}/cancel`);
      await loadExit();
    } catch {
      // handled
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!confirm("Mark this exit as completed? This will deactivate the employee account.")) return;
    setActionLoading(true);
    try {
      await apiPost(`/exits/${id}/complete`);
      await loadExit();
    } catch {
      // handled
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInitiateClearance() {
    setActionLoading(true);
    try {
      await apiPost(`/clearance/exit/${id}`);
      await loadClearance();
    } catch {
      // handled
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChecklistItemUpdate(itemId: string, status: string) {
    try {
      await apiPatch(`/checklists/items/${itemId}`, { status });
      await loadChecklist();
    } catch {
      // handled
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!exit) {
    return (
      <div className="space-y-4">
        <Link to="/exits" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to exits
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Exit request not found.</p>
        </div>
      </div>
    );
  }

  const isTerminal = exit.status === "completed" || exit.status === "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/exits" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to exits
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {exit.employee
              ? `${exit.employee.first_name} ${exit.employee.last_name}`
              : `Exit #${exit.id.slice(0, 8)}`}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>{TYPE_LABELS[exit.exit_type] || exit.exit_type}</span>
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[exit.status])}>
              {STATUS_LABELS[exit.status] || exit.status}
            </span>
            {exit.employee?.designation && <span>{exit.employee.designation}</span>}
          </div>
        </div>
        {!isTerminal && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Cancel Exit
            </button>
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Complete Exit
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {activeTab === "overview" && <OverviewTab exit={exit} />}
        {activeTab === "checklist" && (
          <ChecklistTab
            checklist={checklist}
            exitId={id!}
            onUpdateItem={handleChecklistItemUpdate}
          />
        )}
        {activeTab === "clearance" && (
          <ClearanceTab
            clearance={clearance}
            onInitiate={handleInitiateClearance}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "interview" && <PlaceholderTab name="Exit Interview" />}
        {activeTab === "fnf" && <PlaceholderTab name="Full & Final Settlement" />}
        {activeTab === "assets" && <PlaceholderTab name="Asset Returns" />}
        {activeTab === "kt" && <PlaceholderTab name="Knowledge Transfer" />}
        {activeTab === "letters" && <PlaceholderTab name="Exit Letters" />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverviewTab({ exit }: { exit: any }) {
  const fields = [
    { label: "Exit Type", value: TYPE_LABELS[exit.exit_type] || exit.exit_type },
    { label: "Status", value: STATUS_LABELS[exit.status] || exit.status },
    { label: "Reason Category", value: exit.reason_category?.replace(/_/g, " ") },
    { label: "Reason Detail", value: exit.reason_detail || "--" },
    { label: "Resignation Date", value: exit.resignation_date ? formatDate(exit.resignation_date) : "--" },
    { label: "Notice Start", value: exit.notice_start_date ? formatDate(exit.notice_start_date) : "--" },
    { label: "Last Working Date", value: exit.last_working_date ? formatDate(exit.last_working_date) : "--" },
    { label: "Actual Exit Date", value: exit.actual_exit_date ? formatDate(exit.actual_exit_date) : "--" },
    { label: "Notice Period", value: `${exit.notice_period_days} days${exit.notice_period_waived ? " (waived)" : ""}` },
    { label: "Initiated", value: formatDate(exit.created_at) },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {exit.checklist_summary && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ClipboardCheck className="h-4 w-4 text-rose-500" />
              Checklist
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{exit.checklist_summary.progress}%</p>
            <p className="text-xs text-gray-500">
              {exit.checklist_summary.completed} / {exit.checklist_summary.total} items
            </p>
          </div>
        )}
        {exit.clearance_summary && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Shield className="h-4 w-4 text-rose-500" />
              Clearance
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{exit.clearance_summary.progress}%</p>
            <p className="text-xs text-gray-500">
              {exit.clearance_summary.approved} / {exit.clearance_summary.total} departments
            </p>
          </div>
        )}
        {exit.fnf_summary && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="h-4 w-4 text-rose-500" />
              FnF
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 capitalize">{exit.fnf_summary.status}</p>
            <p className="text-xs text-gray-500">
              Total payable: {exit.fnf_summary.total_payable}
            </p>
          </div>
        )}
      </div>

      {/* Detail Fields */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{f.label}</dt>
            <dd className="mt-0.5 text-sm text-gray-900 capitalize">{f.value}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistTab({
  checklist,
  exitId,
  onUpdateItem,
}: {
  checklist: any;
  exitId: string;
  onUpdateItem: (itemId: string, status: string) => void;
}) {
  if (!checklist || !checklist.items || checklist.items.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-4">No checklist generated yet.</p>
        <p className="text-xs text-gray-400">
          Go to Checklists to generate a checklist from a template.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          {checklist.completed} / {checklist.total} completed ({checklist.progress}%)
        </h3>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-rose-500 h-2 rounded-full transition-all"
          style={{ width: `${checklist.progress}%` }}
        />
      </div>
      <div className="divide-y divide-gray-100">
        {checklist.items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              )}
              {item.remarks && (
                <p className="text-xs text-gray-400 mt-0.5 italic">{item.remarks}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  CHECKLIST_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600",
                )}
              >
                {item.status.replace(/_/g, " ")}
              </span>
              {item.status === "pending" && (
                <button
                  onClick={() => onUpdateItem(item.id, "completed")}
                  className="rounded-md bg-green-50 p-1 text-green-600 hover:bg-green-100"
                  title="Mark complete"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClearanceTab({
  clearance,
  onInitiate,
  actionLoading,
}: {
  clearance: any;
  onInitiate: () => void;
  actionLoading: boolean;
}) {
  if (!clearance || !clearance.records || clearance.records.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-4">No clearance records yet.</p>
        <button
          onClick={onInitiate}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Initiate Clearance
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          {clearance.approved} / {clearance.total} approved ({clearance.progress}%)
        </h3>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-rose-500 h-2 rounded-full transition-all"
          style={{ width: `${clearance.progress}%` }}
        />
      </div>
      <div className="divide-y divide-gray-100">
        {clearance.records.map((record: any) => (
          <div key={record.id} className="flex items-center justify-between py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {record.department?.name || "Unknown Department"}
              </p>
              {record.remarks && (
                <p className="text-xs text-gray-500 mt-0.5">{record.remarks}</p>
              )}
              {record.approved_at && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Approved: {formatDate(record.approved_at)}
                </p>
              )}
            </div>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                CLEARANCE_STATUS_COLORS[record.status] || "bg-gray-100 text-gray-600",
              )}
            >
              {record.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-gray-500">{name} — coming soon.</p>
    </div>
  );
}
