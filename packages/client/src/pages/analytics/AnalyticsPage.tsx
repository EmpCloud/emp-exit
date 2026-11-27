import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  LineChart,
  Line,
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
} from "recharts";
import { apiGet } from "@/api/client";
import toast from "react-hot-toast";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";

const COLORS = [
  "#e11d48", "#f43f5e", "#fb7185", "#fda4af",
  "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981",
  "#6366f1", "#ec4899", "#14b8a6", "#f97316",
];

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

export function AnalyticsPage() {
  const [attrition, setAttrition] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [tenure, setTenure] = useState<any[]>([]);
  const [nps, setNps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [attrRes, reasonRes, deptRes, tenureRes, npsRes] = await Promise.all([
        apiGet<any[]>("/analytics/attrition"),
        apiGet<any[]>("/analytics/reasons"),
        apiGet<any[]>("/analytics/departments"),
        apiGet<any[]>("/analytics/tenure"),
        apiGet<any>("/analytics/nps"),
      ]);
      if (attrRes.success) setAttrition(attrRes.data || []);
      if (reasonRes.success) {
        setReasons(
          (reasonRes.data || []).map((r: any) => ({
            ...r,
            name: REASON_LABELS[r.reason_category] || r.reason_category,
            value: Number(r.count),
          })),
        );
      }
      if (deptRes.success) {
        // Transform to per-department totals
        const deptMap = new Map<string, number>();
        for (const row of deptRes.data || []) {
          const key = row.department || "Unknown";
          deptMap.set(key, (deptMap.get(key) || 0) + Number(row.exit_count));
        }
        setDepartments(
          Array.from(deptMap.entries()).map(([department, count]) => ({ department, count })),
        );
      }
      if (tenureRes.success) {
        setTenure(
          (tenureRes.data || []).map((t: any) => ({
            bucket: t.bucket,
            count: Number(t.count),
          })),
        );
      }
      if (npsRes.success) {
        setNps(npsRes.data);
      }
    } catch {
      setError("We couldn't load the exit analytics. Check your connection and try again.");
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return <LoadingState label="Loading analytics" />;
  }

  if (error) {
    return (
      <div className="app-page">
        <div className="surface-card">
          <ErrorState
            title="Analytics unavailable"
            description={error}
            action={<Button onClick={fetchAll}>Try again</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <header className="page-header">
        <div className="page-header__content">
          <p className="page-header__eyebrow">Insights</p>
          <h1 className="page-title">Exit Analytics</h1>
          <p className="page-subtitle">Attrition trends, reason analysis, and exit metrics.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attrition Rate — Line Chart */}
        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">Monthly Exit Count</h2>
          {attrition.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={attrition}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                <Line
                  type="monotone"
                  dataKey="exit_count"
                  name="Exits"
                  stroke="#e11d48"
                  strokeWidth={2}
                  dot={{ fill: "#e11d48", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Reason Breakdown — Pie Chart */}
        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">Reason Breakdown</h2>
          {reasons.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={reasons}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {reasons.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Department Trends — Bar Chart */}
        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">Department Exits</h2>
          {departments.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={departments}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                <Bar dataKey="count" name="Exits" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Tenure Distribution — Histogram */}
        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">Tenure Distribution</h2>
          {tenure.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tenure}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                <Bar dataKey="count" name="Employees" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* NPS Summary Card */}
      <Link
        to="/analytics/nps"
        className="surface-card surface-card--interactive block p-6 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Exit Survey NPS</h3>
            {nps ? (
              <div className="mt-2 flex items-baseline gap-3">
                <span
                  className="text-4xl font-bold"
                  style={{ color: nps.nps > 50 ? "#16a34a" : nps.nps >= 0 ? "#f59e0b" : "#dc2626" }}
                >
                  {nps.nps}
                </span>
                <span className="text-sm text-muted-foreground">
                  from {nps.totalResponses} response{nps.totalResponses !== 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No data yet</p>
            )}
            {nps && (
              <div className="mt-3 flex gap-4 text-xs">
                <span className="text-green-600 dark:text-green-400">{nps.promoters} promoters</span>
                <span className="text-yellow-600 dark:text-yellow-400">{nps.passives} passives</span>
                <span className="text-red-600 dark:text-red-400">{nps.detractors} detractors</span>
              </div>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Link>
    </div>
  );
}
