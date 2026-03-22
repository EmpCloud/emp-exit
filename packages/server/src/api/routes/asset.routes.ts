// ============================================================================
// ASSET ROUTES
// GET /exit/:exitId, POST /exit/:exitId, PUT /:assetId
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { addAssetReturnSchema, updateAssetSchema } from "@emp-exit/shared";
import * as assetService from "../../services/asset/asset-return.service";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";

const router = Router();
router.use(authenticate);

// GET /assets/exit/:exitId — list assets for an exit
router.get("/exit/:exitId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const assets = await assetService.listAssets(orgId, req.params.exitId);
    return sendSuccess(res, assets);
  } catch (err) {
    next(err);
  }
});

// POST /assets/exit/:exitId — add an asset
router.post("/exit/:exitId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = addAssetReturnSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid asset data", parsed.error.flatten().fieldErrors as any);
    }
    const orgId = req.user!.empcloudOrgId;
    const asset = await assetService.addAsset(orgId, req.params.exitId, parsed.data);
    return sendSuccess(res, asset, 201);
  } catch (err) {
    next(err);
  }
});

// PUT /assets/:assetId — update an asset
router.put("/:assetId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid asset data", parsed.error.flatten().fieldErrors as any);
    }
    const orgId = req.user!.empcloudOrgId;
    const data: any = { ...parsed.data };
    if (data.status === "returned" || data.status === "damaged") {
      data.verified_by = req.user!.empcloudUserId;
    }
    const asset = await assetService.updateAsset(orgId, req.params.assetId, data);
    return sendSuccess(res, asset);
  } catch (err) {
    next(err);
  }
});

export { router as assetRoutes };
