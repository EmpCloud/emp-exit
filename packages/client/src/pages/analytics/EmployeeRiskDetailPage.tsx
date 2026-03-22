import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Loader2,
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
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
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
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/analytics/flight-risk")}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Flight Risk Dashboard
        </button>
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Risk Data</h3>
          <p className="mt-2 text-sm text-gray-500">
            Risk scores have not been calculated for this employee yet.
          </p>
        </div>
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
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/analytics/flight-risk")}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Flight Risk Dashboard
      </button>

      {/* Employee Info Card + Score */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            {data.first_name} {data.last_name}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              {data.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="h-4 w-4 text-gray-400" />
              {data.designation || "No designation"}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="h-4 w-4 text-gray-400" />
              {data.department_name || "No department"}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              Tenure: {tenure}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400">
            Last calculated: {new Date(data.calculated_at).toLocaleDateString()}
          </div>
        </div>

        {/* Score Gauge */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col items-center justify-center">
          <div className="relative h-36 w-36">
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
                strokeDasharray={`${(data.score / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color: gaugeColor }}>
                {data.score}
              </span>
              <span className="text-[10px] font-medium text-gray-500 uppercase">
                Risk Score
              </span>
            </div>
          </div>
          <div className="mt-3">{riskBadge(data.risk_level)}</div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Factor Breakdown</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data.factors || []).map((f, i) => {
            let factorColor = "#22c55e";
            if (f.impact >= 70) factorColor = "#dc2626";
            else if (f.impact >= 50) factorColor = "#f97316";
            else if (f.impact >= 30) factorColor = "#eab308";

            return (
              <div
                key={i}
                className="rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">{f.name}</h4>
                  <span
                    className="text-lg font-bold"
                    style={{ color: factorColor }}
                  >
                    {f.impact}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 mb-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${f.impact}%`,
                      backgroundColor: factorColor,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">{f.description}</p>
                {f.value !== undefined && f.value !== null && (
                  <p className="mt-1 text-xs text-gray-400">
                    Value: {f.value}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Score Trend */}
      {data.history && data.history.length > 1 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Score History
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={data.history.map((h) => ({
                date: new Date(h.calculated_at).toLocaleDateString(),
                score: h.score,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
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
        </div>
      )}

      {/* Recommended Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{recs.title}</h3>
        <p className="text-sm text-gray-500 mb-4">
          Based on the {data.risk_level} risk level for this employee.
        </p>
        <ul className="space-y-3">
          {recs.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <ChevronRight className="h-4 w-4 mt-0.5 text-brand-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
