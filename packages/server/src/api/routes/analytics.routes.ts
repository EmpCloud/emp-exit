// ============================================================================
// ANALYTICS ROUTES
// GET /attrition, /reasons, /departments, /tenure, /rehire-pool
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import * as analyticsService from "../../services/analytics/analytics.service";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";

const router = Router();
router.use(authenticate);
router.use(authorize("hr_admin", "hr_manager", "super_admin", "org_admin"));

// GET /analytics/attrition
router.get("/attrition", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const data = await analyticsService.getAttritionRate(orgId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/reasons
router.get("/reasons", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const data = await analyticsService.getReasonBreakdown(orgId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/departments
router.get("/departments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const data = await analyticsService.getDepartmentTrends(orgId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/tenure
router.get("/tenure", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const data = await analyticsService.getTenureDistribution(orgId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/rehire-pool
router.get("/rehire-pool", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const data = await analyticsService.getRehirePool(orgId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

export { router as analyticsRoutes };
