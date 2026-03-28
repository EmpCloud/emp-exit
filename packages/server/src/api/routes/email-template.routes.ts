// ============================================================================
// EMAIL TEMPLATE ROUTES (Stub)
// GET /email-templates — list email templates (planned feature)
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";

const router = Router();
router.use(authenticate);

// GET /email-templates — list email templates for the organization
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Email templates are a planned feature. Return an empty list for now
    // so clients get a 200 instead of 404.
    return sendSuccess(res, {
      data: [],
      message: "Email template management is coming soon.",
    });
  } catch (err) {
    next(err);
  }
});

export { router as emailTemplateRoutes };
