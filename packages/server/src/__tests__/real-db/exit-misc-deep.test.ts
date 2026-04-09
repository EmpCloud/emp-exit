// =============================================================================
// EXIT MISC DEEP COVERAGE — alumni, rehire, letters, KT, analytics, prediction,
//   checklist, asset, exit-request lifecycle, settings
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import knexLib, { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

let db: Knex;
let dbAvailable = false;
const ORG_ID = 5;
const USER_ID = 522;
const TS = Date.now();
const cleanup: { table: string; id: string }[] = [];

beforeAll(async () => {
  try {
    db = knexLib({
      client: "mysql2",
      connection: { host: "localhost", port: 3306, user: "empcloud", password: process.env.DB_PASSWORD || "", database: "emp_exit" },
    });
    await db.raw("SELECT 1");
    dbAvailable = true;
  } catch {
    // No local MySQL — tests will be skipped
  }
});

afterEach(async () => {
  for (const item of cleanup.reverse()) {
    try { await db(item.table).where({ id: item.id }).del(); } catch {}
  }
  cleanup.length = 0;
});

afterAll(async () => { if (db) await db.destroy(); });

beforeEach((ctx) => { if (!dbAvailable) ctx.skip(); });

async function seedExitRequest(overrides: Record<string, any> = {}): Promise<string> {
  const id = uuidv4();
  await db("exit_requests").insert({
    id, organization_id: ORG_ID, employee_id: 524, exit_type: "resignation",
    status: "completed", reason_category: "career_growth", initiated_by: USER_ID,
    notice_period_days: 30, notice_period_waived: false,
    resignation_date: "2026-01-01", last_working_date: "2026-01-31",
    actual_exit_date: "2026-01-31",
    ...overrides,
  });
  cleanup.push({ table: "exit_requests", id });
  return id;
}

// ==========================================================================
// ALUMNI
// ==========================================================================
describe("Alumni Profiles", () => {
  it("should create an alumni opt-in profile", async () => {
    const exitId = await seedExitRequest();
    const pid = uuidv4();
    await db("alumni_profiles").insert({
      id: pid, exit_request_id: exitId, employee_id: 524, organization_id: ORG_ID,
      personal_email: "priya@personal.com", opted_in: true,
      last_designation: "Engineer", exit_date: "2026-01-31",
    });
    cleanup.push({ table: "alumni_profiles", id: pid });

    const row = await db("alumni_profiles").where({ id: pid }).first();
    expect(row.opted_in).toBe(1);
    expect(row.personal_email).toBe("priya@personal.com");
  });

  it("should update alumni profile with linkedin and phone", async () => {
    const exitId = await seedExitRequest();
    const pid = uuidv4();
    await db("alumni_profiles").insert({
      id: pid, exit_request_id: exitId, employee_id: 524, organization_id: ORG_ID,
      opted_in: true,
    });
    cleanup.push({ table: "alumni_profiles", id: pid });

    await db("alumni_profiles").where({ id: pid }).update({
      linkedin_url: "https://linkedin.com/in/priya", phone: "+919876543210",
    });

    const row = await db("alumni_profiles").where({ id: pid }).first();
    expect(row.linkedin_url).toBe("https://linkedin.com/in/priya");
    expect(row.phone).toBe("+919876543210");
  });

  it("should list alumni with opted_in filter", async () => {
    const exitId = await seedExitRequest();
    const pid = uuidv4();
    await db("alumni_profiles").insert({
      id: pid, exit_request_id: exitId, employee_id: 524, organization_id: ORG_ID,
      opted_in: true, last_designation: "Senior Engineer",
    });
    cleanup.push({ table: "alumni_profiles", id: pid });

    const rows = await db("alumni_profiles")
      .where({ organization_id: ORG_ID, opted_in: true });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("should opt-out by setting opted_in = false", async () => {
    const exitId = await seedExitRequest();
    const pid = uuidv4();
    await db("alumni_profiles").insert({
      id: pid, exit_request_id: exitId, employee_id: 524, organization_id: ORG_ID,
      opted_in: true,
    });
    cleanup.push({ table: "alumni_profiles", id: pid });

    await db("alumni_profiles").where({ id: pid }).update({ opted_in: false });
    const row = await db("alumni_profiles").where({ id: pid }).first();
    expect(row.opted_in).toBe(0);
  });
});

// ==========================================================================
// REHIRE
// ==========================================================================
describe("Rehire Requests", () => {
  it("should create a rehire request from alumni", async () => {
    const exitId = await seedExitRequest();
    const alumniId = uuidv4();
    await db("alumni_profiles").insert({
      id: alumniId, exit_request_id: exitId, employee_id: 524, organization_id: ORG_ID,
      opted_in: true, exit_date: "2026-01-31",
    });
    cleanup.push({ table: "alumni_profiles", id: alumniId });

    const rehireId = uuidv4();
    await db("rehire_requests").insert({
      id: rehireId, organization_id: ORG_ID, alumni_id: alumniId,
      employee_id: 524, requested_by: USER_ID,
      position: "Senior Developer", department: "Engineering",
      proposed_salary: 8000000, status: "proposed",
      original_exit_date: "2026-01-31",
    });
    cleanup.push({ table: "rehire_requests", id: rehireId });

    const row = await db("rehire_requests").where({ id: rehireId }).first();
    expect(row.status).toBe("proposed");
    expect(Number(row.proposed_salary)).toBe(8000000);
  });

  it("should advance rehire through statuses: proposed -> screening -> approved -> hired", async () => {
    const exitId = await seedExitRequest();
    const alumniId = uuidv4();
    await db("alumni_profiles").insert({
      id: alumniId, exit_request_id: exitId, employee_id: 524, organization_id: ORG_ID,
      opted_in: true,
    });
    cleanup.push({ table: "alumni_profiles", id: alumniId });

    const rehireId = uuidv4();
    await db("rehire_requests").insert({
      id: rehireId, organization_id: ORG_ID, alumni_id: alumniId,
      employee_id: 524, requested_by: USER_ID,
      position: "Lead Developer", proposed_salary: 10000000, status: "proposed",
    });
    cleanup.push({ table: "rehire_requests", id: rehireId });

    for (const status of ["screening", "approved", "hired"] as const) {
      await db("rehire_requests").where({ id: rehireId }).update({
        status, ...(status === "hired" ? { rehire_date: "2026-03-01" } : {}),
      });
      const row = await db("rehire_requests").where({ id: rehireId }).first();
      expect(row.status).toBe(status);
    }
  });

  it("should reject a rehire request", async () => {
    const exitId = await seedExitRequest();
    const alumniId = uuidv4();
    await db("alumni_profiles").insert({
      id: alumniId, exit_request_id: exitId, employee_id: 524, organization_id: ORG_ID,
      opted_in: true,
    });
    cleanup.push({ table: "alumni_profiles", id: alumniId });

    const rehireId = uuidv4();
    await db("rehire_requests").insert({
      id: rehireId, organization_id: ORG_ID, alumni_id: alumniId,
      employee_id: 524, requested_by: USER_ID,
      position: "Manager", proposed_salary: 12000000, status: "proposed",
      notes: "Previous performance concerns",
    });
    cleanup.push({ table: "rehire_requests", id: rehireId });

    await db("rehire_requests").where({ id: rehireId }).update({ status: "rejected" });
    const row = await db("rehire_requests").where({ id: rehireId }).first();
    expect(row.status).toBe("rejected");
  });
});

// ==========================================================================
// LETTER TEMPLATES & GENERATION
// ==========================================================================
describe("Letter Templates & Generation", () => {
  it("should create a letter template with Handlebars body", async () => {
    const id = uuidv4();
    await db("letter_templates").insert({
      id, organization_id: ORG_ID, letter_type: "resignation_acceptance",
      name: `Acceptance-${TS}`, body_template: "Dear {{employee.fullName}}, we accept your resignation.",
      is_default: false, is_active: true,
    });
    cleanup.push({ table: "letter_templates", id });

    const row = await db("letter_templates").where({ id }).first();
    expect(row.body_template).toContain("{{employee.fullName}}");
  });

  it("should generate a letter from template", async () => {
    const exitId = await seedExitRequest();
    const tmplId = uuidv4();
    await db("letter_templates").insert({
      id: tmplId, organization_id: ORG_ID, letter_type: "experience",
      name: `Experience-${TS}`, body_template: "This certifies that {{employee.fullName}} worked with us.",
      is_default: true, is_active: true,
    });
    cleanup.push({ table: "letter_templates", id: tmplId });

    const letterId = uuidv4();
    await db("generated_letters").insert({
      id: letterId, exit_request_id: exitId, template_id: tmplId,
      letter_type: "experience",
      generated_body: "This certifies that Priya Sharma worked with us.",
      generated_by: USER_ID, issued_date: "2026-02-01",
    });
    cleanup.push({ table: "generated_letters", id: letterId });

    const row = await db("generated_letters").where({ id: letterId }).first();
    expect(row.generated_body).toContain("Priya Sharma");
    expect(row.letter_type).toBe("experience");
  });

  it("should soft-delete a template by setting is_active=false", async () => {
    const id = uuidv4();
    await db("letter_templates").insert({
      id, organization_id: ORG_ID, letter_type: "relieving",
      name: `Del-${TS}`, body_template: "template body", is_default: false, is_active: true,
    });
    cleanup.push({ table: "letter_templates", id });

    await db("letter_templates").where({ id }).update({ is_active: false });
    const row = await db("letter_templates").where({ id }).first();
    expect(row.is_active).toBe(0);
  });

  it("should list multiple generated letters for one exit", async () => {
    const exitId = await seedExitRequest();
    const l1 = uuidv4();
    const l2 = uuidv4();
    await db("generated_letters").insert([
      { id: l1, exit_request_id: exitId, letter_type: "resignation_acceptance", generated_body: "body1", generated_by: USER_ID, issued_date: "2026-02-01" },
      { id: l2, exit_request_id: exitId, letter_type: "experience", generated_body: "body2", generated_by: USER_ID, issued_date: "2026-02-01" },
    ]);
    cleanup.push({ table: "generated_letters", id: l1 });
    cleanup.push({ table: "generated_letters", id: l2 });

    const rows = await db("generated_letters").where({ exit_request_id: exitId });
    expect(rows.length).toBe(2);
  });
});

// ==========================================================================
// KNOWLEDGE TRANSFER
// ==========================================================================
describe("Knowledge Transfer", () => {
  it("should create a KT plan with items", async () => {
    const exitId = await seedExitRequest();
    const ktId = uuidv4();
    await db("knowledge_transfers").insert({
      id: ktId, exit_request_id: exitId, assignee_id: USER_ID,
      status: "not_started", due_date: "2026-01-25",
    });
    cleanup.push({ table: "knowledge_transfers", id: ktId });

    const item1 = uuidv4();
    const item2 = uuidv4();
    await db("kt_items").insert([
      { id: item1, kt_id: ktId, title: "Document API endpoints", status: "not_started" },
      { id: item2, kt_id: ktId, title: "Handover DB credentials", status: "not_started" },
    ]);
    cleanup.push({ table: "kt_items", id: item1 });
    cleanup.push({ table: "kt_items", id: item2 });

    const items = await db("kt_items").where({ kt_id: ktId });
    expect(items.length).toBe(2);
  });

  it("should update KT item status to completed", async () => {
    const exitId = await seedExitRequest();
    const ktId = uuidv4();
    await db("knowledge_transfers").insert({
      id: ktId, exit_request_id: exitId, status: "in_progress",
    });
    cleanup.push({ table: "knowledge_transfers", id: ktId });

    const itemId = uuidv4();
    await db("kt_items").insert({
      id: itemId, kt_id: ktId, title: "Transfer item", status: "not_started",
    });
    cleanup.push({ table: "kt_items", id: itemId });

    await db("kt_items").where({ id: itemId }).update({
      status: "completed", completed_at: new Date(),
    });
    const row = await db("kt_items").where({ id: itemId }).first();
    expect(row.status).toBe("completed");
    expect(row.completed_at).toBeTruthy();
  });

  it("should update KT status to completed when all items done", async () => {
    const exitId = await seedExitRequest();
    const ktId = uuidv4();
    await db("knowledge_transfers").insert({
      id: ktId, exit_request_id: exitId, status: "in_progress",
    });
    cleanup.push({ table: "knowledge_transfers", id: ktId });

    const itemId = uuidv4();
    await db("kt_items").insert({
      id: itemId, kt_id: ktId, title: "Only item", status: "completed", completed_at: new Date(),
    });
    cleanup.push({ table: "kt_items", id: itemId });

    // Check all items completed
    const items = await db("kt_items").where({ kt_id: ktId });
    const allDone = items.every((i: any) => i.status === "completed");
    if (allDone) {
      await db("knowledge_transfers").where({ id: ktId }).update({ status: "completed" });
    }

    const kt = await db("knowledge_transfers").where({ id: ktId }).first();
    expect(kt.status).toBe("completed");
  });
});

// ==========================================================================
// CHECKLIST TEMPLATES & INSTANCES
// ==========================================================================
describe("Checklist Templates & Instances", () => {
  it("should create a checklist template with items", async () => {
    const tmplId = uuidv4();
    await db("exit_checklist_templates").insert({
      id: tmplId, organization_id: ORG_ID, name: `CL-${TS}`,
      exit_type: "resignation", is_default: false, is_active: true,
    });
    cleanup.push({ table: "exit_checklist_templates", id: tmplId });

    const item1 = uuidv4();
    await db("exit_checklist_template_items").insert({
      id: item1, template_id: tmplId, title: "Return laptop",
      assigned_role: "it_admin", sort_order: 0, is_mandatory: true,
    });
    cleanup.push({ table: "exit_checklist_template_items", id: item1 });

    const items = await db("exit_checklist_template_items").where({ template_id: tmplId });
    expect(items.length).toBe(1);
    expect(items[0].is_mandatory).toBe(1);
  });

  it("should generate checklist instances from template", async () => {
    const exitId = await seedExitRequest({ status: "initiated" });
    const tmplId = uuidv4();
    await db("exit_checklist_templates").insert({
      id: tmplId, organization_id: ORG_ID, name: `Gen-${TS}`, is_default: false, is_active: true,
    });
    cleanup.push({ table: "exit_checklist_templates", id: tmplId });

    const ti1 = uuidv4();
    const ti2 = uuidv4();
    await db("exit_checklist_template_items").insert([
      { id: ti1, template_id: tmplId, title: "Return ID card", sort_order: 0, is_mandatory: true },
      { id: ti2, template_id: tmplId, title: "Exit interview", sort_order: 1, is_mandatory: false },
    ]);
    cleanup.push({ table: "exit_checklist_template_items", id: ti1 });
    cleanup.push({ table: "exit_checklist_template_items", id: ti2 });

    // Generate instances
    const templateItems = await db("exit_checklist_template_items").where({ template_id: tmplId });
    for (const item of templateItems) {
      const instId = uuidv4();
      await db("exit_checklist_instances").insert({
        id: instId, exit_request_id: exitId, template_item_id: item.id,
        title: item.title, status: "pending",
      });
      cleanup.push({ table: "exit_checklist_instances", id: instId });
    }

    const instances = await db("exit_checklist_instances").where({ exit_request_id: exitId });
    expect(instances.length).toBe(2);
  });

  it("should complete a checklist item", async () => {
    const exitId = await seedExitRequest({ status: "initiated" });
    const instId = uuidv4();
    await db("exit_checklist_instances").insert({
      id: instId, exit_request_id: exitId, title: "Submit resignation letter",
      status: "pending",
    });
    cleanup.push({ table: "exit_checklist_instances", id: instId });

    await db("exit_checklist_instances").where({ id: instId }).update({
      status: "completed", completed_by: USER_ID, completed_at: new Date(),
    });
    const row = await db("exit_checklist_instances").where({ id: instId }).first();
    expect(row.status).toBe("completed");
  });
});

// ==========================================================================
// ASSET RETURNS
// ==========================================================================
describe("Asset Returns", () => {
  it("should add and return an asset", async () => {
    const exitId = await seedExitRequest();
    const assetId = uuidv4();
    await db("asset_returns").insert({
      id: assetId, exit_request_id: exitId, category: "electronics",
      asset_name: "MacBook Pro", asset_tag: "MB-001", status: "pending",
      replacement_cost: 15000000,
    });
    cleanup.push({ table: "asset_returns", id: assetId });

    await db("asset_returns").where({ id: assetId }).update({
      status: "returned", returned_date: "2026-01-28", verified_by: USER_ID,
      condition_notes: "Good condition",
    });

    const row = await db("asset_returns").where({ id: assetId }).first();
    expect(row.status).toBe("returned");
    expect(row.verified_by).toBe(USER_ID);
  });

  it("should mark asset as damaged", async () => {
    const exitId = await seedExitRequest();
    const assetId = uuidv4();
    await db("asset_returns").insert({
      id: assetId, exit_request_id: exitId, category: "electronics",
      asset_name: "Monitor", status: "pending", replacement_cost: 2000000,
    });
    cleanup.push({ table: "asset_returns", id: assetId });

    await db("asset_returns").where({ id: assetId }).update({
      status: "damaged", condition_notes: "Screen cracked",
    });

    const row = await db("asset_returns").where({ id: assetId }).first();
    expect(row.status).toBe("damaged");
  });
});

// ==========================================================================
// ANALYTICS: attrition, reason breakdown, dept trends, tenure, rehire pool
// ==========================================================================
describe("Analytics Queries", () => {
  it("should get attrition rate by month", async () => {
    const rows = await db.raw(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS exit_count
       FROM exit_requests WHERE organization_id = ? AND status NOT IN ('cancelled')
       GROUP BY month ORDER BY month ASC LIMIT 24`, [ORG_ID]
    );
    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    expect(Array.isArray(data)).toBe(true);
  });

  it("should get reason breakdown", async () => {
    const rows = await db.raw(
      `SELECT reason_category, COUNT(*) AS count FROM exit_requests
       WHERE organization_id = ? AND status NOT IN ('cancelled')
       GROUP BY reason_category ORDER BY count DESC`, [ORG_ID]
    );
    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    expect(Array.isArray(data)).toBe(true);
  });

  it("should get rehire pool", async () => {
    const rows = await db.raw(
      `SELECT er.id, er.employee_id, er.exit_type, er.reason_category
       FROM exit_requests er
       WHERE er.organization_id = ? AND er.status = 'completed'
       AND er.exit_type IN ('resignation', 'mutual_separation', 'end_of_contract')
       AND er.reason_category NOT IN ('misconduct', 'performance')
       LIMIT 100`, [ORG_ID]
    );
    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    expect(Array.isArray(data)).toBe(true);
  });
});

// ==========================================================================
// FLIGHT RISK & PREDICTION
// ==========================================================================
describe("Flight Risk & Attrition Prediction", () => {
  it("should insert and query flight risk scores", async () => {
    const frsId = uuidv4();
    await db("flight_risk_scores").insert({
      id: frsId, organization_id: ORG_ID, employee_id: 524,
      score: 72, risk_level: "high",
      factors: JSON.stringify([{ name: "Tenure", value: 1.5, impact: 80, description: "Common churn point" }]),
    });
    cleanup.push({ table: "flight_risk_scores", id: frsId });

    const row = await db("flight_risk_scores").where({ id: frsId }).first();
    expect(row.score).toBe(72);
    expect(row.risk_level).toBe("high");
    const factors = typeof row.factors === "string" ? JSON.parse(row.factors) : row.factors;
    expect(factors[0].name).toBe("Tenure");
  });

  it("should insert attrition prediction", async () => {
    const predId = uuidv4();
    await db("attrition_predictions").insert({
      id: predId, organization_id: ORG_ID, department_id: 1,
      month: "2026-05-01", predicted_exits: 3, confidence: 75.5,
    });
    cleanup.push({ table: "attrition_predictions", id: predId });

    const row = await db("attrition_predictions").where({ id: predId }).first();
    expect(row.predicted_exits).toBe(3);
    expect(Number(row.confidence)).toBeCloseTo(75.5, 1);
  });

  it("should compute scoreToRiskLevel correctly", () => {
    const scoreToRiskLevel = (score: number) => {
      if (score >= 80) return "critical";
      if (score >= 60) return "high";
      if (score >= 40) return "medium";
      return "low";
    };

    expect(scoreToRiskLevel(90)).toBe("critical");
    expect(scoreToRiskLevel(80)).toBe("critical");
    expect(scoreToRiskLevel(70)).toBe("high");
    expect(scoreToRiskLevel(60)).toBe("high");
    expect(scoreToRiskLevel(50)).toBe("medium");
    expect(scoreToRiskLevel(40)).toBe("medium");
    expect(scoreToRiskLevel(30)).toBe("low");
    expect(scoreToRiskLevel(0)).toBe("low");
  });
});

// ==========================================================================
// EXIT REQUEST LIFECYCLE
// ==========================================================================
describe("Exit Request Lifecycle", () => {
  it("should initiate -> update -> complete an exit request", async () => {
    const exitId = await seedExitRequest({ status: "initiated" });

    await db("exit_requests").where({ id: exitId }).update({
      status: "in_progress", notice_start_date: "2026-01-01",
    });
    let row = await db("exit_requests").where({ id: exitId }).first();
    expect(row.status).toBe("in_progress");

    await db("exit_requests").where({ id: exitId }).update({
      status: "completed", actual_exit_date: "2026-01-31",
    });
    row = await db("exit_requests").where({ id: exitId }).first();
    expect(row.status).toBe("completed");
  });

  it("should cancel an exit request", async () => {
    const exitId = await seedExitRequest({ status: "initiated" });

    await db("exit_requests").where({ id: exitId }).update({
      status: "cancelled", revoke_reason: "Employee decided to stay",
    });

    const row = await db("exit_requests").where({ id: exitId }).first();
    expect(row.status).toBe("cancelled");
    expect(row.revoke_reason).toBe("Employee decided to stay");
  });

  it("should list exits with status and type filter", async () => {
    const exitId = await seedExitRequest({ exit_type: "termination", status: "initiated" });

    const rows = await db("exit_requests")
      .where({ organization_id: ORG_ID, exit_type: "termination" });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

// ==========================================================================
// SETTINGS
// ==========================================================================
describe("Exit Settings", () => {
  it("should create default settings for org", async () => {
    const fakeOrg = 88880 + (TS % 1000);
    const sid = uuidv4();
    await db("exit_settings").insert({
      id: sid, organization_id: fakeOrg, default_notice_period_days: 30,
      auto_initiate_clearance: true, require_exit_interview: true,
      fnf_approval_required: true, alumni_opt_in_default: true,
    });
    cleanup.push({ table: "exit_settings", id: sid });

    const row = await db("exit_settings").where({ organization_id: fakeOrg }).first();
    expect(row.default_notice_period_days).toBe(30);
  });

  it("should update email notification settings", async () => {
    const fakeOrg = 88881 + (TS % 1000);
    const sid = uuidv4();
    await db("exit_settings").insert({
      id: sid, organization_id: fakeOrg, default_notice_period_days: 30,
      auto_initiate_clearance: true, require_exit_interview: true,
      fnf_approval_required: true, alumni_opt_in_default: true,
      email_on_exit_initiated: true, email_on_fnf_calculated: true,
    });
    cleanup.push({ table: "exit_settings", id: sid });

    await db("exit_settings").where({ id: sid }).update({
      email_on_exit_initiated: false, email_on_fnf_calculated: false,
    });

    const row = await db("exit_settings").where({ id: sid }).first();
    expect(row.email_on_exit_initiated).toBe(0);
    expect(row.email_on_fnf_calculated).toBe(0);
  });
});
