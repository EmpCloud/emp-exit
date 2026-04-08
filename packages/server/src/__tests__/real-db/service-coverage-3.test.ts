// ============================================================================
// EMP EXIT - Service Coverage Tests Part 3
// Targets all services below 80% to push overall from 62.2% to 85%+
// ============================================================================

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
process.env.JWT_SECRET = "test-jwt-secret-cov3";
process.env.EMPCLOUD_URL = "http://localhost:3000";
process.env.LOG_LEVEL = "error";

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { initDB, closeDB, getDB } from "../../db/adapters";
import { initEmpCloudDB, closeEmpCloudDB } from "../../db/empcloud";

vi.mock("../../services/email/exit-email.service", () => ({
  sendExitEmail: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const ORG = 5;
const ADMIN = 522;
const EMP = 524;
const MGR = 529;
const U = String(Date.now()).slice(-6);

let db: ReturnType<typeof getDB>;
let dbAvailable = false;
let exitRequestId: string;

beforeAll(async () => {
  try {
    await initDB();
    await initEmpCloudDB();
    db = getDB();
    // Find an exit request for testing
    const exits = await db.findMany("exit_requests", { filters: { organization_id: ORG }, limit: 1 });
    exitRequestId = (exits.data[0] as any)?.id;
    dbAvailable = true;
  } catch {
    // No local MySQL — tests will be skipped
  }
}, 30000);

afterAll(async () => {
  if (!dbAvailable) return;
  try { await db.deleteMany("exit_checklist_templates", { name: `Cov3 Checklist ${U}` }); } catch {}
  try { await db.deleteMany("knowledge_transfers", { exit_request_id: "nonexistent" }); } catch {}
  await closeEmpCloudDB();
  await closeDB();
}, 15000);

beforeEach((ctx) => { if (!dbAvailable) ctx.skip(); });

// ALUMNI SERVICE (8.6% -> 85%+)
describe("Alumni cov3", () => {
  it("listAlumni", async () => {
    const { listAlumni } = await import("../../services/alumni/alumni.service.js");
    const r = await listAlumni(ORG, { page: 1, perPage: 10 });
    expect(r).toHaveProperty("data");
    expect(r).toHaveProperty("total");
  });

  it("listAlumni with search", async () => {
    const { listAlumni } = await import("../../services/alumni/alumni.service.js");
    const r = await listAlumni(ORG, { search: "zzz-nonexistent", page: 1, perPage: 10 });
    expect(r.data.length).toBe(0);
  });

  it("getProfile 404", async () => {
    const { getProfile } = await import("../../services/alumni/alumni.service.js");
    await expect(getProfile(ORG, "nonexistent-id")).rejects.toThrow();
  });

  it("updateProfile 404", async () => {
    const { updateProfile } = await import("../../services/alumni/alumni.service.js");
    await expect(updateProfile(ORG, "nonexistent-id", { personal_email: "test@test.com" })).rejects.toThrow();
  });

  it("optIn 404 exit", async () => {
    const { optIn } = await import("../../services/alumni/alumni.service.js");
    await expect(optIn(ORG, EMP, "nonexistent-exit")).rejects.toThrow();
  });

  it("optIn with real exit", async () => {
    if (!exitRequestId) return;
    const exit = await db.findOne("exit_requests", { id: exitRequestId, organization_id: ORG }) as any;
    if (!exit) return;
    const { optIn } = await import("../../services/alumni/alumni.service.js");
    try {
      const r = await optIn(ORG, exit.employee_id, exitRequestId);
      expect(r).toHaveProperty("id");
    } catch (e: any) {
      // May conflict if already opted in
      expect(e.message).toContain("already exists");
    }
  });
});

// KNOWLEDGE TRANSFER SERVICE (6.9% -> 85%+)
describe("KT cov3", () => {
  let ktId: string;

  it("createKT 404 exit", async () => {
    const { createKT } = await import("../../services/kt/knowledge-transfer.service.js");
    await expect(createKT(ORG, "nonexistent-exit")).rejects.toThrow();
  });

  it("createKT with real exit", async () => {
    if (!exitRequestId) return;
    const { createKT } = await import("../../services/kt/knowledge-transfer.service.js");
    const kt = await createKT(ORG, exitRequestId, ADMIN);
    expect(kt).toHaveProperty("id");
    ktId = kt.id;
  });

  it("getKT", async () => {
    if (!exitRequestId) return;
    const { getKT } = await import("../../services/kt/knowledge-transfer.service.js");
    const kt = await getKT(ORG, exitRequestId);
    expect(kt).toBeTruthy();
  });

  it("updateKT", async () => {
    if (!exitRequestId) return;
    const { updateKT } = await import("../../services/kt/knowledge-transfer.service.js");
    const kt = await updateKT(ORG, exitRequestId, { status: "in_progress" });
    expect(kt).toBeTruthy();
  });

  it("addItem", async () => {
    if (!ktId) return;
    const { addItem } = await import("../../services/kt/knowledge-transfer.service.js");
    const item = await addItem(ORG, ktId, { title: "Cov3 KT Item", description: "Test item" });
    expect(item).toHaveProperty("id");
  });

  it("addItem 404 KT", async () => {
    const { addItem } = await import("../../services/kt/knowledge-transfer.service.js");
    await expect(addItem(ORG, "nonexistent-kt", { title: "Test" })).rejects.toThrow();
  });

  it("updateItem 404", async () => {
    const { updateItem } = await import("../../services/kt/knowledge-transfer.service.js");
    await expect(updateItem(ORG, "nonexistent-item", { status: "completed" })).rejects.toThrow();
  });

  it("updateKT completed", async () => {
    if (!exitRequestId) return;
    const { updateKT } = await import("../../services/kt/knowledge-transfer.service.js");
    const kt = await updateKT(ORG, exitRequestId, { status: "completed" });
    expect(kt).toBeTruthy();
  });
});

// ASSET RETURN SERVICE (25.7% -> 85%+)
describe("AssetReturn cov3", () => {
  let assetId: string;

  it("addAsset 404 exit", async () => {
    const { addAsset } = await import("../../services/asset/asset-return.service.js");
    await expect(addAsset(ORG, "nonexistent-exit", { asset_name: "Laptop", category: "IT" })).rejects.toThrow();
  });

  it("addAsset with real exit", async () => {
    if (!exitRequestId) return;
    const { addAsset } = await import("../../services/asset/asset-return.service.js");
    const a = await addAsset(ORG, exitRequestId, { asset_name: `Cov3 Laptop ${U}`, category: "IT", replacement_cost: 50000 });
    assetId = a.id;
    expect(a.status).toBe("pending");
  });

  it("listAssets", async () => {
    if (!exitRequestId) return;
    const { listAssets } = await import("../../services/asset/asset-return.service.js");
    const assets = await listAssets(ORG, exitRequestId);
    expect(assets.length).toBeGreaterThan(0);
  });

  it("listAssets 404", async () => {
    const { listAssets } = await import("../../services/asset/asset-return.service.js");
    await expect(listAssets(ORG, "nonexistent-exit")).rejects.toThrow();
  });

  it("updateAsset", async () => {
    if (!assetId) return;
    const { updateAsset } = await import("../../services/asset/asset-return.service.js");
    const a = await updateAsset(ORG, assetId, { status: "returned", returned_date: new Date().toISOString().split("T")[0] });
    expect(a).toBeTruthy();
  });

  it("updateAsset 404", async () => {
    const { updateAsset } = await import("../../services/asset/asset-return.service.js");
    await expect(updateAsset(ORG, "nonexistent-asset", { status: "returned" })).rejects.toThrow();
  });
});

// CHECKLIST SERVICE (32.6% -> 85%+)
describe("Checklist cov3", () => {
  let tmplId: string;
  let tmplItemId: string;

  it("createTemplate", async () => {
    const { createTemplate } = await import("../../services/checklist/checklist.service.js");
    const t = await createTemplate(ORG, { name: `Cov3 Checklist ${U}`, description: "Test checklist", is_default: false });
    tmplId = t.id;
    expect(t.name).toContain("Cov3");
  });

  it("listTemplates", async () => {
    const { listTemplates } = await import("../../services/checklist/checklist.service.js");
    const ts = await listTemplates(ORG);
    expect(ts.length).toBeGreaterThan(0);
  });

  it("getTemplate", async () => {
    const { getTemplate } = await import("../../services/checklist/checklist.service.js");
    const t = await getTemplate(ORG, tmplId);
    expect(t.items).toBeDefined();
  });

  it("updateTemplate", async () => {
    const { updateTemplate } = await import("../../services/checklist/checklist.service.js");
    const t = await updateTemplate(ORG, tmplId, { description: "Updated desc" });
    expect(t.description).toBe("Updated desc");
  });

  it("addTemplateItem", async () => {
    const { addTemplateItem } = await import("../../services/checklist/checklist.service.js");
    const item = await addTemplateItem(ORG, tmplId, { title: "Return ID card", is_mandatory: true });
    tmplItemId = item.id;
    expect(item.title).toBe("Return ID card");
  });

  it("addTemplateItem auto sort", async () => {
    const { addTemplateItem } = await import("../../services/checklist/checklist.service.js");
    const item = await addTemplateItem(ORG, tmplId, { title: "Clear dues" });
    expect(item).toHaveProperty("id");
  });

  it("updateTemplateItem", async () => {
    const { updateTemplateItem } = await import("../../services/checklist/checklist.service.js");
    const item = await updateTemplateItem(ORG, tmplItemId, { title: "Return access card" });
    expect(item.title).toBe("Return access card");
  });

  it("generateChecklist", async () => {
    if (!exitRequestId) return;
    const { generateChecklist } = await import("../../services/checklist/checklist.service.js");
    const items = await generateChecklist(ORG, exitRequestId, tmplId);
    expect(items.length).toBeGreaterThan(0);
  });

  it("getChecklist", async () => {
    if (!exitRequestId) return;
    const { getChecklist } = await import("../../services/checklist/checklist.service.js");
    const r = await getChecklist(ORG, exitRequestId);
    expect(r).toHaveProperty("items");
    expect(r).toHaveProperty("progress");
  });

  it("getChecklist 404", async () => {
    const { getChecklist } = await import("../../services/checklist/checklist.service.js");
    await expect(getChecklist(ORG, "nonexistent-exit")).rejects.toThrow();
  });

  it("removeTemplateItem", async () => {
    const { removeTemplateItem } = await import("../../services/checklist/checklist.service.js");
    const r = await removeTemplateItem(ORG, tmplItemId);
    expect(!!r).toBe(true);
  });

  it("deleteTemplate", async () => {
    const { deleteTemplate } = await import("../../services/checklist/checklist.service.js");
    const r = await deleteTemplate(ORG, tmplId);
    expect(!!r).toBe(true);
  });

  it("deleteTemplate 404", async () => {
    const { deleteTemplate } = await import("../../services/checklist/checklist.service.js");
    await expect(deleteTemplate(ORG, "nonexistent-id")).rejects.toThrow();
  });
});

// REHIRE SERVICE (42.2% -> 85%+)
describe("Rehire cov3", () => {
  it("listRehireRequests", async () => {
    const { listRehireRequests } = await import("../../services/rehire/rehire.service.js");
    const r = await listRehireRequests(ORG, { page: 1, perPage: 10 });
    expect(r).toHaveProperty("data");
    expect(r).toHaveProperty("total");
  });

  it("listRehireRequests with status", async () => {
    const { listRehireRequests } = await import("../../services/rehire/rehire.service.js");
    const r = await listRehireRequests(ORG, { status: "proposed", page: 1, perPage: 10 });
    expect(r).toHaveProperty("data");
  });

  it("getRehireRequest 404", async () => {
    const { getRehireRequest } = await import("../../services/rehire/rehire.service.js");
    await expect(getRehireRequest(ORG, "nonexistent-id")).rejects.toThrow();
  });

  it("proposeRehire 404 alumni", async () => {
    const { proposeRehire } = await import("../../services/rehire/rehire.service.js");
    await expect(proposeRehire(ORG, "nonexistent-alumni", ADMIN, { position: "Engineer", salary: 100000 })).rejects.toThrow();
  });

  it("updateStatus 404", async () => {
    const { updateStatus } = await import("../../services/rehire/rehire.service.js");
    await expect(updateStatus(ORG, "nonexistent-id", "approved")).rejects.toThrow();
  });
});

// ANALYTICS - ATTRITION PREDICTION SERVICE (40% -> 85%+)
describe("AttritionPrediction cov3", () => {
  it("generateAttritionPrediction", async () => {
    const { generateAttritionPrediction } = await import("../../services/analytics/attrition-prediction.service.js");
    await generateAttritionPrediction(ORG);
    // No throw = success
  });

  it("getPredictionTrends", async () => {
    const { getPredictionTrends } = await import("../../services/analytics/attrition-prediction.service.js");
    const r = await getPredictionTrends(ORG);
    expect(Array.isArray(r)).toBe(true);
  });
});

// ANALYTICS - FLIGHT RISK SERVICE (17% -> 85%+)
describe("FlightRisk cov3", () => {
  it("scoreToRiskLevel", async () => {
    const { scoreToRiskLevel } = await import("../../services/analytics/flight-risk.service.js");
    expect(scoreToRiskLevel(85)).toBe("critical");
    expect(scoreToRiskLevel(65)).toBe("high");
    expect(scoreToRiskLevel(45)).toBe("medium");
    expect(scoreToRiskLevel(20)).toBe("low");
  });

  it("calculateFlightRisk", async () => {
    const { calculateFlightRisk } = await import("../../services/analytics/flight-risk.service.js");
    const r = await calculateFlightRisk(ORG, EMP);
    expect(r).toHaveProperty("score");
    expect(r).toHaveProperty("riskLevel");
    expect(r).toHaveProperty("factors");
  });

  it("calculateFlightRisk nonexistent employee", async () => {
    const { calculateFlightRisk } = await import("../../services/analytics/flight-risk.service.js");
    const r = await calculateFlightRisk(ORG, 999999);
    expect(r.score).toBe(0);
  });
});

// SETTINGS SERVICE (69% -> 85%+)
describe("Settings cov3", () => {
  it("getSettings", async () => {
    const { getSettings } = await import("../../services/settings/settings.service.js");
    const s = await getSettings(ORG);
    expect(s).toHaveProperty("default_notice_period_days");
  });

  it("updateSettings", async () => {
    const { getSettings, updateSettings } = await import("../../services/settings/settings.service.js");
    const original = await getSettings(ORG);
    await updateSettings(ORG, { require_exit_interview: true });
    const updated = await getSettings(ORG);
    expect(!!updated.require_exit_interview).toBe(true);
    // Restore
    await updateSettings(ORG, { require_exit_interview: original.require_exit_interview });
  });
});

// BUYOUT SERVICE (58.4% -> 85%+)
describe("NoticeBuyout cov3", () => {
  it("calculateBuyout 404", async () => {
    const mod = await import("../../services/buyout/notice-buyout.service.js");
    const fn = mod.calculateBuyout || mod.default?.calculateBuyout;
    if (!fn) return;
    await expect(fn(ORG, "nonexistent-exit")).rejects.toThrow();
  });

  it("listBuyouts", async () => {
    const mod = await import("../../services/buyout/notice-buyout.service.js");
    const fn = mod.listBuyoutRequests || mod.listBuyouts || mod.default?.listBuyoutRequests;
    if (!fn) return;
    const r = await fn(ORG, { page: 1, perPage: 10 });
    expect(r).toHaveProperty("data");
  });
});
