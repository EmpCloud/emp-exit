// ============================================================================
// PREDICTION ROUTES
// GET /predictions/dashboard, /predictions/high-risk,
//     /predictions/employee/:employeeId, /predictions/trends
// POST /predictions/calculate
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import * as predictionService from "../../services/analytics/attrition-prediction.service";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";

const router = Router();
router.use(authenticate);
router.use(authorize("hr_admin", "hr_manager", "super_admin", "org_admin"));

// GET /predictions/dashboard — flight risk dashboard summary
router.get("/dashboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const data = await predictionService.getFlightRiskDashboard(orgId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /predictions/high-risk — list high-risk employees
router.get("/high-risk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const threshold = Number(req.query.threshold) || 70;
    const data = await predictionService.getHighRiskEmployees(orgId, threshold);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /predictions/employee/:employeeId — individual flight risk report
router.get("/employee/:employeeId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const employeeId = Number(req.params.employeeId);
    const data = await predictionService.getEmployeeFlightRisk(orgId, employeeId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /predictions/calculate — trigger batch calculation (admin)
router.post("/calculate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const count = await predictionService.batchCalculateFlightRisk(orgId);
    return sendSuccess(res, { calculated: count });
  } catch (err) {
    next(err);
  }
});

// GET /predictions/trends — monthly prediction vs actual comparison
router.get("/trends", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const data = await predictionService.getPredictionTrends(orgId);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

export { router as predictionRoutes };
