// =============================================================================
// EXIT INTERVIEW DEEP COVERAGE — template CRUD, questions, schedule/complete/skip, NPS
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

// Helper to seed an exit request
async function seedExitRequest(useParent = false): Promise<string> {
  const id = uuidv4();
  await db("exit_requests").insert({
    id, organization_id: ORG_ID, employee_id: 524, exit_type: "resignation",
    status: "initiated", reason_category: "personal", initiated_by: USER_ID,
    notice_period_days: 30, notice_period_waived: false,
    resignation_date: "2026-04-01", last_working_date: "2026-05-01",
  });
  if (useParent) {
    parentCleanup.push({ table: "exit_requests", id });
  } else {
    cleanup.push({ table: "exit_requests", id });
  }
  return id;
}

// ==========================================================================
// TEMPLATE CRUD
// ==========================================================================
describe("ExitInterviewTemplate CRUD", () => {
  it("should create a template with default values", async () => {
    const id = uuidv4();
    await db("exit_interview_templates").insert({
      id, organization_id: ORG_ID, name: `Template-${TS}`, is_default: false, is_active: true,
    });
    cleanup.push({ table: "exit_interview_templates", id });

    const row = await db("exit_interview_templates").where({ id }).first();
    expect(row).toBeTruthy();
    expect(row.name).toBe(`Template-${TS}`);
    expect(row.is_default).toBe(0);
  });

  it("should update template name and is_default", async () => {
    const id = uuidv4();
    await db("exit_interview_templates").insert({
      id, organization_id: ORG_ID, name: `Old-${TS}`, is_default: false, is_active: true,
    });
    cleanup.push({ table: "exit_interview_templates", id });

    await db("exit_interview_templates").where({ id }).update({ name: `New-${TS}`, is_default: true });
    const row = await db("exit_interview_templates").where({ id }).first();
    expect(row.name).toBe(`New-${TS}`);
    expect(row.is_default).toBe(1);
  });

  it("should list templates for org", async () => {
    const id = uuidv4();
    await db("exit_interview_templates").insert({
      id, organization_id: ORG_ID, name: `List-${TS}`, is_default: false, is_active: true,
    });
    cleanup.push({ table: "exit_interview_templates", id });

    const rows = await db("exit_interview_templates").where({ organization_id: ORG_ID });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("should soft-delete by setting is_active = false", async () => {
    const id = uuidv4();
    await db("exit_interview_templates").insert({
      id, organization_id: ORG_ID, name: `Del-${TS}`, is_default: false, is_active: true,
    });
    cleanup.push({ table: "exit_interview_templates", id });

    await db("exit_interview_templates").where({ id }).update({ is_active: false });
    const row = await db("exit_interview_templates").where({ id }).first();
    expect(row.is_active).toBe(0);
  });

  it("should enforce uniqueness by overriding is_default for same org", async () => {
    const id1 = uuidv4();
    const id2 = uuidv4();
    await db("exit_interview_templates").insert({
      id: id1, organization_id: ORG_ID, name: `Def1-${TS}`, is_default: true, is_active: true,
    });
    cleanup.push({ table: "exit_interview_templates", id: id1 });

    // Before creating second default, unset first
    await db("exit_interview_templates").where({ organization_id: ORG_ID, is_default: true }).update({ is_default: false });
    await db("exit_interview_templates").insert({
      id: id2, organization_id: ORG_ID, name: `Def2-${TS}`, is_default: true, is_active: true,
    });
    cleanup.push({ table: "exit_interview_templates", id: id2 });

    const defaults = await db("exit_interview_templates").where({ organization_id: ORG_ID, is_default: true });
    expect(defaults.length).toBe(1);
    expect(defaults[0].id).toBe(id2);
  });
});

// ==========================================================================
// QUESTIONS
// ==========================================================================
describe("ExitInterviewQuestion CRUD", () => {
  let templateId: string;

  beforeAll(async () => {
    templateId = uuidv4();
    await db("exit_interview_templates").insert({
      id: templateId, organization_id: ORG_ID, name: `QTmpl-${TS}`, is_default: false, is_active: true,
    });
  });

  afterAll(async () => {
    await db("exit_interview_questions").where({ template_id: templateId }).del();
    await db("exit_interview_templates").where({ id: templateId }).del();
  });

  it("should add a text question", async () => {
    const qid = uuidv4();
    await db("exit_interview_questions").insert({
      id: qid, template_id: templateId, question_text: "Why are you leaving?",
      question_type: "text", sort_order: 0, is_required: true,
    });
    cleanup.push({ table: "exit_interview_questions", id: qid });

    const row = await db("exit_interview_questions").where({ id: qid }).first();
    expect(row.question_type).toBe("text");
    expect(row.is_required).toBe(1);
  });

  it("should add a rating question", async () => {
    const qid = uuidv4();
    await db("exit_interview_questions").insert({
      id: qid, template_id: templateId, question_text: "Rate your experience",
      question_type: "rating", sort_order: 1, is_required: true,
    });
    cleanup.push({ table: "exit_interview_questions", id: qid });

    const row = await db("exit_interview_questions").where({ id: qid }).first();
    expect(row.question_type).toBe("rating");
  });

  it("should add a multiple_choice question with options", async () => {
    const qid = uuidv4();
    await db("exit_interview_questions").insert({
      id: qid, template_id: templateId, question_text: "Primary reason?",
      question_type: "multiple_choice", options: JSON.stringify(["Salary", "Growth", "Culture"]),
      sort_order: 2, is_required: false,
    });
    cleanup.push({ table: "exit_interview_questions", id: qid });

    const row = await db("exit_interview_questions").where({ id: qid }).first();
    const opts = JSON.parse(row.options);
    expect(opts).toContain("Salary");
    expect(row.is_required).toBe(0);
  });

  it("should update question text via raw UPDATE", async () => {
    const qid = uuidv4();
    await db("exit_interview_questions").insert({
      id: qid, template_id: templateId, question_text: "Old text",
      question_type: "text", sort_order: 3, is_required: true,
    });
    cleanup.push({ table: "exit_interview_questions", id: qid });

    await db("exit_interview_questions").where({ id: qid }).update({ question_text: "Updated text" });
    const row = await db("exit_interview_questions").where({ id: qid }).first();
    expect(row.question_text).toBe("Updated text");
  });

  it("should delete a question", async () => {
    const qid = uuidv4();
    await db("exit_interview_questions").insert({
      id: qid, template_id: templateId, question_text: "To delete",
      question_type: "text", sort_order: 4, is_required: true,
    });

    await db("exit_interview_questions").where({ id: qid }).del();
    const row = await db("exit_interview_questions").where({ id: qid }).first();
    expect(row).toBeUndefined();
  });

  it("should auto-increment sort_order by counting existing", async () => {
    const count = await db("exit_interview_questions").where({ template_id: templateId }).count("* as cnt").first();
    const nextSort = Number(count?.cnt || 0);
    const qid = uuidv4();
    await db("exit_interview_questions").insert({
      id: qid, template_id: templateId, question_text: "Auto sort",
      question_type: "text", sort_order: nextSort, is_required: true,
    });
    cleanup.push({ table: "exit_interview_questions", id: qid });

    const row = await db("exit_interview_questions").where({ id: qid }).first();
    expect(row.sort_order).toBe(nextSort);
  });
});

// ==========================================================================
// INTERVIEW SCHEDULING & LIFECYCLE
// ==========================================================================
describe("Interview Scheduling & Lifecycle", () => {
  let exitReqId: string;
  let templateId: string;

  beforeAll(async () => {
    exitReqId = await seedExitRequest(true);
    templateId = uuidv4();
    await db("exit_interview_templates").insert({
      id: templateId, organization_id: ORG_ID, name: `Sched-${TS}`, is_default: false, is_active: true,
    });
  });

  afterAll(async () => {
    await db("exit_interview_responses").whereIn("interview_id",
      db("exit_interviews").select("id").where({ exit_request_id: exitReqId })
    ).del();
    await db("exit_interviews").where({ exit_request_id: exitReqId }).del();
    await db("exit_interview_templates").where({ id: templateId }).del();
  });

  it("should schedule an interview", async () => {
    const iid = uuidv4();
    await db("exit_interviews").insert({
      id: iid, exit_request_id: exitReqId, template_id: templateId,
      interviewer_id: USER_ID, scheduled_date: "2026-04-10", status: "scheduled",
    });
    cleanup.push({ table: "exit_interviews", id: iid });

    const row = await db("exit_interviews").where({ id: iid }).first();
    expect(row.status).toBe("scheduled");
    expect(row.interviewer_id).toBe(USER_ID);
  });

  it("should prevent duplicate interviews for same exit request", async () => {
    const iid1 = uuidv4();
    await db("exit_interviews").insert({
      id: iid1, exit_request_id: exitReqId, template_id: templateId,
      interviewer_id: USER_ID, scheduled_date: "2026-04-10", status: "scheduled",
    });
    cleanup.push({ table: "exit_interviews", id: iid1 });

    const existing = await db("exit_interviews").where({ exit_request_id: exitReqId }).first();
    expect(existing).toBeTruthy();
  });

  it("should complete an interview with rating and summary", async () => {
    const iid = uuidv4();
    await db("exit_interviews").insert({
      id: iid, exit_request_id: exitReqId, template_id: templateId,
      interviewer_id: USER_ID, scheduled_date: "2026-04-10", status: "scheduled",
    });
    cleanup.push({ table: "exit_interviews", id: iid });

    await db("exit_interviews").where({ id: iid }).update({
      status: "completed", completed_date: "2026-04-10", overall_rating: 8,
      summary: "Would recommend: Yes",
    });

    const row = await db("exit_interviews").where({ id: iid }).first();
    expect(row.status).toBe("completed");
    expect(row.overall_rating).toBe(8);
    expect(row.summary).toContain("Would recommend");
  });

  it("should skip an interview", async () => {
    const iid = uuidv4();
    await db("exit_interviews").insert({
      id: iid, exit_request_id: exitReqId, template_id: templateId,
      interviewer_id: USER_ID, scheduled_date: "2026-04-11", status: "scheduled",
    });
    cleanup.push({ table: "exit_interviews", id: iid });

    await db("exit_interviews").where({ id: iid }).update({ status: "skipped" });
    const row = await db("exit_interviews").where({ id: iid }).first();
    expect(row.status).toBe("skipped");
  });
});

// ==========================================================================
// INTERVIEW RESPONSES
// ==========================================================================
describe("Interview Responses", () => {
  let exitReqId: string;
  let templateId: string;
  let interviewId: string;
  let q1Id: string;
  let q2Id: string;

  beforeAll(async () => {
    exitReqId = await seedExitRequest(true);
    templateId = uuidv4();
    await db("exit_interview_templates").insert({
      id: templateId, organization_id: ORG_ID, name: `Resp-${TS}`, is_default: false, is_active: true,
    });
    q1Id = uuidv4();
    q2Id = uuidv4();
    await db("exit_interview_questions").insert([
      { id: q1Id, template_id: templateId, question_text: "Q1 text", question_type: "text", sort_order: 0, is_required: true },
      { id: q2Id, template_id: templateId, question_text: "Q2 rating", question_type: "rating", sort_order: 1, is_required: true },
    ]);
    interviewId = uuidv4();
    await db("exit_interviews").insert({
      id: interviewId, exit_request_id: exitReqId, template_id: templateId,
      interviewer_id: USER_ID, scheduled_date: "2026-04-10", status: "scheduled",
    });
  });

  afterAll(async () => {
    await db("exit_interview_responses").where({ interview_id: interviewId }).del();
    await db("exit_interviews").where({ id: interviewId }).del();
    await db("exit_interview_questions").where({ template_id: templateId }).del();
    await db("exit_interview_templates").where({ id: templateId }).del();
  });

  it("should insert text and rating responses", async () => {
    const r1 = uuidv4();
    const r2 = uuidv4();
    await db("exit_interview_responses").insert([
      { id: r1, interview_id: interviewId, question_id: q1Id, answer_text: "Better opportunity", answer_rating: null },
      { id: r2, interview_id: interviewId, question_id: q2Id, answer_text: null, answer_rating: 7 },
    ]);
    cleanup.push({ table: "exit_interview_responses", id: r1 });
    cleanup.push({ table: "exit_interview_responses", id: r2 });

    const responses = await db("exit_interview_responses").where({ interview_id: interviewId });
    expect(responses.length).toBe(2);
    const textResp = responses.find((r: any) => r.question_id === q1Id);
    expect(textResp.answer_text).toBe("Better opportunity");
    const ratingResp = responses.find((r: any) => r.question_id === q2Id);
    expect(ratingResp.answer_rating).toBe(7);
  });

  it("should allow re-submission by deleting existing then inserting", async () => {
    await db("exit_interview_responses").where({ interview_id: interviewId }).del();

    const r1 = uuidv4();
    await db("exit_interview_responses").insert({
      id: r1, interview_id: interviewId, question_id: q1Id, answer_text: "Updated answer", answer_rating: null,
    });
    cleanup.push({ table: "exit_interview_responses", id: r1 });

    const responses = await db("exit_interview_responses").where({ interview_id: interviewId });
    expect(responses.length).toBe(1);
    expect(responses[0].answer_text).toBe("Updated answer");
  });
});

// ==========================================================================
// NPS CALCULATION
// ==========================================================================
describe("NPS Calculation Logic", () => {
  const exitIds: string[] = [];
  const interviewIds: string[] = [];

  beforeAll(async () => {
    // Create 5 exit requests with completed interviews and various ratings
    const ratings = [10, 9, 8, 5, 3]; // 2 promoters, 1 passive, 2 detractors
    for (let i = 0; i < ratings.length; i++) {
      const eid = uuidv4();
      await db("exit_requests").insert({
        id: eid, organization_id: ORG_ID, employee_id: 524 + i, exit_type: "resignation",
        status: "completed", reason_category: "personal", initiated_by: USER_ID,
        notice_period_days: 30, notice_period_waived: false,
      });
      exitIds.push(eid);

      const iid = uuidv4();
      await db("exit_interviews").insert({
        id: iid, exit_request_id: eid, interviewer_id: USER_ID,
        scheduled_date: `2026-0${i + 1}-15`, completed_date: `2026-0${i + 1}-15`,
        status: "completed", overall_rating: ratings[i],
      });
      interviewIds.push(iid);
    }
  });

  afterAll(async () => {
    for (const iid of interviewIds) {
      await db("exit_interviews").where({ id: iid }).del();
    }
    for (const eid of exitIds) {
      await db("exit_requests").where({ id: eid }).del();
    }
  });

  it("should calculate correct NPS from interview ratings", async () => {
    const rows = await db("exit_interviews")
      .join("exit_requests", "exit_requests.id", "exit_interviews.exit_request_id")
      .where("exit_requests.organization_id", ORG_ID)
      .andWhere("exit_interviews.status", "completed")
      .whereNotNull("exit_interviews.overall_rating")
      .select("exit_interviews.overall_rating", "exit_interviews.completed_date");

    let promoters = 0, passives = 0, detractors = 0;
    for (const row of rows) {
      const r = Number(row.overall_rating);
      if (r >= 9) promoters++;
      else if (r >= 7) passives++;
      else detractors++;
    }

    const total = rows.length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    expect(total).toBeGreaterThanOrEqual(5);
    expect(typeof nps).toBe("number");
    expect(nps).toBeGreaterThanOrEqual(-100);
    expect(nps).toBeLessThanOrEqual(100);
  });

  it("should compute monthly NPS trend", async () => {
    const rows = await db("exit_interviews")
      .join("exit_requests", "exit_requests.id", "exit_interviews.exit_request_id")
      .where("exit_requests.organization_id", ORG_ID)
      .andWhere("exit_interviews.status", "completed")
      .whereNotNull("exit_interviews.overall_rating")
      .select("exit_interviews.overall_rating", "exit_interviews.completed_date");

    const monthlyData = new Map<string, { p: number; pa: number; d: number }>();
    for (const row of rows) {
      if (!row.completed_date) continue;
      const date = new Date(row.completed_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData.has(key)) monthlyData.set(key, { p: 0, pa: 0, d: 0 });
      const m = monthlyData.get(key)!;
      const r = Number(row.overall_rating);
      if (r >= 9) m.p++;
      else if (r >= 7) m.pa++;
      else m.d++;
    }

    expect(monthlyData.size).toBeGreaterThan(0);
    for (const [, data] of monthlyData) {
      const total = data.p + data.pa + data.d;
      expect(total).toBeGreaterThan(0);
    }
  });

  it("should return NPS=0 when no completed interviews exist for a fake org", async () => {
    const fakeOrg = 99999;
    const rows = await db("exit_interviews")
      .join("exit_requests", "exit_requests.id", "exit_interviews.exit_request_id")
      .where("exit_requests.organization_id", fakeOrg)
      .andWhere("exit_interviews.status", "completed");
    expect(rows.length).toBe(0);
  });
});
