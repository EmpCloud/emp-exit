// ============================================================================
// SETTINGS SERVICE
// Manages per-organization exit settings.
// ============================================================================

import { getDB } from "../../db/adapters";
import { logger } from "../../utils/logger";

interface UpdateSettingsData {
  default_notice_period_days?: number;
  auto_initiate_clearance?: boolean;
  require_exit_interview?: boolean;
  fnf_approval_required?: boolean;
  alumni_opt_in_default?: boolean;
  email_on_exit_initiated?: boolean;
  email_on_clearance_pending?: boolean;
  email_on_clearance_completed?: boolean;
  email_on_fnf_calculated?: boolean;
  email_on_fnf_approved?: boolean;
  email_on_exit_completed?: boolean;
}

export async function getSettings(orgId: number) {
  const db = getDB();

  let settings = await db.findOne("exit_settings", {
    organization_id: orgId,
  });

  // Auto-create default settings if not found
  if (!settings) {
    settings = await db.create("exit_settings", {
      organization_id: orgId,
      default_notice_period_days: 30,
      auto_initiate_clearance: true,
      require_exit_interview: true,
      fnf_approval_required: true,
      alumni_opt_in_default: true,
    });
    logger.info(`Default exit settings created for org ${orgId}`);
  }

  return settings;
}

export async function updateSettings(orgId: number, data: UpdateSettingsData) {
  const db = getDB();

  // Ensure settings exist
  let settings = await db.findOne<any>("exit_settings", {
    organization_id: orgId,
  });

  if (!settings) {
    // Create with provided data merged into defaults
    settings = await db.create("exit_settings", {
      organization_id: orgId,
      default_notice_period_days: data.default_notice_period_days ?? 30,
      auto_initiate_clearance: data.auto_initiate_clearance ?? true,
      require_exit_interview: data.require_exit_interview ?? true,
      fnf_approval_required: data.fnf_approval_required ?? true,
      alumni_opt_in_default: data.alumni_opt_in_default ?? true,
    });
    logger.info(`Exit settings created for org ${orgId}`);
    return settings;
  }

  const updated = await db.update("exit_settings", settings.id, data);
  logger.info(`Exit settings updated for org ${orgId}`);
  return updated;
}
