// ============================================================================
// CLEARANCE SERVICE
// Business logic for clearance departments and per-exit clearance records.
// ============================================================================

import { getDB } from "../../db/adapters";
import { NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import type { ClearanceDepartment, ClearanceRecord, ClearanceStatus } from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// Department CRUD
// ---------------------------------------------------------------------------

export async function listDepartments(orgId: number): Promise<ClearanceDepartment[]> {
  const db = getDB();
  const result = await db.findMany<ClearanceDepartment>("clearance_departments", {
    filters: { organization_id: orgId },
    sort: { field: "sort_order", order: "asc" },
    limit: 100,
  });
  return result.data;
}

export async function createDepartment(
  orgId: number,
  data: { name: string; approver_role?: string; sort_order?: number },
): Promise<ClearanceDepartment> {
  const db = getDB();

  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const count = await db.count("clearance_departments", { organization_id: orgId });
    sortOrder = count;
  }

  const dept = await db.create<ClearanceDepartment>("clearance_departments", {
    organization_id: orgId,
    name: data.name,
    approver_role: data.approver_role || null,
    sort_order: sortOrder,
    is_active: true,
  } as any);

  logger.info(`Clearance department '${data.name}' created for org ${orgId}`);
  return dept;
}

export async function updateDepartment(
  orgId: number,
  id: string,
  data: { name?: string; approver_role?: string; sort_order?: number; is_active?: boolean },
): Promise<ClearanceDepartment> {
  const db = getDB();

  const dept = await db.findOne<ClearanceDepartment>("clearance_departments", {
    id,
    organization_id: orgId,
  });
  if (!dept) {
    throw new NotFoundError("Clearance department", id);
  }

  const updated = await db.update<ClearanceDepartment>("clearance_departments", id, data as any);
  logger.info(`Clearance department ${id} updated in org ${orgId}`);
  return updated;
}

export async function deleteDepartment(orgId: number, id: string): Promise<boolean> {
  const db = getDB();

  const dept = await db.findOne<ClearanceDepartment>("clearance_departments", {
    id,
    organization_id: orgId,
  });
  if (!dept) {
    throw new NotFoundError("Clearance department", id);
  }

  await db.delete("clearance_departments", id);
  logger.info(`Clearance department ${id} deleted from org ${orgId}`);
  return true;
}

// ---------------------------------------------------------------------------
// Clearance Records (per exit)
// ---------------------------------------------------------------------------

export async function createClearanceRecords(
  orgId: number,
  exitRequestId: string,
): Promise<ClearanceRecord[]> {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  // Get all active departments for the org
  const departments = await listDepartments(orgId);
  const activeDepts = departments.filter((d) => d.is_active);

  if (activeDepts.length === 0) {
    logger.warn(`No active clearance departments found for org ${orgId}`);
    return [];
  }

  // Remove existing clearance records for this exit
  await db.deleteMany("clearance_records", { exit_request_id: exitRequestId });

  // Create a record for each active department
  const recordsData = activeDepts.map((dept) => ({
    exit_request_id: exitRequestId,
    department_id: dept.id,
    status: "pending" as ClearanceStatus,
    pending_amount: 0,
  }));

  const records = await db.createMany<ClearanceRecord>("clearance_records", recordsData as any);
  logger.info(`Created ${records.length} clearance records for exit ${exitRequestId} in org ${orgId}`);

  return records;
}

export async function getClearanceStatus(orgId: number, exitRequestId: string) {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const result = await db.findMany<ClearanceRecord>("clearance_records", {
    filters: { exit_request_id: exitRequestId },
    limit: 100,
    sort: { field: "created_at", order: "asc" },
  });

  // Enrich with department names
  const deptIds = [...new Set(result.data.map((r) => r.department_id))];
  const departments = await Promise.all(
    deptIds.map((id) => db.findById<ClearanceDepartment>("clearance_departments", id)),
  );
  const deptMap = new Map(
    departments.filter(Boolean).map((d) => [d!.id, d!]),
  );

  const records = result.data.map((record) => ({
    ...record,
    department: deptMap.get(record.department_id) || null,
  }));

  const total = records.length;
  const approved = records.filter(
    (r) => r.status === "approved" || r.status === "waived",
  ).length;

  return {
    records,
    total,
    approved,
    progress: total > 0 ? Math.round((approved / total) * 100) : 0,
  };
}

export async function updateClearance(
  orgId: number,
  clearanceId: string,
  data: { status: ClearanceStatus; remarks?: string; pending_amount?: number },
  approvedBy: number,
): Promise<ClearanceRecord> {
  const db = getDB();

  const record = await db.findById<ClearanceRecord>("clearance_records", clearanceId);
  if (!record) {
    throw new NotFoundError("Clearance record", clearanceId);
  }

  // Verify exit belongs to org
  const exit = await db.findOne<any>("exit_requests", {
    id: record.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", record.exit_request_id);
  }

  const updateData: Record<string, any> = {
    status: data.status,
  };

  if (data.status === "approved" || data.status === "rejected") {
    updateData.approved_by = approvedBy;
    updateData.approved_at = new Date();
  }
  if (data.remarks !== undefined) {
    updateData.remarks = data.remarks;
  }
  if (data.pending_amount !== undefined) {
    updateData.pending_amount = data.pending_amount;
  }

  const updated = await db.update<ClearanceRecord>("clearance_records", clearanceId, updateData);
  logger.info(`Clearance ${clearanceId} updated to '${data.status}' by user ${approvedBy}`);
  return updated;
}

export async function getMyClearances(orgId: number, userId: number) {
  const db = getDB();

  // Get clearance records where the user is the approver (approved_by) or pending
  // In practice, clearances are assigned by department role. For now, return all pending for the org.
  const result = await db.findMany<ClearanceRecord>("clearance_records", {
    filters: { status: "pending" },
    limit: 100,
    sort: { field: "created_at", order: "asc" },
  });

  // Filter to only records belonging to this org's exit requests
  const exitIds = [...new Set(result.data.map((r) => r.exit_request_id))];
  const exits = await Promise.all(
    exitIds.map((id) => db.findOne<any>("exit_requests", { id, organization_id: orgId })),
  );
  const validExitIds = new Set(exits.filter(Boolean).map((e) => e!.id));

  const filtered = result.data.filter((r) => validExitIds.has(r.exit_request_id));

  // Enrich with department names
  const deptIds = [...new Set(filtered.map((r) => r.department_id))];
  const departments = await Promise.all(
    deptIds.map((id) => db.findById<ClearanceDepartment>("clearance_departments", id)),
  );
  const deptMap = new Map(
    departments.filter(Boolean).map((d) => [d!.id, d!]),
  );

  return filtered.map((record) => ({
    ...record,
    department: deptMap.get(record.department_id) || null,
  }));
}
