import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB adapter
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

vi.mock("../../db/adapters", () => ({
  getDB: () => mockDB,
}));

vi.mock("../../db/empcloud", () => ({
  findUserById: vi.fn(),
  getEmpCloudDB: () => vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../email/exit-email.service", () => ({
  sendFnFCalculatedEmail: vi.fn().mockResolvedValue(undefined),
  sendFnFApprovedEmail: vi.fn().mockResolvedValue(undefined),
}));

import { calculateFnF, getFnF, updateFnF, approveFnF, markPaid } from "./fnf.service";
import { findUserById } from "../../db/empcloud";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORG_ID = 1;
const EXIT_ID = "exit-1";
const EMPLOYEE_ID = 20;

function makeExitRequest(overrides: Record<string, any> = {}) {
  return {
    id: EXIT_ID,
    organization_id: ORG_ID,
    employee_id: EMPLOYEE_ID,
    exit_type: "resignation",
    status: "initiated",
    notice_period_days: 30,
    notice_start_date: "2026-03-01",
    last_working_date: "2026-03-31",
    notice_period_waived: false,
    ...overrides,
  };
}

function makeFnF(overrides: Record<string, any> = {}) {
  return {
    id: "fnf-1",
    exit_request_id: EXIT_ID,
    status: "calculated",
    basic_salary_due: 0,
    leave_encashment: 0,
    bonus_due: 0,
    gratuity: 0,
    notice_pay_recovery: 0,
    other_deductions: 0,
    other_earnings: 0,
    total_payable: 0,
    breakdown_json: null,
    remarks: null,
    approved_by: null,
    paid_date: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fnf.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (findUserById as any).mockResolvedValue({
      id: EMPLOYEE_ID,
      first_name: "John",
      last_name: "Doe",
      date_of_joining: "2020-01-15",
    });
  });

  // -------------------------------------------------------------------------
  // calculateFnF
  // -------------------------------------------------------------------------
  describe("calculateFnF", () => {
    it("should create a new FnF settlement when none exists", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest()) // exit request
        .mockResolvedValueOnce(null)              // no existing FnF
        .mockResolvedValueOnce(null);             // no approved buyout

      mockDB.create.mockResolvedValue(makeFnF());

      const result = await calculateFnF(ORG_ID, EXIT_ID);

      expect(mockDB.create).toHaveBeenCalledWith(
        "fnf_settlements",
        expect.objectContaining({
          exit_request_id: EXIT_ID,
          status: "calculated",
        }),
      );
      expect(result.status).toBe("calculated");
    });

    it("should update existing FnF if in draft/calculated status", async () => {
      const existingFnF = makeFnF({ status: "draft", breakdown_json: '{"last_basic_salary": 50000}' });

      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(existingFnF) // existing FnF
        .mockResolvedValueOnce(null);        // no buyout

      mockDB.update.mockResolvedValue(makeFnF({ status: "calculated" }));

      const result = await calculateFnF(ORG_ID, EXIT_ID);

      expect(mockDB.update).toHaveBeenCalled();
      expect(result.status).toBe("calculated");
    });

    it("should throw ConflictError if FnF is already approved", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(makeFnF({ status: "approved" }));

      await expect(calculateFnF(ORG_ID, EXIT_ID)).rejects.toThrow("already approved or paid");
    });

    it("should NOT double-count buyout and notice recovery", async () => {
      // When an approved buyout exists, noticePayRecovery should equal the buyout amount,
      // NOT the regular notice shortfall calculation.
      const existingFnF = makeFnF({
        status: "draft",
        breakdown_json: '{"last_basic_salary": 60000}',
      });

      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest({
          notice_period_days: 60,
          notice_start_date: "2026-03-01",
          last_working_date: "2026-03-31",
          notice_period_waived: false,
        }))
        .mockResolvedValueOnce(existingFnF)
        .mockResolvedValueOnce({ buyout_amount: 45000, status: "approved" }); // approved buyout

      mockDB.update.mockImplementation((_table: string, _id: string, data: any) => ({
        ...existingFnF,
        ...data,
      }));

      const result = await calculateFnF(ORG_ID, EXIT_ID);

      // The notice recovery should be the buyout amount, NOT the raw shortfall
      expect(mockDB.update).toHaveBeenCalledWith(
        "fnf_settlements",
        "fnf-1",
        expect.objectContaining({
          notice_pay_recovery: 45000,
        }),
      );
    });

    it("should throw NotFoundError if exit request not found", async () => {
      mockDB.findOne.mockResolvedValueOnce(null);

      await expect(calculateFnF(ORG_ID, "nope")).rejects.toThrow("not found");
    });

    it("should throw NotFoundError if employee not found in empcloud", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(null); // no existing FnF

      (findUserById as any).mockResolvedValue(null);

      await expect(calculateFnF(ORG_ID, EXIT_ID)).rejects.toThrow("not found");
    });
  });

  // -------------------------------------------------------------------------
  // approveFnF
  // -------------------------------------------------------------------------
  describe("approveFnF", () => {
    it("should approve a calculated FnF", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest()) // exit request
        .mockResolvedValueOnce(makeFnF({ status: "calculated" })); // FnF

      mockDB.update.mockResolvedValue(makeFnF({ status: "approved", approved_by: 5 }));

      const result = await approveFnF(ORG_ID, EXIT_ID, 5);

      expect(result.status).toBe("approved");
      expect(mockDB.update).toHaveBeenCalledWith(
        "fnf_settlements",
        "fnf-1",
        expect.objectContaining({ status: "approved", approved_by: 5 }),
      );
    });

    it("should throw if FnF is still in draft (not yet calculated)", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(makeFnF({ status: "draft" }));

      await expect(approveFnF(ORG_ID, EXIT_ID, 5)).rejects.toThrow("must be calculated");
    });

    it("should throw ConflictError if already approved", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(makeFnF({ status: "approved" }));

      await expect(approveFnF(ORG_ID, EXIT_ID, 5)).rejects.toThrow("already approved");
    });
  });

  // -------------------------------------------------------------------------
  // markPaid
  // -------------------------------------------------------------------------
  describe("markPaid", () => {
    it("should mark an approved FnF as paid", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(makeFnF({ status: "approved" }));

      mockDB.update
        .mockResolvedValueOnce(makeFnF({ status: "paid", paid_date: "2026-03-28" })) // fnf update
        .mockResolvedValueOnce({}); // exit_requests status update

      const result = await markPaid(ORG_ID, EXIT_ID, "PAY-12345");

      expect(result.status).toBe("paid");
      // Should also update exit request status
      expect(mockDB.update).toHaveBeenCalledWith(
        "exit_requests",
        EXIT_ID,
        expect.objectContaining({ status: "fnf_processed" }),
      );
    });

    it("should throw if FnF is not approved", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(makeFnF({ status: "calculated" }));

      await expect(markPaid(ORG_ID, EXIT_ID, "PAY-1")).rejects.toThrow("must be approved");
    });
  });

  // -------------------------------------------------------------------------
  // getFnF
  // -------------------------------------------------------------------------
  describe("getFnF", () => {
    it("should return FnF for valid exit request", async () => {
      mockDB.findOne
        .mockResolvedValueOnce(makeExitRequest())
        .mockResolvedValueOnce(makeFnF());

      const result = await getFnF(ORG_ID, EXIT_ID);

      expect(result).not.toBeNull();
      expect(result!.exit_request_id).toBe(EXIT_ID);
    });

    it("should throw NotFoundError if exit request not found", async () => {
      mockDB.findOne.mockResolvedValueOnce(null);

      await expect(getFnF(ORG_ID, "nope")).rejects.toThrow("not found");
    });
  });
});
