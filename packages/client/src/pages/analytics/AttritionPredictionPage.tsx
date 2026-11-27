import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  TrendingDown,
  Shield,
  UserMinus,
  Loader2,
  RefreshCw,
  ChevronRight,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { apiGet, apiPost } from "@/api/client";
import toast from "react-hot-toast";
import { LoadingState } from "@/components/ui/States";
import type {
  FlightRiskDashboard,
  HighRiskEmployee,
  RiskFactor,
  RiskLevel,
  PredictionTrend,
} from "@emp-exit/shared";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#dc2626",
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#dc2626",
};

function riskBadge(level: RiskLevel) {
  const colors: Record<RiskLevel, string> = {
    low: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
    medium: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300",
    high: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
    critical: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[level]}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  let barColor = "#22c55e";
  if (score >= 80) barColor = "#dc2626";
  else if (score >= 60) barColor = "#f97316";
  else if (score >= 40) barColor = "#eab308";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-24 rounded-full bg-muted">
        <div
          className="h-2.5 rounded-full transition-[width]"
          style={{ width: `${score}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Employee Detail Modal
// ---------------------------------------------------------------------------

function EmployeeRiskModal({
  employee,
  onClose,
}: {
  employee: HighRiskEmployee;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  // Gauge color
  let gaugeColor = "#22c55e";
  if (employee.score >= 80) gaugeColor = "#dc2626";
  else if (employee.score >= 60) gaugeColor = "#f97316";
  else if (employee.score >= 40) gaugeColor = "#eab308";

  const recommendations: Record<RiskLevel, string[]> = {
    critical: [
      "Schedule immediate 1-on-1 with direct manager",
      "Review compensation against market benchmarks",
      "Offer retention bonus or career development plan",
      "Assign a mentor or executive sponsor",
    ],
    high: [
      "Schedule a stay interview within the next 2 weeks",
      "Review workload and job satisfaction",
      "Discuss career progression opportunities",
      "Consider lateral move or stretch assignment",
    ],
    medium: [
      "Include in next skip-level meeting",
      "Ensure regular feedback and recognition",
      "Review learning and development opportunities",
    ],
    low: [
      "Continue regular check-ins",
      "Recognize contributions and milestones",
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-4">
      <button type="button" className="fixed inset-0 cursor-default bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-label="Close risk details" tabIndex={-1} />
      <div ref={dialogRef} className="surface-card relative z-50 max-h-[90dvh] w-full max-w-2xl overflow-y-auto shadow-floating" role="dialog" aria-modal="true" aria-labelledby="risk-detail-title" tabIndex={-1}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="risk-detail-title" className="text-lg font-bold text-foreground">
              {employee.first_name} {employee.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {employee.designation || "No designation"} &middot;{" "}
              {employee.department_name || "No department"}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="button-ghost size-11 p-0"
            aria-label="Close risk details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score gauge */}
          <div className="flex flex-col items-center">
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="10"
                  strokeDasharray={`${(employee.score / 100) * 264} 264`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: gaugeColor }}>
                  {employee.score}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Risk Score</span>
              </div>
            </div>
            <div className="mt-2">{riskBadge(employee.risk_level)}</div>
          </div>

          {/* Risk factors */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Risk Factors</h3>
            <div className="space-y-3">
              {(employee.factors || []).map((f: RiskFactor, i: number) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{f.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Impact: {f.impact}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted mb-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${f.impact}%`,
                        backgroundColor:
                          f.impact >= 70 ? "#dc2626" : f.impact >= 50 ? "#f97316" : "#22c55e",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended actions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recommended Actions</h3>
            <ul className="space-y-2">
              {(recommendations[employee.risk_level] || []).map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-brand-500 flex-shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function AttritionPredictionPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<FlightRiskDashboard | null>(null);
  const [highRisk, setHighRisk] = useState<HighRiskEmployee[]>([]);
  const [trends, setTrends] = useState<PredictionTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<HighRiskEmployee | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [dashRes, hrRes, trendRes] = await Promise.all([
        apiGet<FlightRiskDashboard>("/predictions/dashboard"),
        apiGet<HighRiskEmployee[]>("/predictions/high-risk"),
        apiGet<PredictionTrend[]>("/predictions/trends"),
      ]);
      if (dashRes.success) setDashboard(dashRes.data!);
      if (hrRes.success) setHighRisk(hrRes.data || []);
      if (trendRes.success) setTrends(trendRes.data || []);
    } catch {
      toast.error("Failed to load prediction data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCalculate() {
    setCalculating(true);
    try {
      const res = await apiPost<{ calculated: number }>("/predictions/calculate");
      if (res.success) {
        toast.success(`Flight risk scores calculated for ${res.data!.calculated} employees`);
        await fetchData();
      }
    } catch {
      toast.error("Failed to calculate flight risk scores");
    } finally {
      setCalculating(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingState label="Loading flight risk insights" />;
  }

  const noData =
    !dashboard || dashboard.riskDistribution.every((r) => r.value === 0);

  return (
    <div className="app-page">
      {/* Header */}
      <header className="page-header">
        <div className="page-header__content">
          <p className="page-header__eyebrow">Predictive insights</p>
          <h1 className="page-title">Flight Risk Dashboard</h1>
          <p className="page-subtitle">
            Predictive attrition scoring based on employee data patterns.
          </p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="button-primary"
        >
          {calculating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Calculate Scores
        </button>
      </header>

      {noData ? (
        <div className="surface-card p-12 text-center">
          <UserMinus className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No Risk Data Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Click "Calculate Scores" to generate flight risk scores for all active employees.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboard!.totalEmployees}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Employees</p>
                </div>
              </div>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {dashboard!.highRiskCount}
                  </p>
                  <p className="text-xs text-muted-foreground">High / Critical Risk</p>
                </div>
              </div>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40">
                  <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboard!.departmentBreakdown.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Departments Scored</p>
                </div>
              </div>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-950/40">
                  <UserMinus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboard!.topRiskFactors.length > 0
                      ? dashboard!.topRiskFactors[0].name
                      : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Top Risk Factor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Risk Distribution — Donut */}
            <div className="surface-card p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={dashboard!.riskDistribution.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={11}
                  >
                    {dashboard!.riskDistribution
                      .filter((d) => d.value > 0)
                      .map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Department Risk Heatmap — Bar chart colored by risk */}
            <div className="surface-card p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Department Risk Heatmap
              </h3>
              {dashboard!.departmentBreakdown.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard!.departmentBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      type="category"
                      dataKey="department"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`${value}`, "Avg Risk Score"]}
                    />
                    <Bar dataKey="avgScore" name="Avg Risk Score" radius={[0, 4, 4, 0]}>
                      {dashboard!.departmentBreakdown.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={RISK_COLORS[entry.riskLevel] || "#94a3b8"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Prediction Trends */}
          {trends.length > 0 && (
            <div className="surface-card p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Prediction Trends (Predicted vs Actual)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="predicted_exits"
                    name="Predicted"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: "#f97316", r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual_exits"
                    name="Actual"
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#dc2626", r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* High Risk Employees Table */}
          <div className="surface-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">
                High Risk Employees ({highRisk.length})
              </h3>
            </div>
            {highRisk.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No high-risk employees found
              </div>
            ) : (
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th scope="col" className="px-5 py-3">Employee</th>
                      <th scope="col" className="px-5 py-3">Department</th>
                      <th scope="col" className="px-5 py-3">Tenure</th>
                      <th scope="col" className="px-5 py-3">Risk Score</th>
                      <th scope="col" className="px-5 py-3">Level</th>
                      <th scope="col" className="px-5 py-3">Top Factor</th>
                      <th scope="col" className="px-5 py-3"><span className="sr-only">View details</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {highRisk.map((emp) => {
                      const topFactor =
                        emp.factors && emp.factors.length > 0
                          ? emp.factors.reduce((a, b) => (a.impact > b.impact ? a : b))
                          : null;

                      let tenure = "N/A";
                      if (emp.date_of_joining) {
                        const years =
                          (Date.now() - new Date(emp.date_of_joining).getTime()) /
                          (365.25 * 24 * 60 * 60 * 1000);
                        tenure =
                          years < 1
                            ? `${Math.round(years * 12)}m`
                            : `${Math.round(years * 10) / 10}y`;
                      }

                      return (
                        <tr
                          key={emp.employee_id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          <td className="px-5 py-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {emp.first_name} {emp.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {emp.department_name || "N/A"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{tenure}</td>
                          <td className="px-5 py-3">
                            <ScoreBar score={emp.score} />
                          </td>
                          <td className="px-5 py-3">{riskBadge(emp.risk_level)}</td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">
                            {topFactor ? topFactor.name : "N/A"}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              className="button-ghost size-10 p-0"
                              aria-label={`View risk details for ${emp.first_name} ${emp.last_name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedEmployee(emp);
                              }}
                            >
                              <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Risk Factors */}
          {dashboard!.topRiskFactors.length > 0 && (
            <div className="surface-card p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Top Risk Factors (among high-risk employees)
              </h3>
              <div className="space-y-3">
                {dashboard!.topRiskFactors.map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-red-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (f.count /
                                Math.max(
                                  1,
                                  ...dashboard!.topRiskFactors.map((x) => x.count),
                                )) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {f.count} employees
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeRiskModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
