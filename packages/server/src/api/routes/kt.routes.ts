// ============================================================================
// KNOWLEDGE TRANSFER ROUTES
// POST /exit/:exitId, GET /exit/:exitId, PUT /exit/:exitId,
// POST /exit/:exitId/items, PUT /items/:itemId
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { createKTSchema, addKTItemSchema, updateKTItemSchema } from "@emp-exit/shared";
import * as ktService from "../../services/kt/knowledge-transfer.service";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";

const router = Router();
router.use(authenticate);

// POST /kt/exit/:exitId — create KT plan
router.post("/exit/:exitId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createKTSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid KT data", parsed.error.flatten().fieldErrors as any);
    }
    const orgId = req.user!.empcloudOrgId;
    const kt = await ktService.createKT(
      orgId,
      req.params.exitId,
      parsed.data.assignee_id,
      parsed.data.due_date,
    );
    return sendSuccess(res, kt, 201);
  } catch (err) {
    next(err);
  }
});

// GET /kt/exit/:exitId — get KT plan with items
router.get("/exit/:exitId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const kt = await ktService.getKT(orgId, req.params.exitId);
    return sendSuccess(res, kt);
  } catch (err) {
    next(err);
  }
});

// PUT /kt/exit/:exitId — update KT plan
router.put("/exit/:exitId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const kt = await ktService.updateKT(orgId, req.params.exitId, req.body);
    return sendSuccess(res, kt);
  } catch (err) {
    next(err);
  }
});

// POST /kt/exit/:exitId/items — add KT item (uses ktId from the KT plan)
router.post("/exit/:exitId/items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = addKTItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid KT item data", parsed.error.flatten().fieldErrors as any);
    }
    const orgId = req.user!.empcloudOrgId;

    // First get the KT plan to find its ID
    const kt = await ktService.getKT(orgId, req.params.exitId);
    if (!kt) {
      throw new ValidationError("No KT plan exists for this exit. Create one first.");
    }

    const item = await ktService.addItem(orgId, kt.id, parsed.data);
    return sendSuccess(res, item, 201);
  } catch (err) {
    next(err);
  }
});

// PUT /kt/items/:itemId — update KT item
router.put("/items/:itemId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateKTItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid KT item data", parsed.error.flatten().fieldErrors as any);
    }
    const orgId = req.user!.empcloudOrgId;
    const item = await ktService.updateItem(orgId, req.params.itemId, parsed.data);
    return sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
});

export { router as ktRoutes };
