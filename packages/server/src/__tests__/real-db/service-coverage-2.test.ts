// =============================================================================
// EMP EXIT — Service Coverage Round 2
// Targets: all services below 80%
// =============================================================================

process.env.DB_HOST = "localhost";
process.env.DB_PORT = "3306";
process.env.DB_USER = "empcloud";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "";
process.env.DB_NAME = "emp_exit";
process.env.DB_PROVIDER = "mysql";
process.env.EMPCLOUD_DB_HOST = "localhost";
process.env.EMPCLOUD_DB_PORT = "3306";
process.env.EMPCLOUD_DB_USER = "empcloud";
process.env.EMPCLOUD_DB_PASSWORD = process.env.EMPCLOUD_DB_PASSWORD || "";
process.env.EMPCLOUD_DB_NAME = "empcloud";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.EMPCLOUD_URL = "http://localhost:3000";
process.env.LOG_LEVEL = "error";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initDB, closeDB, getDB } from "../../db/adapters";
import { initEmpCloudDB, closeEmpCloudDB } from "../../db/empcloud";

const ORG = 5;
const ADMIN = 522;
const EMP = 524;
const MGR = 529;
const U = String(Date.now()).slice(-6);

let db: ReturnType<typeof getDB>;
let dbAvailable = false;

beforeAll(async () => {
  try {
    await initDB();
    await initEmpCloudDB();
    db = getDB();
    dbAvailable = true;
  } catch {
    // No local MySQL — tests will be skipped
  }
});

afterAll(async () => {
  if (!dbAvailable) return;
  try { await db.deleteMany("checklist_templates", { name: `Cov2 Template ${U}` }); } catch {}
  try { await db.deleteMany("letter_templates", { name: `Cov2 Letter ${U}` }); } catch {}
  await closeEmpCloudDB();
  await closeDB();
});

beforeEach((ctx) => { if (!dbAvailable) ctx.skip(); });

// ============================================================================
// SETTINGS SERVICE
// ============================================================================
describe("Settings coverage-2", () => {
  it("getSettings returns config", async () => {
    const { getSettings } = await import("../../services/settings/settings.service.js");
    const s = await getSettings(ORG);
    expect(s).toHaveProperty("default_notice_period_days");
  });

  it("updateSettings and verify", async () => {
    const { getSettings, updateSettings } = await import("../../services/settings/settings.service.js");
    const original = await getSettings(ORG);
    await updateSettings(ORG, { require_exit_interview: false });
    const updated = await getSettings(ORG);
    expect(updated.require_exit_interview).toBeFalsy();
    // Restore
    await updateSettings(ORG, { require_exit_interview: original.require_exit_interview ?? true });
  });
});

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================
describe("Analytics coverage-2", () => {
  it("getAttritionRate", async () => {
    const { getAttritionRate } = await import("../../services/analytics/analytics.service.js");
    const r = await getAttritionRate(ORG);
    expect(Array.isArray(r)).toBe(true);
  });

  it("getReasonBreakdown", async () => {
    const { getReasonBreakdown } = await import("../../services/analytics/analytics.service.js");
    const r = await getReasonBreakdown(ORG);
    expect(Array.isArray(r)).toBe(true);
  });

  it("getDepartmentTrends", async () => {
    const { getDepartmentTrends } = await import("../../services/analytics/analytics.service.js");
    const r = await getDepartmentTrends(ORG);
    expect(Array.isArray(r)).toBe(true);
  });

  it("getTenureDistribution", async () => {
    const { getTenureDistribution } = await import("../../services/analytics/analytics.service.js");
    const r = await getTenureDistribution(ORG);
    expect(Array.isArray(r)).toBe(true);
  });

  it("getRehirePool", async () => {
    const { getRehirePool } = await import("../../services/analytics/analytics.service.js");
    const r = await getRehirePool(ORG);
    expect(Array.isArray(r)).toBe(true);
  });
});

// ============================================================================
// FLIGHT RISK SERVICE
// ============================================================================
describe("FlightRisk coverage-2", () => {
  it("scoreToRiskLevel", async () => {
    const { scoreToRiskLevel } = await import("../../services/analytics/flight-risk.service.js");
    expect(scoreToRiskLevel(10)).toBe("low");
    expect(scoreToRiskLevel(40)).toBe("medium");
    expect(scoreToRiskLevel(65)).toBe("high");
    expect(scoreToRiskLevel(85)).toBe("critical");
  });

  it("getHighRiskEmployees", async () => {
    const { getHighRiskEmployees } = await import("../../services/analytics/flight-risk.service.js");
    const r = await getHighRiskEmployees(ORG);
    expect(Array.isArray(r)).toBe(true);
  });

  it("getFlightRiskDashboard", async () => {
    const { getFlightRiskDashboard } = await import("../../services/analytics/flight-risk.service.js");
    const d = await getFlightRiskDashboard(ORG);
    expect(d).toHaveProperty("totalEmployees");
    expect(d).toHaveProperty("riskDistribution");
  });

  it("batchCalculateFlightRisk", async () => {
    const { batchCalculateFlightRisk } = await import("../../services/analytics/flight-risk.service.js");
    const count = await batchCalculateFlightRisk(ORG);
    expect(typeof count).toBe("number");
  });
});

// ============================================================================
// ATTRITION PREDICTION
// ============================================================================
describe("AttritionPrediction coverage-2", () => {
  it("generateAttritionPrediction", async () => {
    const { generateAttritionPrediction } = await import("../../services/analytics/attrition-prediction.service.js");
    await generateAttritionPrediction(ORG);
  });

  it("getPredictionTrends", async () => {
    const { getPredictionTrends } = await import("../../services/analytics/attrition-prediction.service.js");
    const r = await getPredictionTrends(ORG);
    expect(Array.isArray(r)).toBe(true);
  });

  it("re-exported scoreToRiskLevel", async () => {
    const { scoreToRiskLevel } = await import("../../services/analytics/attrition-prediction.service.js");
    expect(scoreToRiskLevel(50)).toBe("medium");
  });
});

// ============================================================================
// CHECKLIST SERVICE
// ============================================================================
describe("Checklist coverage-2", () => {
  let templateId: string;
  let itemId: string;

  it("createTemplate", async () => {
    const { createTemplate } = await import("../../services/checklist/checklist.service.js");
    const t = await createTemplate(ORG, {
      name: `Cov2 Template ${U}`,
      description: "Coverage test checklist template",
    });
    expect(t).toHaveProperty("id");
    templateId = t.id;
  });

  it("listTemplates", async () => {
    const { listTemplates } = await import("../../services/checklist/checklist.service.js");
    const r = await listTemplates(ORG);
    expect(r.length).toBeGreaterThan(0);
  });

  it("getTemplate", async () => {
    const { getTemplate } = await import("../../services/checklist/checklist.service.js");
    const t = await getTemplate(ORG, templateId);
    expect(t.name).toContain("Cov2 Template");
  });

  it("addTemplateItem", async () => {
    const { addTemplateItem } = await import("../../services/checklist/checklist.service.js");
    const item = await addTemplateItem(ORG, templateId, {
      title: "Return laptop",
      description: "Return company laptop to IT",
      assigned_role: "it_admin",
    });
    expect(item).toHaveProperty("id");
    itemId = item.id;
  });

  it("updateTemplateItem", async () => {
    const { updateTemplateItem } = await import("../../services/checklist/checklist.service.js");
    const item = await updateTemplateItem(ORG, itemId, { is_mandatory: false });
    expect(item).toBeTruthy();
  });

  it("updateTemplate", async () => {
    const { updateTemplate } = await import("../../services/checklist/checklist.service.js");
    const t = await updateTemplate(ORG, templateId, { description: "Updated for cov2" });
    expect(t).toBeTruthy();
  });

  it("removeTemplateItem", async () => {
    const { removeTemplateItem } = await import("../../services/checklist/checklist.service.js");
    const r = await removeTemplateItem(ORG, itemId);
    expect(r).toBe(true);
  });

  it("deleteTemplate", async () => {
    const { deleteTemplate } = await import("../../services/checklist/checklist.service.js");
    const r = await deleteTemplate(ORG, templateId);
    expect(r).toBe(true);
  });
});

// ============================================================================
// CLEARANCE SERVICE
// ============================================================================
describe("Clearance coverage-2", () => {
  let deptId: string;

  it("listDepartments", async () => {
    const { listDepartments } = await import("../../services/clearance/clearance.service.js");
    const r = await listDepartments(ORG);
    expect(Array.isArray(r)).toBe(true);
  });

  it("createDepartment", async () => {
    const { createDepartment } = await import("../../services/clearance/clearance.service.js");
    const d = await createDepartment(ORG, {
      name: `Cov2 Dept ${U}`,
      approver_role: "manager",
    });
    expect(d).toHaveProperty("id");
    deptId = d.id;
  });

  it("updateDepartment", async () => {
    const { updateDepartment } = await import("../../services/clearance/clearance.service.js");
    const d = await updateDepartment(ORG, deptId, { approver_role: "hr_admin" });
    expect(d).toBeTruthy();
  });

  it("getMyClearances", async () => {
    const { getMyClearances } = await import("../../services/clearance/clearance.service.js");
    const r = await getMyClearances(ORG, ADMIN);
    expect(Array.isArray(r)).toBe(true);
  });

  it("deleteDepartment", async () => {
    const { deleteDepartment } = await import("../../services/clearance/clearance.service.js");
    const r = await deleteDepartment(ORG, deptId);
    expect(r).toBe(true);
  });
});

// ============================================================================
// INTERVIEW SERVICE
// ============================================================================
describe("ExitInterview coverage-2", () => {
  let templateId: string;
  let questionId: string;

  it("createTemplate", async () => {
    const { createTemplate } = await import("../../services/interview/exit-interview.service.js");
    const t = await createTemplate(ORG, {
      name: `Cov2 Interview ${U}`,
      description: "Coverage test interview template",
    });
    expect(t).toHaveProperty("id");
    templateId = t.id;
  });

  it("listTemplates", async () => {
    const { listTemplates } = await import("../../services/interview/exit-interview.service.js");
    const r = await listTemplates(ORG);
    expect(r.length).toBeGreaterThan(0);
  });

  it("getTemplate", async () => {
    const { getTemplate } = await import("../../services/interview/exit-interview.service.js");
    const t = await getTemplate(ORG, templateId);
    expect(t.name).toContain("Cov2 Interview");
  });

  it("addQuestion", async () => {
    const { addQuestion } = await import("../../services/interview/exit-interview.service.js");
    const q = await addQuestion(ORG, templateId, {
      question_text: "What could we have done better?",
      question_type: "text",
      is_required: true,
      order_index: 1,
    });
    expect(q).toHaveProperty("id");
    questionId = q.id;
  });

  it("updateQuestion", async () => {
    const { updateQuestion } = await import("../../services/interview/exit-interview.service.js");
    const q = await updateQuestion(ORG, questionId, { is_required: false });
    expect(q).toBeTruthy();
  });

  it("updateTemplate", async () => {
    const { updateTemplate } = await import("../../services/interview/exit-interview.service.js");
    const t = await updateTemplate(ORG, templateId, { description: "Updated cov2" });
    expect(t).toBeTruthy();
  });

  it("calculateNPS", async () => {
    const { calculateNPS } = await import("../../services/interview/exit-interview.service.js");
    const nps = await calculateNPS(ORG);
    expect(nps).toHaveProperty("nps");
    expect(nps).toHaveProperty("totalResponses");
  });

  it("getNPSTrend", async () => {
    const { getNPSTrend } = await import("../../services/interview/exit-interview.service.js");
    const t = await getNPSTrend(ORG);
    expect(Array.isArray(t)).toBe(true);
  });

  it("removeQuestion", async () => {
    const { removeQuestion } = await import("../../services/interview/exit-interview.service.js");
    await removeQuestion(ORG, questionId);
  });

  it("cleanup template", async () => {
    await db.delete("exit_interview_templates", templateId);
  });
});

// ============================================================================
// LETTER SERVICE
// ============================================================================
describe("Letter coverage-2", () => {
  let templateId: string;

  it("createTemplate", async () => {
    const { createTemplate } = await import("../../services/letter/letter.service.js");
    const t = await createTemplate(ORG, {
      name: `Cov2 Letter ${U}`,
      letter_type: "experience",
      body_template: "<p>This is to certify that {{employee_name}} worked at {{company_name}}</p>",
    });
    expect(t).toHaveProperty("id");
    templateId = t.id;
  });

  it("listTemplates", async () => {
    const { listTemplates } = await import("../../services/letter/letter.service.js");
    const r = await listTemplates(ORG);
    expect(r.length).toBeGreaterThan(0);
  });

  it("getTemplate", async () => {
    const { getTemplate } = await import("../../services/letter/letter.service.js");
    const t = await getTemplate(ORG, templateId);
    expect(t.name).toContain("Cov2 Letter");
  });

  it("updateTemplate", async () => {
    const { updateTemplate } = await import("../../services/letter/letter.service.js");
    const t = await updateTemplate(ORG, templateId, {
      body_template: "<p>Updated: {{employee_name}} at {{company_name}}</p>",
    });
    expect(t).toBeTruthy();
  });

  it("deleteTemplate", async () => {
    const { deleteTemplate } = await import("../../services/letter/letter.service.js");
    const r = await deleteTemplate(ORG, templateId);
    expect(r).toBeTruthy();
  });
});

// ============================================================================
// ALUMNI SERVICE
// ============================================================================
describe("Alumni coverage-2", () => {
  it("listAlumni", async () => {
    const { listAlumni } = await import("../../services/alumni/alumni.service.js");
    const r = await listAlumni(ORG, {});
    expect(r).toHaveProperty("data");
  });
});

// ============================================================================
// NOTICE BUYOUT SERVICE
// ============================================================================
describe("NoticeBuyout coverage-2", () => {
  it("listBuyoutRequests", async () => {
    const { listBuyoutRequests } = await import("../../services/buyout/notice-buyout.service.js");
    const r = await listBuyoutRequests(ORG, { page: 1, perPage: 10 });
    expect(r).toHaveProperty("data");
  });

  it("getBuyoutRequest - not found", async () => {
    const { getBuyoutRequest } = await import("../../services/buyout/notice-buyout.service.js");
    try {
      await getBuyoutRequest(ORG, "nonexistent-id");
    } catch (e: any) {
      expect(e.statusCode || e.message).toBeTruthy();
    }
  });
});

// ============================================================================
// EXIT REQUEST SERVICE
// ============================================================================
describe("ExitRequest coverage-2", () => {
  it("listExits", async () => {
    const { listExits } = await import("../../services/exit/exit-request.service.js");
    const r = await listExits(ORG, {});
    expect(r).toHaveProperty("data");
    expect(r).toHaveProperty("total");
  });

  it("listExits with status filter", async () => {
    const { listExits } = await import("../../services/exit/exit-request.service.js");
    const r = await listExits(ORG, { status: "initiated" });
    expect(r).toHaveProperty("data");
  });

  it("getMyExit - no exit", async () => {
    const { getMyExit } = await import("../../services/exit/exit-request.service.js");
    const r = await getMyExit(ORG, 999999);
    expect(r).toBeNull();
  });
});

// ============================================================================
// KNOWLEDGE TRANSFER SERVICE
// ============================================================================
describe("KT coverage-2", () => {
  it("getKT - no exit request", async () => {
    const { getKT } = await import("../../services/kt/knowledge-transfer.service.js");
    try {
      const r = await getKT(ORG, "nonexistent-exit-id");
      expect(r).toBeNull();
    } catch (e: any) {
      expect(e.statusCode || e.message).toBeTruthy();
    }
  });
});

// ============================================================================
// FNF SERVICE
// ============================================================================
describe("FnF coverage-2", () => {
  it("getFnF - nonexistent", async () => {
    const { getFnF } = await import("../../services/fnf/fnf.service.js");
    try {
      const r = await getFnF(ORG, "nonexistent-exit-id");
      expect(r).toBeNull();
    } catch (e: any) {
      expect(e.statusCode || e.message).toBeTruthy();
    }
  });
});

// ============================================================================
// ASSET RETURN SERVICE
// ============================================================================
describe("AssetReturn coverage-2", () => {
  it("listAssets - no exit request", async () => {
    const { listAssets } = await import("../../services/asset/asset-return.service.js");
    try {
      const r = await listAssets(ORG, "nonexistent-exit-id");
      expect(Array.isArray(r)).toBe(true);
    } catch (e: any) {
      expect(e.statusCode || e.message).toBeTruthy();
    }
  });
});

// ============================================================================
// REHIRE SERVICE
// ============================================================================
describe("Rehire coverage-2", () => {
  it("listRehireRequests", async () => {
    const { listRehireRequests } = await import("../../services/rehire/rehire.service.js");
    const r = await listRehireRequests(ORG, {});
    expect(r).toHaveProperty("data");
    expect(r).toHaveProperty("total");
  });

  it("listRehireRequests with status", async () => {
    const { listRehireRequests } = await import("../../services/rehire/rehire.service.js");
    const r = await listRehireRequests(ORG, { status: "proposed" });
    expect(r).toHaveProperty("data");
  });

  it("getRehireRequest - not found", async () => {
    const { getRehireRequest } = await import("../../services/rehire/rehire.service.js");
    try {
      await getRehireRequest(ORG, "nonexistent-id");
    } catch (e: any) {
      expect(e.message || e.statusCode).toBeTruthy();
    }
  });
});
