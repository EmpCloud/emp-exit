// ============================================================================
// REHIRE ROUTES
// POST / (propose), GET / (list), GET /:id, PUT /:id/status, POST /:id/complete
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import * as rehireService from "../../services/rehire/rehire.service";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { ValidationError } from "../../utils/errors";

const router = Router();
router.use(authenticate);

// POST /rehire — propose a rehire (admin/HR only)
router.post(
  "/",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { alumni_id, position, department, salary, notes } = req.body;
      if (!alumni_id || !position || salary === undefined) {
        throw new ValidationError("alumni_id, position, and salary are required");
      }
      const orgId = req.user!.empcloudOrgId;
      const requestedBy = req.user!.empcloudUserId;
      const result = await rehireService.proposeRehire(orgId, alumni_id, requestedBy, {
        position,
        department,
        salary: Number(salary),
        notes,
      });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /rehire — list rehire requests
router.get(
  "/",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const { status, page, perPage, search } = req.query;
      const result = await rehireService.listRehireRequests(orgId, {
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
        search: search as string | undefined,
      });
      return sendPaginated(res, result.data, result.total, result.page, result.perPage);
    } catch (err) {
      next(err);
    }
  },
);

// GET /rehire/:id — get rehire request detail
router.get(
  "/:id",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const result = await rehireService.getRehireRequest(orgId, req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /rehire/:id/status — update rehire status
router.put(
  "/:id/status",
  authorize("hr_admin", "hr_manager", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        throw new ValidationError("status is required");
      }
      const validStatuses = ["proposed", "screening", "approved", "rejected"];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`status must be one of: ${validStatuses.join(", ")}`);
      }
      const orgId = req.user!.empcloudOrgId;
      const result = await rehireService.updateStatus(orgId, req.params.id, status, notes);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /rehire/:id/complete — complete rehire (reactivate employee)
router.post(
  "/:id/complete",
  authorize("hr_admin", "super_admin", "org_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const result = await rehireService.completeRehire(orgId, req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as rehireRoutes };
