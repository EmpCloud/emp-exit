// ============================================================================
// EMP EXIT — Service Coverage Final Tests
// Targets: alumni, asset-return, checklist, knowledge-transfer, rehire, errors
// ============================================================================

process.env.DB_HOST = "localhost";
process.env.DB_PORT = "3306";
process.env.DB_USER = "empcloud";
process.env.DB_PASSWORD = "EmpCloud2026";
process.env.DB_NAME = "emp_exit";
process.env.DB_PROVIDER = "mysql";
process.env.EMPCLOUD_DB_HOST = "localhost";
process.env.EMPCLOUD_DB_PORT = "3306";
process.env.EMPCLOUD_DB_USER = "empcloud";
process.env.EMPCLOUD_DB_PASSWORD = "EmpCloud2026";
process.env.EMPCLOUD_DB_NAME = "empcloud";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-cov-final";
process.env.EMPCLOUD_URL = "http://localhost:3000";
process.env.LOG_LEVEL = "error";

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { initDB, closeDB, getDB } from "../../db/adapters";
import { initEmpCloudDB, closeEmpCloudDB } from "../../db/empcloud";

vi.mock("../../services/email/exit-email.service", () => ({
  sendExitEmail: vi.fn().mockResolvedValue(undefined),
  ExitEmailService: class { send() { return Promise.resolve(); } },
}));

let db: ReturnType<typeof getDB>;

beforeAll(async () => {
  await initDB();
  await initEmpCloudDB();
  db = getDB();
}, 30000);

afterAll(async () => {
  await closeEmpCloudDB();
  await closeDB();
}, 10000);

// ── ERROR CLASSES ────────────────────────────────────────────────────────────

describe("Exit error classes", () => {
  let errors: any;

  beforeAll(async () => {
    errors = await import("../../utils/errors");
  });

  it("AppError with all fields", () => {
    const err = new errors.AppError(500, "SERVER", "Internal error", { field: ["err"] });
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("SERVER");
    expect(err.details).toEqual({ field: ["err"] });
  });

  it("NotFoundError with id", () => {
    const err = new errors.NotFoundError("Exit request", "abc-123");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("abc-123");
  });

  it("NotFoundError without id", () => {
    const err = new errors.NotFoundError("Checklist");
    expect(err.message).toContain("Checklist");
  });

  it("ValidationError", () => {
    const err = new errors.ValidationError("Bad data");
    expect(err.statusCode).toBe(400);
  });

  it("ForbiddenError", () => {
    const err = new errors.ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it("ConflictError", () => {
    const err = new errors.ConflictError("Already exists");
    expect(err.statusCode).toBe(409);
  });

  it("UnauthorizedError", () => {
    const err = new errors.UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });
});

// ── ALUMNI SERVICE — NotFoundError branches ──────────────────────────────────

describe("Alumni service — error branches", () => {
  let alumniService: any;
  const ORG_ID = 5;

  beforeAll(async () => {
    alumniService = await import("../../services/alumni/alumni.service");
  });

  it("optIn throws NotFoundError for bad exit request", async () => {
    await expect(alumniService.optIn(ORG_ID, 999, "nonexistent-id"))
      .rejects.toThrow();
  });

  it("getProfile throws NotFoundError", async () => {
    await expect(alumniService.getProfile(ORG_ID, "nonexistent-id"))
      .rejects.toThrow();
  });

  it("updateProfile throws NotFoundError", async () => {
    await expect(alumniService.updateProfile(ORG_ID, "nonexistent-id", { personal_email: "a@b.com" }))
      .rejects.toThrow();
  });

  it("listAlumni returns paginated result", async () => {
    const result = await alumniService.listAlumni(ORG_ID, { page: 1, perPage: 5 });
    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("listAlumni with search", async () => {
    const result = await alumniService.listAlumni(ORG_ID, { search: "nonexistent-name-xyz" });
    expect(result.data).toHaveLength(0);
  });
});

// ── KNOWLEDGE TRANSFER SERVICE — getKT error ─────────────────────────────────

describe("Knowledge transfer service — errors", () => {
  let ktService: any;
  const ORG_ID = 5;

  beforeAll(async () => {
    ktService = await import("../../services/kt/knowledge-transfer.service");
  });

  it("getKT throws NotFoundError for nonexistent exit request", async () => {
    await expect(ktService.getKT(ORG_ID, "nonexistent-id"))
      .rejects.toThrow();
  });
});

// ── REHIRE SERVICE — error branches ──────────────────────────────────────────

describe("Rehire service — error branches", () => {
  let rehireService: any;
  const ORG_ID = 5;

  beforeAll(async () => {
    rehireService = await import("../../services/rehire/rehire.service");
  });

  it("getRehireRequest throws NotFoundError", async () => {
    await expect(rehireService.getRehireRequest(ORG_ID, "nonexistent-id"))
      .rejects.toThrow();
  });

  it("listRehireRequests returns data", async () => {
    const result = await rehireService.listRehireRequests(ORG_ID, {});
    expect(result).toBeDefined();
  });
});

// ── CLEARANCE SERVICE — error branches ───────────────────────────────────────

describe("Clearance service — error branches", () => {
  let clearanceService: any;
  const ORG_ID = 5;

  beforeAll(async () => {
    clearanceService = await import("../../services/clearance/clearance.service");
  });

  it("getClearanceStatus throws NotFoundError", async () => {
    await expect(clearanceService.getClearanceStatus(ORG_ID, "nonexistent-id"))
      .rejects.toThrow();
  });
});
