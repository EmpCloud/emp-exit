import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Loader2, ArrowRight } from "lucide-react";
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

  async function fetchAll() {
    setLoading(true);
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
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exit Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Attrition trends, reason analysis, and exit metrics.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attrition Rate — Line Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Exit Count</h3>
          {attrition.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={attrition}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
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
        </div>

        {/* Reason Breakdown — Pie Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Reason Breakdown</h3>
          {reasons.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department Trends — Bar Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Department Exits</h3>
          {departments.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={departments}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Exits" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tenure Distribution — Histogram */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tenure Distribution</h3>
          {tenure.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tenure}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Employees" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* NPS Summary Card */}
      <Link
        to="/analytics/nps"
        className="block rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Exit Survey NPS</h3>
            {nps ? (
              <div className="mt-2 flex items-baseline gap-3">
                <span
                  className="text-4xl font-bold"
                  style={{ color: nps.nps > 50 ? "#16a34a" : nps.nps >= 0 ? "#f59e0b" : "#dc2626" }}
                >
                  {nps.nps}
                </span>
                <span className="text-sm text-gray-500">
                  from {nps.totalResponses} response{nps.totalResponses !== 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">No data yet</p>
            )}
            {nps && (
              <div className="mt-3 flex gap-4 text-xs">
                <span className="text-green-600">{nps.promoters} promoters</span>
                <span className="text-yellow-600">{nps.passives} passives</span>
                <span className="text-red-600">{nps.detractors} detractors</span>
              </div>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
      </Link>
    </div>
  );
}
