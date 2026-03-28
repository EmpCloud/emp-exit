// ============================================================================
// MY-CLEARANCES ALIAS ROUTE
// GET /my-clearances — alias for /clearance/my
// Returns clearance records assigned to the authenticated user.
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import * as clearanceService from "../../services/clearance/clearance.service";

const router = Router();
router.use(authenticate);

// GET /my-clearances
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await clearanceService.getMyClearances(
      req.user!.empcloudOrgId,
      req.user!.empcloudUserId,
    );
    sendSuccess(res, records);
  } catch (err) {
    next(err);
  }
});

export { router as myClearancesRoutes };
