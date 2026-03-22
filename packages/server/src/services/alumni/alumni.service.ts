// ============================================================================
// ALUMNI SERVICE
// Manages alumni opt-in, profiles, and directory.
// ============================================================================

import { getDB } from "../../db/adapters";
import { findUserById } from "../../db/empcloud";
import { NotFoundError, ConflictError } from "../../utils/errors";
import { logger } from "../../utils/logger";

export async function optIn(
  orgId: number,
  employeeId: number,
  exitRequestId: string,
) {
  const db = getDB();

  // Verify exit request belongs to this org and employee
  const exit = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
    employee_id: employeeId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  // Check if already opted in
  const existing = await db.findOne("alumni_profiles", {
    exit_request_id: exitRequestId,
  });
  if (existing) {
    throw new ConflictError("Alumni profile already exists for this exit");
  }

  // Fetch employee info for defaults
  const employee = await findUserById(employeeId);

  const profile = await db.create("alumni_profiles", {
    exit_request_id: exitRequestId,
    employee_id: employeeId,
    organization_id: orgId,
    personal_email: employee?.email || null,
    opted_in: true,
    last_designation: employee?.designation || null,
    exit_date: exit.actual_exit_date || exit.last_working_date || null,
  });

  logger.info(`Alumni opt-in: employee ${employeeId} for exit ${exitRequestId}`);
  return profile;
}

export async function getProfile(orgId: number, profileId: string) {
  const db = getDB();
  const profile = await db.findOne("alumni_profiles", {
    id: profileId,
    organization_id: orgId,
  });
  if (!profile) {
    throw new NotFoundError("Alumni profile", profileId);
  }
  return profile;
}

export async function updateProfile(
  orgId: number,
  profileId: string,
  data: {
    personal_email?: string;
    phone?: string;
    linkedin_url?: string;
    opted_in?: boolean;
  },
) {
  const db = getDB();

  const existing = await db.findOne("alumni_profiles", {
    id: profileId,
    organization_id: orgId,
  });
  if (!existing) {
    throw new NotFoundError("Alumni profile", profileId);
  }

  const updated = await db.update("alumni_profiles", profileId, data);
  logger.info(`Alumni profile updated: ${profileId}`);
  return updated;
}

export async function listAlumni(
  orgId: number,
  params: { search?: string; page?: number; perPage?: number },
) {
  const db = getDB();

  const page = params.page || 1;
  const perPage = params.perPage || 20;

  // Use raw query for search support
  if (params.search) {
    const searchTerm = `%${params.search}%`;
    const rows = await db.raw<any>(
      `SELECT ap.*, u.first_name, u.last_name, u.email as work_email
       FROM alumni_profiles ap
       LEFT JOIN empcloud.users u ON u.id = ap.employee_id
       WHERE ap.organization_id = ? AND ap.opted_in = 1
         AND (u.first_name LIKE ? OR u.last_name LIKE ? OR ap.personal_email LIKE ? OR ap.last_designation LIKE ?)
       ORDER BY ap.created_at DESC
       LIMIT ? OFFSET ?`,
      [orgId, searchTerm, searchTerm, searchTerm, searchTerm, perPage, (page - 1) * perPage],
    );

    const [countResult] = await db.raw<any>(
      `SELECT COUNT(*) as total FROM alumni_profiles ap
       LEFT JOIN empcloud.users u ON u.id = ap.employee_id
       WHERE ap.organization_id = ? AND ap.opted_in = 1
         AND (u.first_name LIKE ? OR u.last_name LIKE ? OR ap.personal_email LIKE ? OR ap.last_designation LIKE ?)`,
      [orgId, searchTerm, searchTerm, searchTerm, searchTerm],
    );

    const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
    const total = countResult?.[0]?.total || 0;

    return { data, total: Number(total), page, perPage };
  }

  const result = await db.findMany("alumni_profiles", {
    filters: { organization_id: orgId, opted_in: true },
    page,
    limit: perPage,
    sort: { field: "created_at", order: "desc" },
  });

  return {
    data: result.data,
    total: result.total,
    page: result.page,
    perPage,
  };
}
