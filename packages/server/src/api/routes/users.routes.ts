// ============================================================================
// USERS ROUTES — read-only proxy into the EmpCloud `users` table for the
// caller's organization. Used by UI pickers (initiate exit, etc.) to
// resolve a person from name/email/emp_code instead of asking the user
// to memorise the numeric DB id.
//
// Source of truth is the EmpCloud master users table (org-scoped).
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getEmpCloudDB } from "../../db/empcloud";
import { sendSuccess } from "../../utils/response";

const router = Router();

router.use(authenticate);

// GET /search?q=... — typeahead lookup, max 20 results, scoped to org
router.get("/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const db = getEmpCloudDB();
    const orgId = req.user!.empcloudOrgId;

    let query = db("users")
      .where({ organization_id: orgId, status: 1 })
      .select("id", "first_name", "last_name", "email", "emp_code", "designation");

    if (q) {
      const like = `%${q}%`;
      query = query.andWhere((b) => {
        b.where("first_name", "like", like)
          .orWhere("last_name", "like", like)
          .orWhere("email", "like", like)
          .orWhere("emp_code", "like", like)
          .orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", [like]);
      });
    }

    const rows = await query.orderBy("first_name", "asc").limit(20);
    sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

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
