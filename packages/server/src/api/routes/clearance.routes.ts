// ============================================================================
// CLEARANCE ROUTES
// GET /departments       — list clearance departments
// POST /departments      — create department
// PUT /departments/:id   — update department
// DELETE /departments/:id — delete department
// POST /exit/:exitId     — create clearance records for exit
// GET /exit/:exitId      — get clearance status for exit
// PUT /:clearanceId      — update clearance record
// GET /my                — clearances assigned to me
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { createClearanceDeptSchema, updateClearanceSchema } from "@emp-exit/shared";
import { ValidationError } from "../../utils/errors";
import * as clearanceService from "../../services/clearance/clearance.service";

const router = Router();

router.use(authenticate);

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

// Shared handler for listing departments
async function handleListDepartments(req: Request, res: Response, next: NextFunction) {
  try {
    const depts = await clearanceService.listDepartments(req.user!.empcloudOrgId);
    sendSuccess(res, depts);
  } catch (err) {
    next(err);
  }
}

// GET / — alias root (supports /clearance-departments mount)
router.get("/", handleListDepartments);

// GET /departments
router.get("/departments", handleListDepartments);

// POST /departments
router.post(
  "/departments",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createClearanceDeptSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid department data", parsed.error.flatten().fieldErrors as any);
      }

      const dept = await clearanceService.createDepartment(req.user!.empcloudOrgId, parsed.data);
      sendSuccess(res, dept, 201);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /departments/:id
router.put(
  "/departments/:id",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dept = await clearanceService.updateDepartment(
        req.user!.empcloudOrgId,
        req.params.id,
        req.body,
      );
      sendSuccess(res, dept);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /departments/:id
router.delete(
  "/departments/:id",
  authorize("super_admin", "org_admin", "hr_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await clearanceService.deleteDepartment(req.user!.empcloudOrgId, req.params.id);
      sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Clearance Records (per exit)
// ---------------------------------------------------------------------------

// POST /exit/:exitId — create clearance records for exit
router.post(
  "/exit/:exitId",
  authorize("super_admin", "org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await clearanceService.createClearanceRecords(
        req.user!.empcloudOrgId,
        req.params.exitId,
      );
      sendSuccess(res, records, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /exit/:exitId — get clearance status for exit
router.get(
  "/exit/:exitId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await clearanceService.getClearanceStatus(
        req.user!.empcloudOrgId,
        req.params.exitId,
      );
      sendSuccess(res, status);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:clearanceId — update clearance record
router.put(
  "/:clearanceId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateClearanceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid clearance data", parsed.error.flatten().fieldErrors as any);
      }

      const record = await clearanceService.updateClearance(
        req.user!.empcloudOrgId,
        req.params.clearanceId,
        parsed.data,
        req.user!.empcloudUserId,
      );
      sendSuccess(res, record);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my — clearances assigned to me
router.get(
  "/my",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await clearanceService.getMyClearances(
        req.user!.empcloudOrgId,
        req.user!.empcloudUserId,
      );
      sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  },
);

export { router as clearanceRoutes };
