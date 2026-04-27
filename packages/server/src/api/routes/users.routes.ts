// ============================================================================
// USERS ROUTES
// Lookup helpers for selecting employees in pickers/dropdowns.
// Source of truth is the EmpCloud master users table (org-scoped).
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { getEmpCloudDB } from "../../db/empcloud";

const router = Router();
router.use(authenticate);

// GET /users — list active employees in the caller's org.
// Excludes employees who already have an open exit so HR doesn't try to
// initiate a duplicate exit for the same person.
//
// Optional q= for substring match on name, email, or emp_code.
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const q = ((req.query.q as string) || "").trim();
    const excludeOpenExit = req.query.exclude_open_exit !== "false";
    const limit = Math.min(parseInt((req.query.limit as string) || "200", 10) || 200, 500);

    const db = getEmpCloudDB();
    let query = db("users")
      .where({ organization_id: orgId, status: 1 })
      .select(
        "id",
        "first_name",
        "last_name",
        "email",
        "emp_code",
        "designation",
        "department_id",
      );

    if (q) {
      query = query.andWhere((b) =>
        b
          .where("first_name", "like", `%${q}%`)
          .orWhere("last_name", "like", `%${q}%`)
          .orWhere("email", "like", `%${q}%`)
          .orWhere("emp_code", "like", `%${q}%`),
      );
    }

    const rows = await query.orderBy("first_name", "asc").limit(limit);

    let openExitIds = new Set<number>();
    if (excludeOpenExit && rows.length > 0) {
      const { getDB } = await import("../../db/adapters");
      const exitDb = getDB();
      const openStatuses = ["draft", "submitted", "approved", "in_progress"];
      const openExits = await exitDb.findMany<any>("exit_requests", {
        filters: { organization_id: orgId },
        limit: 5000,
      });
      for (const ex of openExits.data) {
        if (openStatuses.includes(ex.status)) {
          openExitIds.add(Number(ex.employee_id));
        }
      }
    }

    const data = rows
      .filter((u) => !openExitIds.has(Number(u.id)))
      .map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        emp_code: u.emp_code,
        designation: u.designation,
        department_id: u.department_id,
      }));

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

export { router as usersRoutes };
