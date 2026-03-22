// ============================================================================
// EMP-EXIT CONSTANTS
// ============================================================================

import {
  ExitType,
  ReasonCategory,
  AssetCategory,
  ExitStatus,
  ClearanceStatus,
  FnFStatus,
  LetterType,
} from "../types";

// ---------------------------------------------------------------------------
// Exit Types
// ---------------------------------------------------------------------------

export const EXIT_TYPES = [
  { key: ExitType.RESIGNATION, label: "Resignation", color: "#F59E0B" },
  { key: ExitType.TERMINATION, label: "Termination", color: "#EF4444" },
  { key: ExitType.RETIREMENT, label: "Retirement", color: "#8B5CF6" },
  { key: ExitType.END_OF_CONTRACT, label: "End of Contract", color: "#3B82F6" },
  { key: ExitType.MUTUAL_SEPARATION, label: "Mutual Separation", color: "#6B7280" },
] as const;

// ---------------------------------------------------------------------------
// Reason Categories
// ---------------------------------------------------------------------------

export const REASON_CATEGORIES = [
  { key: ReasonCategory.BETTER_OPPORTUNITY, label: "Better Opportunity" },
  { key: ReasonCategory.COMPENSATION, label: "Compensation" },
  { key: ReasonCategory.RELOCATION, label: "Relocation" },
  { key: ReasonCategory.PERSONAL, label: "Personal Reasons" },
  { key: ReasonCategory.HEALTH, label: "Health" },
  { key: ReasonCategory.HIGHER_EDUCATION, label: "Higher Education" },
  { key: ReasonCategory.RETIREMENT, label: "Retirement" },
  { key: ReasonCategory.PERFORMANCE, label: "Performance" },
  { key: ReasonCategory.MISCONDUCT, label: "Misconduct" },
  { key: ReasonCategory.REDUNDANCY, label: "Redundancy" },
  { key: ReasonCategory.OTHER, label: "Other" },
] as const;

// ---------------------------------------------------------------------------
// Asset Categories
// ---------------------------------------------------------------------------

export const ASSET_CATEGORIES = [
  { key: AssetCategory.LAPTOP, label: "Laptop" },
  { key: AssetCategory.PHONE, label: "Phone" },
  { key: AssetCategory.ID_CARD, label: "ID Card" },
  { key: AssetCategory.ACCESS_CARD, label: "Access Card" },
  { key: AssetCategory.VEHICLE, label: "Vehicle" },
  { key: AssetCategory.FURNITURE, label: "Furniture" },
  { key: AssetCategory.OTHER, label: "Other" },
] as const;

// ---------------------------------------------------------------------------
// Default Clearance Departments
// ---------------------------------------------------------------------------

export const DEFAULT_CLEARANCE_DEPTS = [
  { name: "IT / Systems", sort_order: 1 },
  { name: "Finance / Accounts", sort_order: 2 },
  { name: "HR / Admin", sort_order: 3 },
  { name: "Reporting Manager", sort_order: 4 },
  { name: "Library / Knowledge Base", sort_order: 5 },
  { name: "Security / Facilities", sort_order: 6 },
] as const;

// ---------------------------------------------------------------------------
// FnF Components
// ---------------------------------------------------------------------------

export const FNF_COMPONENTS = [
  { key: "basic_salary_due", label: "Basic Salary Due", type: "earning" },
  { key: "leave_encashment", label: "Leave Encashment", type: "earning" },
  { key: "bonus_due", label: "Bonus Due", type: "earning" },
  { key: "gratuity", label: "Gratuity", type: "earning" },
  { key: "other_earnings", label: "Other Earnings", type: "earning" },
  { key: "notice_pay_recovery", label: "Notice Pay Recovery", type: "deduction" },
  { key: "other_deductions", label: "Other Deductions", type: "deduction" },
] as const;
