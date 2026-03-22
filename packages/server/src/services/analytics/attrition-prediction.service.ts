// ============================================================================
// ATTRITION PREDICTION SERVICE
// Flight risk scoring based on employee data patterns.
// Factors: tenure, department exit rate, feedback, manager changes,
// salary revision recency.
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../db/adapters";
import { getEmpCloudDB } from "../../db/empcloud";
import { logger } from "../../utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskFactor {
  name: string;
  value: number;
  impact: number;
  description: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface FlightRiskResult {
  score: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
}

export interface FlightRiskRecord {
  id: string;
  organization_id: number;
  employee_id: number;
  score: number;
  risk_level: RiskLevel;
  factors: RiskFactor[];
  calculated_at: string;
}

export interface HighRiskEmployee {
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
}

export interface DashboardSummary {
  totalEmployees: number;
  riskDistribution: { name: string; value: number; color: string }[];
  highRiskCount: number;
  departmentBreakdown: { department: string; avgScore: number; employeeCount: number; riskLevel: RiskLevel }[];
  topRiskFactors: { name: string; count: number }[];
}

export interface PredictionTrend {
  month: string;
  predicted_exits: number;
  actual_exits: number | null;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Factor weights
// ---------------------------------------------------------------------------

const WEIGHTS = {
  tenure: 0.20,
  departmentExitRate: 0.20,
  recentFeedback: 0.15,
  managerChange: 0.20,
  salaryRevision: 0.25,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "critical": return "#dc2626";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// Calculate flight risk for a single employee
// ---------------------------------------------------------------------------

export async function calculateFlightRisk(
  orgId: number,
  employeeId: number,
): Promise<FlightRiskResult> {
  const empDb = getEmpCloudDB();
  const db = getDB();
  const factors: RiskFactor[] = [];

  // Fetch employee from empcloud
  const employee = await empDb("users")
    .where({ id: employeeId, organization_id: orgId })
    .first();

  if (!employee) {
    return { score: 0, riskLevel: "low", factors: [] };
  }

  // -----------------------------------------------------------------------
  // 1. Tenure Factor — 1-2 years and 5-7 years are higher risk
  // -----------------------------------------------------------------------
  let tenureScore = 0;
  if (employee.date_of_joining) {
    const joinDate = new Date(employee.date_of_joining);
    const now = new Date();
    const tenureYears = (now.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (tenureYears >= 1 && tenureYears <= 2) {
      tenureScore = 80;
    } else if (tenureYears >= 5 && tenureYears <= 7) {
      tenureScore = 70;
    } else if (tenureYears < 0.5) {
      tenureScore = 50; // very new — probation risk
    } else if (tenureYears > 10) {
      tenureScore = 15; // long tenure — low risk
    } else {
      tenureScore = 30;
    }

    factors.push({
      name: "Tenure",
      value: Math.round(tenureYears * 10) / 10,
      impact: tenureScore,
      description:
        tenureScore >= 70
          ? `${Math.round(tenureYears * 10) / 10} years — common churn point`
          : `${Math.round(tenureYears * 10) / 10} years of tenure`,
    });
  } else {
    tenureScore = 40;
    factors.push({
      name: "Tenure",
      value: 0,
      impact: tenureScore,
      description: "Date of joining not recorded",
    });
  }

  // -----------------------------------------------------------------------
  // 2. Department Factor — compare dept exit rate vs org average
  // -----------------------------------------------------------------------
  let deptScore = 0;
  const deptId = employee.department_id;

  if (deptId) {
    // Org-wide exit rate (last 12 months)
    const orgExitsRaw = await db.raw<any>(
      `SELECT COUNT(*) AS cnt
       FROM exit_requests
       WHERE organization_id = ?
         AND status NOT IN ('cancelled')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`,
      [orgId],
    );
    const orgExits = Number(
      Array.isArray(orgExitsRaw) && Array.isArray(orgExitsRaw[0])
        ? orgExitsRaw[0][0]?.cnt
        : orgExitsRaw[0]?.cnt ?? 0,
    );

    // Department exit rate
    const deptExitsRaw = await db.raw<any>(
      `SELECT COUNT(*) AS cnt
       FROM exit_requests er
       LEFT JOIN empcloud.users u ON u.id = er.employee_id
       WHERE er.organization_id = ?
         AND u.department_id = ?
         AND er.status NOT IN ('cancelled')
         AND er.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`,
      [orgId, deptId],
    );
    const deptExits = Number(
      Array.isArray(deptExitsRaw) && Array.isArray(deptExitsRaw[0])
        ? deptExitsRaw[0][0]?.cnt
        : deptExitsRaw[0]?.cnt ?? 0,
    );

    // Count employees in department
    const deptCountRaw = await empDb("users")
      .where({ organization_id: orgId, department_id: deptId, status: 1 })
      .count("* as cnt");
    const deptCount = Number(deptCountRaw[0]?.cnt ?? 1);

    // Count all active employees in org
    const orgCountRaw = await empDb("users")
      .where({ organization_id: orgId, status: 1 })
      .count("* as cnt");
    const orgCount = Number(orgCountRaw[0]?.cnt ?? 1);

    const orgRate = orgCount > 0 ? orgExits / orgCount : 0;
    const deptRate = deptCount > 0 ? deptExits / deptCount : 0;

    if (orgRate > 0 && deptRate > orgRate * 1.5) {
      deptScore = 85;
    } else if (orgRate > 0 && deptRate > orgRate * 1.2) {
      deptScore = 65;
    } else if (orgRate > 0 && deptRate > orgRate) {
      deptScore = 45;
    } else {
      deptScore = 20;
    }

    factors.push({
      name: "Department Exit Rate",
      value: Math.round(deptRate * 100),
      impact: deptScore,
      description:
        deptScore >= 65
          ? "Department has significantly higher exit rate than org average"
          : "Department exit rate is within normal range",
    });
  } else {
    deptScore = 30;
    factors.push({
      name: "Department Exit Rate",
      value: 0,
      impact: deptScore,
      description: "No department assigned",
    });
  }

  // -----------------------------------------------------------------------
  // 3. Recent Feedback — check exit interview ratings for the department
  //    (proxy for constructive/negative feedback environment)
  // -----------------------------------------------------------------------
  let feedbackScore = 0;

  const interviewRatingsRaw = await db.raw<any>(
    `SELECT AVG(ei.overall_rating) AS avg_rating
     FROM exit_interviews ei
     JOIN exit_requests er ON er.id = ei.exit_request_id
     LEFT JOIN empcloud.users u ON u.id = er.employee_id
     WHERE er.organization_id = ?
       AND u.department_id = ?
       AND ei.status = 'completed'
       AND ei.overall_rating IS NOT NULL
       AND er.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`,
    [orgId, deptId || 0],
  );
  const avgRating = Number(
    Array.isArray(interviewRatingsRaw) && Array.isArray(interviewRatingsRaw[0])
      ? interviewRatingsRaw[0][0]?.avg_rating
      : interviewRatingsRaw[0]?.avg_rating ?? 0,
  );

  if (avgRating > 0) {
    // Lower exit interview ratings = dept culture issues = higher risk for remaining
    if (avgRating <= 2) {
      feedbackScore = 80;
    } else if (avgRating <= 3) {
      feedbackScore = 55;
    } else {
      feedbackScore = 20;
    }
    factors.push({
      name: "Dept Feedback Climate",
      value: Math.round(avgRating * 10) / 10,
      impact: feedbackScore,
      description:
        feedbackScore >= 55
          ? "Exit interviews indicate low satisfaction in this department"
          : "Exit interviews indicate reasonable department satisfaction",
    });
  } else {
    feedbackScore = 30; // neutral if no data
    factors.push({
      name: "Dept Feedback Climate",
      value: 0,
      impact: feedbackScore,
      description: "No exit interview data available for this department",
    });
  }

  // -----------------------------------------------------------------------
  // 4. Manager Change — recent reporting manager change = higher risk
  // -----------------------------------------------------------------------
  let managerChangeScore = 0;

  // Check audit_logs for manager changes, or use a heuristic:
  // If the user's reporting_manager_id was updated recently, that's a signal.
  // We'll check audit_logs for recent changes to reporting_manager.
  const managerChangeRaw = await db.raw<any>(
    `SELECT COUNT(*) AS cnt
     FROM audit_logs
     WHERE organization_id = ?
       AND entity_type = 'user'
       AND action LIKE '%manager%'
       AND new_value LIKE ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`,
    [orgId, `%${employeeId}%`],
  );
  const managerChanges = Number(
    Array.isArray(managerChangeRaw) && Array.isArray(managerChangeRaw[0])
      ? managerChangeRaw[0][0]?.cnt
      : managerChangeRaw[0]?.cnt ?? 0,
  );

  if (managerChanges > 0) {
    managerChangeScore = 75;
    factors.push({
      name: "Manager Change",
      value: managerChanges,
      impact: managerChangeScore,
      description: "Reporting manager changed in the last 6 months",
    });
  } else {
    managerChangeScore = 10;
    factors.push({
      name: "Manager Change",
      value: 0,
      impact: managerChangeScore,
      description: "No recent reporting manager change detected",
    });
  }

  // -----------------------------------------------------------------------
  // 5. Salary Revision — no salary revision in 18+ months = higher risk
  //    We approximate by checking audit_logs for salary/compensation events,
  //    or fall back to a moderate score.
  // -----------------------------------------------------------------------
  let salaryScore = 0;

  const salaryRevisionRaw = await db.raw<any>(
    `SELECT COUNT(*) AS cnt
     FROM audit_logs
     WHERE organization_id = ?
       AND (action LIKE '%salary%' OR action LIKE '%compensation%' OR action LIKE '%revision%')
       AND new_value LIKE ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 18 MONTH)`,
    [orgId, `%${employeeId}%`],
  );
  const salaryRevisions = Number(
    Array.isArray(salaryRevisionRaw) && Array.isArray(salaryRevisionRaw[0])
      ? salaryRevisionRaw[0][0]?.cnt
      : salaryRevisionRaw[0]?.cnt ?? 0,
  );

  if (salaryRevisions === 0) {
    // No evidence of salary revision in 18 months
    salaryScore = 75;
    factors.push({
      name: "Salary Revision",
      value: 0,
      impact: salaryScore,
      description: "No salary revision detected in the last 18 months",
    });
  } else {
    salaryScore = 15;
    factors.push({
      name: "Salary Revision",
      value: salaryRevisions,
      impact: salaryScore,
      description: "Recent salary revision found",
    });
  }

  // -----------------------------------------------------------------------
  // Weighted sum → normalize to 0-100
  // -----------------------------------------------------------------------
  const rawScore =
    tenureScore * WEIGHTS.tenure +
    deptScore * WEIGHTS.departmentExitRate +
    feedbackScore * WEIGHTS.recentFeedback +
    managerChangeScore * WEIGHTS.managerChange +
    salaryScore * WEIGHTS.salaryRevision;

  const score = clamp(Math.round(rawScore), 0, 100);
  const riskLevel = scoreToRiskLevel(score);

  return { score, riskLevel, factors };
}

// ---------------------------------------------------------------------------
// Batch calculate flight risk for all active employees
// ---------------------------------------------------------------------------

export async function batchCalculateFlightRisk(orgId: number): Promise<number> {
  const empDb = getEmpCloudDB();
  const db = getDB();

  // Get all active employees
  const employees = await empDb("users")
    .where({ organization_id: orgId, status: 1 })
    .select("id");

  logger.info(`Batch calculating flight risk for ${employees.length} employees in org ${orgId}`);

  // Delete old scores for this org
  await db.raw("DELETE FROM flight_risk_scores WHERE organization_id = ?", [orgId]);

  let calculated = 0;

  for (const emp of employees) {
    try {
      const result = await calculateFlightRisk(orgId, emp.id);

      await db.raw(
        `INSERT INTO flight_risk_scores (id, organization_id, employee_id, score, risk_level, factors, calculated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          uuidv4(),
          orgId,
          emp.id,
          result.score,
          result.riskLevel,
          JSON.stringify(result.factors),
        ],
      );

      calculated++;
    } catch (err) {
      logger.error(`Failed to calculate flight risk for employee ${emp.id}:`, err);
    }
  }

  // Also generate monthly attrition prediction
  await generateAttritionPrediction(orgId);

  logger.info(`Flight risk batch complete: ${calculated}/${employees.length} employees scored`);
  return calculated;
}

// ---------------------------------------------------------------------------
// Get high-risk employees
// ---------------------------------------------------------------------------

export async function getHighRiskEmployees(
  orgId: number,
  threshold = 70,
): Promise<HighRiskEmployee[]> {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       frs.employee_id,
       frs.score,
       frs.risk_level,
       frs.factors,
       frs.calculated_at,
       u.first_name,
       u.last_name,
       u.email,
       u.designation,
       u.date_of_joining,
       d.name AS department_name
     FROM flight_risk_scores frs
     LEFT JOIN empcloud.users u ON u.id = frs.employee_id
     LEFT JOIN empcloud.organization_departments d ON d.id = u.department_id
     WHERE frs.organization_id = ?
       AND frs.score >= ?
     ORDER BY frs.score DESC
     LIMIT 200`,
    [orgId, threshold],
  );

  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;

  return data.map((r: any) => ({
    employee_id: r.employee_id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    designation: r.designation,
    department_name: r.department_name,
    date_of_joining: r.date_of_joining,
    score: r.score,
    risk_level: r.risk_level as RiskLevel,
    factors: typeof r.factors === "string" ? JSON.parse(r.factors) : r.factors || [],
    calculated_at: r.calculated_at,
  }));
}

// ---------------------------------------------------------------------------
// Get individual employee flight risk
// ---------------------------------------------------------------------------

export async function getEmployeeFlightRisk(
  orgId: number,
  employeeId: number,
): Promise<(HighRiskEmployee & { history: { score: number; calculated_at: string }[] }) | null> {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       frs.employee_id,
       frs.score,
       frs.risk_level,
       frs.factors,
       frs.calculated_at,
       u.first_name,
       u.last_name,
       u.email,
       u.designation,
       u.date_of_joining,
       d.name AS department_name
     FROM flight_risk_scores frs
     LEFT JOIN empcloud.users u ON u.id = frs.employee_id
     LEFT JOIN empcloud.organization_departments d ON d.id = u.department_id
     WHERE frs.organization_id = ?
       AND frs.employee_id = ?
     ORDER BY frs.calculated_at DESC
     LIMIT 1`,
    [orgId, employeeId],
  );

  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  if (!data || data.length === 0) return null;

  const r = data[0];

  return {
    employee_id: r.employee_id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    designation: r.designation,
    department_name: r.department_name,
    date_of_joining: r.date_of_joining,
    score: r.score,
    risk_level: r.risk_level as RiskLevel,
    factors: typeof r.factors === "string" ? JSON.parse(r.factors) : r.factors || [],
    calculated_at: r.calculated_at,
    history: [], // populated below
  };
}

// ---------------------------------------------------------------------------
// Flight Risk Dashboard — summary stats
// ---------------------------------------------------------------------------

export async function getFlightRiskDashboard(orgId: number): Promise<DashboardSummary> {
  const db = getDB();
  const empDb = getEmpCloudDB();

  // Total active employees
  const totalRaw = await empDb("users")
    .where({ organization_id: orgId, status: 1 })
    .count("* as cnt");
  const totalEmployees = Number(totalRaw[0]?.cnt ?? 0);

  // Risk distribution
  const distRaw = await db.raw<any>(
    `SELECT risk_level, COUNT(*) AS cnt
     FROM flight_risk_scores
     WHERE organization_id = ?
     GROUP BY risk_level`,
    [orgId],
  );
  const distData = Array.isArray(distRaw) && Array.isArray(distRaw[0]) ? distRaw[0] : distRaw;

  const distMap: Record<string, number> = {};
  for (const row of distData) {
    distMap[row.risk_level] = Number(row.cnt);
  }

  const riskDistribution = [
    { name: "Low", value: distMap["low"] || 0, color: "#22c55e" },
    { name: "Medium", value: distMap["medium"] || 0, color: "#eab308" },
    { name: "High", value: distMap["high"] || 0, color: "#f97316" },
    { name: "Critical", value: distMap["critical"] || 0, color: "#dc2626" },
  ];

  const highRiskCount = (distMap["high"] || 0) + (distMap["critical"] || 0);

  // Department breakdown
  const deptRaw = await db.raw<any>(
    `SELECT
       COALESCE(d.name, 'Unknown') AS department,
       AVG(frs.score) AS avg_score,
       COUNT(*) AS employee_count
     FROM flight_risk_scores frs
     LEFT JOIN empcloud.users u ON u.id = frs.employee_id
     LEFT JOIN empcloud.organization_departments d ON d.id = u.department_id
     WHERE frs.organization_id = ?
     GROUP BY department
     ORDER BY avg_score DESC`,
    [orgId],
  );
  const deptData = Array.isArray(deptRaw) && Array.isArray(deptRaw[0]) ? deptRaw[0] : deptRaw;

  const departmentBreakdown = deptData.map((r: any) => ({
    department: r.department,
    avgScore: Math.round(Number(r.avg_score)),
    employeeCount: Number(r.employee_count),
    riskLevel: scoreToRiskLevel(Math.round(Number(r.avg_score))),
  }));

  // Top risk factors across all scored employees
  const allFactorsRaw = await db.raw<any>(
    `SELECT factors
     FROM flight_risk_scores
     WHERE organization_id = ?
       AND score >= 60`,
    [orgId],
  );
  const allFactorsData =
    Array.isArray(allFactorsRaw) && Array.isArray(allFactorsRaw[0])
      ? allFactorsRaw[0]
      : allFactorsRaw;

  const factorCounts: Record<string, number> = {};
  for (const row of allFactorsData) {
    const factors: RiskFactor[] =
      typeof row.factors === "string" ? JSON.parse(row.factors) : row.factors || [];
    for (const f of factors) {
      if (f.impact >= 60) {
        factorCounts[f.name] = (factorCounts[f.name] || 0) + 1;
      }
    }
  }

  const topRiskFactors = Object.entries(factorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalEmployees,
    riskDistribution,
    highRiskCount,
    departmentBreakdown,
    topRiskFactors,
  };
}

// ---------------------------------------------------------------------------
// Generate monthly attrition prediction per department
// ---------------------------------------------------------------------------

async function generateAttritionPrediction(orgId: number): Promise<void> {
  const db = getDB();
  const empDb = getEmpCloudDB();

  // Get departments
  const departments = await empDb("organization_departments")
    .where({ organization_id: orgId })
    .select("id", "name");

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  for (const dept of departments) {
    // Count high-risk employees in this department
    const highRiskRaw = await db.raw<any>(
      `SELECT COUNT(*) AS cnt
       FROM flight_risk_scores frs
       LEFT JOIN empcloud.users u ON u.id = frs.employee_id
       WHERE frs.organization_id = ?
         AND u.department_id = ?
         AND frs.score >= 60`,
      [orgId, dept.id],
    );
    const highRisk = Number(
      Array.isArray(highRiskRaw) && Array.isArray(highRiskRaw[0])
        ? highRiskRaw[0][0]?.cnt
        : highRiskRaw[0]?.cnt ?? 0,
    );

    // Predicted exits = roughly 30% of high-risk employees per month
    const predictedExits = Math.round(highRisk * 0.3);
    const confidence = highRisk > 0 ? Math.min(85, 50 + highRisk * 5) : 30;

    // Delete existing prediction for this month + dept
    await db.raw(
      `DELETE FROM attrition_predictions
       WHERE organization_id = ? AND department_id = ? AND month = ?`,
      [orgId, dept.id, monthStr],
    );

    await db.raw(
      `INSERT INTO attrition_predictions (id, organization_id, department_id, month, predicted_exits, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), orgId, dept.id, monthStr, predictedExits, confidence],
    );
  }
}

// ---------------------------------------------------------------------------
// Get prediction trends (monthly predicted vs actual)
// ---------------------------------------------------------------------------

export async function getPredictionTrends(orgId: number): Promise<PredictionTrend[]> {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       DATE_FORMAT(ap.month, '%Y-%m') AS month,
       SUM(ap.predicted_exits) AS predicted_exits,
       SUM(ap.actual_exits) AS actual_exits,
       AVG(ap.confidence) AS confidence
     FROM attrition_predictions ap
     WHERE ap.organization_id = ?
     GROUP BY DATE_FORMAT(ap.month, '%Y-%m')
     ORDER BY month ASC
     LIMIT 12`,
    [orgId],
  );

  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;

  return data.map((r: any) => ({
    month: r.month,
    predicted_exits: Number(r.predicted_exits),
    actual_exits: r.actual_exits != null ? Number(r.actual_exits) : null,
    confidence: Number(r.confidence),
  }));
}
