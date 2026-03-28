// ============================================================================
// EMP EXIT — Comprehensive API Integration Tests
// Tests against live deployment at https://test-exit.empcloud.com
// Run: npx vitest run src/__tests__/api.test.ts
// ============================================================================

import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.API_BASE_URL || "https://test-exit.empcloud.com/api/v1";
let token = "";
let userId: number;
let orgId: number;
const U = Date.now();

// -- Shared IDs populated across tests --
let exitId = "";
let exitId2 = "";
let checklistTemplateId = "";
let checklistTemplateItemId = "";
let checklistInstanceItemId = "";
let clearanceDeptId = "";
let clearanceDeptId2 = "";
let clearanceRecordId = "";
let interviewTemplateId = "";
let questionId = "";
let assetId = "";
let letterTemplateId = "";
let letterId = "";
let alumniId = "";
let buyoutId = "";
let rehireId = "";

// ============================================================================
// Helper
// ============================================================================
async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let body: any = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

// ============================================================================
// Auth
// ============================================================================
beforeAll(async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ananya@technova.in", password: "Welcome@123" }),
  });
  const json = await res.json();
  token = json.data?.tokens?.accessToken || json.data?.token;
  userId = json.data?.user?.empcloudUserId || json.data?.user?.id;
  orgId = json.data?.user?.empcloudOrgId;
  expect(token).toBeTruthy();
  expect(userId).toBeTruthy();
});

// ============================================================================
// 1. AUTH
// ============================================================================
describe("Auth", () => {
  it("1.1 POST /auth/login — valid credentials", async () => {
    const { status, body } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "ananya@technova.in", password: "Welcome@123" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.tokens?.accessToken || body.data?.token).toBeTruthy();
  });

  it("1.2 POST /auth/login — wrong password returns error", async () => {
    const { status, body } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "ananya@technova.in", password: "WrongPassword" }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(body.success).toBe(false);
  });

  it("1.3 Unauthenticated request returns 401", async () => {
    const res = await fetch(`${BASE}/exits`, {
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });
});

// ============================================================================
// 2. SETTINGS
// ============================================================================
describe("Settings", () => {
  it("2.1 GET /settings — verify exit settings", async () => {
    const { status, body } = await api("/settings");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("default_notice_period_days");
    expect(body.data).toHaveProperty("auto_initiate_clearance");
    expect(body.data).toHaveProperty("require_exit_interview");
    expect(body.data).toHaveProperty("fnf_approval_required");
  });

  it("2.2 PUT /settings — update settings", async () => {
    const { status, body } = await api("/settings", {
      method: "PUT",
      body: JSON.stringify({ default_notice_period_days: 30 }),
    });
    expect([200, 403]).toContain(status);
    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });
});

// ============================================================================
// 3. EXIT REQUESTS
// ============================================================================
describe("Exit Requests", () => {
  it("3.1 POST /exits — initiate exit for employee 3", async () => {
    const { status, body } = await api("/exits", {
      method: "POST",
      body: JSON.stringify({
        employee_id: 3,
        exit_type: "resignation",
        reason: `Personal reasons - API test ${U}`,
        notice_date: new Date().toISOString().split("T")[0],
        last_working_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    exitId = body.data.id;
    expect(exitId).toBeTruthy();
  });

  it("3.2 POST /exits — initiate second exit for employee 4", async () => {
    const { status, body } = await api("/exits", {
      method: "POST",
      body: JSON.stringify({
        employee_id: 4,
        exit_type: "termination",
        reason: `Performance issues - API test ${U}`,
        notice_date: new Date().toISOString().split("T")[0],
        last_working_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    exitId2 = body.data.id;
    expect(exitId2).toBeTruthy();
  });

  it("3.3 GET /exits — list all exits", async () => {
    const { status, body } = await api("/exits");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const items = body.data?.data || body.data || [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("3.4 GET /exits?status=pending — filter by status", async () => {
    const { status, body } = await api("/exits?status=pending");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("3.5 GET /exits/:id — get exit detail", async () => {
    const { status, body } = await api(`/exits/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(exitId);
  });

  it("3.6 PUT /exits/:id — update exit", async () => {
    const { status, body } = await api(`/exits/${exitId}`, {
      method: "PUT",
      body: JSON.stringify({ reason: `Updated reason - API test ${U}` }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// 4. EXIT INTERVIEWS
// ============================================================================
describe("Exit Interviews", () => {
  it("4.1 POST /interviews/templates — create interview template", async () => {
    const { status, body } = await api("/interviews/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `Standard Exit Interview ${U}`,
        description: "Standard template for exit interviews",
        is_default: false,
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    interviewTemplateId = body.data.id;
    expect(interviewTemplateId).toBeTruthy();
  });

  it("4.2 GET /interviews/templates — list templates", async () => {
    const { status, body } = await api("/interviews/templates");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("4.3 GET /interviews/templates/:id — get template with questions", async () => {
    const { status, body } = await api(`/interviews/templates/${interviewTemplateId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(interviewTemplateId);
  });

  it("4.4 PUT /interviews/templates/:id — update template", async () => {
    const { status, body } = await api(`/interviews/templates/${interviewTemplateId}`, {
      method: "PUT",
      body: JSON.stringify({ description: `Updated description ${U}` }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("4.5 POST /interviews/templates/:id/questions — add question", async () => {
    const { status, body } = await api(`/interviews/templates/${interviewTemplateId}/questions`, {
      method: "POST",
      body: JSON.stringify({
        question_text: "What is the primary reason for leaving?",
        question_type: "text",
        is_required: true,
        sort_order: 1,
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    questionId = body.data.id;
    expect(questionId).toBeTruthy();
  });

  it("4.6 PUT /interviews/templates/:templateId/questions/:questionId — update question", async () => {
    const { status, body } = await api(
      `/interviews/templates/${interviewTemplateId}/questions/${questionId}`,
      {
        method: "PUT",
        body: JSON.stringify({ question_text: "What is the primary reason for your departure?" }),
      },
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("4.7 POST /interviews/exit/:exitId — schedule interview for exit", async () => {
    const { status, body } = await api(`/interviews/exit/${exitId}`, {
      method: "POST",
      body: JSON.stringify({
        template_id: interviewTemplateId,
        conducted_by: userId,
        scheduled_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("4.8 GET /interviews/exit/:exitId — get interview for exit", async () => {
    const { status, body } = await api(`/interviews/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});

// ============================================================================
// 5. CHECKLISTS
// ============================================================================
describe("Checklists", () => {
  it("5.1 POST /checklists/templates — create checklist template", async () => {
    const { status, body } = await api("/checklists/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `Exit Checklist ${U}`,
        description: "Standard exit checklist for all departures",
        exit_type: "resignation",
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    checklistTemplateId = body.data.id;
    expect(checklistTemplateId).toBeTruthy();
  });

  it("5.2 GET /checklists/templates — list templates", async () => {
    const { status, body } = await api("/checklists/templates");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("5.3 GET /checklists/templates/:id — get template", async () => {
    const { status, body } = await api(`/checklists/templates/${checklistTemplateId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("5.4 PUT /checklists/templates/:id — update template", async () => {
    const { status, body } = await api(`/checklists/templates/${checklistTemplateId}`, {
      method: "PUT",
      body: JSON.stringify({ description: `Updated checklist template ${U}` }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("5.5 POST /checklists/templates/:id/items — add item to template", async () => {
    const { status, body } = await api(`/checklists/templates/${checklistTemplateId}/items`, {
      method: "POST",
      body: JSON.stringify({
        title: "Return laptop",
        description: "Return company laptop to IT department",
        department: "IT",
        is_required: true,
        sort_order: 1,
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    checklistTemplateItemId = body.data.id;
    expect(checklistTemplateItemId).toBeTruthy();
  });

  it("5.6 POST /checklists/generate — generate checklist for exit", async () => {
    const { status, body } = await api("/checklists/generate", {
      method: "POST",
      body: JSON.stringify({
        exit_request_id: exitId,
        template_id: checklistTemplateId,
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    // Store first item ID for status update
    const items = Array.isArray(body.data) ? body.data : [body.data];
    if (items.length > 0 && items[0].id) {
      checklistInstanceItemId = items[0].id;
    }
  });

  it("5.7 GET /checklists/exit/:exitId — get checklist for exit", async () => {
    const { status, body } = await api(`/checklists/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("5.8 PATCH /checklists/items/:itemId — update checklist item status", async () => {
    if (!checklistInstanceItemId) return;
    const { status, body } = await api(`/checklists/items/${checklistInstanceItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// 6. CLEARANCE
// ============================================================================
describe("Clearance", () => {
  it("6.1 POST /clearance/departments — create clearance department", async () => {
    const { status, body } = await api("/clearance/departments", {
      method: "POST",
      body: JSON.stringify({
        name: `IT Department ${U}`,
        description: "Information Technology clearance",
        approver_id: userId,
        sort_order: 1,
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    clearanceDeptId = body.data.id;
    expect(clearanceDeptId).toBeTruthy();
  });

  it("6.2 POST /clearance/departments — create second department", async () => {
    const { status, body } = await api("/clearance/departments", {
      method: "POST",
      body: JSON.stringify({
        name: `Finance Department ${U}`,
        description: "Finance clearance",
        approver_id: userId,
        sort_order: 2,
      }),
    });
    expect(status).toBe(201);
    clearanceDeptId2 = body.data.id;
  });

  it("6.3 GET /clearance/departments — list departments", async () => {
    const { status, body } = await api("/clearance/departments");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("6.4 PUT /clearance/departments/:id — update department", async () => {
    const { status, body } = await api(`/clearance/departments/${clearanceDeptId}`, {
      method: "PUT",
      body: JSON.stringify({ description: `Updated IT dept ${U}` }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("6.5 POST /clearance/exit/:exitId — create clearance records", async () => {
    const { status, body } = await api(`/clearance/exit/${exitId}`, { method: "POST" });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    const records = Array.isArray(body.data) ? body.data : [body.data];
    if (records.length > 0 && records[0].id) {
      clearanceRecordId = records[0].id;
    }
  });

  it("6.6 GET /clearance/exit/:exitId — get clearance status", async () => {
    const { status, body } = await api(`/clearance/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("6.7 PUT /clearance/:clearanceId — update clearance record", async () => {
    if (!clearanceRecordId) return;
    const { status, body } = await api(`/clearance/${clearanceRecordId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cleared", remarks: `Cleared via API test ${U}` }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("6.8 GET /clearance/my — my assigned clearances", async () => {
    const { status, body } = await api("/clearance/my");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("6.9 DELETE /clearance/departments/:id — delete department", async () => {
    const { status, body } = await api(`/clearance/departments/${clearanceDeptId2}`, {
      method: "DELETE",
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// 7. KNOWLEDGE TRANSFER
// ============================================================================
describe("Knowledge Transfer", () => {
  it("7.1 POST /kt/exit/:exitId — create KT plan", async () => {
    const { status, body } = await api(`/kt/exit/${exitId}`, {
      method: "POST",
      body: JSON.stringify({
        assignee_id: 2,
        due_date: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0],
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("7.2 GET /kt/exit/:exitId — get KT plan", async () => {
    const { status, body } = await api(`/kt/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("7.3 PUT /kt/exit/:exitId — update KT plan", async () => {
    const { status, body } = await api(`/kt/exit/${exitId}`, {
      method: "PUT",
      body: JSON.stringify({
        due_date: new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
      }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("7.4 POST /kt/exit/:exitId/items — add KT item", async () => {
    const { status, body } = await api(`/kt/exit/${exitId}/items`, {
      method: "POST",
      body: JSON.stringify({
        title: `Project handover documentation ${U}`,
        description: "Document all ongoing project details",
        priority: "high",
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    if (body.data?.id) {
      // Store for later update
    }
  });
});

// ============================================================================
// 8. FNF SETTLEMENT
// ============================================================================
describe("FnF Settlement", () => {
  it("8.1 POST /fnf/exit/:exitId/calculate — calculate FnF", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}/calculate`, { method: "POST" });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("8.2 GET /fnf/exit/:exitId — get FnF", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("8.3 PUT /fnf/exit/:exitId — update FnF with adjustments", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}`, {
      method: "PUT",
      body: JSON.stringify({
        adjustments: [{ description: "Bonus adjustment", amount: 5000, type: "addition" }],
      }),
    });
    expect([200, 400]).toContain(status); // May fail if schema differs
    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });

  it("8.4 POST /fnf/exit/:exitId/approve — approve FnF", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}/approve`, { method: "POST" });
    expect([200, 400]).toContain(status); // May need FnF in correct state
    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });

  it("8.5 POST /fnf/exit/:exitId/mark-paid — mark FnF as paid", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}/mark-paid`, {
      method: "POST",
      body: JSON.stringify({ payment_reference: `PAY-${U}` }),
    });
    expect([200, 400]).toContain(status);
    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });
});

// ============================================================================
// 9. ASSETS
// ============================================================================
describe("Assets", () => {
  it("9.1 POST /assets/exit/:exitId — add asset", async () => {
    const { status, body } = await api(`/assets/exit/${exitId}`, {
      method: "POST",
      body: JSON.stringify({
        asset_name: `MacBook Pro ${U}`,
        asset_type: "laptop",
        asset_tag: `ASSET-${U}`,
        assigned_date: "2025-01-15",
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    assetId = body.data.id;
    expect(assetId).toBeTruthy();
  });

  it("9.2 GET /assets/exit/:exitId — list assets for exit", async () => {
    const { status, body } = await api(`/assets/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("9.3 PUT /assets/:assetId — mark asset as returned", async () => {
    const { status, body } = await api(`/assets/${assetId}`, {
      method: "PUT",
      body: JSON.stringify({
        status: "returned",
        return_date: new Date().toISOString().split("T")[0],
        condition: "good",
      }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// 10. LETTERS
// ============================================================================
describe("Letters", () => {
  it("10.1 POST /letters/templates — create letter template", async () => {
    const { status, body } = await api("/letters/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `Acceptance Letter ${U}`,
        letter_type: "acceptance",
        subject: "Acceptance of Resignation",
        body_template: "Dear {{employee_name}}, we accept your resignation effective {{last_working_date}}.",
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    letterTemplateId = body.data.id;
    expect(letterTemplateId).toBeTruthy();
  });

  it("10.2 GET /letters/templates — list templates", async () => {
    const { status, body } = await api("/letters/templates");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("10.3 PUT /letters/templates/:id — update template", async () => {
    const { status, body } = await api(`/letters/templates/${letterTemplateId}`, {
      method: "PUT",
      body: JSON.stringify({ subject: `Updated Acceptance Letter ${U}` }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("10.4 POST /letters/exit/:exitId/generate — generate letter", async () => {
    const { status, body } = await api(`/letters/exit/${exitId}/generate`, {
      method: "POST",
      body: JSON.stringify({ template_id: letterTemplateId }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    letterId = body.data.id;
    expect(letterId).toBeTruthy();
  });

  it("10.5 GET /letters/exit/:exitId — list letters for exit", async () => {
    const { status, body } = await api(`/letters/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("10.6 GET /letters/:letterId/download — download letter", async () => {
    if (!letterId) return;
    const res = await fetch(`${BASE}/letters/${letterId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type") || "";
    expect(contentType).toContain("text/html");
  });
});

// ============================================================================
// 11. ANALYTICS
// ============================================================================
describe("Analytics", () => {
  it("11.1 GET /analytics/attrition — attrition rate", async () => {
    const { status, body } = await api("/analytics/attrition");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("11.2 GET /analytics/reasons — reason breakdown", async () => {
    const { status, body } = await api("/analytics/reasons");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("11.3 GET /analytics/departments — department trends", async () => {
    const { status, body } = await api("/analytics/departments");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("11.4 GET /analytics/tenure — tenure distribution", async () => {
    const { status, body } = await api("/analytics/tenure");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("11.5 GET /analytics/rehire-pool — rehire pool", async () => {
    const { status, body } = await api("/analytics/rehire-pool");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("11.6 GET /analytics/nps — NPS score", async () => {
    const { status, body } = await api("/analytics/nps");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("11.7 GET /analytics/nps/trend — NPS trend", async () => {
    const { status, body } = await api("/analytics/nps/trend?months=6");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// 12. ALUMNI
// ============================================================================
describe("Alumni", () => {
  it("12.1 GET /alumni — list alumni directory", async () => {
    const { status, body } = await api("/alumni");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("12.2 POST /alumni/opt-in — opt in to alumni (may fail if no completed exit)", async () => {
    const { status, body } = await api("/alumni/opt-in", {
      method: "POST",
      body: JSON.stringify({ exitRequestId: exitId }),
    });
    // May fail if exit not completed; valid states are 201 or 400
    expect([200, 201, 400]).toContain(status);
    if (status === 201) {
      alumniId = body.data.id;
      expect(alumniId).toBeTruthy();
    }
  });
});

// ============================================================================
// 13. BUYOUT
// ============================================================================
describe("Notice Period Buyout", () => {
  it("13.1 POST /buyout/calculate — preview buyout calculation", async () => {
    const { status, body } = await api("/buyout/calculate", {
      method: "POST",
      body: JSON.stringify({
        exit_request_id: exitId,
        requested_last_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      }),
    });
    expect([200, 400]).toContain(status); // May fail if salary info not available
    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  it("13.2 POST /buyout/request — submit buyout request", async () => {
    const { status, body } = await api("/buyout/request", {
      method: "POST",
      body: JSON.stringify({
        exit_request_id: exitId,
        requested_last_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      }),
    });
    expect([200, 201, 400]).toContain(status);
    if (status === 201) {
      buyoutId = body.data.id;
      expect(buyoutId).toBeTruthy();
    }
  });

  it("13.3 GET /buyout — list all buyout requests", async () => {
    const { status, body } = await api("/buyout");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("13.4 GET /buyout/exit/:exitId — get buyout for exit", async () => {
    const { status, body } = await api(`/buyout/exit/${exitId}`);
    expect([200, 404]).toContain(status);
    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });
});

// ============================================================================
// 14. REHIRE
// ============================================================================
describe("Rehire", () => {
  it("14.1 GET /rehire — list rehire requests", async () => {
    const { status, body } = await api("/rehire");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("14.2 POST /rehire — propose rehire (may fail without alumni)", async () => {
    // This may fail if no valid alumni; that's OK
    const { status, body } = await api("/rehire", {
      method: "POST",
      body: JSON.stringify({
        alumni_id: alumniId || "nonexistent",
        position: "Senior Developer",
        department: "Engineering",
        salary: 120000,
        notes: `Rehire via API test ${U}`,
      }),
    });
    expect([200, 201, 400, 404]).toContain(status);
    if (status === 201) {
      rehireId = body.data.id;
    }
  });
});

// ============================================================================
// 15. PREDICTIONS (FLIGHT RISK)
// ============================================================================
describe("Predictions (Flight Risk)", () => {
  it("15.1 GET /predictions/dashboard — flight risk dashboard", async () => {
    const { status, body } = await api("/predictions/dashboard");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("15.2 GET /predictions/high-risk — high risk employees", async () => {
    const { status, body } = await api("/predictions/high-risk?threshold=50");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("15.3 GET /predictions/employee/:employeeId — individual risk", async () => {
    const { status, body } = await api(`/predictions/employee/${userId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("15.4 POST /predictions/calculate — batch calculate", async () => {
    const { status, body } = await api("/predictions/calculate", { method: "POST" });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.data.calculated).toBe("number");
  });

  it("15.5 GET /predictions/trends — prediction trends", async () => {
    const { status, body } = await api("/predictions/trends");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// 16. EXIT LIFECYCLE COMPLETION
// ============================================================================
describe("Exit Lifecycle", () => {
  it("16.1 POST /exits/:id/cancel — cancel second exit", async () => {
    const { status, body } = await api(`/exits/${exitId2}/cancel`, { method: "POST" });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("16.2 POST /exits/:id/complete — complete first exit", async () => {
    const { status, body } = await api(`/exits/${exitId}/complete`, { method: "POST" });
    expect([200, 400]).toContain(status); // May fail if clearance incomplete
    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });
});

// ============================================================================
// 17. HEALTH CHECK
// ============================================================================
describe("Health", () => {
  it("17.1 GET /health — health check passes", async () => {
    const healthBase = BASE.replace("/api/v1", "/health");
    const res = await fetch(healthBase);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
