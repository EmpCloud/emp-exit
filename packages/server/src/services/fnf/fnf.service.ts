// ============================================================================
// FULL & FINAL SETTLEMENT SERVICE
// Calculates, adjusts, approves, and marks FnF settlements as paid.
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../db/adapters";
import { findUserById } from "../../db/empcloud";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import type { FnFSettlement, ExitRequest, NoticeBuyoutRequest } from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate pro-rata salary from LWD.
 * lastBasic = monthly basic salary (in smallest currency unit).
 * lwd = last working date string (YYYY-MM-DD).
 */
function proRataSalary(lastBasic: number, lwd: string): number {
  const lwdDate = new Date(lwd);
  const dayOfMonth = lwdDate.getDate();
  const daysInMonth = new Date(lwdDate.getFullYear(), lwdDate.getMonth() + 1, 0).getDate();
  return Math.round((lastBasic * dayOfMonth) / daysInMonth);
}

/**
 * Gratuity calculation (India):
 * Eligible if tenure >= 5 years.
 * Formula: 15 * lastBasic * completedYears / 26
 */
function calculateGratuity(lastBasic: number, dateOfJoining: string, lwd: string): number {
  const doj = new Date(dateOfJoining);
  const lwdDate = new Date(lwd);
  const diffMs = lwdDate.getTime() - doj.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  const completedYears = Math.floor(years);

  if (completedYears < 5) return 0;
  return Math.round((15 * lastBasic * completedYears) / 26);
}

/**
 * Notice period recovery: if employee did not serve full notice.
 */
function noticeRecovery(
  lastBasic: number,
  noticeDays: number,
  noticeStartDate: string | null,
  lwd: string,
  noticeWaived: boolean,
): number {
  if (noticeWaived) return 0;
  if (!noticeStartDate) return 0;

  const start = new Date(noticeStartDate);
  const end = new Date(lwd);
  const servedDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const shortfall = Math.max(0, noticeDays - servedDays);

  if (shortfall <= 0) return 0;
  const dailyRate = Math.round(lastBasic / 30);
  return dailyRate * shortfall;
}

// ---------------------------------------------------------------------------
// Core FnF operations
// ---------------------------------------------------------------------------

export async function calculateFnF(
  orgId: number,
  exitRequestId: string,
): Promise<FnFSettlement> {
  const db = getDB();

  // Get exit request
  const exitReq = await db.findOne<ExitRequest>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  // Check if FnF already exists
  const existing = await db.findOne<FnFSettlement>("fnf_settlements", {
    exit_request_id: exitRequestId,
  });
  if (existing && (existing.status === "approved" || existing.status === "paid")) {
    throw new ConflictError("FnF settlement already approved or paid — cannot recalculate");
  }

  // Get employee from EmpCloud
  const employee = await findUserById(exitReq.employee_id);
  if (!employee) throw new NotFoundError("Employee", String(exitReq.employee_id));

  // Use LWD or fallback to today
  const lwd = exitReq.last_working_date || new Date().toISOString().split("T")[0];

  // For calculation we need a basic salary. In a real system this comes from payroll.
  // We'll use a placeholder approach: read from breakdown_json if previously set,
  // or default to 0 (manual entry expected).
  let lastBasic = 0;
  if (existing?.breakdown_json) {
    try {
      const breakdown = JSON.parse(existing.breakdown_json);
      lastBasic = breakdown.last_basic_salary || 0;
    } catch {
      // ignore parse errors
    }
  }

  const pendingSalary = lastBasic > 0 ? proRataSalary(lastBasic, lwd) : 0;
  const gratuity = lastBasic > 0 && employee.date_of_joining
    ? calculateGratuity(lastBasic, employee.date_of_joining, lwd)
    : 0;
  let noticePayRecovery = lastBasic > 0
    ? noticeRecovery(
        lastBasic,
        exitReq.notice_period_days,
        exitReq.notice_start_date,
        lwd,
        exitReq.notice_period_waived,
      )
    : 0;

  // If an approved buyout exists, add the buyout amount to notice recovery
  const approvedBuyout = await db.findOne<NoticeBuyoutRequest>("notice_buyout_requests", {
    exit_request_id: exitRequestId,
    status: "approved",
  });
  if (approvedBuyout) {
    noticePayRecovery += approvedBuyout.buyout_amount;
    logger.info(
      `FnF includes buyout recovery of ${approvedBuyout.buyout_amount} for exit ${exitRequestId}`,
    );
  }

  // Carry forward any previously set values
  const leaveEncashment = existing?.leave_encashment || 0;
  const bonusDue = existing?.bonus_due || 0;
  const otherDeductions = existing?.other_deductions || 0;
  const otherEarnings = existing?.other_earnings || 0;

  const totalEarnings = pendingSalary + leaveEncashment + gratuity + bonusDue + otherEarnings;
  const totalDeductions = noticePayRecovery + otherDeductions;
  const totalPayable = totalEarnings - totalDeductions;

  const breakdownJson = JSON.stringify({
    last_basic_salary: lastBasic,
    lwd,
    date_of_joining: employee.date_of_joining,
    notice_days: exitReq.notice_period_days,
    notice_start_date: exitReq.notice_start_date,
    notice_waived: exitReq.notice_period_waived,
    calculated_at: new Date().toISOString(),
  });

  if (existing) {
    // Update existing FnF
    const updated = await db.update<FnFSettlement>("fnf_settlements", existing.id, {
      status: "calculated",
      basic_salary_due: pendingSalary,
      leave_encashment: leaveEncashment,
      bonus_due: bonusDue,
      gratuity,
      notice_pay_recovery: noticePayRecovery,
      other_deductions: otherDeductions,
      other_earnings: otherEarnings,
      total_payable: totalPayable,
      breakdown_json: breakdownJson,
    });
    logger.info(`FnF recalculated for exit ${exitRequestId}: total=${totalPayable}`);
    return updated;
  }

  // Create new FnF
  const fnf = await db.create<FnFSettlement>("fnf_settlements", {
    id: uuidv4(),
    exit_request_id: exitRequestId,
    status: "calculated",
    basic_salary_due: pendingSalary,
    leave_encashment: leaveEncashment,
    bonus_due: bonusDue,
    gratuity,
    notice_pay_recovery: noticePayRecovery,
    other_deductions: otherDeductions,
    other_earnings: otherEarnings,
    total_payable: totalPayable,
    breakdown_json: breakdownJson,
  });

  logger.info(`FnF calculated for exit ${exitRequestId}: id=${fnf.id}, total=${totalPayable}`);
  return fnf;
}

export async function getFnF(
  orgId: number,
  exitRequestId: string,
): Promise<FnFSettlement | null> {
  const db = getDB();

  // Verify exit request belongs to org
  const exitReq = await db.findOne<ExitRequest>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  return db.findOne<FnFSettlement>("fnf_settlements", {
    exit_request_id: exitRequestId,
  });
}

export async function updateFnF(
  orgId: number,
  exitRequestId: string,
  data: {
    basic_salary_due?: number;
    leave_encashment?: number;
    bonus_due?: number;
    gratuity?: number;
    notice_pay_recovery?: number;
    other_deductions?: number;
    other_earnings?: number;
    remarks?: string;
    breakdown_json?: string;
  },
): Promise<FnFSettlement> {
  const db = getDB();

  // Verify exit request belongs to org
  const exitReq = await db.findOne<ExitRequest>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  const fnf = await db.findOne<FnFSettlement>("fnf_settlements", {
    exit_request_id: exitRequestId,
  });
  if (!fnf) throw new NotFoundError("FnF settlement for exit", exitRequestId);

  if (fnf.status === "paid") {
    throw new ConflictError("Cannot update a paid FnF settlement");
  }

  // Recalculate total
  const basicSalaryDue = data.basic_salary_due ?? fnf.basic_salary_due;
  const leaveEncashment = data.leave_encashment ?? fnf.leave_encashment;
  const bonusDue = data.bonus_due ?? fnf.bonus_due;
  const gratuity = data.gratuity ?? fnf.gratuity;
  const noticePayRecovery = data.notice_pay_recovery ?? fnf.notice_pay_recovery;
  const otherDeductions = data.other_deductions ?? fnf.other_deductions;
  const otherEarnings = data.other_earnings ?? fnf.other_earnings;

  const totalEarnings = basicSalaryDue + leaveEncashment + gratuity + bonusDue + otherEarnings;
  const totalDeductions = noticePayRecovery + otherDeductions;
  const totalPayable = totalEarnings - totalDeductions;

  const updated = await db.update<FnFSettlement>("fnf_settlements", fnf.id, {
    ...data,
    total_payable: totalPayable,
  });

  logger.info(`FnF updated for exit ${exitRequestId}: total=${totalPayable}`);
  return updated;
}

export async function approveFnF(
  orgId: number,
  exitRequestId: string,
  approvedBy: number,
): Promise<FnFSettlement> {
  const db = getDB();

  const exitReq = await db.findOne<ExitRequest>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  const fnf = await db.findOne<FnFSettlement>("fnf_settlements", {
    exit_request_id: exitRequestId,
  });
  if (!fnf) throw new NotFoundError("FnF settlement for exit", exitRequestId);

  if (fnf.status === "draft") {
    throw new ValidationError("FnF must be calculated before approval");
  }
  if (fnf.status === "approved" || fnf.status === "paid") {
    throw new ConflictError("FnF settlement already approved or paid");
  }

  const updated = await db.update<FnFSettlement>("fnf_settlements", fnf.id, {
    status: "approved",
    approved_by: approvedBy,
  });

  logger.info(`FnF approved for exit ${exitRequestId} by user ${approvedBy}`);
  return updated;
}

export async function markPaid(
  orgId: number,
  exitRequestId: string,
  paymentReference: string,
): Promise<FnFSettlement> {
  const db = getDB();

  const exitReq = await db.findOne<ExitRequest>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  const fnf = await db.findOne<FnFSettlement>("fnf_settlements", {
    exit_request_id: exitRequestId,
  });
  if (!fnf) throw new NotFoundError("FnF settlement for exit", exitRequestId);

  if (fnf.status !== "approved") {
    throw new ValidationError("FnF must be approved before marking as paid");
  }

  const updated = await db.update<FnFSettlement>("fnf_settlements", fnf.id, {
    status: "paid",
    paid_date: new Date().toISOString().split("T")[0],
    remarks: fnf.remarks
      ? `${fnf.remarks}\nPayment ref: ${paymentReference}`
      : `Payment ref: ${paymentReference}`,
  });

  // Also update exit request status to fnf_processed
  await db.update("exit_requests", exitRequestId, {
    status: "fnf_processed",
  });

  logger.info(`FnF marked as paid for exit ${exitRequestId}, ref: ${paymentReference}`);
  return updated;
}
