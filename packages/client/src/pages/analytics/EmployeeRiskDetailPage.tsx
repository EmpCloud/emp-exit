import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Mail,
  Briefcase,
  Building,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiGet } from "@/api/client";
import toast from "react-hot-toast";
import type { RiskLevel, RiskFactor } from "@emp-exit/shared";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";

interface EmployeeRiskDetail {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  designation: string | null;
  department_name: string | null;
  date_of_joining: string | null;
  score: number;
  risk_level: RiskLevel;
  factors: RiskFactor[];
  calculated_at: string;
  history: { score: number; calculated_at: string }[];
}

function riskBadge(level: RiskLevel) {
  const colors: Record<RiskLevel, string> = {
    low: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
    medium: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300",
    high: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
    critical: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${colors[level]}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
  );
}

const RECOMMENDATIONS: Record<RiskLevel, { title: string; items: string[] }> = {
  critical: {
    title: "Urgent Retention Actions Required",
    items: [
      "Schedule an immediate 1-on-1 meeting with direct manager and HR",
      "Review compensation and benefits against market benchmarks",
      "Offer a retention package (bonus, promotion path, or flexible work)",
      "Assign a senior executive sponsor for career development",
      "Address any specific pain points identified in risk factors",
    ],
  },
  high: {
    title: "Proactive Retention Measures",
    items: [
      "Schedule a stay interview within the next 2 weeks",
      "Review workload distribution and job satisfaction",
      "Discuss clear career progression and growth opportunities",
      "Consider a lateral move or a high-visibility project assignment",
      "Ensure recognition for recent contributions",
    ],
  },
  medium: {
    title: "Engagement Enhancement",
    items: [
      "Include in the next skip-level meeting for direct feedback",
      "Ensure regular feedback loops and quarterly goal reviews",
      "Provide access to learning and development programs",
      "Monitor engagement indicators over the next quarter",
    ],
  },
  low: {
    title: "Maintain Engagement",
    items: [
      "Continue regular check-ins and 1-on-1 meetings",
      "Recognize contributions and celebrate milestones",
      "Encourage participation in team and company events",
    ],
  },
};

export function EmployeeRiskDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeRiskDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await apiGet<EmployeeRiskDetail>(
          `/predictions/employee/${employeeId}`,
        );
        if (res.success && res.data) {
          setData(res.data);
        } else {
          toast.error("Employee risk data not found");
        }
      } catch {
        toast.error("Failed to load employee risk data");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [employeeId]);

  if (loading) {
    return <LoadingState label="Loading employee risk" />;
  }

  if (!data) {
    return (
      <div className="app-page">
        <button
          onClick={() => navigate("/analytics/flight-risk")}
          className="button-ghost w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Flight Risk Dashboard
        </button>
        <div className="surface-card"><EmptyState icon={AlertTriangle} title="No Risk Data" description="Risk scores have not been calculated for this employee yet." /></div>
      </div>
    );
  }

  // Gauge
  let gaugeColor = "#22c55e";
  if (data.score >= 80) gaugeColor = "#dc2626";
  else if (data.score >= 60) gaugeColor = "#f97316";
  else if (data.score >= 40) gaugeColor = "#eab308";

  // Tenure
  let tenure = "N/A";
  if (data.date_of_joining) {
    const years =
      (Date.now() - new Date(data.date_of_joining).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    tenure =
      years < 1
        ? `${Math.round(years * 12)} months`
        : `${Math.round(years * 10) / 10} years`;
  }

  const recs = RECOMMENDATIONS[data.risk_level];

  return (
    <div className="app-page">
      {/* Back link */}
      <button
        onClick={() => navigate("/analytics/flight-risk")}
        className="button-ghost w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Flight Risk Dashboard
      </button>

      {/* Employee Info Card + Score */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info */}
        <section className="surface-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-foreground">
            {data.first_name} {data.last_name}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {data.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              {data.designation || "No designation"}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4 text-muted-foreground" />
              {data.department_name || "No department"}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Tenure: {tenure}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Last calculated: {formatDate(data.calculated_at)}
          </div>
        </section>

        {/* Score Gauge */}
        <section className="surface-card flex flex-col items-center justify-center p-5 sm:p-6">
          <div className="relative h-36 w-36">
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
                strokeDasharray={`${(data.score / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color: gaugeColor }}>
                {data.score}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Risk Score
              </span>
            </div>
          </div>
          <div className="mt-3">{riskBadge(data.risk_level)}</div>
        </section>
      </div>

      {/* Risk Factors */}
      <section className="surface-card p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Risk Factor Breakdown</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data.factors || []).map((f, i) => {
            let factorColor = "#22c55e";
            if (f.impact >= 70) factorColor = "#dc2626";
            else if (f.impact >= 50) factorColor = "#f97316";
            else if (f.impact >= 30) factorColor = "#eab308";

            return (
              <div
                key={i}
                className="rounded-xl border border-border bg-muted/20 p-4 transition-colors duration-150 hover:border-brand-400 hover:bg-muted/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">{f.name}</h4>
                  <span
                    className="text-lg font-bold"
                    style={{ color: factorColor }}
                  >
                    {f.impact}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted mb-2">
                  <div
                    className="h-2 rounded-full transition-[width]"
                    style={{
                      width: `${f.impact}%`,
                      backgroundColor: factorColor,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                {f.value !== undefined && f.value !== null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Value: {f.value}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Historical Score Trend */}
      {data.history && data.history.length > 1 && (
        <section className="surface-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Score History
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={data.history.map((h) => ({
                date: formatDate(h.calculated_at),
                score: h.score,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
              <Line
                type="monotone"
                dataKey="score"
                name="Risk Score"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: "#f97316", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Recommended Actions */}
      <section className="surface-card p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">{recs.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Based on the {data.risk_level} risk level for this employee.
        </p>
        <ul className="space-y-3">
          {recs.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 mt-0.5 text-brand-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
