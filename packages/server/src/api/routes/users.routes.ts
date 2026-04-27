// ============================================================================
// USERS ROUTES — read-only proxy into the EmpCloud `users` table for the
// caller's organization. Used by UI pickers (initiate exit, etc.) to
// resolve a person from name/email/emp_code instead of asking the user
// to memorise the numeric DB id.
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

export { router as usersRoutes };
