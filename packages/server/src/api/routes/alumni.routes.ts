// ============================================================================
// ALUMNI ROUTES
// GET / (list), GET /:id, PUT /my (self), POST /opt-in
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { updateAlumniSchema, paginationSchema } from "@emp-exit/shared";
import * as alumniService from "../../services/alumni/alumni.service";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { ValidationError } from "../../utils/errors";

const router = Router();
router.use(authenticate);

// POST /alumni/opt-in
router.post("/opt-in", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { exitRequestId } = req.body;
    if (!exitRequestId) {
      throw new ValidationError("exitRequestId is required");
    }
    const orgId = req.user!.empcloudOrgId;
    const employeeId = req.user!.empcloudUserId;
    const profile = await alumniService.optIn(orgId, employeeId, exitRequestId);
    return sendSuccess(res, profile, 201);
  } catch (err) {
    next(err);
  }
});

// GET /alumni — list alumni directory
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = paginationSchema.safeParse(req.query);
    const orgId = req.user!.empcloudOrgId;
    const result = await alumniService.listAlumni(orgId, {
      search: params.data?.search,
      page: params.data?.page,
      perPage: params.data?.perPage,
    });
    return sendPaginated(res, result.data, result.total, result.page, result.perPage);
  } catch (err) {
    next(err);
  }
});

// GET /alumni/:id — get specific alumni profile
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const profile = await alumniService.getProfile(orgId, req.params.id as string);
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
});

// PUT /alumni/my — update own alumni profile
router.put("/my", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateAlumniSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid profile data", parsed.error.flatten().fieldErrors as any);
    }
    const orgId = req.user!.empcloudOrgId;

    // Find the user's alumni profile
    const db = (await import("../../db/adapters")).getDB();
    const profile = await db.findOne<any>("alumni_profiles", {
      organization_id: orgId,
      employee_id: req.user!.empcloudUserId,
    });
    if (!profile) {
      throw new ValidationError("No alumni profile found for your account");
    }

    const updated = await alumniService.updateProfile(orgId, profile.id, parsed.data);
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

export { router as alumniRoutes };
