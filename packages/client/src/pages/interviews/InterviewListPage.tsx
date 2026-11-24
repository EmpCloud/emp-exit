import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  SkipForward,
  Eye,
  Calendar,
} from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import { Page, PageActions, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Select } from "@/components/ui/Field";
import { Table, TableScroll, TableShell } from "@/components/ui/Table";

interface InterviewListItem {
  id: string;
  exit_request_id: string;
  template_id: string | null;
  interviewer_id: number | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  overall_rating: number | null;
  created_at: string;
  exit_status: string | null;
  employee?: { first_name: string; last_name: string; designation: string | null } | null;
}

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

const STATUS_CONFIG: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  scheduled: {
    bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    label: "Scheduled",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
    label: "Completed",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  skipped: {
    bg: "bg-muted text-muted-foreground",
    label: "Skipped",
    icon: <SkipForward className="h-3.5 w-3.5" />,
  },
};

export function InterviewListPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiGet<InterviewListItem[]>("/interviews/list", params);
      setInterviews(res.data ?? []);
    } catch {
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  if (loading) {
    return <div className="surface-card"><LoadingState /></div>;
  }

  return (
    <Page>
      {/* Header */}
      <PageHeader>
        <PageHeaderContent>
          <PageTitle className="flex items-center gap-2">
            <MessageSquare aria-hidden="true" className="size-6 text-primary" />
            Exit Interviews
          </PageTitle>
          <PageDescription>View and manage scheduled exit interviews.</PageDescription>
        </PageHeaderContent>
        <PageActions>
        <Button
          onClick={() => navigate("/interviews/templates")}
          variant="secondary"
        >
          <Calendar aria-hidden="true" className="size-4" />
          Manage Templates
        </Button>
        </PageActions>
      </PageHeader>

      {/* Filter */}
      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:max-w-64"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">
          {interviews.length} interview{interviews.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* List */}
      {interviews.length === 0 ? (
        <div className="surface-card"><EmptyState icon={MessageSquare} title="No exit interviews yet" description="Interviews are scheduled from an exit request. Open an exit and use its Interview tab to schedule one." action={<Button onClick={() => navigate("/exits")}>View Exits</Button>} /></div>
      ) : (
        <TableShell>
          <TableScroll>
          <Table>
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Scheduled</th>
                <th scope="col">Rating</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => {
                const cfg = STATUS_CONFIG[iv.status] || STATUS_CONFIG.scheduled;
                const name = iv.employee
                  ? `${iv.employee.first_name} ${iv.employee.last_name}`
                  : "—";
                return (
                  <tr key={iv.id}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {iv.employee?.designation && (
                        <p className="text-xs text-muted-foreground">{iv.employee.designation}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {iv.scheduled_date ? formatDate(iv.scheduled_date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {iv.overall_rating != null ? `${iv.overall_rating}/10` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          cfg.bg,
                        )}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/interviews/${iv.exit_request_id}`)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          </TableScroll>
        </TableShell>
      )}
    </Page>
  );
}
