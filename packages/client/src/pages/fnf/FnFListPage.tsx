import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calculator,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import { Page, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Select } from "@/components/ui/Field";
import { Table, TableScroll, TableShell } from "@/components/ui/Table";

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-muted text-muted-foreground", label: "Draft" },
  calculated: { bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", label: "Calculated" },
  approved: { bg: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300", label: "Approved" },
  paid: { bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", label: "Paid" },
};

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "calculated", label: "Calculated" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
];

interface FnFRow {
  id: string;
  exit_request_id: string;
  status: string;
  total_payable: number;
  updated_at: string;
  last_working_date: string | null;
  employee?: {
    first_name: string;
    last_name: string;
    designation: string | null;
    emp_code: string | null;
  } | null;
}

// Amounts are stored in paise; show as ₹ with grouping.
function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

export function FnFListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FnFRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, any> = {};
        if (statusFilter) params.status = statusFilter;
        const res = await apiGet<FnFRow[]>("/fnf", params);
        if (!cancelled) setRows(res.data ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <Page>
      {/* Header */}
      <PageHeader>
        <PageHeaderContent>
          <PageTitle className="flex items-center gap-2">
            <Calculator aria-hidden="true" className="size-6 text-primary" />
            Full &amp; Final Settlements
          </PageTitle>
          <PageDescription>Manage FnF calculations, approvals, and payments.</PageDescription>
        </PageHeaderContent>
      </PageHeader>

      {/* Filter */}
      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:max-w-64"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">
          {loading ? null : `${rows.length} settlement${rows.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="surface-card"><LoadingState /></div>
      ) : rows.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={DollarSign}
            title="No FnF settlements yet"
            description="FnF settlements are created from an exit request. Open an exit and calculate its full & final settlement to see it here."
            action={<Button onClick={() => navigate("/exits")}>View Exits <ArrowRight aria-hidden="true" className="size-4" /></Button>}
          />
        </div>
      ) : (
        <TableShell>
          <TableScroll>
          <Table>
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Last Working Date</th>
                <th scope="col">Net Payable</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
                const name = r.employee
                  ? `${r.employee.first_name} ${r.employee.last_name}`
                  : "—";
                return (
                  <tr key={r.id}>
                    <td className="px-6 py-4">
                      <Link
                        to={`/fnf/${r.exit_request_id}`}
                        className="text-sm font-medium text-foreground hover:text-rose-600 dark:text-rose-400"
                      >
                        {name}
                      </Link>
                      {r.employee?.designation && (
                        <p className="text-xs text-muted-foreground">{r.employee.designation}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {r.last_working_date ? formatDate(r.last_working_date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {formatINR(r.total_payable)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                          cfg.bg,
                        )}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/fnf/${r.exit_request_id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300"
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          </TableScroll>
        </TableShell>
      )}

      {/* Workflow legend */}
      <div className="surface-card p-5">
        <h4 className="mb-4 text-center text-sm font-medium text-muted-foreground">Settlement Workflow</h4>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["draft", "calculated", "approved", "paid"].map((status, idx) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                    cfg.bg,
                  )}
                >
                  {cfg.label}
                </span>
                {idx < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground/50" />}
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
