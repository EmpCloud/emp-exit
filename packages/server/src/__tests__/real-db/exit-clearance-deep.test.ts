// =============================================================================
// EXIT CLEARANCE DEEP COVERAGE — multi-dept clearance, approval chain, status
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import knexLib, { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

let db: Knex;
const ORG_ID = 5;
const USER_ID = 522;
const TS = Date.now();
const cleanup: { table: string; id: string }[] = [];

beforeAll(async () => {
  db = knexLib({
    client: "mysql2",
    connection: { host: "localhost", port: 3306, user: "empcloud", password: "EmpCloud2026", database: "emp_exit" },
  });
  await db.raw("SELECT 1");
});

afterEach(async () => {
  for (const item of cleanup.reverse()) {
    try { await db(item.table).where({ id: item.id }).del(); } catch {}
  }
  cleanup.length = 0;
});

const parentCleanup: { table: string; id: string }[] = [];

afterAll(async () => {
  for (const item of parentCleanup.reverse()) {
    try { await db(item.table).where({ id: item.id }).del(); } catch {}
  }
  parentCleanup.length = 0;
  if (db) await db.destroy();
});

async function seedExitRequest(useParentCleanup = false): Promise<string> {
  const id = uuidv4();
  await db("exit_requests").insert({
    id, organization_id: ORG_ID, employee_id: 524, exit_type: "resignation",
    status: "initiated", reason_category: "career_growth", initiated_by: USER_ID,
    notice_period_days: 30, notice_period_waived: false,
  });
  if (useParentCleanup) {
    parentCleanup.push({ table: "exit_requests", id });
  } else {
    cleanup.push({ table: "exit_requests", id });
  }
  return id;
}

// ==========================================================================
// CLEARANCE DEPARTMENTS
// ==========================================================================
describe("ClearanceDepartment CRUD", () => {
  it("should create a clearance department", async () => {
    const id = uuidv4();
    await db("clearance_departments").insert({
      id, organization_id: ORG_ID, name: `IT-${TS}`, approver_role: "hr_admin",
      sort_order: 0, is_active: true,
    });
    cleanup.push({ table: "clearance_departments", id });

    const row = await db("clearance_departments").where({ id }).first();
    expect(row.name).toBe(`IT-${TS}`);
    expect(row.approver_role).toBe("hr_admin");
  });

  it("should update a department", async () => {
    const id = uuidv4();
    await db("clearance_departments").insert({
      id, organization_id: ORG_ID, name: `Finance-${TS}`, sort_order: 1, is_active: true,
    });
    cleanup.push({ table: "clearance_departments", id });

    await db("clearance_departments").where({ id }).update({ name: `Finance-Updated-${TS}`, is_active: false });
    const row = await db("clearance_departments").where({ id }).first();
    expect(row.name).toBe(`Finance-Updated-${TS}`);
    expect(row.is_active).toBe(0);
  });

  it("should delete a department", async () => {
    const id = uuidv4();
    await db("clearance_departments").insert({
      id, organization_id: ORG_ID, name: `TempDept-${TS}`, sort_order: 2, is_active: true,
    });

    await db("clearance_departments").where({ id }).del();
    const row = await db("clearance_departments").where({ id }).first();
    expect(row).toBeUndefined();
  });

  it("should list departments sorted by sort_order", async () => {
    const id1 = uuidv4();
    const id2 = uuidv4();
    await db("clearance_departments").insert([
      { id: id1, organization_id: ORG_ID, name: `Dept-Z-${TS}`, sort_order: 10, is_active: true },
      { id: id2, organization_id: ORG_ID, name: `Dept-A-${TS}`, sort_order: 5, is_active: true },
    ]);
    cleanup.push({ table: "clearance_departments", id: id1 });
    cleanup.push({ table: "clearance_departments", id: id2 });

    const rows = await db("clearance_departments")
      .where({ organization_id: ORG_ID })
      .orderBy("sort_order", "asc");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    // Verify ordering
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].sort_order).toBeGreaterThanOrEqual(rows[i - 1].sort_order);
    }
  });

  it("should auto-assign sort_order by counting existing departments", async () => {
    const count = await db("clearance_departments").where({ organization_id: ORG_ID }).count("* as cnt").first();
    const nextSort = Number(count?.cnt || 0);

    const id = uuidv4();
    await db("clearance_departments").insert({
      id, organization_id: ORG_ID, name: `AutoSort-${TS}`, sort_order: nextSort, is_active: true,
    });
    cleanup.push({ table: "clearance_departments", id });

    const row = await db("clearance_departments").where({ id }).first();
    expect(row.sort_order).toBe(nextSort);
  });
});

// ==========================================================================
// CLEARANCE RECORDS
// ==========================================================================
describe("ClearanceRecord lifecycle", () => {
  let exitReqId: string;
  let deptIds: string[] = [];

  beforeAll(async () => {
    exitReqId = await seedExitRequest(true);
    // Create 3 clearance departments
    for (const name of ["IT", "Finance", "Admin"]) {
      const id = uuidv4();
      await db("clearance_departments").insert({
        id, organization_id: ORG_ID, name: `${name}-${TS}`, sort_order: deptIds.length, is_active: true,
      });
      deptIds.push(id);
    }
  });

  afterAll(async () => {
    await db("clearance_records").where({ exit_request_id: exitReqId }).del();
    for (const did of deptIds) {
      await db("clearance_departments").where({ id: did }).del();
    }
  });

  it("should create clearance records for all active departments", async () => {
    for (const deptId of deptIds) {
      const rid = uuidv4();
      await db("clearance_records").insert({
        id: rid, exit_request_id: exitReqId, department_id: deptId,
        status: "pending", pending_amount: 0,
      });
      cleanup.push({ table: "clearance_records", id: rid });
    }

    const records = await db("clearance_records").where({ exit_request_id: exitReqId });
    expect(records.length).toBe(3);
    expect(records.every((r: any) => r.status === "pending")).toBe(true);
  });

  it("should approve a clearance record", async () => {
    const rid = uuidv4();
    await db("clearance_records").insert({
      id: rid, exit_request_id: exitReqId, department_id: deptIds[0],
      status: "pending", pending_amount: 0,
    });
    cleanup.push({ table: "clearance_records", id: rid });

    await db("clearance_records").where({ id: rid }).update({
      status: "approved", approved_by: USER_ID, approved_at: new Date(), remarks: "All clear",
    });

    const row = await db("clearance_records").where({ id: rid }).first();
    expect(row.status).toBe("approved");
    expect(row.approved_by).toBe(USER_ID);
    expect(row.remarks).toBe("All clear");
  });

  it("should reject a clearance record with pending amount", async () => {
    const rid = uuidv4();
    await db("clearance_records").insert({
      id: rid, exit_request_id: exitReqId, department_id: deptIds[1],
      status: "pending", pending_amount: 0,
    });
    cleanup.push({ table: "clearance_records", id: rid });

    await db("clearance_records").where({ id: rid }).update({
      status: "rejected", approved_by: USER_ID, approved_at: new Date(),
      remarks: "Missing laptop", pending_amount: 50000,
    });

    const row = await db("clearance_records").where({ id: rid }).first();
    expect(row.status).toBe("rejected");
    expect(Number(row.pending_amount)).toBe(50000);
  });

  it("should waive a clearance record", async () => {
    const rid = uuidv4();
    await db("clearance_records").insert({
      id: rid, exit_request_id: exitReqId, department_id: deptIds[2],
      status: "pending", pending_amount: 0,
    });
    cleanup.push({ table: "clearance_records", id: rid });

    await db("clearance_records").where({ id: rid }).update({
      status: "waived", remarks: "Waived by management",
    });

    const row = await db("clearance_records").where({ id: rid }).first();
    expect(row.status).toBe("waived");
  });

  it("should calculate progress percentage", async () => {
    // Clean existing then create mixed-status records
    await db("clearance_records").where({ exit_request_id: exitReqId }).del();

    const rids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const rid = uuidv4();
      await db("clearance_records").insert({
        id: rid, exit_request_id: exitReqId, department_id: deptIds[i],
        status: i < 2 ? "approved" : "pending", pending_amount: 0,
      });
      rids.push(rid);
    }

    const records = await db("clearance_records").where({ exit_request_id: exitReqId });
    const total = records.length;
    const approved = records.filter((r: any) => r.status === "approved" || r.status === "waived").length;
    const progress = total > 0 ? Math.round((approved / total) * 100) : 0;

    expect(total).toBe(3);
    expect(approved).toBe(2);
    expect(progress).toBe(67);

    for (const rid of rids) cleanup.push({ table: "clearance_records", id: rid });
  });

  it("should detect all clearances completed", async () => {
    await db("clearance_records").where({ exit_request_id: exitReqId }).del();

    const rids: string[] = [];
    for (const deptId of deptIds) {
      const rid = uuidv4();
      await db("clearance_records").insert({
        id: rid, exit_request_id: exitReqId, department_id: deptId,
        status: "approved", approved_by: USER_ID, approved_at: new Date(), pending_amount: 0,
      });
      rids.push(rid);
    }

    const records = await db("clearance_records").where({ exit_request_id: exitReqId });
    const allDone = records.every((r: any) => r.status === "approved" || r.status === "waived");
    expect(allDone).toBe(true);

    for (const rid of rids) cleanup.push({ table: "clearance_records", id: rid });
  });

  it("should enrich clearance records with department names", async () => {
    await db("clearance_records").where({ exit_request_id: exitReqId }).del();

    const rid = uuidv4();
    await db("clearance_records").insert({
      id: rid, exit_request_id: exitReqId, department_id: deptIds[0],
      status: "pending", pending_amount: 0,
    });
    cleanup.push({ table: "clearance_records", id: rid });

    const record = await db("clearance_records").where({ id: rid }).first();
    const dept = await db("clearance_departments").where({ id: record.department_id }).first();
    expect(dept).toBeTruthy();
    expect(dept.name).toContain("IT");
  });
});
