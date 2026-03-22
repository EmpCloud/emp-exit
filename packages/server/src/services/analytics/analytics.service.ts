// ============================================================================
// ANALYTICS SERVICE
// Provides exit analytics: attrition rate, reason breakdown, dept trends,
// tenure distribution, and rehire pool.
// ============================================================================

import { getDB } from "../../db/adapters";
import { logger } from "../../utils/logger";

/**
 * Get attrition rate — exits per month / avg headcount.
 */
export async function getAttritionRate(orgId: number) {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%m') AS month,
       COUNT(*) AS exit_count
     FROM exit_requests
     WHERE organization_id = ?
       AND status NOT IN ('cancelled')
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY month ASC
     LIMIT 24`,
    [orgId],
  );

  // rows comes as [rows, fields] from mysql2
  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  return data;
}

/**
 * Get reason breakdown — GROUP BY reason_category.
 */
export async function getReasonBreakdown(orgId: number) {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       reason_category,
       COUNT(*) AS count
     FROM exit_requests
     WHERE organization_id = ?
       AND status NOT IN ('cancelled')
     GROUP BY reason_category
     ORDER BY count DESC`,
    [orgId],
  );

  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  return data;
}

/**
 * Get department trends — exits per department over time.
 */
export async function getDepartmentTrends(orgId: number) {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       COALESCE(d.name, 'Unknown') AS department,
       DATE_FORMAT(er.created_at, '%Y-%m') AS month,
       COUNT(*) AS exit_count
     FROM exit_requests er
     LEFT JOIN empcloud.users u ON u.id = er.employee_id
     LEFT JOIN empcloud.organization_departments d ON d.id = u.department_id
     WHERE er.organization_id = ?
       AND er.status NOT IN ('cancelled')
     GROUP BY department, month
     ORDER BY month ASC, exit_count DESC`,
    [orgId],
  );

  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  return data;
}

/**
 * Get tenure distribution — bucket by years of service at exit.
 */
export async function getTenureDistribution(orgId: number) {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       CASE
         WHEN TIMESTAMPDIFF(YEAR, u.date_of_joining, COALESCE(er.actual_exit_date, er.last_working_date, er.created_at)) < 1 THEN '< 1 year'
         WHEN TIMESTAMPDIFF(YEAR, u.date_of_joining, COALESCE(er.actual_exit_date, er.last_working_date, er.created_at)) BETWEEN 1 AND 2 THEN '1-2 years'
         WHEN TIMESTAMPDIFF(YEAR, u.date_of_joining, COALESCE(er.actual_exit_date, er.last_working_date, er.created_at)) BETWEEN 3 AND 5 THEN '3-5 years'
         WHEN TIMESTAMPDIFF(YEAR, u.date_of_joining, COALESCE(er.actual_exit_date, er.last_working_date, er.created_at)) BETWEEN 6 AND 10 THEN '6-10 years'
         ELSE '10+ years'
       END AS bucket,
       COUNT(*) AS count
     FROM exit_requests er
     LEFT JOIN empcloud.users u ON u.id = er.employee_id
     WHERE er.organization_id = ?
       AND er.status NOT IN ('cancelled')
       AND u.date_of_joining IS NOT NULL
     GROUP BY bucket
     ORDER BY count DESC`,
    [orgId],
  );

  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  return data;
}

/**
 * Get rehire pool — employees eligible for rehire.
 * Criteria: exit_type is resignation, reason is not misconduct/performance,
 * and has an alumni profile with opted_in = true.
 */
export async function getRehirePool(orgId: number) {
  const db = getDB();

  const rows = await db.raw<any>(
    `SELECT
       er.id AS exit_request_id,
       er.employee_id,
       u.first_name,
       u.last_name,
       u.email,
       u.designation,
       er.exit_type,
       er.reason_category,
       er.actual_exit_date,
       ap.personal_email,
       ap.linkedin_url,
       ap.last_designation
     FROM exit_requests er
     LEFT JOIN empcloud.users u ON u.id = er.employee_id
     LEFT JOIN alumni_profiles ap ON ap.exit_request_id = er.id AND ap.opted_in = 1
     WHERE er.organization_id = ?
       AND er.status = 'completed'
       AND er.exit_type IN ('resignation', 'mutual_separation', 'end_of_contract')
       AND er.reason_category NOT IN ('misconduct', 'performance')
     ORDER BY er.actual_exit_date DESC
     LIMIT 100`,
    [orgId],
  );

  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  return data;
}
