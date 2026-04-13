// ============================================================================
// CHECKLIST ROUTES
// GET /templates            — list templates
// POST /templates           — create template
// GET /templates/:id        — get template with items
// PUT /templates/:id        — update template
// DELETE /templates/:id     — delete template
// POST /templates/:id/items — add item to template
// PUT /items/:itemId        — update template item
// DELETE /items/:itemId     — remove template item
// POST /generate            — generate checklist for exit
// GET /exit/:exitId         — get checklist for exit
// PATCH /items/:itemId      — update checklist item status
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import {
  createChecklistTemplateSchema,
  addTemplateItemSchema,
  updateChecklistItemSchema,
} from "@emp-exit/shared";
import { ValidationError } from "../../utils/errors";
import * as checklistService from "../../services/checklist/checklist.service";

const router = Router();

router.use(authenticate);

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

// Shared handler for listing templates
async function handleListTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await checklistService.listTemplates(req.user!.empcloudOrgId);
    sendSuccess(res, templates);
  } catch (err) {
    next(err);
  }
}

// GET / — alias root (supports /checklist-templates mount)
router.get(
  "/",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  handleListTemplates,
);

// GET /templates
router.get(
  "/templates",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  handleListTemplates,
);

// POST /templates
router.post(
  "/templates",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createChecklistTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid template data", parsed.error.flatten().fieldErrors as any);
      }

      const template = await checklistService.createTemplate(req.user!.empcloudOrgId, parsed.data as any);
      sendSuccess(res, template, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /templates/:id
router.get(
  "/templates/:id",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await checklistService.getTemplate(req.user!.empcloudOrgId, req.params.id as string);
      sendSuccess(res, template);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /templates/:id
router.put(
  "/templates/:id",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await checklistService.updateTemplate(
        req.user!.empcloudOrgId,
        req.params.id as string,
        req.body,
      );
      sendSuccess(res, template);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /templates/:id
router.delete(
  "/templates/:id",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await checklistService.deleteTemplate(req.user!.empcloudOrgId, req.params.id as string);
      sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Template Items
// ---------------------------------------------------------------------------

// POST /templates/:id/items
router.post(
  "/templates/:id/items",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = addTemplateItemSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid item data", parsed.error.flatten().fieldErrors as any);
      }

      const item = await checklistService.addTemplateItem(
        req.user!.empcloudOrgId,
        req.params.id as string,
        parsed.data as any,
      );
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /items/:itemId (template item)
router.put(
  "/items/:itemId",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await checklistService.updateTemplateItem(
        req.user!.empcloudOrgId,
        req.params.itemId as string,
        req.body,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /items/:itemId (template item)
router.delete(
  "/items/:itemId",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await checklistService.removeTemplateItem(req.user!.empcloudOrgId, req.params.itemId as string);
      sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Checklist Instances (per exit)
// ---------------------------------------------------------------------------

// POST /generate — generate checklist from template for an exit
router.post(
  "/generate",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { exit_request_id, template_id } = req.body;
      if (!exit_request_id || !template_id) {
        throw new ValidationError("exit_request_id and template_id are required");
      }

      const items = await checklistService.generateChecklist(
        req.user!.empcloudOrgId,
        exit_request_id,
        template_id,
      );
      sendSuccess(res, items, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /exit/:exitId — get checklist for an exit
router.get(
  "/exit/:exitId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checklist = await checklistService.getChecklist(
        req.user!.empcloudOrgId,
        req.params.exitId as string,
      );
      sendSuccess(res, checklist);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /items/:itemId — update checklist instance item status
router.patch(
  "/items/:itemId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateChecklistItemSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid update data", parsed.error.flatten().fieldErrors as any);
      }

      const item = await checklistService.updateChecklistItem(
        req.user!.empcloudOrgId,
        req.params.itemId as string,
        parsed.data,
        req.user!.empcloudUserId,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },
);

export { router as checklistRoutes };
