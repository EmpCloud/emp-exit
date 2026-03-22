// ============================================================================
// KNOWLEDGE TRANSFER SERVICE
// Manages KT plans and items for exiting employees.
// ============================================================================

import { getDB } from "../../db/adapters";
import { NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";

export async function createKT(
  orgId: number,
  exitRequestId: string,
  assigneeId?: number,
  dueDate?: string,
) {
  const db = getDB();

  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const kt = await db.create("knowledge_transfers", {
    exit_request_id: exitRequestId,
    assignee_id: assigneeId || null,
    due_date: dueDate || null,
    status: "not_started",
  });

  logger.info(`KT plan created for exit ${exitRequestId}`);
  return kt;
}

export async function getKT(orgId: number, exitRequestId: string) {
  const db = getDB();

  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const kt = await db.findOne<any>("knowledge_transfers", {
    exit_request_id: exitRequestId,
  });
  if (!kt) {
    return null;
  }

  // Fetch items
  const itemsResult = await db.findMany("kt_items", {
    filters: { kt_id: kt.id },
    limit: 200,
    sort: { field: "created_at", order: "asc" },
  });

  return { ...kt, items: itemsResult.data };
}

export async function updateKT(
  orgId: number,
  exitRequestId: string,
  data: { assignee_id?: number; status?: string },
) {
  const db = getDB();

  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const kt = await db.findOne<any>("knowledge_transfers", {
    exit_request_id: exitRequestId,
  });
  if (!kt) {
    throw new NotFoundError("Knowledge transfer plan");
  }

  const updateData: Record<string, any> = {};
  if (data.assignee_id !== undefined) updateData.assignee_id = data.assignee_id;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "completed") {
      updateData.completed_date = new Date().toISOString().split("T")[0];
    }
  }

  const updated = await db.update("knowledge_transfers", kt.id, updateData);
  logger.info(`KT plan updated for exit ${exitRequestId}`);
  return updated;
}

export async function addItem(
  orgId: number,
  ktId: string,
  data: { title: string; description?: string; document_url?: string },
) {
  const db = getDB();

  const kt = await db.findById<any>("knowledge_transfers", ktId);
  if (!kt) {
    throw new NotFoundError("Knowledge transfer plan", ktId);
  }

  // Verify org ownership via exit request
  const exit = await db.findOne("exit_requests", {
    id: kt.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Knowledge transfer plan", ktId);
  }

  const item = await db.create("kt_items", {
    kt_id: ktId,
    title: data.title,
    description: data.description || null,
    document_url: data.document_url || null,
    status: "not_started",
  });

  // Update KT status to in_progress if still not_started
  if (kt.status === "not_started") {
    await db.update("knowledge_transfers", ktId, { status: "in_progress" });
  }

  logger.info(`KT item added: ${data.title} to KT ${ktId}`);
  return item;
}

export async function updateItem(
  orgId: number,
  itemId: string,
  data: { status?: string; completed_at?: string },
) {
  const db = getDB();

  const item = await db.findById<any>("kt_items", itemId);
  if (!item) {
    throw new NotFoundError("KT item", itemId);
  }

  // Verify org ownership
  const kt = await db.findById<any>("knowledge_transfers", item.kt_id);
  if (!kt) {
    throw new NotFoundError("KT item", itemId);
  }
  const exit = await db.findOne("exit_requests", {
    id: kt.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("KT item", itemId);
  }

  const updateData: Record<string, any> = {};
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "completed") {
      updateData.completed_at = data.completed_at || new Date().toISOString();
    }
  }

  const updated = await db.update("kt_items", itemId, updateData);
  logger.info(`KT item updated: ${itemId} status=${data.status || "unchanged"}`);
  return updated;
}
