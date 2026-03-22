import { useState, useEffect, Fragment } from "react";
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
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
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
      <div className="h-2.5 w-24 rounded-full bg-gray-200">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700">{score}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {employee.first_name} {employee.last_name}
            </h2>
            <p className="text-sm text-gray-500">
              {employee.designation || "No designation"} &middot;{" "}
              {employee.department_name || "No department"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
                  stroke="#e5e7eb"
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
                <span className="text-[10px] font-medium text-gray-500 uppercase">Risk Score</span>
              </div>
            </div>
            <div className="mt-2">{riskBadge(employee.risk_level)}</div>
          </div>

          {/* Risk factors */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Factors</h3>
            <div className="space-y-3">
              {(employee.factors || []).map((f: RiskFactor, i: number) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{f.name}</span>
                    <span className="text-xs font-semibold text-gray-500">
                      Impact: {f.impact}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 mb-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${f.impact}%`,
                        backgroundColor:
                          f.impact >= 70 ? "#dc2626" : f.impact >= 50 ? "#f97316" : "#22c55e",
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommended Actions</h3>
            <ul className="space-y-2">
              {(recommendations[employee.risk_level] || []).map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
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
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  const noData =
    !dashboard || dashboard.riskDistribution.every((r) => r.value === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flight Risk Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Predictive attrition scoring based on employee data patterns.
          </p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {calculating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Calculate Scores
        </button>
      </div>

      {noData ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <UserMinus className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Risk Data Yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Click "Calculate Scores" to generate flight risk scores for all active employees.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard!.totalEmployees}
                  </p>
                  <p className="text-xs text-gray-500">Total Employees</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {dashboard!.highRiskCount}
                  </p>
                  <p className="text-xs text-gray-500">High / Critical Risk</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard!.departmentBreakdown.length}
                  </p>
                  <p className="text-xs text-gray-500">Departments Scored</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
                  <UserMinus className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard!.topRiskFactors.length > 0
                      ? dashboard!.topRiskFactors[0].name
                      : "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">Top Risk Factor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Risk Distribution — Donut */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Risk Distribution</h3>
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
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Department Risk Heatmap — Bar chart colored by risk */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Department Risk Heatmap
              </h3>
              {dashboard!.departmentBreakdown.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard!.departmentBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="department"
                      tick={{ fontSize: 10 }}
                      width={120}
                    />
                    <Tooltip
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
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Prediction Trends (Predicted vs Actual)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
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
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                High Risk Employees ({highRisk.length})
              </h3>
            </div>
            {highRisk.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                No high-risk employees found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Employee</th>
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3">Tenure</th>
                      <th className="px-5 py-3">Risk Score</th>
                      <th className="px-5 py-3">Level</th>
                      <th className="px-5 py-3">Top Factor</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
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
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          <td className="px-5 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {emp.first_name} {emp.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{emp.email}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            {emp.department_name || "N/A"}
                          </td>
                          <td className="px-5 py-3 text-gray-700">{tenure}</td>
                          <td className="px-5 py-3">
                            <ScoreBar score={emp.score} />
                          </td>
                          <td className="px-5 py-3">{riskBadge(emp.risk_level)}</td>
                          <td className="px-5 py-3 text-gray-600 text-xs">
                            {topFactor ? topFactor.name : "N/A"}
                          </td>
                          <td className="px-5 py-3">
                            <ChevronRight className="h-4 w-4 text-gray-400" />
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
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Top Risk Factors (among high-risk employees)
              </h3>
              <div className="space-y-3">
                {dashboard!.topRiskFactors.map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 rounded-full bg-gray-200">
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
                      <span className="text-xs font-semibold text-gray-500">
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
