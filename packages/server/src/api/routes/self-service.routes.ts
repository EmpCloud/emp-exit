// ============================================================================
// SELF-SERVICE ROUTES (employee-facing)
// POST /resign     — submit resignation
// GET /my-exit     — my exit status with summary
// GET /my-checklist — my exit checklist items
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { submitResignationSchema } from "@emp-exit/shared";
import { ValidationError } from "../../utils/errors";
import * as exitService from "../../services/exit/exit-request.service";
import * as checklistService from "../../services/checklist/checklist.service";

const router = Router();

router.use(authenticate);

// POST /resign — submit my resignation
router.post(
  "/resign",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = submitResignationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid resignation data", parsed.error.flatten().fieldErrors as any);
      }

      const exit = await exitService.submitResignation(
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

// GET /my-exit — get my exit status
router.get(
  "/my-exit",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exit = await exitService.getMyExit(
        req.user!.empcloudOrgId,
        req.user!.empcloudUserId,
      );
      sendSuccess(res, exit);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-checklist — get my exit checklist
router.get(
  "/my-checklist",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exit = await exitService.getMyExit(
        req.user!.empcloudOrgId,
        req.user!.empcloudUserId,
      );

      if (!exit) {
        return sendSuccess(res, { items: [], total: 0, completed: 0, progress: 0 });
      }

      const checklist = await checklistService.getChecklist(
        req.user!.empcloudOrgId,
        exit.id,
      );
      sendSuccess(res, checklist);
    } catch (err) {
      next(err);
    }
  },
);

export { router as selfServiceRoutes };
