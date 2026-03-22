// ============================================================================
// EXIT REQUEST ROUTES
// POST /           — initiate exit
// GET /            — list exits
// GET /:id         — get exit detail
// PUT /:id         — update exit
// POST /:id/cancel — cancel exit
// POST /:id/complete — complete exit
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { initiateExitSchema, updateExitSchema } from "@emp-exit/shared";
import { ValidationError } from "../../utils/errors";
import * as exitService from "../../services/exit/exit-request.service";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST / — initiate exit (HR only)
router.post(
  "/",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = initiateExitSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid exit data", parsed.error.flatten().fieldErrors as any);
      }

      const exit = await exitService.initiateExit(
        req.user!.empcloudOrgId,
        req.user!.empcloudUserId,
        parsed.data,
      );
      sendSuccess(res, exit, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET / — list exits
router.get(
  "/",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await exitService.listExits(req.user!.empcloudOrgId, {
        status: req.query.status as string,
        exit_type: req.query.exit_type as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        perPage: req.query.perPage ? Number(req.query.perPage) : undefined,
        sort: req.query.sort as string,
        order: req.query.order as "asc" | "desc",
      });
      sendPaginated(res, result.data, result.total, result.page, result.perPage);
    } catch (err) {
      next(err);
    }
  },
);

// GET /:id — get exit detail
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exit = await exitService.getExit(req.user!.empcloudOrgId, req.params.id);
      sendSuccess(res, exit);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id — update exit
router.put(
  "/:id",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateExitSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid update data", parsed.error.flatten().fieldErrors as any);
      }

      const exit = await exitService.updateExit(
        req.user!.empcloudOrgId,
        req.params.id,
        parsed.data,
      );
      sendSuccess(res, exit);
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/cancel — cancel exit
router.post(
  "/:id/cancel",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exit = await exitService.cancelExit(req.user!.empcloudOrgId, req.params.id);
      sendSuccess(res, exit);
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/complete — complete exit
router.post(
  "/:id/complete",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exit = await exitService.completeExit(req.user!.empcloudOrgId, req.params.id);
      sendSuccess(res, exit);
    } catch (err) {
      next(err);
    }
  },
);

export { router as exitRoutes };
