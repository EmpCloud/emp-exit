// ============================================================================
// EMP-EXIT ZOD VALIDATORS
// ============================================================================

import { z } from "zod";
import {
  ExitType,
  ExitStatus,
  ReasonCategory,
  ChecklistItemStatus,
  ClearanceStatus,
  InterviewQuestionType,
  InterviewStatus,
  FnFStatus,
  AssetCategory,
  AssetReturnStatus,
  KTStatus,
  LetterType,
} from "../types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Exit Requests
// ---------------------------------------------------------------------------

export const initiateExitSchema = z.object({
  employee_id: z.number().int().positive(),
  exit_type: z.nativeEnum(ExitType),
  reason_category: z.nativeEnum(ReasonCategory),
  reason_detail: z.string().max(2000).optional(),
  resignation_date: z.string().optional(),
  last_working_date: z.string().optional(),
  notice_period_days: z.number().int().min(0).optional(),
  notice_period_waived: z.boolean().optional(),
});

export const updateExitSchema = z.object({
  status: z.nativeEnum(ExitStatus).optional(),
  reason_category: z.nativeEnum(ReasonCategory).optional(),
  reason_detail: z.string().max(2000).optional(),
  notice_start_date: z.string().optional(),
  last_working_date: z.string().optional(),
  actual_exit_date: z.string().optional(),
  notice_period_days: z.number().int().min(0).optional(),
  notice_period_waived: z.boolean().optional(),
  revoke_reason: z.string().max(1000).optional(),
});

export const submitResignationSchema = z.object({
  reason_category: z.nativeEnum(ReasonCategory),
  reason_detail: z.string().max(2000).optional(),
  resignation_date: z.string(),
  last_working_date: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Checklist Templates
// ---------------------------------------------------------------------------

export const createChecklistTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  exit_type: z.nativeEnum(ExitType).optional(),
  is_default: z.boolean().optional(),
});

export const addTemplateItemSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  assigned_role: z.string().max(50).optional(),
  assigned_department_id: z.number().int().positive().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_mandatory: z.boolean().optional(),
});

export const updateChecklistItemSchema = z.object({
  status: z.nativeEnum(ChecklistItemStatus).optional(),
  remarks: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Clearance
// ---------------------------------------------------------------------------

export const createClearanceDeptSchema = z.object({
  name: z.string().min(1).max(200),
  approver_role: z.string().max(50).optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const updateClearanceSchema = z.object({
  status: z.nativeEnum(ClearanceStatus),
  remarks: z.string().max(1000).optional(),
  pending_amount: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Exit Interviews
// ---------------------------------------------------------------------------

export const createInterviewTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  is_default: z.boolean().optional(),
});

export const addInterviewQuestionSchema = z.object({
  question_text: z.string().min(1).max(1000),
  question_type: z.nativeEnum(InterviewQuestionType),
  options: z.string().max(2000).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_required: z.boolean().optional(),
});

export const submitInterviewResponseSchema = z.object({
  responses: z.array(
    z.object({
      question_id: z.string().uuid(),
      answer_text: z.string().max(5000).optional(),
      answer_rating: z.number().int().min(1).max(10).optional(),
    })
  ),
  overall_rating: z.number().int().min(1).max(10).optional(),
  summary: z.string().max(5000).optional(),
});

// ---------------------------------------------------------------------------
// FnF Settlement
// ---------------------------------------------------------------------------

export const calculateFnFSchema = z.object({
  basic_salary_due: z.number().min(0).optional(),
  leave_encashment: z.number().min(0).optional(),
  bonus_due: z.number().min(0).optional(),
  gratuity: z.number().min(0).optional(),
  notice_pay_recovery: z.number().min(0).optional(),
  other_deductions: z.number().min(0).optional(),
  other_earnings: z.number().min(0).optional(),
  remarks: z.string().max(2000).optional(),
  breakdown_json: z.string().optional(),
});

export const updateFnFSchema = z.object({
  status: z.nativeEnum(FnFStatus).optional(),
  basic_salary_due: z.number().min(0).optional(),
  leave_encashment: z.number().min(0).optional(),
  bonus_due: z.number().min(0).optional(),
  gratuity: z.number().min(0).optional(),
  notice_pay_recovery: z.number().min(0).optional(),
  other_deductions: z.number().min(0).optional(),
  other_earnings: z.number().min(0).optional(),
  remarks: z.string().max(2000).optional(),
  paid_date: z.string().optional(),
  breakdown_json: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Asset Returns
// ---------------------------------------------------------------------------

export const addAssetReturnSchema = z.object({
  category: z.nativeEnum(AssetCategory),
  asset_name: z.string().min(1).max(200),
  asset_tag: z.string().max(100).optional(),
  assigned_date: z.string().optional(),
  replacement_cost: z.number().min(0).optional(),
});

export const updateAssetSchema = z.object({
  status: z.nativeEnum(AssetReturnStatus).optional(),
  returned_date: z.string().optional(),
  condition_notes: z.string().max(1000).optional(),
  replacement_cost: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Knowledge Transfer
// ---------------------------------------------------------------------------

export const createKTSchema = z.object({
  assignee_id: z.number().int().positive().optional(),
  due_date: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const addKTItemSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  document_url: z.string().url().max(500).optional(),
});

export const updateKTItemSchema = z.object({
  status: z.nativeEnum(KTStatus).optional(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  document_url: z.string().url().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Letters
// ---------------------------------------------------------------------------

export const createLetterTemplateSchema = z.object({
  letter_type: z.nativeEnum(LetterType),
  name: z.string().min(1).max(200),
  body_template: z.string().min(1),
  is_default: z.boolean().optional(),
});

export const generateLetterSchema = z.object({
  template_id: z.string().uuid().optional(),
  letter_type: z.nativeEnum(LetterType),
});

// ---------------------------------------------------------------------------
// Alumni
// ---------------------------------------------------------------------------

export const updateAlumniSchema = z.object({
  personal_email: z.string().email().max(200).optional(),
  phone: z.string().max(20).optional(),
  linkedin_url: z.string().url().max(300).optional(),
  opted_in: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const updateSettingsSchema = z.object({
  default_notice_period_days: z.number().int().min(0).max(365).optional(),
  auto_initiate_clearance: z.boolean().optional(),
  require_exit_interview: z.boolean().optional(),
  fnf_approval_required: z.boolean().optional(),
  alumni_opt_in_default: z.boolean().optional(),
});
