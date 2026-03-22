// ============================================================================
// EXIT REQUEST SERVICE
// Business logic for creating, updating, and managing exit requests.
// ============================================================================

import { getDB } from "../../db/adapters";
import { getEmpCloudDB } from "../../db/empcloud";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { sendExitInitiatedEmail, sendExitCompletedEmail } from "../email/exit-email.service";
import type {
  ExitRequest,
  ExitStatus,
  ExitType,
  ExitChecklistInstance,
  ClearanceRecord,
  FnFSettlement,
} from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InitiateExitData {
  employee_id: number;
  exit_type: ExitType;
  reason_category: string;
  reason_detail?: string;
  resignation_date?: string;
  last_working_date?: string;
  notice_period_days?: number;
  notice_period_waived?: boolean;
}

interface ListExitsParams {
  status?: string;
  exit_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  order?: "asc" | "desc";
}

interface UpdateExitData {
  status?: ExitStatus;
  reason_category?: string;
  reason_detail?: string;
  notice_start_date?: string;
  last_working_date?: string;
  actual_exit_date?: string;
  notice_period_days?: number;
  notice_period_waived?: boolean;
  revoke_reason?: string;
}

interface SubmitResignationData {
  reason_category: string;
  reason_detail?: string;
  resignation_date: string;
  last_working_date?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function initiateExit(
  orgId: number,
  initiatedBy: number,
  data: InitiateExitData,
): Promise<ExitRequest> {
  const db = getDB();

  // Check employee exists in empcloud
  const empDb = getEmpCloudDB();
  const employee = await empDb("users").where({ id: data.employee_id, organization_id: orgId }).first();
  if (!employee) {
    throw new NotFoundError("Employee", String(data.employee_id));
  }

  // Check no active exit for this employee
  const existing = await db.findOne<ExitRequest>("exit_requests", {
    organization_id: orgId,
    employee_id: data.employee_id,
  });
  if (existing && existing.status !== "completed" && existing.status !== "cancelled") {
    throw new ConflictError("An active exit request already exists for this employee");
  }

  // Get org settings for default notice period
  const settings = await db.findOne<any>("exit_settings", { organization_id: orgId });
  const noticeDays = data.notice_period_days ?? settings?.default_notice_period_days ?? 30;

  const exitRequest = await db.create<ExitRequest>("exit_requests", {
    organization_id: orgId,
    employee_id: data.employee_id,
    exit_type: data.exit_type,
    status: "initiated" as ExitStatus,
    reason_category: data.reason_category,
    reason_detail: data.reason_detail || null,
    initiated_by: initiatedBy,
    resignation_date: data.resignation_date || null,
    last_working_date: data.last_working_date || null,
    notice_period_days: noticeDays,
    notice_period_waived: data.notice_period_waived || false,
  } as any);

  logger.info(`Exit request initiated for employee ${data.employee_id} by ${initiatedBy} in org ${orgId}`);

  // Non-blocking email notification
  sendExitInitiatedEmail(exitRequest.id).catch(() => {});

  return exitRequest;
}

export async function listExits(
  orgId: number,
  params: ListExitsParams,
) {
  const db = getDB();
  const page = params.page || 1;
  const limit = params.perPage || 20;

  const filters: Record<string, any> = { organization_id: orgId };

  if (params.status) {
    filters.status = params.status;
  }
  if (params.exit_type) {
    filters.exit_type = params.exit_type;
  }

  const result = await db.findMany<ExitRequest>("exit_requests", {
    page,
    limit,
    filters,
    sort: params.sort
      ? { field: params.sort, order: params.order || "desc" }
      : { field: "created_at", order: "desc" },
  });

  // Enrich with employee names from empcloud
  const empDb = getEmpCloudDB();
  const employeeIds = [...new Set(result.data.map((e) => e.employee_id))];
  if (employeeIds.length > 0) {
    const employees = await empDb("users")
      .whereIn("id", employeeIds)
      .select("id", "first_name", "last_name", "email", "emp_code", "designation", "department_id");

    const empMap = new Map(employees.map((e: any) => [e.id, e]));

    const enriched = result.data.map((exit) => ({
      ...exit,
      employee: empMap.get(exit.employee_id) || null,
    }));

    return {
      data: enriched,
      total: result.total,
      page: result.page,
      perPage: result.limit,
      totalPages: result.totalPages,
    };
  }

  return {
    data: result.data,
    total: result.total,
    page: result.page,
    perPage: result.limit,
    totalPages: result.totalPages,
  };
}

export async function getExit(orgId: number, id: string) {
  const db = getDB();

  const exit = await db.findOne<ExitRequest>("exit_requests", {
    id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", id);
  }

  // Fetch employee info
  const empDb = getEmpCloudDB();
  const employee = await empDb("users")
    .where({ id: exit.employee_id })
    .select("id", "first_name", "last_name", "email", "emp_code", "designation", "department_id")
    .first();

  // Fetch checklist summary
  const checklistItems = await db.findMany<ExitChecklistInstance>("exit_checklist_instances", {
    filters: { exit_request_id: id },
    limit: 100,
  });
  const checklistTotal = checklistItems.total;
  const checklistCompleted = checklistItems.data.filter(
    (i) => i.status === "completed" || i.status === "waived" || i.status === "na",
  ).length;

  // Fetch clearance summary
  const clearanceRecords = await db.findMany<ClearanceRecord>("clearance_records", {
    filters: { exit_request_id: id },
    limit: 100,
  });
  const clearanceTotal = clearanceRecords.total;
  const clearanceApproved = clearanceRecords.data.filter(
    (r) => r.status === "approved" || r.status === "waived",
  ).length;

  // Fetch FnF summary
  const fnf = await db.findOne<FnFSettlement>("fnf_settlements", { exit_request_id: id });

  // Fetch interview summary
  const interview = await db.findOne<any>("exit_interviews", { exit_request_id: id });

  return {
    ...exit,
    employee: employee || null,
    checklist_summary: {
      total: checklistTotal,
      completed: checklistCompleted,
      progress: checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0,
    },
    clearance_summary: {
      total: clearanceTotal,
      approved: clearanceApproved,
      progress: clearanceTotal > 0 ? Math.round((clearanceApproved / clearanceTotal) * 100) : 0,
    },
    fnf_summary: fnf
      ? { status: fnf.status, total_payable: fnf.total_payable }
      : null,
    interview_summary: interview
      ? { status: interview.status, scheduled_date: interview.scheduled_date }
      : null,
  };
}

export async function updateExit(
  orgId: number,
  id: string,
  data: UpdateExitData,
): Promise<ExitRequest> {
  const db = getDB();

  const exit = await db.findOne<ExitRequest>("exit_requests", {
    id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", id);
  }

  if (exit.status === "completed" || exit.status === "cancelled") {
    throw new ValidationError("Cannot update a completed or cancelled exit request");
  }

  const updated = await db.update<ExitRequest>("exit_requests", id, data as any);
  logger.info(`Exit request ${id} updated in org ${orgId}`);
  return updated;
}

export async function cancelExit(orgId: number, id: string): Promise<ExitRequest> {
  const db = getDB();

  const exit = await db.findOne<ExitRequest>("exit_requests", {
    id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", id);
  }

  if (exit.status === "completed") {
    throw new ValidationError("Cannot cancel a completed exit request");
  }
  if (exit.status === "cancelled") {
    throw new ValidationError("Exit request is already cancelled");
  }

  const updated = await db.update<ExitRequest>("exit_requests", id, {
    status: "cancelled",
  } as any);

  logger.info(`Exit request ${id} cancelled in org ${orgId}`);
  return updated;
}

export async function completeExit(orgId: number, id: string): Promise<ExitRequest> {
  const db = getDB();

  const exit = await db.findOne<ExitRequest>("exit_requests", {
    id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", id);
  }

  if (exit.status === "completed") {
    throw new ValidationError("Exit request is already completed");
  }
  if (exit.status === "cancelled") {
    throw new ValidationError("Cannot complete a cancelled exit request");
  }

  const updated = await db.update<ExitRequest>("exit_requests", id, {
    status: "completed",
    actual_exit_date: new Date().toISOString().split("T")[0],
  } as any);

  // Update user status in empcloud DB (set status inactive, set date_of_exit)
  try {
    const empDb = getEmpCloudDB();
    await empDb("users").where({ id: exit.employee_id }).update({
      status: 0,
      date_of_exit: updated.actual_exit_date || new Date().toISOString().split("T")[0],
      updated_at: new Date(),
    });
    logger.info(`EmpCloud user ${exit.employee_id} marked as inactive after exit completion`);
  } catch (err) {
    logger.error(`Failed to update empcloud user status for employee ${exit.employee_id}:`, err);
  }

  logger.info(`Exit request ${id} completed in org ${orgId}`);

  // Non-blocking email notification
  sendExitCompletedEmail(id).catch(() => {});

  return updated;
}

export async function submitResignation(
  orgId: number,
  userId: number,
  data: SubmitResignationData,
): Promise<ExitRequest> {
  return initiateExit(orgId, userId, {
    employee_id: userId,
    exit_type: "resignation" as ExitType,
    reason_category: data.reason_category,
    reason_detail: data.reason_detail,
    resignation_date: data.resignation_date,
    last_working_date: data.last_working_date,
  });
}

export async function getMyExit(orgId: number, userId: number) {
  const db = getDB();

  const exit = await db.findOne<ExitRequest>("exit_requests", {
    organization_id: orgId,
    employee_id: userId,
  });

  if (!exit || exit.status === "cancelled") {
    return null;
  }

  return getExit(orgId, exit.id);
}
