// ============================================================================
// EXIT EMAIL SERVICE
// Branded HTML email notifications for each exit lifecycle stage.
// ============================================================================

import { getDB } from "../../db/adapters";
import { getEmpCloudDB, findUserById } from "../../db/empcloud";
import { sendMail } from "./transport";
import { logger } from "../../utils/logger";
import type { ExitRequest, FnFSettlement } from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// HTML template wrapper
// ---------------------------------------------------------------------------

function brandedHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#e11d48;padding:24px 32px;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">EMP Exit</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">${title}</h2>
        ${bodyContent}
      </div>
      <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated notification from EMP Exit. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getExitWithEmployee(exitRequestId: string) {
  const db = getDB();
  const exit = await db.findById<ExitRequest>("exit_requests", exitRequestId);
  if (!exit) return null;

  const employee = await findUserById(exit.employee_id);
  const empDb = getEmpCloudDB();

  // Get manager email if available
  let managerEmail: string | null = null;
  if (employee?.reporting_manager_id) {
    const manager = await empDb("users")
      .where({ id: employee.reporting_manager_id })
      .select("email")
      .first();
    managerEmail = manager?.email || null;
  }

  // Get HR admins for the org
  const hrAdmins = await empDb("users")
    .where({ organization_id: exit.organization_id, status: 1 })
    .whereIn("role", ["hr_admin", "hr_manager"])
    .select("email");
  const hrEmails = hrAdmins.map((u: any) => u.email).filter(Boolean);

  const employeeName = employee
    ? `${employee.first_name} ${employee.last_name}`
    : `Employee #${exit.employee_id}`;

  return { exit, employee, employeeName, managerEmail, hrEmails };
}

// ---------------------------------------------------------------------------
// Email functions
// ---------------------------------------------------------------------------

export async function sendExitInitiatedEmail(exitRequestId: string): Promise<void> {
  try {
    const data = await getExitWithEmployee(exitRequestId);
    if (!data) return;

    const { employeeName, employee, managerEmail, hrEmails } = data;
    const recipients: string[] = [];
    if (employee?.email) recipients.push(employee.email);
    if (managerEmail) recipients.push(managerEmail);
    recipients.push(...hrEmails);

    if (recipients.length === 0) return;

    const unique = [...new Set(recipients)];
    const body = `
      <p style="color:#374151;line-height:1.6;">The exit process has been initiated for <strong>${employeeName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Exit Type</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${data.exit.exit_type}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Reason</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${data.exit.reason_category}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Notice Period</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${data.exit.notice_period_days} days</td></tr>
        ${data.exit.last_working_date ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Last Working Date</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${data.exit.last_working_date}</td></tr>` : ""}
      </table>
      <p style="color:#374151;font-size:14px;">Please review and take the necessary actions to proceed with the exit workflow.</p>
    `;

    await sendMail(
      unique,
      `Exit Process Initiated for ${employeeName}`,
      brandedHtml("Exit Process Initiated", body),
    );
  } catch (err) {
    logger.error(`Failed to send exit initiated email for ${exitRequestId}:`, err);
  }
}

export async function sendClearancePendingEmail(
  exitRequestId: string,
  departmentName: string,
): Promise<void> {
  try {
    const data = await getExitWithEmployee(exitRequestId);
    if (!data) return;

    const { employeeName, hrEmails } = data;
    // Send to HR admins as department head proxy
    const recipients = [...new Set(hrEmails)];
    if (recipients.length === 0) return;

    const body = `
      <p style="color:#374151;line-height:1.6;">Clearance is required from the <strong>${departmentName}</strong> department for <strong>${employeeName}</strong>.</p>
      <p style="color:#374151;font-size:14px;">Please review the clearance request and approve or reject as appropriate.</p>
      <div style="margin:24px 0;">
        <span style="display:inline-block;padding:8px 16px;background:#fef2f2;color:#e11d48;border-radius:6px;font-size:13px;font-weight:600;">Action Required: Clearance Pending</span>
      </div>
    `;

    await sendMail(
      recipients,
      `Clearance Required: ${departmentName} — ${employeeName}`,
      brandedHtml("Clearance Required", body),
    );
  } catch (err) {
    logger.error(`Failed to send clearance pending email for ${exitRequestId}:`, err);
  }
}

export async function sendClearanceCompletedEmail(exitRequestId: string): Promise<void> {
  try {
    const data = await getExitWithEmployee(exitRequestId);
    if (!data || !data.employee?.email) return;

    const body = `
      <p style="color:#374151;line-height:1.6;">Great news, <strong>${data.employeeName}</strong>!</p>
      <p style="color:#374151;font-size:14px;">All department clearances have been completed for your exit request. The next step in the process will begin shortly.</p>
      <div style="margin:24px 0;">
        <span style="display:inline-block;padding:8px 16px;background:#f0fdf4;color:#16a34a;border-radius:6px;font-size:13px;font-weight:600;">All Clearances Completed</span>
      </div>
    `;

    await sendMail(
      data.employee.email,
      "All Clearances Completed",
      brandedHtml("Clearances Completed", body),
    );
  } catch (err) {
    logger.error(`Failed to send clearance completed email for ${exitRequestId}:`, err);
  }
}

export async function sendFnFCalculatedEmail(exitRequestId: string): Promise<void> {
  try {
    const data = await getExitWithEmployee(exitRequestId);
    if (!data || !data.employee?.email) return;

    const db = getDB();
    const fnf = await db.findOne<FnFSettlement>("fnf_settlements", {
      exit_request_id: exitRequestId,
    });

    const totalFormatted = fnf ? (fnf.total_payable / 100).toLocaleString("en-IN") : "N/A";

    const body = `
      <p style="color:#374151;line-height:1.6;">Dear <strong>${data.employeeName}</strong>,</p>
      <p style="color:#374151;font-size:14px;">Your Full & Final settlement has been calculated.</p>
      <div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:14px;color:#6b7280;">Estimated Total Payable</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;">${totalFormatted}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">This amount is subject to approval. You will be notified once your F&F is approved.</p>
    `;

    await sendMail(
      data.employee.email,
      "Your F&F Settlement Has Been Calculated",
      brandedHtml("F&F Settlement Calculated", body),
    );
  } catch (err) {
    logger.error(`Failed to send FnF calculated email for ${exitRequestId}:`, err);
  }
}

export async function sendFnFApprovedEmail(exitRequestId: string): Promise<void> {
  try {
    const data = await getExitWithEmployee(exitRequestId);
    if (!data || !data.employee?.email) return;

    const body = `
      <p style="color:#374151;line-height:1.6;">Dear <strong>${data.employeeName}</strong>,</p>
      <p style="color:#374151;font-size:14px;">Your Full & Final settlement has been <strong>approved</strong>. Payment will be processed as per company policy.</p>
      <div style="margin:24px 0;">
        <span style="display:inline-block;padding:8px 16px;background:#f0fdf4;color:#16a34a;border-radius:6px;font-size:13px;font-weight:600;">F&F Approved</span>
      </div>
    `;

    await sendMail(
      data.employee.email,
      "Your F&F Settlement Has Been Approved",
      brandedHtml("F&F Settlement Approved", body),
    );
  } catch (err) {
    logger.error(`Failed to send FnF approved email for ${exitRequestId}:`, err);
  }
}

export async function sendExitCompletedEmail(exitRequestId: string): Promise<void> {
  try {
    const data = await getExitWithEmployee(exitRequestId);
    if (!data || !data.employee?.email) return;

    const body = `
      <p style="color:#374151;line-height:1.6;">Dear <strong>${data.employeeName}</strong>,</p>
      <p style="color:#374151;font-size:14px;">Your exit process is now <strong>complete</strong>. Your relieving letter will be shared separately.</p>
      <p style="color:#374151;font-size:14px;">We wish you all the best in your future endeavors. If you have opted into the alumni network, you can stay connected with your former colleagues.</p>
      <div style="margin:24px 0;">
        <span style="display:inline-block;padding:8px 16px;background:#eff6ff;color:#2563eb;border-radius:6px;font-size:13px;font-weight:600;">Exit Complete</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">Thank you for your contributions to the organization.</p>
    `;

    await sendMail(
      data.employee.email,
      "Your Exit is Complete — Relieving Letter Attached",
      brandedHtml("Exit Complete", body),
    );
  } catch (err) {
    logger.error(`Failed to send exit completed email for ${exitRequestId}:`, err);
  }
}
