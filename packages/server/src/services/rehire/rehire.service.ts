// ============================================================================
// REHIRE SERVICE
// Business logic for proposing, reviewing, and completing rehires.
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../db/adapters";
import { getEmpCloudDB } from "../../db/empcloud";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import type { AlumniProfile } from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProposeRehireData {
  position: string;
  department?: string;
  salary: number;
  notes?: string;
}

type RehireStatus = "proposed" | "screening" | "approved" | "rejected" | "hired";

interface RehireRequest {
  id: string;
  organization_id: number;
  alumni_id: string;
  employee_id: number;
  requested_by: number;
  position: string;
  department: string | null;
  proposed_salary: number;
  status: RehireStatus;
  notes: string | null;
  original_exit_date: string | null;
  rehire_date: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function proposeRehire(
  orgId: number,
  alumniId: string,
  requestedBy: number,
  data: ProposeRehireData,
): Promise<RehireRequest> {
  const db = getDB();

  // Verify alumni profile exists and belongs to org
  const alumni = await db.findOne<AlumniProfile>("alumni_profiles", {
    id: alumniId,
    organization_id: orgId,
  });
  if (!alumni) {
    throw new NotFoundError("Alumni profile", alumniId);
  }

  // Check rehire eligibility from the exit request
  const exit = await db.findOne<any>("exit_requests", {
    id: alumni.exit_request_id,
    organization_id: orgId,
  });

  // Check if there's already an active rehire request for this alumni
  const existing = await db.findOne<RehireRequest>("rehire_requests", {
    organization_id: orgId,
    alumni_id: alumniId,
  });
  if (existing && existing.status !== "rejected" && existing.status !== "hired") {
    throw new ConflictError("An active rehire request already exists for this alumni");
  }

  const rehireRequest = await db.create<RehireRequest>("rehire_requests", {
    id: uuidv4(),
    organization_id: orgId,
    alumni_id: alumniId,
    employee_id: alumni.employee_id,
    requested_by: requestedBy,
    position: data.position,
    department: data.department || null,
    proposed_salary: data.salary,
    status: "proposed",
    notes: data.notes || null,
    original_exit_date: exit?.actual_exit_date || alumni.exit_date || null,
    rehire_date: null,
  } as any);

  logger.info(`Rehire proposed for alumni ${alumniId} by user ${requestedBy} in org ${orgId}`);
  return rehireRequest;
}

export async function listRehireRequests(
  orgId: number,
  params: { status?: string; page?: number; perPage?: number; search?: string },
) {
  const db = getDB();
  const page = params.page || 1;
  const limit = params.perPage || 20;

  const filters: Record<string, any> = { organization_id: orgId };
  if (params.status) {
    filters.status = params.status;
  }

  const result = await db.findMany<RehireRequest>("rehire_requests", {
    page,
    limit,
    filters,
    sort: { field: "created_at", order: "desc" },
  });

  // Enrich with alumni + employee info
  const empDb = getEmpCloudDB();
  const employeeIds = [...new Set(result.data.map((r) => r.employee_id))];
  const alumniIds = [...new Set(result.data.map((r) => r.alumni_id))];

  const employees = employeeIds.length > 0
    ? await empDb("users")
        .whereIn("id", employeeIds)
        .select("id", "first_name", "last_name", "email", "emp_code", "designation")
    : [];
  const empMap = new Map(employees.map((e: any) => [e.id, e]));

  const alumniProfiles = alumniIds.length > 0
    ? await Promise.all(alumniIds.map((id) => db.findById<AlumniProfile>("alumni_profiles", id)))
    : [];
  const alumniMap = new Map(
    alumniProfiles.filter(Boolean).map((a) => [a!.id, a!]),
  );

  // Enrich with exit reason
  const exitRequestIds = alumniProfiles
    .filter(Boolean)
    .map((a) => a!.exit_request_id);
  const exitRequests = exitRequestIds.length > 0
    ? await Promise.all(exitRequestIds.map((id) => db.findById<any>("exit_requests", id)))
    : [];
  const exitMap = new Map(
    exitRequests.filter(Boolean).map((e) => [e!.id, e!]),
  );

  const enriched = result.data.map((req) => {
    const alumni = alumniMap.get(req.alumni_id);
    const exitReq = alumni ? exitMap.get(alumni.exit_request_id) : null;
    return {
      ...req,
      employee: empMap.get(req.employee_id) || null,
      alumni: alumni || null,
      exit_reason: exitReq?.reason_category || null,
    };
  });

  return {
    data: enriched,
    total: result.total,
    page: result.page,
    perPage: result.limit,
    totalPages: result.totalPages,
  };
}

export async function getRehireRequest(orgId: number, id: string) {
  const db = getDB();

  const request = await db.findOne<RehireRequest>("rehire_requests", {
    id,
    organization_id: orgId,
  });
  if (!request) {
    throw new NotFoundError("Rehire request", id);
  }

  // Get alumni profile
  const alumni = await db.findById<AlumniProfile>("alumni_profiles", request.alumni_id);

  // Get employee info
  const empDb = getEmpCloudDB();
  const employee = await empDb("users")
    .where({ id: request.employee_id })
    .select("id", "first_name", "last_name", "email", "emp_code", "designation", "department_id", "date_of_joining")
    .first();

  // Get original exit data
  const exit = alumni
    ? await db.findById<any>("exit_requests", alumni.exit_request_id)
    : null;

  return {
    ...request,
    employee: employee || null,
    alumni: alumni || null,
    original_exit: exit
      ? {
          exit_type: exit.exit_type,
          reason_category: exit.reason_category,
          reason_detail: exit.reason_detail,
          actual_exit_date: exit.actual_exit_date,
          last_working_date: exit.last_working_date,
        }
      : null,
  };
}

export async function updateStatus(
  orgId: number,
  id: string,
  status: RehireStatus,
  notes?: string,
): Promise<RehireRequest> {
  const db = getDB();

  const request = await db.findOne<RehireRequest>("rehire_requests", {
    id,
    organization_id: orgId,
  });
  if (!request) {
    throw new NotFoundError("Rehire request", id);
  }

  if (request.status === "hired") {
    throw new ValidationError("Cannot update status of a completed rehire");
  }

  const updateData: Record<string, any> = { status };
  if (notes !== undefined) {
    updateData.notes = request.notes
      ? `${request.notes}\n---\n${notes}`
      : notes;
  }

  const updated = await db.update<RehireRequest>("rehire_requests", id, updateData);
  logger.info(`Rehire request ${id} status updated to '${status}' in org ${orgId}`);
  return updated;
}

export async function completeRehire(
  orgId: number,
  id: string,
): Promise<RehireRequest> {
  const db = getDB();

  const request = await db.findOne<RehireRequest>("rehire_requests", {
    id,
    organization_id: orgId,
  });
  if (!request) {
    throw new NotFoundError("Rehire request", id);
  }

  if (request.status !== "approved") {
    throw new ValidationError("Rehire must be approved before completing");
  }

  // Reactivate user in empcloud
  try {
    const empDb = getEmpCloudDB();
    await empDb("users").where({ id: request.employee_id }).update({
      status: 1,
      date_of_exit: null,
      designation: request.position,
      updated_at: new Date(),
    });
    logger.info(`EmpCloud user ${request.employee_id} reactivated for rehire`);
  } catch (err) {
    logger.error(`Failed to reactivate empcloud user ${request.employee_id}:`, err);
    throw new ValidationError("Failed to reactivate user in the system");
  }

  const updated = await db.update<RehireRequest>("rehire_requests", id, {
    status: "hired",
    rehire_date: new Date().toISOString().split("T")[0],
  } as any);

  logger.info(`Rehire completed for request ${id}, employee ${request.employee_id} in org ${orgId}`);
  return updated;
}
