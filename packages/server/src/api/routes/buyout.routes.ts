// ============================================================================
// NOTICE PERIOD BUYOUT ROUTES
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";
import * as buyoutService from "../../services/buyout/notice-buyout.service";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /buyout/calculate — preview buyout calculation (no persistence)
router.post(
  "/calculate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const { exit_request_id, requested_last_date } = req.body;

      if (!exit_request_id) throw new ValidationError("exit_request_id is required");
      if (!requested_last_date) throw new ValidationError("requested_last_date is required");

      const calculation = await buyoutService.calculateBuyout(
        orgId,
        exit_request_id,
        requested_last_date,
      );
      sendSuccess(res, calculation);
    } catch (err) {
      next(err);
    }
  },
);

// POST /buyout/request — submit a buyout request
router.post(
  "/request",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const employeeId = req.user!.empcloudUserId;
      const { exit_request_id, requested_last_date } = req.body;

      if (!exit_request_id) throw new ValidationError("exit_request_id is required");
      if (!requested_last_date) throw new ValidationError("requested_last_date is required");

      const buyout = await buyoutService.submitBuyoutRequest(
        orgId,
        exit_request_id,
        requested_last_date,
        employeeId,
      );
      sendSuccess(res, buyout, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /buyout/exit/:exitId — get buyout request for a specific exit
router.get(
  "/exit/:exitId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const buyout = await buyoutService.getBuyoutRequest(orgId, req.params.exitId);
      sendSuccess(res, buyout);
    } catch (err) {
      next(err);
    }
  },
);

// GET /buyout — list all buyout requests (admin view)
router.get(
  "/",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const result = await buyoutService.listBuyoutRequests(orgId, {
        status: req.query.status as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        perPage: req.query.perPage ? Number(req.query.perPage) : undefined,
        sort: req.query.sort as string | undefined,
        order: req.query.order as "asc" | "desc" | undefined,
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /buyout/:id/approve — approve a buyout request
router.post(
  "/:id/approve",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const approvedBy = req.user!.empcloudUserId;
      const buyout = await buyoutService.approveBuyout(orgId, req.params.id, approvedBy);
      sendSuccess(res, buyout);
    } catch (err) {
      next(err);
    }
  },
);

// POST /buyout/:id/reject — reject a buyout request
router.post(
  "/:id/reject",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const rejectedBy = req.user!.empcloudUserId;
      const { reason } = req.body;

      if (!reason) throw new ValidationError("reason is required");

      const buyout = await buyoutService.rejectBuyout(orgId, req.params.id, rejectedBy, reason);
      sendSuccess(res, buyout);
    } catch (err) {
      next(err);
    }
  },
);

export { router as buyoutRoutes };
