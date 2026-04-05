/**
 * EMP Exit — Infrastructure coverage tests.
 * Error classes, response helpers.
 */
import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "../utils/errors";

describe("Error classes", () => {
  describe("AppError", () => {
    it("sets statusCode, code, message", () => {
      const err = new AppError(500, "INTERNAL", "Oops");
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe("INTERNAL");
      expect(err.message).toBe("Oops");
      expect(err.name).toBe("AppError");
    });

    it("stores details", () => {
      const err = new AppError(400, "X", "Y", { f: ["r"] });
      expect(err.details).toEqual({ f: ["r"] });
    });
  });

  describe("NotFoundError", () => {
    it("creates 404 with resource and id", () => {
      const err = new NotFoundError("Clearance", "99");
      expect(err.statusCode).toBe(404);
      expect(err.message).toContain("Clearance");
      expect(err.message).toContain("99");
    });

    it("creates 404 without id", () => {
      expect(new NotFoundError("Resignation").message).toBe("Resignation not found");
    });
  });

  describe("ValidationError", () => {
    it("creates 400", () => {
      const err = new ValidationError("Bad");
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("UnauthorizedError", () => {
    it("defaults to 'Unauthorized'", () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe("Unauthorized");
    });
  });

  describe("ForbiddenError", () => {
    it("creates 403", () => {
      expect(new ForbiddenError().statusCode).toBe(403);
    });
  });

  describe("ConflictError", () => {
    it("creates 409", () => {
      expect(new ConflictError("Dup").statusCode).toBe(409);
    });
  });
});

// ---------------------------------------------------------------------------
// Response Helpers
// ---------------------------------------------------------------------------
import { sendSuccess, sendError, sendPaginated } from "../utils/response";

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
}

describe("Response helpers", () => {
  it("sendSuccess sends 200 envelope", () => {
    const res = mockRes();
    sendSuccess(res, { ok: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { ok: true } });
  });

  it("sendError sends error envelope", () => {
    const res = mockRes();
    sendError(res, 400, "BAD", "msg");
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: "BAD", message: "msg" } });
  });

  it("sendPaginated calculates totalPages", () => {
    const res = mockRes();
    sendPaginated(res, [1, 2], 30, 1, 10);
    expect(res.json.mock.calls[0][0].data.totalPages).toBe(3);
  });
});
