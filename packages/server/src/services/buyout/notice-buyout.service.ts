// ============================================================================
// NOTICE PERIOD BUYOUT SERVICE
// Allows employees to buy out remaining notice period days by paying
// the equivalent salary. Integrates with F&F settlement.
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../db/adapters";
import { findUserById } from "../../db/empcloud";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import type { ExitRequest, NoticeBuyoutRequest } from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuyoutCalculation {
  originalNoticeDays: number;
  servedDays: number;
  remainingDays: number;
  dailyRate: number;
  buyoutAmount: number;
  currency: string;
  requestedLastDate: string;
  originalLastDate: string;
}

interface ListBuyoutParams {
  status?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Core Service Functions
// ---------------------------------------------------------------------------

/**
 * Calculate a buyout preview without persisting.
 * Uses resignation_date as start of notice and the exit request's
 * notice_period_days / last_working_date to determine the buyout window.
 */
export async function calculateBuyout(
  orgId: number,
  exitRequestId: string,
  requestedLastDate: string,
): Promise<BuyoutCalculation> {
  const db = getDB();

  const exitReq = await db.findOne<ExitRequest>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  if (!exitReq.resignation_date) {
    throw new ValidationError("Exit request has no resignation date — cannot compute buyout");
  }

  const originalLastDate =
    exitReq.last_working_date || exitReq.resignation_date;
  const originalNoticeDays = exitReq.notice_period_days;

  // Validate requested date is before original last date
  if (new Date(requestedLastDate) >= new Date(originalLastDate)) {
    throw new ValidationError("Requested last date must be earlier than the original last working date");
  }
  if (new Date(requestedLastDate) < new Date(exitReq.resignation_date)) {
    throw new ValidationError("Requested last date cannot be before the resignation date");
  }

  const servedDays = Math.max(0, daysBetween(exitReq.resignation_date, requestedLastDate));
  const remainingDays = Math.max(0, originalNoticeDays - servedDays);

  // Get employee salary for daily rate computation
  const employee = await findUserById(exitReq.employee_id);
  let lastBasic = 0;
  if (employee?.last_basic_salary) {
    lastBasic = employee.last_basic_salary;
  }

  const dailyRate = lastBasic > 0 ? Math.round(lastBasic / 30) : 0;
  const buyoutAmount = dailyRate * remainingDays;

  return {
    originalNoticeDays,
    servedDays,
    remainingDays,
    dailyRate,
    buyoutAmount,
    currency: "INR",
    requestedLastDate,
    originalLastDate,
  };
}

/**
 * Submit a buyout request — persists the calculation.
 */
export async function submitBuyoutRequest(
  orgId: number,
  exitRequestId: string,
  requestedLastDate: string,
  employeeId: number,
): Promise<NoticeBuyoutRequest> {
  const db = getDB();

  // Check for existing pending/approved buyout for this exit
  const existing = await db.findOne<NoticeBuyoutRequest>("notice_buyout_requests", {
    organization_id: orgId,
    exit_request_id: exitRequestId,
  });
  if (existing && existing.status !== "rejected") {
    throw new ConflictError("A buyout request already exists for this exit. Please wait for it to be processed or have it rejected first.");
  }

  const calc = await calculateBuyout(orgId, exitRequestId, requestedLastDate);

  const buyout = await db.create<NoticeBuyoutRequest>("notice_buyout_requests", {
    id: uuidv4(),
    organization_id: orgId,
    exit_request_id: exitRequestId,
    employee_id: employeeId,
    original_last_date: calc.originalLastDate,
    requested_last_date: requestedLastDate,
    original_notice_days: calc.originalNoticeDays,
    served_days: calc.servedDays,
    remaining_days: calc.remainingDays,
    daily_rate: calc.dailyRate,
    buyout_amount: calc.buyoutAmount,
    currency: calc.currency,
    status: "pending",
  } as any);

  logger.info(
    `Buyout request submitted: exit=${exitRequestId}, employee=${employeeId}, ` +
    `remainingDays=${calc.remainingDays}, amount=${calc.buyoutAmount}`,
  );

  return buyout;
}

/**
 * Approve a buyout request.
 * Updates the exit request's last_working_date to the requested date.
 */
export async function approveBuyout(
  orgId: number,
  buyoutId: string,
  approvedBy: number,
): Promise<NoticeBuyoutRequest> {
  const db = getDB();

  const buyout = await db.findOne<NoticeBuyoutRequest>("notice_buyout_requests", {
    id: buyoutId,
    organization_id: orgId,
  });
  if (!buyout) throw new NotFoundError("Buyout request", buyoutId);

  if (buyout.status === "approved") {
    throw new ConflictError("Buyout request is already approved");
  }
  if (buyout.status === "rejected") {
    throw new ValidationError("Cannot approve a rejected buyout request");
  }

  // Update buyout status
  const updated = await db.update<NoticeBuyoutRequest>("notice_buyout_requests", buyoutId, {
    status: "approved",
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  } as any);

  // Update exit request's last working date
  await db.update("exit_requests", buyout.exit_request_id, {
    last_working_date: buyout.requested_last_date,
  });

  logger.info(
    `Buyout approved: id=${buyoutId}, exit=${buyout.exit_request_id}, ` +
    `newLWD=${buyout.requested_last_date}, approvedBy=${approvedBy}`,
  );

  return updated;
}

/**
 * Reject a buyout request with a reason.
 */
export async function rejectBuyout(
  orgId: number,
  buyoutId: string,
  rejectedBy: number,
  reason: string,
): Promise<NoticeBuyoutRequest> {
  const db = getDB();

  const buyout = await db.findOne<NoticeBuyoutRequest>("notice_buyout_requests", {
    id: buyoutId,
    organization_id: orgId,
  });
  if (!buyout) throw new NotFoundError("Buyout request", buyoutId);

  if (buyout.status !== "pending") {
    throw new ValidationError("Can only reject a pending buyout request");
  }

  const updated = await db.update<NoticeBuyoutRequest>("notice_buyout_requests", buyoutId, {
    status: "rejected",
    rejected_by: rejectedBy,
    rejected_reason: reason,
  } as any);

  logger.info(`Buyout rejected: id=${buyoutId}, exit=${buyout.exit_request_id}, by=${rejectedBy}`);

  return updated;
}

/**
 * Get the buyout request for a specific exit request.
 */
export async function getBuyoutRequest(
  orgId: number,
  exitRequestId: string,
): Promise<NoticeBuyoutRequest | null> {
  const db = getDB();
  return db.findOne<NoticeBuyoutRequest>("notice_buyout_requests", {
    organization_id: orgId,
    exit_request_id: exitRequestId,
  });
}

/**
 * List buyout requests for an org (admin view).
 */
export async function listBuyoutRequests(
  orgId: number,
  params: ListBuyoutParams,
) {
  const db = getDB();
  const page = params.page || 1;
  const limit = params.perPage || 20;

  const filters: Record<string, any> = { organization_id: orgId };
  if (params.status) {
    filters.status = params.status;
  }

  const result = await db.findMany<NoticeBuyoutRequest>("notice_buyout_requests", {
    page,
    limit,
    filters,
    sort: params.sort
      ? { field: params.sort, order: params.order || "desc" }
      : { field: "created_at", order: "desc" },
  });

  return {
    data: result.data,
    total: result.total,
    page: result.page,
    perPage: result.limit,
    totalPages: result.totalPages,
  };
}
