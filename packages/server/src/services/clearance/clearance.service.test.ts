import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB adapter
// ---------------------------------------------------------------------------

const mockDB = {
  create: vi.fn(),
  createMany: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  raw: vi.fn(),
};

vi.mock("../../db/adapters", () => ({
  getDB: () => mockDB,
}));

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../email/exit-email.service", () => ({
  sendClearancePendingEmail: vi.fn().mockResolvedValue(undefined),
  sendClearanceCompletedEmail: vi.fn().mockResolvedValue(undefined),
}));

import {
  createDepartment,
  listDepartments,
  createClearanceRecords,
  getClearanceStatus,
  updateClearance,
} from "./clearance.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORG_ID = 1;
const EXIT_ID = "exit-1";

function makeDept(overrides: Record<string, any> = {}) {
  return {
    id: "dept-1",
    organization_id: ORG_ID,
    name: "IT Department",
    approver_role: null,
    sort_order: 0,
    is_active: true,
    created_at: new Date(),
    ...overrides,
  };
}

function makeClearanceRecord(overrides: Record<string, any> = {}) {
  return {
    id: "cr-1",
    exit_request_id: EXIT_ID,
    department_id: "dept-1",
    status: "pending",
    pending_amount: 0,
    remarks: null,
    approved_by: null,
    approved_at: null,
    created_at: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("clearance.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // createDepartment
  // -------------------------------------------------------------------------
  describe("createDepartment", () => {
    it("should create a clearance department", async () => {
      mockDB.count.mockResolvedValue(3); // 3 existing depts -> sort_order = 3
      mockDB.create.mockResolvedValue(makeDept({ sort_order: 3 }));

      const result = await createDepartment(ORG_ID, { name: "IT Department" });

      expect(result.name).toBe("IT Department");
      expect(mockDB.create).toHaveBeenCalledWith(
        "clearance_departments",
        expect.objectContaining({
          organization_id: ORG_ID,
          name: "IT Department",
          is_active: true,
          sort_order: 3,
        }),
      );
    });

    it("should use provided sort_order when given", async () => {
      mockDB.create.mockResolvedValue(makeDept({ sort_order: 0 }));

      await createDepartment(ORG_ID, { name: "HR", sort_order: 0 });

      expect(mockDB.create).toHaveBeenCalledWith(
        "clearance_departments",
        expect.objectContaining({ sort_order: 0 }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // listDepartments
  // -------------------------------------------------------------------------
  describe("listDepartments", () => {
    it("should return departments sorted by sort_order", async () => {
      mockDB.findMany.mockResolvedValue({
        data: [
          makeDept({ id: "dept-1", sort_order: 0 }),
          makeDept({ id: "dept-2", name: "Finance", sort_order: 1 }),
        ],
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      const result = await listDepartments(ORG_ID);

      expect(result).toHaveLength(2);
      expect(mockDB.findMany).toHaveBeenCalledWith(
        "clearance_departments",
        expect.objectContaining({
          sort: { field: "sort_order", order: "asc" },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // createClearanceRecords
  // -------------------------------------------------------------------------
  describe("createClearanceRecords", () => {
    it("should create one clearance record per active department", async () => {
      // Exit exists
      mockDB.findOne.mockResolvedValue({ id: EXIT_ID, organization_id: ORG_ID });

      // listDepartments returns 2 active depts
      mockDB.findMany.mockResolvedValue({
        data: [
          makeDept({ id: "dept-1", is_active: true }),
          makeDept({ id: "dept-2", name: "Finance", is_active: true }),
        ],
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      // deleteMany for removing old records
      mockDB.deleteMany.mockResolvedValue(0);

      // createMany for new records
      const records = [
        makeClearanceRecord({ department_id: "dept-1" }),
        makeClearanceRecord({ id: "cr-2", department_id: "dept-2" }),
      ];
      mockDB.createMany.mockResolvedValue(records);

      const result = await createClearanceRecords(ORG_ID, EXIT_ID);

      expect(result).toHaveLength(2);
      expect(mockDB.deleteMany).toHaveBeenCalledWith("clearance_records", { exit_request_id: EXIT_ID });
      expect(mockDB.createMany).toHaveBeenCalledWith(
        "clearance_records",
        expect.arrayContaining([
          expect.objectContaining({ exit_request_id: EXIT_ID, department_id: "dept-1", status: "pending" }),
          expect.objectContaining({ exit_request_id: EXIT_ID, department_id: "dept-2", status: "pending" }),
        ]),
      );
    });

    it("should return empty array if no active departments", async () => {
      mockDB.findOne.mockResolvedValue({ id: EXIT_ID, organization_id: ORG_ID });
      mockDB.findMany.mockResolvedValue({
        data: [makeDept({ is_active: false })],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      const result = await createClearanceRecords(ORG_ID, EXIT_ID);

      expect(result).toEqual([]);
    });

    it("should throw NotFoundError for missing exit request", async () => {
      mockDB.findOne.mockResolvedValue(null);

      await expect(createClearanceRecords(ORG_ID, "nope")).rejects.toThrow("not found");
    });
  });

  // -------------------------------------------------------------------------
  // getClearanceStatus
  // -------------------------------------------------------------------------
  describe("getClearanceStatus", () => {
    it("should return clearance progress", async () => {
      mockDB.findOne.mockResolvedValue({ id: EXIT_ID, organization_id: ORG_ID });
      mockDB.findMany.mockResolvedValue({
        data: [
          makeClearanceRecord({ status: "approved" }),
          makeClearanceRecord({ id: "cr-2", status: "pending", department_id: "dept-2" }),
        ],
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      });
      mockDB.findById
        .mockResolvedValueOnce(makeDept())
        .mockResolvedValueOnce(makeDept({ id: "dept-2", name: "Finance" }));

      const result = await getClearanceStatus(ORG_ID, EXIT_ID);

      expect(result.total).toBe(2);
      expect(result.approved).toBe(1);
      expect(result.progress).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  // updateClearance — complete clearance
  // -------------------------------------------------------------------------
  describe("updateClearance", () => {
    it("should approve a clearance record", async () => {
      mockDB.findById.mockResolvedValue(makeClearanceRecord({ exit_request_id: EXIT_ID }));
      mockDB.findOne.mockResolvedValue({ id: EXIT_ID, organization_id: ORG_ID }); // exit request
      mockDB.update.mockResolvedValue(makeClearanceRecord({ status: "approved", approved_by: 5 }));

      // Mock the all-done check (non-blocking async)
      mockDB.findMany.mockResolvedValue({
        data: [makeClearanceRecord({ status: "approved" })],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      const result = await updateClearance(
        ORG_ID,
        "cr-1",
        { status: "approved" as any },
        5,
      );

      expect(result.status).toBe("approved");
      expect(mockDB.update).toHaveBeenCalledWith(
        "clearance_records",
        "cr-1",
        expect.objectContaining({
          status: "approved",
          approved_by: 5,
          approved_at: expect.any(Date),
        }),
      );
    });

    it("should set remarks if provided", async () => {
      mockDB.findById.mockResolvedValue(makeClearanceRecord());
      mockDB.findOne.mockResolvedValue({ id: EXIT_ID, organization_id: ORG_ID });
      mockDB.update.mockResolvedValue(
        makeClearanceRecord({ status: "rejected", remarks: "Missing laptop" }),
      );

      const result = await updateClearance(
        ORG_ID,
        "cr-1",
        { status: "rejected" as any, remarks: "Missing laptop" },
        5,
      );

      expect(mockDB.update).toHaveBeenCalledWith(
        "clearance_records",
        "cr-1",
        expect.objectContaining({ remarks: "Missing laptop" }),
      );
    });

    it("should throw NotFoundError for missing clearance record", async () => {
      mockDB.findById.mockResolvedValue(null);

      await expect(
        updateClearance(ORG_ID, "nope", { status: "approved" as any }, 5),
      ).rejects.toThrow("not found");
    });

    it("should support waived status", async () => {
      mockDB.findById.mockResolvedValue(makeClearanceRecord());
      mockDB.findOne.mockResolvedValue({ id: EXIT_ID, organization_id: ORG_ID });
      mockDB.update.mockResolvedValue(makeClearanceRecord({ status: "waived" }));
      mockDB.findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100, totalPages: 0 });

      const result = await updateClearance(
        ORG_ID,
        "cr-1",
        { status: "waived" as any },
        5,
      );

      expect(result.status).toBe("waived");
    });
  });
});
