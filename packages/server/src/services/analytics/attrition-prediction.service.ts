// ============================================================================
// ATTRITION PREDICTION SERVICE
// Monthly attrition prediction per department + prediction trends.
//
// Flight risk scoring logic: see flight-risk.service.ts
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../db/adapters";
import { getEmpCloudDB } from "../../db/empcloud";
import { logger } from "../../utils/logger";

// Re-export everything from flight-risk so existing imports continue to work
export {
  calculateFlightRisk,
  batchCalculateFlightRisk,
  getHighRiskEmployees,
  getEmployeeFlightRisk,
  getFlightRiskDashboard,
  scoreToRiskLevel,
} from "./flight-risk.service";

export type {
  RiskFactor,
  RiskLevel,
  FlightRiskResult,
  FlightRiskRecord,
  HighRiskEmployee,
  DashboardSummary,
} from "./flight-risk.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PredictionTrend {
  month: string;
  predicted_exits: number;
  actual_exits: number | null;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Generate monthly attrition prediction per department
// ---------------------------------------------------------------------------

export async function generateAttritionPrediction(orgId: number): Promise<void> {
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
