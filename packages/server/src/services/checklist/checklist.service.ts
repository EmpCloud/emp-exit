// ============================================================================
// CHECKLIST SERVICE
// Business logic for checklist templates and exit checklist instances.
// ============================================================================

import { getDB } from "../../db/adapters";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import type {
  ExitChecklistTemplate,
  ExitChecklistTemplateItem,
  ExitChecklistInstance,
  ChecklistItemStatus,
} from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// Template CRUD
// ---------------------------------------------------------------------------

export async function createTemplate(
  orgId: number,
  data: { name: string; description?: string; exit_type?: string; is_default?: boolean },
): Promise<ExitChecklistTemplate> {
  const db = getDB();

  // If marking as default, unset other defaults for this org (optionally per exit_type)
  if (data.is_default) {
    const filters: Record<string, any> = { organization_id: orgId, is_default: true };
    if (data.exit_type) {
      filters.exit_type = data.exit_type;
    }
    await db.updateMany("exit_checklist_templates", filters, { is_default: false });
  }

  const template = await db.create<ExitChecklistTemplate>("exit_checklist_templates", {
    organization_id: orgId,
    name: data.name,
    description: data.description || null,
    exit_type: data.exit_type || null,
    is_default: data.is_default || false,
    is_active: true,
  } as any);

  logger.info(`Checklist template '${data.name}' created for org ${orgId}`);
  return template;
}

export async function listTemplates(orgId: number) {
  const db = getDB();
  const result = await db.findMany<ExitChecklistTemplate>("exit_checklist_templates", {
    filters: { organization_id: orgId },
    sort: { field: "created_at", order: "desc" },
    limit: 100,
  });

  // Attach item counts
  const templates = await Promise.all(
    result.data.map(async (tmpl) => {
      const itemCount = await db.count("exit_checklist_template_items", { template_id: tmpl.id });
      return { ...tmpl, item_count: itemCount };
    }),
  );

  return templates;
}

export async function getTemplate(orgId: number, id: string) {
  const db = getDB();

  const template = await db.findOne<ExitChecklistTemplate>("exit_checklist_templates", {
    id,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Checklist template", id);
  }

  const itemsResult = await db.findMany<ExitChecklistTemplateItem>("exit_checklist_template_items", {
    filters: { template_id: id },
    sort: { field: "sort_order", order: "asc" },
    limit: 200,
  });

  return {
    ...template,
    items: itemsResult.data,
  };
}

export async function updateTemplate(
  orgId: number,
  id: string,
  data: { name?: string; description?: string; exit_type?: string; is_default?: boolean; is_active?: boolean },
): Promise<ExitChecklistTemplate> {
  const db = getDB();

  const template = await db.findOne<ExitChecklistTemplate>("exit_checklist_templates", {
    id,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Checklist template", id);
  }

  if (data.is_default) {
    const filters: Record<string, any> = { organization_id: orgId, is_default: true };
    await db.updateMany("exit_checklist_templates", filters, { is_default: false });
  }

  const updated = await db.update<ExitChecklistTemplate>("exit_checklist_templates", id, data as any);
  logger.info(`Checklist template ${id} updated in org ${orgId}`);
  return updated;
}

export async function deleteTemplate(orgId: number, id: string): Promise<boolean> {
  const db = getDB();

  const template = await db.findOne<ExitChecklistTemplate>("exit_checklist_templates", {
    id,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Checklist template", id);
  }

  await db.delete("exit_checklist_templates", id);
  logger.info(`Checklist template ${id} deleted from org ${orgId}`);
  return true;
}

// ---------------------------------------------------------------------------
// Template Items
// ---------------------------------------------------------------------------

export async function addTemplateItem(
  orgId: number,
  templateId: string,
  data: {
    title: string;
    description?: string;
    assigned_role?: string;
    assigned_department_id?: number;
    sort_order?: number;
    is_mandatory?: boolean;
  },
): Promise<ExitChecklistTemplateItem> {
  const db = getDB();

  const template = await db.findOne<ExitChecklistTemplate>("exit_checklist_templates", {
    id: templateId,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Checklist template", templateId);
  }

  // Auto-assign sort_order if not provided
  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const count = await db.count("exit_checklist_template_items", { template_id: templateId });
    sortOrder = count;
  }

  const item = await db.create<ExitChecklistTemplateItem>("exit_checklist_template_items", {
    template_id: templateId,
    title: data.title,
    description: data.description || null,
    assigned_role: data.assigned_role || null,
    assigned_department_id: data.assigned_department_id || null,
    sort_order: sortOrder,
    is_mandatory: data.is_mandatory !== undefined ? data.is_mandatory : true,
  } as any);

  logger.info(`Item '${data.title}' added to checklist template ${templateId}`);
  return item;
}

export async function updateTemplateItem(
  orgId: number,
  itemId: string,
  data: {
    title?: string;
    description?: string;
    assigned_role?: string;
    assigned_department_id?: number;
    sort_order?: number;
    is_mandatory?: boolean;
  },
): Promise<ExitChecklistTemplateItem> {
  const db = getDB();

  const item = await db.findById<ExitChecklistTemplateItem>("exit_checklist_template_items", itemId);
  if (!item) {
    throw new NotFoundError("Template item", itemId);
  }

  // Verify template belongs to org
  const template = await db.findOne<ExitChecklistTemplate>("exit_checklist_templates", {
    id: item.template_id,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Checklist template", item.template_id);
  }

  const updated = await db.update<ExitChecklistTemplateItem>(
    "exit_checklist_template_items",
    itemId,
    data as any,
  );
  return updated;
}

export async function removeTemplateItem(orgId: number, itemId: string): Promise<boolean> {
  const db = getDB();

  const item = await db.findById<ExitChecklistTemplateItem>("exit_checklist_template_items", itemId);
  if (!item) {
    throw new NotFoundError("Template item", itemId);
  }

  // Verify template belongs to org
  const template = await db.findOne<ExitChecklistTemplate>("exit_checklist_templates", {
    id: item.template_id,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Checklist template", item.template_id);
  }

  await db.delete("exit_checklist_template_items", itemId);
  logger.info(`Template item ${itemId} removed from template ${item.template_id}`);
  return true;
}

// ---------------------------------------------------------------------------
// Checklist Instances (per exit)
// ---------------------------------------------------------------------------

export async function generateChecklist(
  orgId: number,
  exitRequestId: string,
  templateId: string,
): Promise<ExitChecklistInstance[]> {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  // Get template with items
  const template = await getTemplate(orgId, templateId);

  if (template.items.length === 0) {
    throw new ValidationError("Template has no items to generate checklist from");
  }

  // Remove existing checklist items for this exit
  await db.deleteMany("exit_checklist_instances", { exit_request_id: exitRequestId });

  // Create instances from template items
  const instancesData = template.items.map((item) => ({
    exit_request_id: exitRequestId,
    template_item_id: item.id,
    title: item.title,
    description: item.description,
    status: "pending" as ChecklistItemStatus,
    assigned_to: null,
  }));

  const instances = await db.createMany<ExitChecklistInstance>("exit_checklist_instances", instancesData as any);
  logger.info(`Generated ${instances.length} checklist items for exit ${exitRequestId} from template ${templateId}`);

  return instances;
}

export async function getChecklist(orgId: number, exitRequestId: string) {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const result = await db.findMany<ExitChecklistInstance>("exit_checklist_instances", {
    filters: { exit_request_id: exitRequestId },
    sort: { field: "created_at", order: "asc" },
    limit: 200,
  });

  const total = result.data.length;
  const completed = result.data.filter(
    (i) => i.status === "completed" || i.status === "waived" || i.status === "na",
  ).length;

  return {
    items: result.data,
    total,
    completed,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function updateChecklistItem(
  orgId: number,
  itemId: string,
  data: { status?: ChecklistItemStatus; remarks?: string },
  userId?: number,
): Promise<ExitChecklistInstance> {
  const db = getDB();

  const item = await db.findById<ExitChecklistInstance>("exit_checklist_instances", itemId);
  if (!item) {
    throw new NotFoundError("Checklist item", itemId);
  }

  // Verify exit belongs to org
  const exit = await db.findOne<any>("exit_requests", {
    id: item.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", item.exit_request_id);
  }

  const updateData: Record<string, any> = {};
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "completed") {
      updateData.completed_by = userId || null;
      updateData.completed_at = new Date();
    }
  }
  if (data.remarks !== undefined) {
    updateData.remarks = data.remarks;
  }

  const updated = await db.update<ExitChecklistInstance>("exit_checklist_instances", itemId, updateData);
  logger.info(`Checklist item ${itemId} updated to status '${data.status}'`);
  return updated;
}
