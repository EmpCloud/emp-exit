import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB adapter & empcloud DB
// ---------------------------------------------------------------------------

const mockDB = {
  create: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  raw: vi.fn(),
};

const mockEmpCloudQuery = {
  where: vi.fn().mockReturnThis(),
  first: vi.fn(),
  select: vi.fn().mockReturnThis(),
  whereIn: vi.fn().mockReturnThis(),
  update: vi.fn().mockResolvedValue(1),
};

vi.mock("../../db/adapters", () => ({
  getDB: () => mockDB,
}));

vi.mock("../../db/empcloud", () => ({
  getEmpCloudDB: () =>
    vi.fn().mockImplementation(() => mockEmpCloudQuery),
}));

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../email/exit-email.service", () => ({
  sendExitInitiatedEmail: vi.fn().mockResolvedValue(undefined),
  sendExitCompletedEmail: vi.fn().mockResolvedValue(undefined),
}));

import {
  initiateExit,
  updateExit,
  cancelExit,
  completeExit,
} from "./exit-request.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORG_ID = 1;
const USER_ID = 10;
const EMPLOYEE_ID = 20;

function makeExitRequest(overrides: Record<string, any> = {}) {
  return {
    id: "exit-1",
    organization_id: ORG_ID,
    employee_id: EMPLOYEE_ID,
    exit_type: "resignation",
    status: "initiated",
    reason_category: "better_opportunity",
    reason_detail: null,
    initiated_by: USER_ID,
    resignation_date: "2026-03-01",
    last_working_date: "2026-03-31",
    notice_period_days: 30,
    notice_period_waived: false,
    notice_start_date: null,
    actual_exit_date: null,
    created_at: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("exit-request.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empcloud employee exists
    mockEmpCloudQuery.first.mockResolvedValue({
      id: EMPLOYEE_ID,
      organization_id: ORG_ID,
      first_name: "John",
      last_name: "Doe",
    });
  });

  // -------------------------------------------------------------------------
  // initiateExit — create
  // -------------------------------------------------------------------------
  describe("initiateExit", () => {
    it("should create an exit request with default notice period", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(null) // no existing exit
        .mockResolvedValueOnce({ default_notice_period_days: 60 }); // settings
      mockDB.create.mockResolvedValue(makeExitRequest({ notice_period_days: 60 }));

      const result = await initiateExit(ORG_ID, USER_ID, {
        employee_id: EMPLOYEE_ID,
        exit_type: "resignation" as any,
        reason_category: "better_opportunity",
      });

      expect(result.notice_period_days).toBe(60);
      expect(mockDB.create).toHaveBeenCalledWith(
        "exit_requests",
        expect.objectContaining({
          organization_id: ORG_ID,
          employee_id: EMPLOYEE_ID,
          status: "initiated",
        }),
      );
    });

    it("should use 30-day default when no settings exist", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(null) // no existing exit
        .mockResolvedValueOnce(null); // no settings
      mockDB.create.mockResolvedValue(makeExitRequest({ notice_period_days: 30 }));

      const result = await initiateExit(ORG_ID, USER_ID, {
        employee_id: EMPLOYEE_ID,
        exit_type: "resignation" as any,
        reason_category: "personal",
      });

      expect(result.notice_period_days).toBe(30);
    });

    it("should throw ConflictError if active exit exists", async () => {
      mockDB.findOne.mockResolvedValueOnce(makeExitRequest({ status: "initiated" })); // active exit exists

      await expect(
        initiateExit(ORG_ID, USER_ID, {
          employee_id: EMPLOYEE_ID,
          exit_type: "resignation" as any,
          reason_category: "personal",
        }),
      ).rejects.toThrow("active exit request already exists");
    });

    it("should throw NotFoundError for unknown employee", async () => {
      mockEmpCloudQuery.first.mockResolvedValue(null); // employee not found

      await expect(
        initiateExit(ORG_ID, USER_ID, {
          employee_id: 999,
          exit_type: "resignation" as any,
          reason_category: "personal",
        }),
      ).rejects.toThrow("not found");
    });

    it("should allow exit if previous exit was cancelled", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest({ status: "cancelled" })) // cancelled exit
        .mockResolvedValueOnce(null); // no settings
      mockDB.create.mockResolvedValue(makeExitRequest());

      const result = await initiateExit(ORG_ID, USER_ID, {
        employee_id: EMPLOYEE_ID,
        exit_type: "resignation" as any,
        reason_category: "relocation",
      });

      expect(result.status).toBe("initiated");
    });
  });

  // -------------------------------------------------------------------------
  // updateExit — approve / modify
  // -------------------------------------------------------------------------
  describe("updateExit", () => {
    it("should update an active exit request", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "initiated" }));
      mockDB.update.mockResolvedValue(makeExitRequest({ last_working_date: "2026-04-15" }));

      const result = await updateExit(ORG_ID, "exit-1", {
        last_working_date: "2026-04-15",
      });

      expect(result.last_working_date).toBe("2026-04-15");
    });

    it("should throw ValidationError when updating completed exit", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "completed" }));

      await expect(updateExit(ORG_ID, "exit-1", {})).rejects.toThrow("completed or cancelled");
    });

    it("should throw NotFoundError for missing exit", async () => {
      mockDB.findOne.mockResolvedValue(null);

      await expect(updateExit(ORG_ID, "nope", {})).rejects.toThrow("not found");
    });
  });

  // -------------------------------------------------------------------------
  // cancelExit
  // -------------------------------------------------------------------------
  describe("cancelExit", () => {
    it("should cancel an active exit request", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "initiated" }));
      mockDB.update.mockResolvedValue(makeExitRequest({ status: "cancelled" }));

      const result = await cancelExit(ORG_ID, "exit-1");

      expect(mockDB.update).toHaveBeenCalledWith(
        "exit_requests",
        "exit-1",
        expect.objectContaining({ status: "cancelled" }),
      );
    });

    it("should throw when cancelling a completed exit", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "completed" }));

      await expect(cancelExit(ORG_ID, "exit-1")).rejects.toThrow("completed");
    });

    it("should throw when already cancelled", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "cancelled" }));

      await expect(cancelExit(ORG_ID, "exit-1")).rejects.toThrow("already cancelled");
    });
  });

  // -------------------------------------------------------------------------
  // completeExit
  // -------------------------------------------------------------------------
  describe("completeExit", () => {
    it("should complete an exit request and set actual_exit_date", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "initiated" }));
      mockDB.update.mockResolvedValue(
        makeExitRequest({
          status: "completed",
          actual_exit_date: new Date().toISOString().split("T")[0],
        }),
      );

      const result = await completeExit(ORG_ID, "exit-1");

      expect(mockDB.update).toHaveBeenCalledWith(
        "exit_requests",
        "exit-1",
        expect.objectContaining({
          status: "completed",
          actual_exit_date: expect.any(String),
        }),
      );
    });

    it("should throw when already completed", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "completed" }));

      await expect(completeExit(ORG_ID, "exit-1")).rejects.toThrow("already completed");
    });

    it("should throw when trying to complete a cancelled exit", async () => {
      mockDB.findOne.mockResolvedValue(makeExitRequest({ status: "cancelled" }));

      await expect(completeExit(ORG_ID, "exit-1")).rejects.toThrow("cancelled");
    });
  });
});
