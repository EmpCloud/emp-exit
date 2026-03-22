// ============================================================================
// EMP-EXIT SHARED TYPES
// These types are the single source of truth for both server and client.
// ============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum ExitType {
  RESIGNATION = "resignation",
  TERMINATION = "termination",
  RETIREMENT = "retirement",
  END_OF_CONTRACT = "end_of_contract",
  MUTUAL_SEPARATION = "mutual_separation",
}

export enum ExitStatus {
  INITIATED = "initiated",
  NOTICE_PERIOD = "notice_period",
  CLEARANCE_PENDING = "clearance_pending",
  FNF_PENDING = "fnf_pending",
  FNF_PROCESSED = "fnf_processed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ReasonCategory {
  BETTER_OPPORTUNITY = "better_opportunity",
  COMPENSATION = "compensation",
  RELOCATION = "relocation",
  PERSONAL = "personal",
  HEALTH = "health",
  HIGHER_EDUCATION = "higher_education",
  RETIREMENT = "retirement",
  PERFORMANCE = "performance",
  MISCONDUCT = "misconduct",
  REDUNDANCY = "redundancy",
  OTHER = "other",
}

export enum ChecklistItemStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  WAIVED = "waived",
  NA = "na",
}

export enum ClearanceStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  WAIVED = "waived",
}

export enum InterviewQuestionType {
  TEXT = "text",
  RATING = "rating",
  MULTIPLE_CHOICE = "multiple_choice",
  YES_NO = "yes_no",
}

export enum InterviewStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}

export enum FnFStatus {
  DRAFT = "draft",
  CALCULATED = "calculated",
  APPROVED = "approved",
  PAID = "paid",
}

export enum AssetCategory {
  LAPTOP = "laptop",
  PHONE = "phone",
  ID_CARD = "id_card",
  ACCESS_CARD = "access_card",
  VEHICLE = "vehicle",
  FURNITURE = "furniture",
  OTHER = "other",
}

export enum AssetReturnStatus {
  PENDING = "pending",
  RETURNED = "returned",
  DAMAGED = "damaged",
  LOST = "lost",
  WAIVED = "waived",
}

export enum KTStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export enum LetterType {
  EXPERIENCE = "experience",
  RELIEVING = "relieving",
  SERVICE_CERTIFICATE = "service_certificate",
  NOC = "noc",
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ExitSettings {
  id: string;
  organization_id: number;
  default_notice_period_days: number;
  auto_initiate_clearance: boolean;
  require_exit_interview: boolean;
  fnf_approval_required: boolean;
  alumni_opt_in_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExitRequest {
  id: string;
  organization_id: number;
  employee_id: number;
  exit_type: ExitType;
  status: ExitStatus;
  reason_category: ReasonCategory;
  reason_detail: string | null;
  initiated_by: number;
  approved_by: number | null;
  resignation_date: string | null;
  notice_start_date: string | null;
  last_working_date: string | null;
  actual_exit_date: string | null;
  notice_period_days: number;
  notice_period_waived: boolean;
  revoke_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitChecklistTemplate {
  id: string;
  organization_id: number;
  name: string;
  description: string | null;
  exit_type: ExitType | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExitChecklistTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  assigned_role: string | null;
  assigned_department_id: number | null;
  sort_order: number;
  is_mandatory: boolean;
  created_at: string;
}

export interface ExitChecklistInstance {
  id: string;
  exit_request_id: string;
  template_item_id: string | null;
  title: string;
  description: string | null;
  status: ChecklistItemStatus;
  assigned_to: number | null;
  completed_by: number | null;
  completed_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClearanceDepartment {
  id: string;
  organization_id: number;
  name: string;
  approver_role: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClearanceRecord {
  id: string;
  exit_request_id: string;
  department_id: string;
  status: ClearanceStatus;
  approved_by: number | null;
  approved_at: string | null;
  remarks: string | null;
  pending_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ExitInterviewTemplate {
  id: string;
  organization_id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExitInterviewQuestion {
  id: string;
  template_id: string;
  question_text: string;
  question_type: InterviewQuestionType;
  options: string | null;
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export interface ExitInterview {
  id: string;
  exit_request_id: string;
  template_id: string | null;
  interviewer_id: number | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: InterviewStatus;
  overall_rating: number | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitInterviewResponse {
  id: string;
  interview_id: string;
  question_id: string;
  answer_text: string | null;
  answer_rating: number | null;
  created_at: string;
}

export interface FnFSettlement {
  id: string;
  exit_request_id: string;
  status: FnFStatus;
  basic_salary_due: number;
  leave_encashment: number;
  bonus_due: number;
  gratuity: number;
  notice_pay_recovery: number;
  other_deductions: number;
  other_earnings: number;
  total_payable: number;
  calculated_by: number | null;
  approved_by: number | null;
  paid_date: string | null;
  remarks: string | null;
  breakdown_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetReturn {
  id: string;
  exit_request_id: string;
  category: AssetCategory;
  asset_name: string;
  asset_tag: string | null;
  status: AssetReturnStatus;
  assigned_date: string | null;
  returned_date: string | null;
  verified_by: number | null;
  condition_notes: string | null;
  replacement_cost: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeTransfer {
  id: string;
  exit_request_id: string;
  assignee_id: number | null;
  status: KTStatus;
  due_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KTItem {
  id: string;
  kt_id: string;
  title: string;
  description: string | null;
  status: KTStatus;
  document_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LetterTemplate {
  id: string;
  organization_id: number;
  letter_type: LetterType;
  name: string;
  body_template: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedLetter {
  id: string;
  exit_request_id: string;
  template_id: string | null;
  letter_type: LetterType;
  generated_body: string;
  generated_by: number;
  issued_date: string | null;
  file_path: string | null;
  created_at: string;
}

export interface AlumniProfile {
  id: string;
  exit_request_id: string;
  employee_id: number;
  organization_id: number;
  personal_email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  opted_in: boolean;
  last_designation: string | null;
  last_department: string | null;
  exit_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: number;
  exit_request_id: string | null;
  actor_id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API Envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface AuthPayload {
  empcloudUserId: number;
  empcloudOrgId: number;
  exitProfileId: string | null;
  role: "super_admin" | "org_admin" | "hr_admin" | "hr_manager" | "employee";
  email: string;
  firstName: string;
  lastName: string;
  orgName: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
