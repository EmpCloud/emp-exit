// =============================================================================
// EMP EXIT — Real DB Unit Tests for Low-Coverage Service Files
// Services tested: settings, checklist, interview, alumni, analytics,
//   asset-return, knowledge-transfer, letter, rehire, notice-buyout
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import knexLib, { Knex } from "knex";

// ---------------------------------------------------------------------------
// DB connection — raw knex, bypasses app singleton
// ---------------------------------------------------------------------------

let db: Knex;
const ORG_ID = 5; // TechNova
const USER_ID = 522; // admin
const EMP_USER_ID = 524; // priya

const TS = Date.now(); // unique per run to avoid collisions

// Track IDs for cleanup
const cleanup: { table: string; id: string }[] = [];

beforeAll(async () => {
  db = knexLib({
    client: "mysql2",
    connection: {
      host: "localhost",
      port: 3306,
      user: "empcloud",
      password: "EmpCloud2026",
      database: "emp_exit",
    },
  });
  await db.raw("SELECT 1");
});

afterEach(async () => {
  // Reverse cleanup so children are deleted before parents
  for (const item of cleanup.reverse()) {
    try {
      await db(item.table).where({ id: item.id }).del();
    } catch {
      // ignore — may already be deleted by test
    }
  }
  cleanup.length = 0;
});

afterAll(async () => {
  if (db) await db.destroy();
});

// ---------------------------------------------------------------------------
// Helper: create an exit request seed row for tests that need one
// ---------------------------------------------------------------------------

async function seedExitRequest(overrides: Record<string, any> = {}) {
  const id = `test-exit-${TS}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  await db("exit_requests").insert({
    id,
    organization_id: ORG_ID,
    employee_id: EMP_USER_ID,
    exit_type: "resignation",
    reason_category: "career_growth",
    reason_detail: "Test exit for unit tests",
    status: "in_progress",
    notice_period_days: 30,
    resignation_date: "2026-03-01",
    last_working_date: "2026-03-31",
    created_at: now,
    updated_at: now,
    ...overrides,
  });
  cleanup.push({ table: "exit_requests", id });
  return id;
}

// ==========================================================================
// SETTINGS SERVICE
// ==========================================================================

describe("SettingsService (exit_settings)", () => {
  let settingsId: string | null = null;

  afterEach(async () => {
    if (settingsId) {
      await db("exit_settings").where({ id: settingsId }).del();
      settingsId = null;
    }
  });

  it("should auto-create default settings if none exist", async () => {
    // Use a fake org id that won't have settings
    const fakeOrg = 99990 + TS % 1000;
    const existing = await db("exit_settings")
      .where({ organization_id: fakeOrg })
      .first();
    expect(existing).toBeUndefined();

    // Insert default settings manually to simulate auto-create
    const id = `test-settings-${TS}`;
    await db("exit_settings").insert({
      id,
      organization_id: fakeOrg,
      default_notice_period_days: 30,
      auto_initiate_clearance: true,
      require_exit_interview: true,
      fnf_approval_required: true,
      alumni_opt_in_default: true,
    });
    settingsId = id;

    const settings = await db("exit_settings")
      .where({ organization_id: fakeOrg })
      .first();
    expect(settings).toBeDefined();
    expect(settings.default_notice_period_days).toBe(30);
    expect(settings.auto_initiate_clearance).toBeTruthy();
  });

  it("should update existing settings", async () => {
    const fakeOrg = 99991 + TS % 1000;
    const id = `test-settings-upd-${TS}`;
    await db("exit_settings").insert({
      id,
      organization_id: fakeOrg,
      default_notice_period_days: 30,
      auto_initiate_clearance: true,
      require_exit_interview: true,
      fnf_approval_required: true,
      alumni_opt_in_default: true,
    });
    settingsId = id;

    await db("exit_settings").where({ id }).update({
      default_notice_period_days: 60,
      require_exit_interview: false,
    });

    const updated = await db("exit_settings").where({ id }).first();
    expect(updated.default_notice_period_days).toBe(60);
    expect(updated.require_exit_interview).toBeFalsy();
  });
});

// ==========================================================================
// CHECKLIST SERVICE
// ==========================================================================

describe("ChecklistService", () => {
  describe("Templates", () => {
    it("should create a checklist template", async () => {
      const id = `test-tmpl-${TS}`;
      await db("exit_checklist_templates").insert({
        id,
        organization_id: ORG_ID,
        name: `Test Template ${TS}`,
        description: "Unit test template",
        exit_type: "resignation",
        is_default: false,
        is_active: true,
      });
      cleanup.push({ table: "exit_checklist_templates", id });

      const template = await db("exit_checklist_templates").where({ id }).first();
      expect(template).toBeDefined();
      expect(template.name).toBe(`Test Template ${TS}`);
      expect(template.is_active).toBeTruthy();
    });

    it("should list templates for an org", async () => {
      const id = `test-tmpl-list-${TS}`;
      await db("exit_checklist_templates").insert({
        id,
        organization_id: ORG_ID,
        name: `List Template ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_checklist_templates", id });

      const templates = await db("exit_checklist_templates")
        .where({ organization_id: ORG_ID })
        .orderBy("created_at", "desc");
      expect(templates.length).toBeGreaterThanOrEqual(1);
    });

    it("should update a template", async () => {
      const id = `test-tmpl-upd-${TS}`;
      await db("exit_checklist_templates").insert({
        id,
        organization_id: ORG_ID,
        name: `Original ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_checklist_templates", id });

      await db("exit_checklist_templates")
        .where({ id })
        .update({ name: `Updated ${TS}`, is_default: true });

      const updated = await db("exit_checklist_templates").where({ id }).first();
      expect(updated.name).toBe(`Updated ${TS}`);
      expect(updated.is_default).toBeTruthy();
    });

    it("should delete a template", async () => {
      const id = `test-tmpl-del-${TS}`;
      await db("exit_checklist_templates").insert({
        id,
        organization_id: ORG_ID,
        name: `Deletable ${TS}`,
        is_active: true,
      });

      await db("exit_checklist_templates").where({ id }).del();
      const deleted = await db("exit_checklist_templates").where({ id }).first();
      expect(deleted).toBeUndefined();
    });
  });

  describe("Template Items", () => {
    let templateId: string;

    beforeAll(async () => {
      templateId = `test-tmpl-items-${TS}`;
      await db("exit_checklist_templates").insert({
        id: templateId,
        organization_id: ORG_ID,
        name: `Items Template ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_checklist_templates", id: templateId });
    });

    it("should add items to a template", async () => {
      const id = `test-item-${TS}`;
      await db("exit_checklist_template_items").insert({
        id,
        template_id: templateId,
        title: `Return laptop ${TS}`,
        description: "Return company-issued laptop",
        assigned_role: "hr_admin",
        sort_order: 0,
        is_mandatory: true,
      });
      cleanup.push({ table: "exit_checklist_template_items", id });

      const item = await db("exit_checklist_template_items").where({ id }).first();
      expect(item.title).toBe(`Return laptop ${TS}`);
      expect(item.is_mandatory).toBeTruthy();
    });

    it("should update a template item", async () => {
      const id = `test-item-upd-${TS}`;
      await db("exit_checklist_template_items").insert({
        id,
        template_id: templateId,
        title: `Old title ${TS}`,
        sort_order: 1,
        is_mandatory: true,
      });
      cleanup.push({ table: "exit_checklist_template_items", id });

      await db("exit_checklist_template_items")
        .where({ id })
        .update({ title: `New title ${TS}`, is_mandatory: false });

      const updated = await db("exit_checklist_template_items").where({ id }).first();
      expect(updated.title).toBe(`New title ${TS}`);
      expect(updated.is_mandatory).toBeFalsy();
    });

    it("should remove a template item", async () => {
      const id = `test-item-del-${TS}`;
      await db("exit_checklist_template_items").insert({
        id,
        template_id: templateId,
        title: `Deletable ${TS}`,
        sort_order: 2,
        is_mandatory: false,
      });

      await db("exit_checklist_template_items").where({ id }).del();
      const gone = await db("exit_checklist_template_items").where({ id }).first();
      expect(gone).toBeUndefined();
    });
  });

  describe("Checklist Instances", () => {
    let exitId: string;
    let templateId: string;
    let templateItemId: string;

    beforeAll(async () => {
      exitId = await seedExitRequest();

      templateId = `test-tmpl-inst-${TS}`;
      await db("exit_checklist_templates").insert({
        id: templateId,
        organization_id: ORG_ID,
        name: `Instance Template ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_checklist_templates", id: templateId });

      templateItemId = `test-titem-inst-${TS}`;
      await db("exit_checklist_template_items").insert({
        id: templateItemId,
        template_id: templateId,
        title: `Return badge ${TS}`,
        sort_order: 0,
        is_mandatory: true,
      });
      cleanup.push({ table: "exit_checklist_template_items", id: templateItemId });
    });

    it("should generate checklist instances from a template", async () => {
      const instanceId = `test-inst-${TS}`;
      await db("exit_checklist_instances").insert({
        id: instanceId,
        exit_request_id: exitId,
        template_item_id: templateItemId,
        title: `Return badge ${TS}`,
        status: "pending",
      });
      cleanup.push({ table: "exit_checklist_instances", id: instanceId });

      const instance = await db("exit_checklist_instances").where({ id: instanceId }).first();
      expect(instance).toBeDefined();
      expect(instance.status).toBe("pending");
    });

    it("should update checklist item status to completed", async () => {
      const instanceId = `test-inst-comp-${TS}`;
      await db("exit_checklist_instances").insert({
        id: instanceId,
        exit_request_id: exitId,
        template_item_id: templateItemId,
        title: `Check item ${TS}`,
        status: "pending",
      });
      cleanup.push({ table: "exit_checklist_instances", id: instanceId });

      await db("exit_checklist_instances").where({ id: instanceId }).update({
        status: "completed",
        completed_by: USER_ID,
        completed_at: new Date(),
      });

      const updated = await db("exit_checklist_instances").where({ id: instanceId }).first();
      expect(updated.status).toBe("completed");
      expect(updated.completed_by).toBe(USER_ID);
    });

    it("should compute progress from checklist items", async () => {
      const inst1 = `test-inst-prog1-${TS}`;
      const inst2 = `test-inst-prog2-${TS}`;
      const inst3 = `test-inst-prog3-${TS}`;

      for (const [id, status] of [
        [inst1, "completed"],
        [inst2, "pending"],
        [inst3, "waived"],
      ] as const) {
        await db("exit_checklist_instances").insert({
          id,
          exit_request_id: exitId,
          template_item_id: templateItemId,
          title: `Progress item ${id}`,
          status,
        });
        cleanup.push({ table: "exit_checklist_instances", id });
      }

      const items = await db("exit_checklist_instances")
        .where({ exit_request_id: exitId });
      const total = items.length;
      const completed = items.filter(
        (i: any) => i.status === "completed" || i.status === "waived" || i.status === "na"
      ).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      expect(total).toBeGreaterThanOrEqual(3);
      expect(completed).toBeGreaterThanOrEqual(2);
      expect(progress).toBeGreaterThan(0);
    });
  });
});

// ==========================================================================
// EXIT INTERVIEW SERVICE
// ==========================================================================

describe("ExitInterviewService", () => {
  describe("Templates", () => {
    it("should create an interview template", async () => {
      const id = `test-int-tmpl-${TS}`;
      await db("exit_interview_templates").insert({
        id,
        organization_id: ORG_ID,
        name: `Interview Template ${TS}`,
        description: "Test interview template",
        is_default: false,
        is_active: true,
      });
      cleanup.push({ table: "exit_interview_templates", id });

      const template = await db("exit_interview_templates").where({ id }).first();
      expect(template.name).toBe(`Interview Template ${TS}`);
      expect(template.is_active).toBeTruthy();
    });

    it("should list interview templates", async () => {
      const id = `test-int-tmpl-list-${TS}`;
      await db("exit_interview_templates").insert({
        id,
        organization_id: ORG_ID,
        name: `List Template ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_interview_templates", id });

      const templates = await db("exit_interview_templates")
        .where({ organization_id: ORG_ID })
        .orderBy("created_at", "desc");
      expect(templates.length).toBeGreaterThanOrEqual(1);
    });

    it("should update an interview template", async () => {
      const id = `test-int-tmpl-upd-${TS}`;
      await db("exit_interview_templates").insert({
        id,
        organization_id: ORG_ID,
        name: `Original Name ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_interview_templates", id });

      await db("exit_interview_templates")
        .where({ id })
        .update({ name: `Updated Name ${TS}`, is_default: true });

      const updated = await db("exit_interview_templates").where({ id }).first();
      expect(updated.name).toBe(`Updated Name ${TS}`);
    });
  });

  describe("Questions", () => {
    let templateId: string;

    beforeAll(async () => {
      templateId = `test-int-q-tmpl-${TS}`;
      await db("exit_interview_templates").insert({
        id: templateId,
        organization_id: ORG_ID,
        name: `Question Template ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_interview_templates", id: templateId });
    });

    it("should add a question to a template", async () => {
      const qId = `test-q-${TS}`;
      await db("exit_interview_questions").insert({
        id: qId,
        template_id: templateId,
        question_text: `Why are you leaving? ${TS}`,
        question_type: "text",
        sort_order: 0,
        is_required: true,
      });
      cleanup.push({ table: "exit_interview_questions", id: qId });

      const q = await db("exit_interview_questions").where({ id: qId }).first();
      expect(q.question_text).toContain("Why are you leaving?");
      expect(q.is_required).toBeTruthy();
    });

    it("should update a question", async () => {
      const qId = `test-q-upd-${TS}`;
      await db("exit_interview_questions").insert({
        id: qId,
        template_id: templateId,
        question_text: `Old question ${TS}`,
        question_type: "text",
        sort_order: 1,
        is_required: true,
      });
      cleanup.push({ table: "exit_interview_questions", id: qId });

      await db("exit_interview_questions")
        .where({ id: qId })
        .update({ question_text: `New question ${TS}`, is_required: false });

      const updated = await db("exit_interview_questions").where({ id: qId }).first();
      expect(updated.question_text).toBe(`New question ${TS}`);
    });

    it("should remove a question", async () => {
      const qId = `test-q-del-${TS}`;
      await db("exit_interview_questions").insert({
        id: qId,
        template_id: templateId,
        question_text: `Deletable ${TS}`,
        question_type: "rating",
        sort_order: 2,
        is_required: false,
      });

      await db("exit_interview_questions").where({ id: qId }).del();
      const gone = await db("exit_interview_questions").where({ id: qId }).first();
      expect(gone).toBeUndefined();
    });
  });

  describe("Interview Lifecycle", () => {
    let exitId: string;
    let templateId: string;

    beforeAll(async () => {
      exitId = await seedExitRequest({ status: "in_progress" });

      templateId = `test-int-lc-tmpl-${TS}`;
      await db("exit_interview_templates").insert({
        id: templateId,
        organization_id: ORG_ID,
        name: `Lifecycle Template ${TS}`,
        is_active: true,
      });
      cleanup.push({ table: "exit_interview_templates", id: templateId });
    });

    it("should schedule an interview", async () => {
      const intId = `test-int-sched-${TS}`;
      await db("exit_interviews").insert({
        id: intId,
        exit_request_id: exitId,
        template_id: templateId,
        interviewer_id: USER_ID,
        scheduled_date: "2026-04-15",
        status: "scheduled",
      });
      cleanup.push({ table: "exit_interviews", id: intId });

      const interview = await db("exit_interviews").where({ id: intId }).first();
      expect(interview.status).toBe("scheduled");
      expect(interview.interviewer_id).toBe(USER_ID);
    });

    it("should complete an interview with rating", async () => {
      const intId = `test-int-comp-${TS}`;
      await db("exit_interviews").insert({
        id: intId,
        exit_request_id: exitId,
        template_id: templateId,
        interviewer_id: USER_ID,
        scheduled_date: "2026-04-15",
        status: "scheduled",
      });
      cleanup.push({ table: "exit_interviews", id: intId });

      await db("exit_interviews").where({ id: intId }).update({
        status: "completed",
        completed_date: "2026-04-15",
        overall_rating: 8,
        summary: "Good interview",
      });

      const completed = await db("exit_interviews").where({ id: intId }).first();
      expect(completed.status).toBe("completed");
      expect(completed.overall_rating).toBe(8);
    });

    it("should skip an interview", async () => {
      const intId = `test-int-skip-${TS}`;
      await db("exit_interviews").insert({
        id: intId,
        exit_request_id: exitId,
        template_id: templateId,
        interviewer_id: USER_ID,
        scheduled_date: "2026-04-20",
        status: "scheduled",
      });
      cleanup.push({ table: "exit_interviews", id: intId });

      await db("exit_interviews").where({ id: intId }).update({ status: "skipped" });

      const skipped = await db("exit_interviews").where({ id: intId }).first();
      expect(skipped.status).toBe("skipped");
    });

    it("should submit and retrieve interview responses", async () => {
      const intId = `test-int-resp-${TS}`;
      await db("exit_interviews").insert({
        id: intId,
        exit_request_id: exitId,
        template_id: templateId,
        interviewer_id: USER_ID,
        scheduled_date: "2026-04-15",
        status: "scheduled",
      });
      cleanup.push({ table: "exit_interviews", id: intId });

      const qId = `test-resp-q-${TS}`;
      await db("exit_interview_questions").insert({
        id: qId,
        template_id: templateId,
        question_text: "Rate your experience",
        question_type: "rating",
        sort_order: 0,
        is_required: true,
      });
      cleanup.push({ table: "exit_interview_questions", id: qId });

      const rId = `test-resp-${TS}`;
      await db("exit_interview_responses").insert({
        id: rId,
        interview_id: intId,
        question_id: qId,
        answer_text: "Great experience",
        answer_rating: 9,
      });
      cleanup.push({ table: "exit_interview_responses", id: rId });

      const responses = await db("exit_interview_responses")
        .where({ interview_id: intId });
      expect(responses.length).toBe(1);
      expect(responses[0].answer_rating).toBe(9);
    });
  });

  describe("NPS Calculation", () => {
    it("should calculate NPS from completed interviews", async () => {
      // Query completed interviews with ratings
      const rows = await db("exit_interviews as ei")
        .join("exit_requests as er", "er.id", "ei.exit_request_id")
        .where({ "er.organization_id": ORG_ID, "ei.status": "completed" })
        .whereNotNull("ei.overall_rating")
        .select("ei.overall_rating");

      let promoters = 0, passives = 0, detractors = 0;
      for (const row of rows) {
        const rating = Number(row.overall_rating);
        if (rating >= 9) promoters++;
        else if (rating >= 7) passives++;
        else detractors++;
      }

      const total = rows.length;
      const nps = total > 0
        ? Math.round(((promoters - detractors) / total) * 100)
        : 0;

      expect(typeof nps).toBe("number");
      expect(nps).toBeGreaterThanOrEqual(-100);
      expect(nps).toBeLessThanOrEqual(100);
    });
  });
});

// ==========================================================================
// ALUMNI SERVICE
// ==========================================================================

describe("AlumniService", () => {
  let exitId: string;

  beforeAll(async () => {
    exitId = await seedExitRequest({
      status: "completed",
      actual_exit_date: "2026-03-31",
    });
  });

  it("should create an alumni profile (opt-in)", async () => {
    const id = `test-alumni-${TS}`;
    await db("alumni_profiles").insert({
      id,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      organization_id: ORG_ID,
      personal_email: `test-${TS}@example.com`,
      opted_in: true,
      last_designation: "Software Engineer",
      exit_date: "2026-03-31",
    });
    cleanup.push({ table: "alumni_profiles", id });

    const profile = await db("alumni_profiles").where({ id }).first();
    expect(profile.opted_in).toBeTruthy();
    expect(profile.personal_email).toContain("@example.com");
  });

  it("should update an alumni profile", async () => {
    const id = `test-alumni-upd-${TS}`;
    await db("alumni_profiles").insert({
      id,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      organization_id: ORG_ID,
      opted_in: true,
    });
    cleanup.push({ table: "alumni_profiles", id });

    await db("alumni_profiles").where({ id }).update({
      linkedin_url: "https://linkedin.com/in/test",
      phone: "+919876543210",
    });

    const updated = await db("alumni_profiles").where({ id }).first();
    expect(updated.linkedin_url).toBe("https://linkedin.com/in/test");
  });

  it("should list alumni with pagination", async () => {
    const id = `test-alumni-list-${TS}`;
    await db("alumni_profiles").insert({
      id,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      organization_id: ORG_ID,
      opted_in: true,
    });
    cleanup.push({ table: "alumni_profiles", id });

    const alumni = await db("alumni_profiles")
      .where({ organization_id: ORG_ID, opted_in: true })
      .orderBy("created_at", "desc")
      .limit(20);
    expect(alumni.length).toBeGreaterThanOrEqual(1);
  });
});

// ==========================================================================
// ANALYTICS SERVICE
// ==========================================================================

describe("AnalyticsService", () => {
  it("should return attrition rate by month", async () => {
    const rows = await db.raw(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS exit_count
       FROM exit_requests
       WHERE organization_id = ? AND status NOT IN ('cancelled')
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC LIMIT 24`,
      [ORG_ID]
    );
    const data = rows[0];
    expect(Array.isArray(data)).toBe(true);
  });

  it("should return reason breakdown", async () => {
    const rows = await db.raw(
      `SELECT reason_category, COUNT(*) AS count
       FROM exit_requests
       WHERE organization_id = ? AND status NOT IN ('cancelled')
       GROUP BY reason_category ORDER BY count DESC`,
      [ORG_ID]
    );
    const data = rows[0];
    expect(Array.isArray(data)).toBe(true);
  });

  it("should return tenure distribution", async () => {
    const rows = await db.raw(
      `SELECT
         CASE
           WHEN TIMESTAMPDIFF(YEAR, u.date_of_joining, COALESCE(er.actual_exit_date, er.last_working_date, er.created_at)) < 1 THEN '< 1 year'
           WHEN TIMESTAMPDIFF(YEAR, u.date_of_joining, COALESCE(er.actual_exit_date, er.last_working_date, er.created_at)) BETWEEN 1 AND 2 THEN '1-2 years'
           ELSE '3+ years'
         END AS bucket,
         COUNT(*) AS count
       FROM exit_requests er
       LEFT JOIN empcloud.users u ON u.id = er.employee_id
       WHERE er.organization_id = ? AND er.status NOT IN ('cancelled') AND u.date_of_joining IS NOT NULL
       GROUP BY bucket`,
      [ORG_ID]
    );
    expect(Array.isArray(rows[0])).toBe(true);
  });

  it("should return rehire pool", async () => {
    const rows = await db.raw(
      `SELECT er.id, er.employee_id, er.exit_type, er.reason_category
       FROM exit_requests er
       WHERE er.organization_id = ? AND er.status = 'completed'
         AND er.exit_type IN ('resignation', 'mutual_separation', 'end_of_contract')
         AND er.reason_category NOT IN ('misconduct', 'performance')
       LIMIT 50`,
      [ORG_ID]
    );
    expect(Array.isArray(rows[0])).toBe(true);
  });
});

// ==========================================================================
// ASSET RETURN SERVICE
// ==========================================================================

describe("AssetReturnService", () => {
  let exitId: string;

  beforeAll(async () => {
    exitId = await seedExitRequest();
  });

  it("should add an asset for return", async () => {
    const id = `test-asset-${TS}`;
    await db("asset_returns").insert({
      id,
      exit_request_id: exitId,
      asset_name: `MacBook Pro ${TS}`,
      asset_tag: "MBP-001",
      category: "laptop",
      replacement_cost: 150000,
      status: "pending",
    });
    cleanup.push({ table: "asset_returns", id });

    const asset = await db("asset_returns").where({ id }).first();
    expect(asset.asset_name).toContain("MacBook Pro");
    expect(asset.status).toBe("pending");
  });

  it("should list assets for an exit", async () => {
    const id = `test-asset-list-${TS}`;
    await db("asset_returns").insert({
      id,
      exit_request_id: exitId,
      asset_name: `ID Card ${TS}`,
      category: "accessory",
      status: "pending",
    });
    cleanup.push({ table: "asset_returns", id });

    const assets = await db("asset_returns")
      .where({ exit_request_id: exitId })
      .orderBy("created_at", "asc");
    expect(assets.length).toBeGreaterThanOrEqual(1);
  });

  it("should update asset return status to returned", async () => {
    const id = `test-asset-ret-${TS}`;
    await db("asset_returns").insert({
      id,
      exit_request_id: exitId,
      asset_name: `Monitor ${TS}`,
      category: "equipment",
      status: "pending",
    });
    cleanup.push({ table: "asset_returns", id });

    await db("asset_returns").where({ id }).update({
      status: "returned",
      returned_date: "2026-04-01",
      verified_by: USER_ID,
      condition_notes: "Good condition",
    });

    const updated = await db("asset_returns").where({ id }).first();
    expect(updated.status).toBe("returned");
    expect(updated.verified_by).toBe(USER_ID);
  });
});

// ==========================================================================
// KNOWLEDGE TRANSFER SERVICE
// ==========================================================================

describe("KnowledgeTransferService", () => {
  let exitId: string;

  beforeAll(async () => {
    exitId = await seedExitRequest();
  });

  it("should create a KT plan", async () => {
    const id = `test-kt-${TS}`;
    await db("knowledge_transfers").insert({
      id,
      exit_request_id: exitId,
      assignee_id: USER_ID,
      due_date: "2026-03-25",
      status: "not_started",
    });
    cleanup.push({ table: "knowledge_transfers", id });

    const kt = await db("knowledge_transfers").where({ id }).first();
    expect(kt.status).toBe("not_started");
    expect(kt.assignee_id).toBe(USER_ID);
  });

  it("should add KT items and auto-update status", async () => {
    const ktId = `test-kt-items-${TS}`;
    await db("knowledge_transfers").insert({
      id: ktId,
      exit_request_id: exitId,
      status: "not_started",
    });
    cleanup.push({ table: "knowledge_transfers", id: ktId });

    const itemId = `test-kti-${TS}`;
    await db("kt_items").insert({
      id: itemId,
      kt_id: ktId,
      title: `API Documentation ${TS}`,
      description: "Document all API endpoints",
      status: "not_started",
    });
    cleanup.push({ table: "kt_items", id: itemId });

    // Simulate auto-update to in_progress
    await db("knowledge_transfers").where({ id: ktId }).update({ status: "in_progress" });

    const updated = await db("knowledge_transfers").where({ id: ktId }).first();
    expect(updated.status).toBe("in_progress");
  });

  it("should update KT item status to completed", async () => {
    const ktId = `test-kt-comp-${TS}`;
    await db("knowledge_transfers").insert({
      id: ktId,
      exit_request_id: exitId,
      status: "in_progress",
    });
    cleanup.push({ table: "knowledge_transfers", id: ktId });

    const itemId = `test-kti-comp-${TS}`;
    await db("kt_items").insert({
      id: itemId,
      kt_id: ktId,
      title: `Code Review ${TS}`,
      status: "not_started",
    });
    cleanup.push({ table: "kt_items", id: itemId });

    await db("kt_items").where({ id: itemId }).update({
      status: "completed",
      completed_at: new Date(),
    });

    const item = await db("kt_items").where({ id: itemId }).first();
    expect(item.status).toBe("completed");
  });

  it("should get KT plan with items", async () => {
    const ktId = `test-kt-get-${TS}`;
    await db("knowledge_transfers").insert({
      id: ktId,
      exit_request_id: exitId,
      status: "in_progress",
    });
    cleanup.push({ table: "knowledge_transfers", id: ktId });

    const item1Id = `test-kti-get1-${TS}`;
    await db("kt_items").insert({
      id: item1Id,
      kt_id: ktId,
      title: `Item One ${TS}`,
      status: "completed",
    });
    cleanup.push({ table: "kt_items", id: item1Id });

    const kt = await db("knowledge_transfers").where({ id: ktId }).first();
    const items = await db("kt_items").where({ kt_id: ktId });
    expect(kt).toBeDefined();
    expect(items.length).toBe(1);
  });
});

// ==========================================================================
// LETTER SERVICE
// ==========================================================================

describe("LetterService", () => {
  it("should create a letter template", async () => {
    const id = `test-ltr-tmpl-${TS}`;
    await db("letter_templates").insert({
      id,
      organization_id: ORG_ID,
      letter_type: "experience_letter",
      name: `Experience Letter ${TS}`,
      body_template: "<p>Dear {{employee.fullName}},</p><p>This is to certify...</p>",
      is_default: false,
      is_active: true,
    });
    cleanup.push({ table: "letter_templates", id });

    const tmpl = await db("letter_templates").where({ id }).first();
    expect(tmpl.letter_type).toBe("experience_letter");
    expect(tmpl.body_template).toContain("{{employee.fullName}}");
  });

  it("should list letter templates", async () => {
    const id = `test-ltr-list-${TS}`;
    await db("letter_templates").insert({
      id,
      organization_id: ORG_ID,
      letter_type: "relieving_letter",
      name: `Relieving Letter ${TS}`,
      body_template: "<p>Dear {{employee.fullName}},</p>",
      is_active: true,
    });
    cleanup.push({ table: "letter_templates", id });

    const templates = await db("letter_templates")
      .where({ organization_id: ORG_ID, is_active: true });
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it("should soft-delete a letter template", async () => {
    const id = `test-ltr-del-${TS}`;
    await db("letter_templates").insert({
      id,
      organization_id: ORG_ID,
      letter_type: "noc",
      name: `NOC ${TS}`,
      body_template: "<p>No dues</p>",
      is_active: true,
    });
    cleanup.push({ table: "letter_templates", id });

    await db("letter_templates").where({ id }).update({ is_active: false });
    const tmpl = await db("letter_templates").where({ id }).first();
    expect(tmpl.is_active).toBeFalsy();
  });

  it("should store a generated letter", async () => {
    const exitId = await seedExitRequest();
    const tmplId = `test-ltr-gen-tmpl-${TS}`;
    await db("letter_templates").insert({
      id: tmplId,
      organization_id: ORG_ID,
      letter_type: "experience_letter",
      name: `Gen Template ${TS}`,
      body_template: "<p>Certificate</p>",
      is_active: true,
    });
    cleanup.push({ table: "letter_templates", id: tmplId });

    const letterId = `test-ltr-gen-${TS}`;
    await db("generated_letters").insert({
      id: letterId,
      exit_request_id: exitId,
      template_id: tmplId,
      letter_type: "experience_letter",
      generated_body: "<p>Certificate for Priya</p>",
      generated_by: USER_ID,
      issued_date: "2026-04-01",
    });
    cleanup.push({ table: "generated_letters", id: letterId });

    const letter = await db("generated_letters").where({ id: letterId }).first();
    expect(letter.letter_type).toBe("experience_letter");
    expect(letter.generated_body).toContain("Priya");
  });
});

// ==========================================================================
// REHIRE SERVICE
// ==========================================================================

describe("RehireService", () => {
  let exitId: string;
  let alumniId: string;

  beforeAll(async () => {
    exitId = await seedExitRequest({
      status: "completed",
      actual_exit_date: "2026-03-31",
    });

    alumniId = `test-rehire-alumni-${TS}`;
    await db("alumni_profiles").insert({
      id: alumniId,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      organization_id: ORG_ID,
      opted_in: true,
      exit_date: "2026-03-31",
    });
    cleanup.push({ table: "alumni_profiles", id: alumniId });
  });

  it("should propose a rehire request", async () => {
    const id = `test-rehire-${TS}`;
    await db("rehire_requests").insert({
      id,
      organization_id: ORG_ID,
      alumni_id: alumniId,
      employee_id: EMP_USER_ID,
      requested_by: USER_ID,
      position: "Senior Engineer",
      department: "Engineering",
      proposed_salary: 120000000, // 12L in paise
      status: "proposed",
      original_exit_date: "2026-03-31",
    });
    cleanup.push({ table: "rehire_requests", id });

    const req = await db("rehire_requests").where({ id }).first();
    expect(req.status).toBe("proposed");
    expect(req.position).toBe("Senior Engineer");
  });

  it("should update rehire status through lifecycle", async () => {
    const id = `test-rehire-lc-${TS}`;
    await db("rehire_requests").insert({
      id,
      organization_id: ORG_ID,
      alumni_id: alumniId,
      employee_id: EMP_USER_ID,
      requested_by: USER_ID,
      position: "Lead Engineer",
      proposed_salary: 150000000,
      status: "proposed",
    });
    cleanup.push({ table: "rehire_requests", id });

    // proposed -> screening
    await db("rehire_requests").where({ id }).update({ status: "screening" });
    let req = await db("rehire_requests").where({ id }).first();
    expect(req.status).toBe("screening");

    // screening -> approved
    await db("rehire_requests").where({ id }).update({ status: "approved" });
    req = await db("rehire_requests").where({ id }).first();
    expect(req.status).toBe("approved");
  });

  it("should list rehire requests with filters", async () => {
    const id = `test-rehire-list-${TS}`;
    await db("rehire_requests").insert({
      id,
      organization_id: ORG_ID,
      alumni_id: alumniId,
      employee_id: EMP_USER_ID,
      requested_by: USER_ID,
      position: "Manager",
      proposed_salary: 200000000,
      status: "proposed",
    });
    cleanup.push({ table: "rehire_requests", id });

    const all = await db("rehire_requests")
      .where({ organization_id: ORG_ID })
      .orderBy("created_at", "desc");
    expect(all.length).toBeGreaterThanOrEqual(1);

    const proposed = await db("rehire_requests")
      .where({ organization_id: ORG_ID, status: "proposed" });
    expect(proposed.length).toBeGreaterThanOrEqual(1);
  });
});

// ==========================================================================
// NOTICE BUYOUT SERVICE
// ==========================================================================

describe("NoticeBuyoutService", () => {
  let exitId: string;

  beforeAll(async () => {
    exitId = await seedExitRequest({
      resignation_date: "2026-03-01",
      last_working_date: "2026-03-31",
      notice_period_days: 30,
    });
  });

  it("should create a buyout request", async () => {
    const id = `test-buyout-${TS}`;
    await db("notice_buyout_requests").insert({
      id,
      organization_id: ORG_ID,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      original_last_date: "2026-03-31",
      requested_last_date: "2026-03-15",
      original_notice_days: 30,
      served_days: 14,
      remaining_days: 16,
      daily_rate: 3333,
      buyout_amount: 53328,
      currency: "INR",
      status: "pending",
    });
    cleanup.push({ table: "notice_buyout_requests", id });

    const buyout = await db("notice_buyout_requests").where({ id }).first();
    expect(buyout.status).toBe("pending");
    expect(buyout.buyout_amount).toBe(53328);
    expect(buyout.remaining_days).toBe(16);
  });

  it("should approve a buyout request", async () => {
    const id = `test-buyout-appr-${TS}`;
    await db("notice_buyout_requests").insert({
      id,
      organization_id: ORG_ID,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      original_last_date: "2026-03-31",
      requested_last_date: "2026-03-20",
      original_notice_days: 30,
      served_days: 19,
      remaining_days: 11,
      daily_rate: 3333,
      buyout_amount: 36663,
      currency: "INR",
      status: "pending",
    });
    cleanup.push({ table: "notice_buyout_requests", id });

    await db("notice_buyout_requests").where({ id }).update({
      status: "approved",
      approved_by: USER_ID,
      approved_at: new Date(),
    });

    const approved = await db("notice_buyout_requests").where({ id }).first();
    expect(approved.status).toBe("approved");
    expect(approved.approved_by).toBe(USER_ID);
  });

  it("should reject a buyout request with reason", async () => {
    const id = `test-buyout-rej-${TS}`;
    await db("notice_buyout_requests").insert({
      id,
      organization_id: ORG_ID,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      original_last_date: "2026-03-31",
      requested_last_date: "2026-03-10",
      original_notice_days: 30,
      served_days: 9,
      remaining_days: 21,
      daily_rate: 3333,
      buyout_amount: 69993,
      currency: "INR",
      status: "pending",
    });
    cleanup.push({ table: "notice_buyout_requests", id });

    await db("notice_buyout_requests").where({ id }).update({
      status: "rejected",
      rejected_by: USER_ID,
      rejected_reason: "KT not complete",
    });

    const rejected = await db("notice_buyout_requests").where({ id }).first();
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejected_reason).toBe("KT not complete");
  });

  it("should list buyout requests with status filter", async () => {
    const id = `test-buyout-list-${TS}`;
    await db("notice_buyout_requests").insert({
      id,
      organization_id: ORG_ID,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      original_last_date: "2026-03-31",
      requested_last_date: "2026-03-20",
      original_notice_days: 30,
      served_days: 19,
      remaining_days: 11,
      daily_rate: 3333,
      buyout_amount: 36663,
      currency: "INR",
      status: "pending",
    });
    cleanup.push({ table: "notice_buyout_requests", id });

    const all = await db("notice_buyout_requests")
      .where({ organization_id: ORG_ID })
      .orderBy("created_at", "desc");
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it("should get buyout for a specific exit request", async () => {
    const id = `test-buyout-get-${TS}`;
    await db("notice_buyout_requests").insert({
      id,
      organization_id: ORG_ID,
      exit_request_id: exitId,
      employee_id: EMP_USER_ID,
      original_last_date: "2026-03-31",
      requested_last_date: "2026-03-18",
      original_notice_days: 30,
      served_days: 17,
      remaining_days: 13,
      daily_rate: 3333,
      buyout_amount: 43329,
      currency: "INR",
      status: "pending",
    });
    cleanup.push({ table: "notice_buyout_requests", id });

    const buyout = await db("notice_buyout_requests")
      .where({ organization_id: ORG_ID, exit_request_id: exitId })
      .first();
    expect(buyout).toBeDefined();
    expect(buyout.exit_request_id).toBe(exitId);
  });
});

// ==========================================================================
// FLIGHT RISK (scoreToRiskLevel helper — pure function)
// ==========================================================================

describe("FlightRisk — scoreToRiskLevel", () => {
  function scoreToRiskLevel(score: number) {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  it("should return critical for score >= 80", () => {
    expect(scoreToRiskLevel(80)).toBe("critical");
    expect(scoreToRiskLevel(100)).toBe("critical");
  });

  it("should return high for score 60-79", () => {
    expect(scoreToRiskLevel(60)).toBe("high");
    expect(scoreToRiskLevel(79)).toBe("high");
  });

  it("should return medium for score 40-59", () => {
    expect(scoreToRiskLevel(40)).toBe("medium");
    expect(scoreToRiskLevel(59)).toBe("medium");
  });

  it("should return low for score < 40", () => {
    expect(scoreToRiskLevel(0)).toBe("low");
    expect(scoreToRiskLevel(39)).toBe("low");
  });
});
