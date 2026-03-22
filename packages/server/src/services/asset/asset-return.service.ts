// ============================================================================
// ASSET RETURN SERVICE
// Manages company asset returns for exiting employees.
// ============================================================================

import { getDB } from "../../db/adapters";
import { NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";

interface AddAssetData {
  asset_name: string;
  asset_tag?: string;
  category: string;
  replacement_cost?: number;
  assigned_date?: string;
}

interface UpdateAssetData {
  status?: string;
  returned_date?: string;
  verified_by?: number;
  condition_notes?: string;
  replacement_cost?: number;
}

export async function addAsset(
  orgId: number,
  exitRequestId: string,
  data: AddAssetData,
) {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const asset = await db.create("asset_returns", {
    exit_request_id: exitRequestId,
    asset_name: data.asset_name,
    asset_tag: data.asset_tag || null,
    category: data.category,
    replacement_cost: data.replacement_cost || 0,
    assigned_date: data.assigned_date || null,
    status: "pending",
  });

  logger.info(`Asset added: ${data.asset_name} for exit ${exitRequestId}`);
  return asset;
}

export async function listAssets(orgId: number, exitRequestId: string) {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const result = await db.findMany("asset_returns", {
    filters: { exit_request_id: exitRequestId },
    limit: 100,
    sort: { field: "created_at", order: "asc" },
  });

  return result.data;
}

export async function updateAsset(
  orgId: number,
  assetId: string,
  data: UpdateAssetData,
) {
  const db = getDB();

  // Verify asset exists and belongs to org (via exit request)
  const asset = await db.findById<any>("asset_returns", assetId);
  if (!asset) {
    throw new NotFoundError("Asset", assetId);
  }

  const exit = await db.findOne("exit_requests", {
    id: asset.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Asset", assetId);
  }

  const updated = await db.update("asset_returns", assetId, data);
  logger.info(`Asset updated: ${assetId} status=${data.status || "unchanged"}`);
  return updated;
}
