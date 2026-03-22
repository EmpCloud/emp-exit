// ============================================================================
// FULL & FINAL SETTLEMENT ROUTES
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";
import { updateFnFSchema } from "@emp-exit/shared";
import * as fnfService from "../../services/fnf/fnf.service";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /exit/:exitId/calculate — calculate FnF for an exit
router.post(
  "/exit/:exitId/calculate",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const fnf = await fnfService.calculateFnF(orgId, req.params.exitId);
      sendSuccess(res, fnf);
    } catch (err) {
      next(err);
    }
  },
);

// GET /exit/:exitId — get FnF for an exit
router.get(
  "/exit/:exitId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const fnf = await fnfService.getFnF(orgId, req.params.exitId);
      sendSuccess(res, fnf);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /exit/:exitId — update FnF (manual adjustments)
router.put(
  "/exit/:exitId",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const parsed = updateFnFSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid FnF data", {
          validation: parsed.error.errors.map((e) => e.message),
        });
      }
      const fnf = await fnfService.updateFnF(orgId, req.params.exitId, parsed.data);
      sendSuccess(res, fnf);
    } catch (err) {
      next(err);
    }
  },
);

// POST /exit/:exitId/approve — approve FnF
router.post(
  "/exit/:exitId/approve",
  authorize("org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const approvedBy = req.user!.empcloudUserId;
      const fnf = await fnfService.approveFnF(orgId, req.params.exitId, approvedBy);
      sendSuccess(res, fnf);
    } catch (err) {
      next(err);
    }
  },
);

// POST /exit/:exitId/mark-paid — mark FnF as paid
router.post(
  "/exit/:exitId/mark-paid",
  authorize("org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const { payment_reference } = req.body;
      if (!payment_reference) {
        throw new ValidationError("payment_reference is required");
      }
      const fnf = await fnfService.markPaid(orgId, req.params.exitId, payment_reference);
      sendSuccess(res, fnf);
    } catch (err) {
      next(err);
    }
  },
);

export { router as fnfRoutes };
