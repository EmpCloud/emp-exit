// ============================================================================
// LETTER ROUTES
// Templates: GET /templates, POST /templates, PUT /templates/:id
// Generation: POST /exit/:exitId/generate, GET /exit/:exitId
// Download/Send: GET /:letterId/download, POST /:letterId/send
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { createLetterTemplateSchema, generateLetterSchema } from "@emp-exit/shared";
import * as letterService from "../../services/letter/letter.service";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";

const router = Router();
router.use(authenticate);

// ---- Templates ----

// Shared handler for listing templates
async function handleListTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.empcloudOrgId;
    const templates = await letterService.listTemplates(orgId);
    return sendSuccess(res, templates);
  } catch (err) {
    next(err);
  }
}

// GET / — alias root (supports /letter-templates mount)
router.get("/", handleListTemplates);

// GET /letters/templates
router.get("/templates", handleListTemplates);

// POST /letters/templates
router.post(
  "/templates",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createLetterTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid template data", parsed.error.flatten().fieldErrors as any);
      }
      const orgId = req.user!.empcloudOrgId;
      const template = await letterService.createTemplate(orgId, parsed.data);
      return sendSuccess(res, template, 201);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /letters/templates/:id
router.put(
  "/templates/:id",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const template = await letterService.updateTemplate(orgId, req.params.id, req.body);
      return sendSuccess(res, template);
    } catch (err) {
      next(err);
    }
  },
);

// ---- Generation ----

// POST /letters/exit/:exitId/generate
router.post(
  "/exit/:exitId/generate",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = generateLetterSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid generation data", parsed.error.flatten().fieldErrors as any);
      }
      const orgId = req.user!.empcloudOrgId;
      const templateId = parsed.data.template_id;
      if (!templateId) {
        throw new ValidationError("template_id is required");
      }
      const letter = await letterService.generateLetter(
        orgId,
        req.params.exitId,
        templateId,
        req.user!.empcloudUserId,
      );
      return sendSuccess(res, letter, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /letters/exit/:exitId — list generated letters for an exit
router.get("/exit/:exitId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const letters = await letterService.listLetters(orgId, req.params.exitId);
    return sendSuccess(res, letters);
  } catch (err) {
    next(err);
  }
});

// ---- Download / Send ----

// GET /letters/:letterId/download
router.get("/:letterId/download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const letter = await letterService.getLetter(orgId, req.params.letterId) as any;
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="${letter.letter_type}_letter.html"`);
    return res.send(letter.generated_body);
  } catch (err) {
    next(err);
  }
});

// POST /letters/:letterId/send
router.post(
  "/:letterId/send",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const result = await letterService.sendLetter(orgId, req.params.letterId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as letterRoutes };
