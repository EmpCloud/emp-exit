// ============================================================================
// AUTH ROUTES
// POST /login, /register, /sso, /refresh-token
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "../../services/auth/auth.service";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";
import { authLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  orgName: z.string().min(1).max(100),
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().max(55).optional(),
});

const ssoSchema = z.object({
  token: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /auth/login
router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid login data", parsed.error.flatten().fieldErrors as any);
    }
    const result = await authService.login(parsed.data.email, parsed.data.password);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /auth/register
router.post("/register", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid registration data", parsed.error.flatten().fieldErrors as any);
    }
    const result = await authService.register(parsed.data);
    return sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
});

// POST /auth/sso
router.post("/sso", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ssoSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid SSO data");
    }
    const result = await authService.ssoLogin(parsed.data.token);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh-token
router.post("/refresh-token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Missing refresh token");
    }
    const tokens = await authService.refreshToken(parsed.data.refreshToken);
    return sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
});

export { router as authRoutes };
