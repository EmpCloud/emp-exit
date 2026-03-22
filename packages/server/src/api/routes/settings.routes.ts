// ============================================================================
// SETTINGS ROUTES
// GET /, PUT /
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { updateSettingsSchema } from "@emp-exit/shared";
import * as settingsService from "../../services/settings/settings.service";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";

const router = Router();
router.use(authenticate);

// GET /settings
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const settings = await settingsService.getSettings(orgId);
    return sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
});

// PUT /settings
router.put(
  "/",
  authorize("hr_admin", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid settings data", parsed.error.flatten().fieldErrors as any);
      }
      const orgId = req.user!.empcloudOrgId;
      const settings = await settingsService.updateSettings(orgId, parsed.data);
      return sendSuccess(res, settings);
    } catch (err) {
      next(err);
    }
  },
);

export { router as settingsRoutes };
