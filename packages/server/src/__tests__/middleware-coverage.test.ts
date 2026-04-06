// =============================================================================
// EMP EXIT — Middleware, Error, Rate Limit, Errors, Response Unit Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../config", () => ({
  config: { jwt: { secret: "exit-test-secret" } },
}));
vi.mock("@emp-exit/shared", () => ({ default: {} }));

import { authenticate, authorize, AuthPayload } from "../api/middleware/auth.middleware";
import { errorHandler } from "../api/middleware/error.middleware";
import { rateLimit } from "../api/middleware/rate-limit.middleware";
import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError } from "../utils/errors";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";

function mockReq(overrides: any = {}): any {
  return { headers: {}, params: {}, query: {}, body: {}, ip: "127.0.0.1", ...overrides };
}
function mockRes(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

// =============================================================================
// Auth Middleware
// =============================================================================
describe("Exit Auth Middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("authenticate()", () => {
    it("rejects missing auth", () => {
      const next = vi.fn();
      authenticate(mockReq(), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it("internal service bypass", () => {
      const orig = process.env.INTERNAL_SERVICE_SECRET;
      process.env.INTERNAL_SERVICE_SECRET = "sec123";
      const req = mockReq({
        headers: { "x-internal-service": "empcloud-dashboard", "x-internal-secret": "sec123" },
        query: { organization_id: "7" },
      });
      const next = vi.fn();
      authenticate(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user.empcloudOrgId).toBe(7);
      expect(req.user.exitProfileId).toBeNull();
      process.env.INTERNAL_SERVICE_SECRET = orig;
    });

    it("authenticates valid JWT from header", () => {
      const payload: AuthPayload = {
        empcloudUserId: 1, empcloudOrgId: 2, exitProfileId: "uuid-1",
        role: "hr_admin", email: "h@t.com", firstName: "H", lastName: "R", orgName: "T",
      };
      const token = jwt.sign(payload, "exit-test-secret");
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const next = vi.fn();
      authenticate(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user.empcloudUserId).toBe(1);
    });

    it("accepts query token", () => {
      const token = jwt.sign({ empcloudUserId: 3 }, "exit-test-secret");
      const req = mockReq({ query: { token } });
      const next = vi.fn();
      authenticate(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    });

    it("rejects expired token", () => {
      const token = jwt.sign({ sub: "1" }, "exit-test-secret", { expiresIn: "-1s" });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const next = vi.fn();
      authenticate(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "TOKEN_EXPIRED" }));
    });

    it("rejects invalid token", () => {
      const req = mockReq({ headers: { authorization: "Bearer invalid" } });
      const next = vi.fn();
      authenticate(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_TOKEN" }));
    });
  });

  describe("authorize()", () => {
    it("rejects unauthenticated", () => {
      const mw = authorize("hr_admin");
      const next = vi.fn();
      mw(mockReq(), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it("rejects wrong role", () => {
      const mw = authorize("org_admin");
      const next = vi.fn();
      mw(mockReq({ user: { role: "employee" } }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it("allows matching role", () => {
      const mw = authorize("employee");
      const next = vi.fn();
      mw(mockReq({ user: { role: "employee" } }), mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    });

    it("allows any auth when no roles", () => {
      const mw = authorize();
      const next = vi.fn();
      mw(mockReq({ user: { role: "employee" } }), mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});

// =============================================================================
// Error Handler
// =============================================================================
describe("Exit Error Handler", () => {
  it("handles AppError", () => {
    const res = mockRes();
    errorHandler(new AppError(409, "CONFLICT", "dup"), mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("handles ZodError as 400", () => {
    const err = new ZodError([{ code: "invalid_type", expected: "string", received: "number", path: ["x"], message: "bad" }]);
    const res = mockRes();
    errorHandler(err, mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles unknown error as 500", () => {
    const res = mockRes();
    errorHandler(new Error("boom"), mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// =============================================================================
// Rate Limit
// =============================================================================
describe("Exit Rate Limit", () => {
  it("skips when disabled", () => {
    const orig = process.env.RATE_LIMIT_DISABLED;
    process.env.RATE_LIMIT_DISABLED = "true";
    const limiter = rateLimit({ windowMs: 1000, max: 1 });
    const next = vi.fn();
    limiter(mockReq({ ip: "exit-skip" }), mockRes(), next);
    expect(next).toHaveBeenCalled();
    process.env.RATE_LIMIT_DISABLED = orig;
  });

  it("blocks over limit", () => {
    const orig = process.env.RATE_LIMIT_DISABLED;
    delete process.env.RATE_LIMIT_DISABLED;
    const limiter = rateLimit({ windowMs: 60000, max: 1 });
    const ip = `exit-block-${Date.now()}`;
    limiter(mockReq({ ip }), mockRes(), vi.fn());
    const res = mockRes();
    limiter(mockReq({ ip }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(429);
    process.env.RATE_LIMIT_DISABLED = orig;
  });
});

// =============================================================================
// Error Classes
// =============================================================================
describe("Exit Error Classes", () => {
  it("AppError", () => { expect(new AppError(400, "X", "m").statusCode).toBe(400); });
  it("NotFoundError", () => { expect(new NotFoundError("Ticket").message).toContain("Ticket"); });
  it("NotFoundError with id", () => { expect(new NotFoundError("Ticket", "abc").message).toContain("abc"); });
  it("ValidationError", () => { expect(new ValidationError("bad").statusCode).toBe(400); });
  it("UnauthorizedError", () => { expect(new UnauthorizedError().statusCode).toBe(401); });
  it("ForbiddenError", () => { expect(new ForbiddenError().statusCode).toBe(403); });
  it("ConflictError", () => { expect(new ConflictError("dup").statusCode).toBe(409); });
});

// =============================================================================
// Response Helpers
// =============================================================================
describe("Exit Response Helpers", () => {
  it("sendSuccess default 200", () => {
    const res = mockRes();
    sendSuccess(res, { ok: true });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("sendError sends error envelope", () => {
    const res = mockRes();
    sendError(res, 404, "NOT_FOUND", "gone");
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("sendPaginated", () => {
    const res = mockRes();
    sendPaginated(res, [1], 10, 1, 5);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
