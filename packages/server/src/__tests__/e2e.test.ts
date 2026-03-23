// ============================================================================
// EMP EXIT — E2E API Tests
// ============================================================================

import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:4400/api/v1";
const HEALTH_BASE = "http://localhost:4400/health";
let token = "";
let userId: number;
const U = Date.now();

// -- Shared IDs --
let exitId = "";
let checklistTemplateId = "";
let checklistItemId = "";
let clearanceDeptId = "";
let clearanceId = "";
let interviewTemplateId = "";
let questionId = "";
let assetId = "";
let ktItemId = "";
let letterTemplateId = "";
let letterId = "";
let alumniId = "";

async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
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
  token = json.data?.tokens?.accessToken || json.data?.token || json.data?.accessToken;
  userId = json.data?.user?.empcloudUserId || json.data?.user?.id;
  expect(token).toBeTruthy();
});

describe("Health", () => {
  it("GET /health returns ok", async () => {
    const res = await fetch(HEALTH_BASE);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
  });
});

describe("Auth", () => {
  it("POST /auth/login succeeds", async () => {
    const { status, body } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "ananya@technova.in", password: "Welcome@123" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Exit Requests
// ============================================================================
describe("Exit Requests", () => {
  it("POST /exits — initiate exit (or reuse existing)", async () => {
    const { status, body } = await api("/exits", {
      method: "POST",
      body: JSON.stringify({
        employee_id: userId,
        exit_type: "resignation",
        reason_category: "better_opportunity",
        reason_detail: `E2E test exit request ${U}`,
        last_working_date: "2026-05-31",
      }),
    });
    if (status === 201) {
      exitId = body.data.id;
    } else if (status === 409) {
      // Employee already has an active exit — fetch the existing one
      const listRes = await api("/exits");
      const exits = listRes.body?.data?.data || listRes.body?.data;
      if (Array.isArray(exits) && exits.length > 0) {
        exitId = exits[0].id;
      }
    }
    expect([201, 409]).toContain(status);
    expect(exitId).toBeTruthy();
  });

  it("GET /exits — list exits", async () => {
    const { status, body } = await api("/exits");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("GET /exits/:id — get exit detail", async () => {
    const { status, body } = await api(`/exits/${exitId}`);
    expect(status).toBe(200);
    expect(body.data.id).toBe(exitId);
  });

  it("PUT /exits/:id — update exit", async () => {
    const { status, body } = await api(`/exits/${exitId}`, {
      method: "PUT",
      body: JSON.stringify({ reason_detail: `Updated reason ${U}` }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Checklist Templates
// ============================================================================
describe("Checklist Templates", () => {
  it("POST /checklists/templates — create template", async () => {
    const { status, body } = await api("/checklists/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `Exit Checklist ${U}`,
        description: "Standard offboarding checklist",
        exit_type: "resignation",
      }),
    });
    expect(status).toBe(201);
    checklistTemplateId = body.data.id;
  });

  it("POST /checklists/templates/:id/items — add items", async () => {
    const { status, body } = await api(`/checklists/templates/${checklistTemplateId}/items`, {
      method: "POST",
      body: JSON.stringify({
        title: "Return laptop",
        description: "Return company laptop to IT",
        assigned_role: "employee",
        is_mandatory: true,
        sort_order: 1,
      }),
    });
    expect(status).toBe(201);
    checklistItemId = body.data.id;
  });

  it("GET /checklists/templates — list templates", async () => {
    const { status, body } = await api("/checklists/templates");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Checklists (instances)
// ============================================================================
describe("Checklists", () => {
  it("POST /checklists/generate — generate from template", async () => {
    const { status, body } = await api("/checklists/generate", {
      method: "POST",
      body: JSON.stringify({
        exit_request_id: exitId,
        template_id: checklistTemplateId,
      }),
    });
    // May return 400 if checklist already generated for this exit
    expect([201, 400, 409]).toContain(status);
  });

  it("GET /checklists/exit/:exitId — get checklist", async () => {
    const { status, body } = await api(`/checklists/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    // Capture an item ID for updating
    const items = Array.isArray(body.data) ? body.data : body.data?.items;
    if (items?.length > 0) {
      checklistItemId = items[0].id;
    }
  });

  it("PATCH /checklists/items/:itemId — update item status", async () => {
    if (!checklistItemId) return;
    const { status, body } = await api(`/checklists/items/${checklistItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", remarks: "Laptop returned" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Clearance
// ============================================================================
describe("Clearance", () => {
  it("POST /clearance/departments — create department", async () => {
    const { status, body } = await api("/clearance/departments", {
      method: "POST",
      body: JSON.stringify({ name: `IT Department ${U}`, approver_role: "hr_admin", sort_order: 1 }),
    });
    expect(status).toBe(201);
    clearanceDeptId = body.data.id;
  });

  it("POST /clearance/exit/:exitId — create clearance records", async () => {
    const { status, body } = await api(`/clearance/exit/${exitId}`, {
      method: "POST",
    });
    // May 409 if already created
    expect([200, 201, 409]).toContain(status);
    // Capture a clearance record ID
    if (status === 201 || status === 200) {
      const records = Array.isArray(body.data) ? body.data : [body.data];
      if (records?.length > 0 && records[0]?.id) {
        clearanceId = records[0].id;
      }
    }
  });

  it("GET /clearance/exit/:exitId — get clearance status", async () => {
    const { status, body } = await api(`/clearance/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    // Fallback to capture clearance ID from GET
    if (!clearanceId) {
      const records = Array.isArray(body.data) ? body.data : body.data?.records;
      if (records?.length > 0 && records[0]?.id) {
        clearanceId = records[0].id;
      }
    }
  });

  it("PUT /clearance/:clearanceId — approve clearance", async () => {
    if (!clearanceId) return;
    const { status, body } = await api(`/clearance/${clearanceId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "approved", remarks: "All clear" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Exit Interviews
// ============================================================================
describe("Exit Interviews", () => {
  it("POST /interviews/templates — create template", async () => {
    const { status, body } = await api("/interviews/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `Standard Interview ${U}`,
        description: "Default exit interview template",
      }),
    });
    expect(status).toBe(201);
    interviewTemplateId = body.data.id;
  });

  it("POST /interviews/templates/:id/questions — add question", async () => {
    const { status, body } = await api(`/interviews/templates/${interviewTemplateId}/questions`, {
      method: "POST",
      body: JSON.stringify({
        question_text: "What was the primary reason for leaving?",
        question_type: "text",
        sort_order: 1,
        is_required: true,
      }),
    });
    expect(status).toBe(201);
    questionId = body.data.id;
  });

  it("POST /interviews/exit/:exitId — schedule interview", async () => {
    const { status, body } = await api(`/interviews/exit/${exitId}`, {
      method: "POST",
      body: JSON.stringify({
        template_id: interviewTemplateId,
        conducted_by: userId,
        scheduled_at: "2026-05-20",
      }),
    });
    // May 409 if already scheduled
    expect([201, 409]).toContain(status);
  });
});

// ============================================================================
// FnF (Full & Final Settlement)
// ============================================================================
describe("FnF", () => {
  it("POST /fnf/exit/:exitId/calculate — calculate FnF", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}/calculate`, {
      method: "POST",
    });
    // 409 if already calculated for this exit
    expect([200, 201, 409]).toContain(status);
  });

  it("GET /fnf/exit/:exitId — get FnF", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("PUT /fnf/exit/:exitId — update FnF", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}`, {
      method: "PUT",
      body: JSON.stringify({ leave_encashment: 15000, remarks: "Updated leave encashment" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("POST /fnf/exit/:exitId/approve — approve FnF", async () => {
    const { status, body } = await api(`/fnf/exit/${exitId}/approve`, {
      method: "POST",
    });
    // 409 if already approved
    expect([200, 409]).toContain(status);
  });
});

// ============================================================================
// Asset Returns
// ============================================================================
describe("Asset Returns", () => {
  it("POST /assets/exit/:exitId — add asset", async () => {
    const { status, body } = await api(`/assets/exit/${exitId}`, {
      method: "POST",
      body: JSON.stringify({
        category: "laptop",
        asset_name: `MacBook Pro ${U}`,
        asset_tag: "TECH-001",
        replacement_cost: 150000,
      }),
    });
    expect(status).toBe(201);
    assetId = body.data.id;
  });

  it("GET /assets/exit/:exitId — list assets", async () => {
    const { status, body } = await api(`/assets/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("PUT /assets/:assetId — update status", async () => {
    if (!assetId) return;
    const { status, body } = await api(`/assets/${assetId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "returned", condition_notes: "Good condition" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Knowledge Transfer
// ============================================================================
describe("Knowledge Transfer", () => {
  it("POST /kt/exit/:exitId — create KT plan", async () => {
    const { status, body } = await api(`/kt/exit/${exitId}`, {
      method: "POST",
      body: JSON.stringify({
        assignee_id: userId,
        due_date: "2026-05-25",
      }),
    });
    // May 409 if already exists
    expect([201, 409]).toContain(status);
  });

  it("POST /kt/exit/:exitId/items — add KT item", async () => {
    const { status, body } = await api(`/kt/exit/${exitId}/items`, {
      method: "POST",
      body: JSON.stringify({
        title: `API Documentation ${U}`,
        description: "Document all API endpoints",
      }),
    });
    expect(status).toBe(201);
    ktItemId = body.data.id;
  });

  it("PUT /kt/items/:itemId — update KT item", async () => {
    if (!ktItemId) return;
    const { status, body } = await api(`/kt/items/${ktItemId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "in_progress", description: "In progress — 50% done" }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Letters
// ============================================================================
describe("Letters", () => {
  it("POST /letters/templates — create template", async () => {
    const { status, body } = await api("/letters/templates", {
      method: "POST",
      body: JSON.stringify({
        letter_type: "experience",
        name: `Experience Letter ${U}`,
        body_template: "<p>This is to certify that {{employee_name}} worked at {{company_name}}.</p>",
      }),
    });
    expect(status).toBe(201);
    letterTemplateId = body.data.id;
  });

  it("POST /letters/exit/:exitId/generate — generate letter", async () => {
    const { status, body } = await api(`/letters/exit/${exitId}/generate`, {
      method: "POST",
      body: JSON.stringify({
        template_id: letterTemplateId,
        letter_type: "experience",
      }),
    });
    expect(status).toBe(201);
    letterId = body.data.id;
  });

  it("GET /letters/exit/:exitId — list letters", async () => {
    const { status, body } = await api(`/letters/exit/${exitId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Alumni
// ============================================================================
describe("Alumni", () => {
  it("POST /alumni/opt-in", async () => {
    const { status, body } = await api("/alumni/opt-in", {
      method: "POST",
      body: JSON.stringify({ exitRequestId: exitId }),
    });
    // May 400 if already opted in, or 409 conflict
    expect([200, 201, 400, 409]).toContain(status);
    if (status === 201 || status === 200) {
      alumniId = body.data?.id;
    }
  });

  it("GET /alumni — list", async () => {
    const { status, body } = await api("/alumni");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("GET /alumni/:id — get profile", async () => {
    if (!alumniId) {
      // Try to get from list
      const listRes = await api("/alumni");
      const alumni = listRes.body?.data?.data || listRes.body?.data;
      if (Array.isArray(alumni) && alumni.length > 0) {
        alumniId = alumni[0].id;
      }
    }
    if (!alumniId) return;
    const { status, body } = await api(`/alumni/${alumniId}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Analytics
// ============================================================================
describe("Analytics", () => {
  it("GET /analytics/attrition", async () => {
    const { status, body } = await api("/analytics/attrition");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("GET /analytics/reasons", async () => {
    const { status, body } = await api("/analytics/reasons");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("GET /analytics/nps", async () => {
    const { status, body } = await api("/analytics/nps");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ============================================================================
// Settings
// ============================================================================
describe("Settings", () => {
  it("GET /settings", async () => {
    const { status, body } = await api("/settings");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("PUT /settings — update", async () => {
    const { status, body } = await api("/settings", {
      method: "PUT",
      body: JSON.stringify({ default_notice_period_days: 30 }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
