// ============================================================================
// NPS ALIAS ROUTES
// Exposes /nps/scores, /nps/trends, /nps/responses as top-level aliases
// for the canonical /analytics/nps/* endpoints.
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import * as interviewService from "../../services/interview/exit-interview.service";

const router = Router();
router.use(authenticate);
router.use(authorize("hr_admin", "hr_manager", "super_admin", "org_admin"));

// GET /nps/scores — NPS score with breakdown (alias for /analytics/nps)
router.get("/scores", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const { from, to } = req.query;
    const data = await interviewService.calculateNPS(orgId, {
      from: from as string | undefined,
      to: to as string | undefined,
    });
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /nps/trends — monthly NPS trend (alias for /analytics/nps/trend)
router.get("/trends", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const months = req.query.months ? Number(req.query.months) : 12;
    const data = await interviewService.getNPSTrend(orgId, months);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /nps/responses — NPS responses (alias for /analytics/nps/responses)
router.get("/responses", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const months = req.query.months ? Number(req.query.months) : 12;
    const data = await interviewService.getNPSTrend(orgId, months);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

export { router as npsRoutes };
