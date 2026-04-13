// ============================================================================
// EMPCLOUD DATABASE CONNECTION
// Separate Knex connection to the EmpCloud master database.
// Used for authentication, user lookups, and org data.
// ============================================================================

import knex from "knex";
import type { Knex } from "knex";
import { config } from "../config";
import { logger } from "../utils/logger";

let empcloudDb: Knex | null = null;

/**
 * Initialize the EmpCloud database connection.
 * Call this once at server startup.
 */
export async function initEmpCloudDB(): Promise<Knex> {
  if (empcloudDb) return empcloudDb;

  const { empcloudDb: dbConfig } = config;

  empcloudDb = knex({
    client: "mysql2",
    connection: {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.name,
    },
    pool: { min: 2, max: 10 },
  });

  // Verify connection
  await empcloudDb.raw("SELECT 1");
  logger.info(`EmpCloud database connected (${dbConfig.host}:${dbConfig.port}/${dbConfig.name})`);

  return empcloudDb;
}

/**
 * Get the EmpCloud Knex instance. Throws if not initialized.
 */
export function getEmpCloudDB(): Knex {
  if (!empcloudDb) {
    throw new Error("EmpCloud database not initialized. Call initEmpCloudDB() first.");
  }
  return empcloudDb;
}

/**
 * Run the EmpCloud schema migration (creates tables if they don't exist).
 */
export async function migrateEmpCloudDB(): Promise<void> {
  const db = getEmpCloudDB();
  const { up } = await import("./empcloud-schema");
  await up(db);
  logger.info("EmpCloud schema migration applied");
}

/**
 * Close the EmpCloud database connection.
 */
export async function closeEmpCloudDB(): Promise<void> {
  if (empcloudDb) {
    await empcloudDb.destroy();
    empcloudDb = null;
  }
}

// ---------------------------------------------------------------------------
// Query helpers for common EmpCloud lookups
// ---------------------------------------------------------------------------

export interface EmpCloudUser {
  id: number;
  organization_id: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string | null;
  emp_code: string | null;
  contact_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  date_of_joining: string | null;
  date_of_exit: string | null;
  designation: string | null;
  department_id: number | null;
  location_id: number | null;
  reporting_manager_id: number | null;
  employment_type: string;
  role: string;
  status: number;
  created_at: Date;
  updated_at: Date;
}

export interface EmpCloudOrganization {
  id: number;
  name: string;
  legal_name: string | null;
  email: string | null;
  contact_number: string | null;
  timezone: string | null;
  country: string;
  state: string | null;
  city: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Find a user by email (active users only).
 */
export async function findUserByEmail(email: string): Promise<EmpCloudUser | null> {
  const db = getEmpCloudDB();
  const user = await db("users").where({ email, status: 1 }).first();
  return user || null;
}

/**
 * Find a user by ID.
 */
export async function findUserById(id: number): Promise<EmpCloudUser | null> {
  const db = getEmpCloudDB();
  const user = await db("users").where({ id }).first();
  return user || null;
}

/**
 * Find an organization by ID.
 */
export async function findOrgById(id: number): Promise<EmpCloudOrganization | null> {
  const db = getEmpCloudDB();
  const org = await db("organizations").where({ id }).first();
  return org || null;
}

/**
 * Find all users in an organization (active only).
 */
export async function findUsersByOrgId(
  orgId: number,
  options?: { limit?: number; offset?: number },
): Promise<EmpCloudUser[]> {
  const db = getEmpCloudDB();
  let query = db("users").where({ organization_id: orgId, status: 1 });
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.offset(options.offset);
  return query;
}

/**
 * Count active users in an organization.
 */
export async function countUsersByOrgId(orgId: number): Promise<number> {
  const db = getEmpCloudDB();
  const [{ count }] = await db("users")
    .where({ organization_id: orgId, status: 1 })
    .count("* as count");
  return Number(count);
}

/**
 * Update user password in EmpCloud.
 */
export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = getEmpCloudDB();
  await db("users").where({ id: userId }).update({
    password: passwordHash,
    updated_at: new Date(),
  });
}
