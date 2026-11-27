import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { apiGet } from "@/api/client";
import toast from "react-hot-toast";
import { LoadingState } from "@/components/ui/States";

function getNPSColor(nps: number): string {
  if (nps > 50) return "#16a34a";
  if (nps >= 0) return "#f59e0b";
  return "#dc2626";
}

function getNPSLabel(nps: number): string {
  if (nps > 70) return "Excellent";
  if (nps > 50) return "Great";
  if (nps > 30) return "Good";
  if (nps >= 0) return "Needs Improvement";
  return "Critical";
}

export function NPSPage() {
  const [npsData, setNpsData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const [npsRes, trendRes] = await Promise.all([
        apiGet<any>("/analytics/nps"),
        apiGet<any>("/analytics/nps/trend", { months: 12 }),
      ]);
      if (npsRes.success) setNpsData(npsRes.data);
      if (trendRes.success) setTrendData(trendRes.data || []);
    } catch {
      toast.error("Failed to load NPS data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingState label="Loading NPS insights" />;
  }

  const nps = npsData?.nps ?? 0;
  const promoters = npsData?.promoters ?? 0;
  const passives = npsData?.passives ?? 0;
  const detractors = npsData?.detractors ?? 0;
  const totalResponses = npsData?.totalResponses ?? 0;

  const promoterPct = totalResponses > 0 ? Math.round((promoters / totalResponses) * 100) : 0;
  const passivePct = totalResponses > 0 ? Math.round((passives / totalResponses) * 100) : 0;
  const detractorPct = totalResponses > 0 ? Math.round((detractors / totalResponses) * 100) : 0;

  const npsColor = getNPSColor(nps);

  // Gauge calculation (NPS range -100 to +100, mapped to 0-180 degrees)
  const gaugeAngle = ((nps + 100) / 200) * 180;

  // Stacked bar data
  const breakdownData = [
    { name: "Promoters (9-10)", value: promoterPct, count: promoters, fill: "#16a34a" },
    { name: "Passives (7-8)", value: passivePct, count: passives, fill: "#f59e0b" },
    { name: "Detractors (1-6)", value: detractorPct, count: detractors, fill: "#dc2626" },
  ];

  return (
    <div className="app-page">
      <header className="page-header">
      <div className="flex items-start gap-3">
        <Link
          to="/analytics"
          className="button-secondary size-11 shrink-0 p-0"
          aria-label="Back to analytics"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="page-header__content">
          <p className="page-header__eyebrow">Experience insights</p>
          <h1 className="page-title">Exit Survey NPS</h1>
          <p className="page-subtitle">
            Net Promoter Score from exit interviews ({totalResponses} responses)
          </p>
        </div>
      </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* NPS Score Card with Gauge */}
        <section className="surface-card p-5 text-center sm:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-6">NPS Score</h3>

          {/* SVG Gauge */}
          <div className="relative mx-auto" style={{ width: 200, height: 120 }}>
            <svg viewBox="0 0 200 120" className="w-full h-full">
              {/* Background arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Red zone (-100 to 0) */}
              <path
                d="M 20 100 A 80 80 0 0 1 100 20"
                fill="none"
                stroke="#fecaca"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Yellow zone (0 to 50) */}
              <path
                d="M 100 20 A 80 80 0 0 1 156 38"
                fill="none"
                stroke="#fef3c7"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Green zone (50 to 100) */}
              <path
                d="M 156 38 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#dcfce7"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Needle */}
              <line
                x1="100"
                y1="100"
                x2={100 + 65 * Math.cos((Math.PI * (180 - gaugeAngle)) / 180)}
                y2={100 - 65 * Math.sin((Math.PI * (180 - gaugeAngle)) / 180)}
                stroke={npsColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="5" fill={npsColor} />
            </svg>
          </div>

          <div className="mt-2">
            <p className="text-5xl font-bold" style={{ color: npsColor }}>{nps}</p>
            <p className="text-sm font-medium mt-1" style={{ color: npsColor }}>
              {getNPSLabel(nps)}
            </p>
          </div>

          <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span>-100</span>
            <span>0</span>
            <span>+50</span>
            <span>+100</span>
          </div>
        </section>

        {/* Breakdown Card */}
        <section className="surface-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Breakdown</h3>

          {/* Stacked horizontal bar */}
          <div className="mb-6">
            <div className="flex h-8 rounded-full overflow-hidden bg-muted">
              {promoterPct > 0 && (
                <div
                  className="bg-green-500 flex items-center justify-center text-xs font-semibold text-white"
                  style={{ width: `${promoterPct}%` }}
                >
                  {promoterPct > 10 ? `${promoterPct}%` : ""}
                </div>
              )}
              {passivePct > 0 && (
                <div
                  className="bg-yellow-400 flex items-center justify-center text-xs font-semibold text-white"
                  style={{ width: `${passivePct}%` }}
                >
                  {passivePct > 10 ? `${passivePct}%` : ""}
                </div>
              )}
              {detractorPct > 0 && (
                <div
                  className="bg-red-500 flex items-center justify-center text-xs font-semibold text-white"
                  style={{ width: `${detractorPct}%` }}
                >
                  {detractorPct > 10 ? `${detractorPct}%` : ""}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Promoters (9-10)</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground">{promoters}</span>
                <span className="ms-1 text-xs text-muted-foreground">({promoterPct}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="text-sm text-muted-foreground">Passives (7-8)</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground">{passives}</span>
                <span className="ms-1 text-xs text-muted-foreground">({passivePct}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Detractors (1-6)</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground">{detractors}</span>
                <span className="ms-1 text-xs text-muted-foreground">({detractorPct}%)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">Total responses</p>
            <p className="text-2xl font-bold text-foreground">{totalResponses}</p>
          </div>
        </section>

        {/* Industry Benchmark Card */}
        <section className="surface-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Industry Benchmarks</h3>
          <div className="space-y-4">
            {[
              { label: "Your NPS", value: nps, color: npsColor },
              { label: "IT Industry Avg", value: 32, color: "#6b7280" },
              { label: "Top Performers", value: 65, color: "#6b7280" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(0, ((item.value + 100) / 200) * 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              {nps > 32 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : nps < 32 ? (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-xs text-muted-foreground">
                {nps > 32
                  ? "Above industry average"
                  : nps < 32
                    ? "Below industry average"
                    : "At industry average"}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Monthly NPS Trend */}
      <section className="surface-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Monthly NPS Trend (Last 12 Months)</h3>
        {trendData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No trend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => {
                  const [y, m] = v.split("-");
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                domain={[-100, 100]}
                ticks={[-100, -50, 0, 50, 100]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "nps" ? "NPS" : "Responses",
                ]}
                labelFormatter={(label) => {
                  const [y, m] = label.split("-");
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return `${months[parseInt(m, 10) - 1]} ${y}`;
                }}
              />
              {/* Zero line */}
              <Line
                type="monotone"
                dataKey="nps"
                name="NPS"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={{ fill: "#e11d48", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="responses"
                name="Responses"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
