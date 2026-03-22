// ============================================================================
// EMP-EXIT — OpenAPI / Swagger Documentation
// ============================================================================

import { Request, Response } from "express";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "EMP Exit API",
    version: "1.0.0",
    description:
      "Employee exit and offboarding module for the EMP HRMS ecosystem. Manages resignations, exit workflows, checklists, clearance, exit interviews, full & final settlement, asset returns, knowledge transfer, letters, alumni network, attrition analytics, and predictions.",
  },
  servers: [{ url: "http://localhost:3004", description: "Local development" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http" as const, scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ApiResponse: {
        type: "object" as const,
        properties: {
          success: { type: "boolean" },
          data: { type: "object" },
        },
      },
      Error: {
        type: "object" as const,
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } },
        },
      },
    },
  },
  paths: {
    // =========================================================================
    // AUTH
    // =========================================================================
    "/api/v1/auth/login": {
      post: { tags: ["Auth"], summary: "Login with email and password", security: [], responses: { "200": { description: "Login successful" } } },
    },
    "/api/v1/auth/register": {
      post: { tags: ["Auth"], summary: "Register a new organization", security: [], responses: { "201": { description: "Registered" } } },
    },
    "/api/v1/auth/sso": {
      post: { tags: ["Auth"], summary: "SSO authentication via EMP Cloud token", security: [], responses: { "200": { description: "SSO login successful" } } },
    },
    "/api/v1/auth/refresh-token": {
      post: { tags: ["Auth"], summary: "Refresh access token", security: [], responses: { "200": { description: "New tokens" } } },
    },

    // =========================================================================
    // EXITS
    // =========================================================================
    "/api/v1/exits": {
      get: {
        tags: ["Exits"],
        summary: "List exit requests (paginated)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "per_page", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Exit list" } },
      },
      post: { tags: ["Exits"], summary: "Initiate an exit/resignation", responses: { "201": { description: "Exit initiated" } } },
    },
    "/api/v1/exits/{id}": {
      get: {
        tags: ["Exits"],
        summary: "Get exit by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Exit data" } },
      },
      put: {
        tags: ["Exits"],
        summary: "Update exit details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Exit updated" } },
      },
    },
    "/api/v1/exits/{id}/approve": {
      post: {
        tags: ["Exits"],
        summary: "Approve exit request",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Exit approved" } },
      },
    },
    "/api/v1/exits/{id}/reject": {
      post: {
        tags: ["Exits"],
        summary: "Reject exit request",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Exit rejected" } },
      },
    },

    // =========================================================================
    // SELF-SERVICE
    // =========================================================================
    "/api/v1/self-service/resign": {
      post: { tags: ["Self-Service"], summary: "Submit resignation (employee self-service)", responses: { "201": { description: "Resignation submitted" } } },
    },
    "/api/v1/self-service/my-exit": {
      get: { tags: ["Self-Service"], summary: "Get my exit status", responses: { "200": { description: "Exit status" } } },
    },
    "/api/v1/self-service/checklist": {
      get: { tags: ["Self-Service"], summary: "Get my exit checklist", responses: { "200": { description: "Checklist data" } } },
    },
    "/api/v1/self-service/checklist/{itemId}/complete": {
      post: {
        tags: ["Self-Service"],
        summary: "Complete a checklist item",
        parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Item completed" } },
      },
    },
    "/api/v1/self-service/feedback": {
      post: { tags: ["Self-Service"], summary: "Submit exit feedback/survey", responses: { "201": { description: "Feedback submitted" } } },
    },
    "/api/v1/self-service/documents": {
      get: { tags: ["Self-Service"], summary: "Get my exit documents", responses: { "200": { description: "Document list" } } },
    },

    // =========================================================================
    // CHECKLISTS
    // =========================================================================
    "/api/v1/checklists/templates": {
      get: { tags: ["Checklists"], summary: "List checklist templates", responses: { "200": { description: "Template list" } } },
      post: { tags: ["Checklists"], summary: "Create checklist template", responses: { "201": { description: "Template created" } } },
    },
    "/api/v1/checklists/templates/{id}": {
      get: {
        tags: ["Checklists"],
        summary: "Get checklist template",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Template data" } },
      },
      put: {
        tags: ["Checklists"],
        summary: "Update checklist template",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Template updated" } },
      },
      delete: {
        tags: ["Checklists"],
        summary: "Delete checklist template",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Template deleted" } },
      },
    },
    "/api/v1/checklists/templates/{id}/items": {
      post: {
        tags: ["Checklists"],
        summary: "Add item to checklist template",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "Item added" } },
      },
    },
    "/api/v1/checklists/exit/{exitId}": {
      get: {
        tags: ["Checklists"],
        summary: "Get exit checklist with status",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Exit checklist" } },
      },
      post: {
        tags: ["Checklists"],
        summary: "Assign checklist to exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "Checklist assigned" } },
      },
    },
    "/api/v1/checklists/items/{itemId}/toggle": {
      patch: {
        tags: ["Checklists"],
        summary: "Toggle checklist item completion",
        parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Item toggled" } },
      },
    },

    // =========================================================================
    // CLEARANCE
    // =========================================================================
    "/api/v1/clearance/exit/{exitId}": {
      get: {
        tags: ["Clearance"],
        summary: "Get clearance status for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Clearance status" } },
      },
      post: {
        tags: ["Clearance"],
        summary: "Create clearance tasks for exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "Clearance tasks created" } },
      },
    },
    "/api/v1/clearance/{id}": {
      put: {
        tags: ["Clearance"],
        summary: "Update clearance task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Task updated" } },
      },
      delete: {
        tags: ["Clearance"],
        summary: "Delete clearance task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Task deleted" } },
      },
    },
    "/api/v1/clearance/{id}/approve": {
      post: {
        tags: ["Clearance"],
        summary: "Approve clearance task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Clearance approved" } },
      },
    },
    "/api/v1/clearance/my": {
      get: { tags: ["Clearance"], summary: "Get clearance tasks assigned to me", responses: { "200": { description: "My clearance tasks" } } },
    },
    "/api/v1/clearance/{id}/sign-off": {
      put: {
        tags: ["Clearance"],
        summary: "Sign off on clearance task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Signed off" } },
      },
    },
    "/api/v1/clearance/summary/{exitId}": {
      get: {
        tags: ["Clearance"],
        summary: "Get clearance summary for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Clearance summary" } },
      },
    },

    // =========================================================================
    // EXIT INTERVIEWS
    // =========================================================================
    "/api/v1/interviews/exit/{exitId}": {
      get: {
        tags: ["Exit Interviews"],
        summary: "List exit interviews for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Interview list" } },
      },
      post: {
        tags: ["Exit Interviews"],
        summary: "Schedule exit interview",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "Interview scheduled" } },
      },
    },
    "/api/v1/interviews/{id}": {
      get: {
        tags: ["Exit Interviews"],
        summary: "Get exit interview by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Interview data" } },
      },
      put: {
        tags: ["Exit Interviews"],
        summary: "Update exit interview",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Interview updated" } },
      },
      delete: {
        tags: ["Exit Interviews"],
        summary: "Cancel exit interview",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Interview cancelled" } },
      },
    },
    "/api/v1/interviews/{id}/feedback": {
      post: {
        tags: ["Exit Interviews"],
        summary: "Submit exit interview feedback",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "Feedback submitted" } },
      },
    },
    "/api/v1/interviews/{id}/complete": {
      post: {
        tags: ["Exit Interviews"],
        summary: "Complete exit interview",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Interview completed" } },
      },
    },
    "/api/v1/interviews/analytics": {
      get: { tags: ["Exit Interviews"], summary: "Exit interview analytics", responses: { "200": { description: "Interview analytics" } } },
    },

    // =========================================================================
    // F&F (Full & Final Settlement)
    // =========================================================================
    "/api/v1/fnf/exit/{exitId}": {
      post: {
        tags: ["F&F"],
        summary: "Generate F&F settlement for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "F&F generated" } },
      },
      get: {
        tags: ["F&F"],
        summary: "Get F&F settlement details",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "F&F data" } },
      },
    },
    "/api/v1/fnf/{id}": {
      put: {
        tags: ["F&F"],
        summary: "Update F&F settlement",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "F&F updated" } },
      },
    },
    "/api/v1/fnf/{id}/approve": {
      post: {
        tags: ["F&F"],
        summary: "Approve F&F settlement",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "F&F approved" } },
      },
    },
    "/api/v1/fnf/{id}/process": {
      post: {
        tags: ["F&F"],
        summary: "Process F&F payment",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "F&F processed" } },
      },
    },

    // =========================================================================
    // ASSETS
    // =========================================================================
    "/api/v1/assets/exit/{exitId}": {
      get: {
        tags: ["Assets"],
        summary: "List assets to return for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Asset list" } },
      },
      post: {
        tags: ["Assets"],
        summary: "Add asset to return list",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "Asset added" } },
      },
    },
    "/api/v1/assets/{assetId}": {
      put: {
        tags: ["Assets"],
        summary: "Update asset return status",
        parameters: [{ name: "assetId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Asset updated" } },
      },
    },

    // =========================================================================
    // KNOWLEDGE TRANSFER
    // =========================================================================
    "/api/v1/kt/exit/{exitId}": {
      get: {
        tags: ["Knowledge Transfer"],
        summary: "Get KT plan for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "KT plan" } },
      },
      post: {
        tags: ["Knowledge Transfer"],
        summary: "Create KT plan for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "KT plan created" } },
      },
      put: {
        tags: ["Knowledge Transfer"],
        summary: "Update KT plan",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "KT plan updated" } },
      },
    },
    "/api/v1/kt/exit/{exitId}/items": {
      post: {
        tags: ["Knowledge Transfer"],
        summary: "Add KT item",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "201": { description: "KT item added" } },
      },
    },
    "/api/v1/kt/items/{itemId}": {
      put: {
        tags: ["Knowledge Transfer"],
        summary: "Update KT item",
        parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "KT item updated" } },
      },
    },

    // =========================================================================
    // LETTERS
    // =========================================================================
    "/api/v1/letters/templates": {
      get: { tags: ["Letters"], summary: "List letter templates", responses: { "200": { description: "Template list" } } },
      post: { tags: ["Letters"], summary: "Create letter template", responses: { "201": { description: "Template created" } } },
    },
    "/api/v1/letters/templates/{id}": {
      put: {
        tags: ["Letters"],
        summary: "Update letter template",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Template updated" } },
      },
    },
    "/api/v1/letters/generate": {
      post: { tags: ["Letters"], summary: "Generate a letter from template", responses: { "201": { description: "Letter generated" } } },
    },
    "/api/v1/letters/exit/{exitId}": {
      get: {
        tags: ["Letters"],
        summary: "List letters for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Letter list" } },
      },
    },
    "/api/v1/letters/{letterId}/download": {
      get: {
        tags: ["Letters"],
        summary: "Download a letter",
        parameters: [{ name: "letterId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Letter file" } },
      },
    },
    "/api/v1/letters/{letterId}/send": {
      post: {
        tags: ["Letters"],
        summary: "Send letter via email",
        parameters: [{ name: "letterId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Letter sent" } },
      },
    },

    // =========================================================================
    // ALUMNI
    // =========================================================================
    "/api/v1/alumni": {
      get: { tags: ["Alumni"], summary: "List alumni directory (paginated)", responses: { "200": { description: "Alumni list" } } },
    },
    "/api/v1/alumni/opt-in": {
      post: { tags: ["Alumni"], summary: "Opt in to alumni network", responses: { "201": { description: "Opted in" } } },
    },
    "/api/v1/alumni/{id}": {
      get: {
        tags: ["Alumni"],
        summary: "Get alumni profile",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Alumni profile" } },
      },
    },
    "/api/v1/alumni/my": {
      put: { tags: ["Alumni"], summary: "Update my alumni profile", responses: { "200": { description: "Profile updated" } } },
    },

    // =========================================================================
    // ANALYTICS
    // =========================================================================
    "/api/v1/analytics/attrition": {
      get: { tags: ["Analytics"], summary: "Attrition rate analytics", responses: { "200": { description: "Attrition data" } } },
    },
    "/api/v1/analytics/reasons": {
      get: { tags: ["Analytics"], summary: "Exit reasons breakdown", responses: { "200": { description: "Reason data" } } },
    },
    "/api/v1/analytics/departments": {
      get: { tags: ["Analytics"], summary: "Attrition by department", responses: { "200": { description: "Department data" } } },
    },
    "/api/v1/analytics/tenure": {
      get: { tags: ["Analytics"], summary: "Attrition by tenure bracket", responses: { "200": { description: "Tenure data" } } },
    },
    "/api/v1/analytics/rehire-pool": {
      get: { tags: ["Analytics"], summary: "Rehire-eligible alumni pool", responses: { "200": { description: "Rehire pool data" } } },
    },

    // =========================================================================
    // PREDICTIONS
    // =========================================================================
    "/api/v1/predictions/dashboard": {
      get: { tags: ["Predictions"], summary: "Flight risk prediction dashboard", responses: { "200": { description: "Prediction dashboard" } } },
    },
    "/api/v1/predictions/high-risk": {
      get: { tags: ["Predictions"], summary: "List high-risk employees", responses: { "200": { description: "High-risk list" } } },
    },
    "/api/v1/predictions/employee/{employeeId}": {
      get: {
        tags: ["Predictions"],
        summary: "Get flight risk for a specific employee",
        parameters: [{ name: "employeeId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Employee prediction" } },
      },
    },
    "/api/v1/predictions/calculate": {
      post: { tags: ["Predictions"], summary: "Trigger prediction recalculation", responses: { "200": { description: "Calculation triggered" } } },
    },
    "/api/v1/predictions/trends": {
      get: { tags: ["Predictions"], summary: "Prediction trends over time", responses: { "200": { description: "Trend data" } } },
    },

    // =========================================================================
    // BUYOUT
    // =========================================================================
    "/api/v1/buyout/calculate": {
      post: { tags: ["Buyout"], summary: "Calculate notice period buyout amount", responses: { "200": { description: "Buyout calculation" } } },
    },
    "/api/v1/buyout/request": {
      post: { tags: ["Buyout"], summary: "Submit buyout request", responses: { "201": { description: "Buyout requested" } } },
    },
    "/api/v1/buyout/exit/{exitId}": {
      get: {
        tags: ["Buyout"],
        summary: "Get buyout details for an exit",
        parameters: [{ name: "exitId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Buyout data" } },
      },
    },
    "/api/v1/buyout": {
      get: { tags: ["Buyout"], summary: "List buyout requests (paginated)", responses: { "200": { description: "Buyout list" } } },
    },
    "/api/v1/buyout/{id}/approve": {
      post: {
        tags: ["Buyout"],
        summary: "Approve buyout request",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Buyout approved" } },
      },
    },
    "/api/v1/buyout/{id}/reject": {
      post: {
        tags: ["Buyout"],
        summary: "Reject buyout request",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Buyout rejected" } },
      },
    },

    // =========================================================================
    // SETTINGS
    // =========================================================================
    "/api/v1/settings": {
      get: { tags: ["Settings"], summary: "Get exit module settings", responses: { "200": { description: "Settings data" } } },
      put: { tags: ["Settings"], summary: "Update exit module settings (admin)", responses: { "200": { description: "Settings updated" } } },
    },

    // =========================================================================
    // HEALTH
    // =========================================================================
    "/health": {
      get: { tags: ["Health"], summary: "Health check", security: [], responses: { "200": { description: "Server is healthy" } } },
    },
  },
};

export function swaggerUIHandler(_req: Request, res: Response) {
  res.send(`<!DOCTYPE html>
<html><head><title>EMP Exit API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/docs/openapi.json', dom_id: '#swagger-ui' })</script>
</body></html>`);
}

export function openapiHandler(_req: Request, res: Response) {
  res.json(spec);
}
