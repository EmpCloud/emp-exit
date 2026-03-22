// ============================================================================
// LETTER SERVICE
// Manages exit letter templates, generation via Handlebars, and delivery.
// ============================================================================

import Handlebars from "handlebars";
import { getDB } from "../../db/adapters";
import { findUserById, findOrgById } from "../../db/empcloud";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { config } from "../../config";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface CreateTemplateData {
  letter_type: string;
  name: string;
  body_template: string;
  is_default?: boolean;
}

export async function createTemplate(orgId: number, data: CreateTemplateData) {
  const db = getDB();

  const template = await db.create("letter_templates", {
    organization_id: orgId,
    letter_type: data.letter_type,
    name: data.name,
    body_template: data.body_template,
    is_default: data.is_default || false,
    is_active: true,
  });

  logger.info(`Letter template created: ${data.name} (org: ${orgId})`);
  return template;
}

export async function listTemplates(orgId: number) {
  const db = getDB();
  const result = await db.findMany("letter_templates", {
    filters: { organization_id: orgId, is_active: true },
    limit: 100,
    sort: { field: "created_at", order: "desc" },
  });
  return result.data;
}

export async function getTemplate(orgId: number, id: string) {
  const db = getDB();
  const template = await db.findOne("letter_templates", {
    id,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Letter template", id);
  }
  return template;
}

export async function updateTemplate(
  orgId: number,
  id: string,
  data: Partial<CreateTemplateData>,
) {
  const db = getDB();
  const existing = await db.findOne("letter_templates", {
    id,
    organization_id: orgId,
  });
  if (!existing) {
    throw new NotFoundError("Letter template", id);
  }

  const updated = await db.update("letter_templates", id, data);
  logger.info(`Letter template updated: ${id}`);
  return updated;
}

export async function deleteTemplate(orgId: number, id: string) {
  const db = getDB();
  const existing = await db.findOne("letter_templates", {
    id,
    organization_id: orgId,
  });
  if (!existing) {
    throw new NotFoundError("Letter template", id);
  }

  await db.update("letter_templates", id, { is_active: false });
  logger.info(`Letter template deleted (soft): ${id}`);
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export async function generateLetter(
  orgId: number,
  exitRequestId: string,
  templateId: string,
  generatedBy: number,
) {
  const db = getDB();

  // Fetch template
  const template = await db.findOne<any>("letter_templates", {
    id: templateId,
    organization_id: orgId,
  });
  if (!template) {
    throw new NotFoundError("Letter template", templateId);
  }

  // Fetch exit request
  const exitReq = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  // Fetch employee and org from empcloud
  const employee = await findUserById(exitReq.employee_id);
  if (!employee) {
    throw new NotFoundError("Employee", String(exitReq.employee_id));
  }

  const org = await findOrgById(orgId);
  if (!org) {
    throw new NotFoundError("Organization", String(orgId));
  }

  // Compile Handlebars template
  const compiled = Handlebars.compile(template.body_template);
  const generatedBody = compiled({
    employee: {
      firstName: employee.first_name,
      lastName: employee.last_name,
      fullName: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      empCode: employee.emp_code,
      designation: employee.designation,
      dateOfJoining: employee.date_of_joining,
      dateOfExit: employee.date_of_exit,
    },
    organization: {
      name: org.name,
      legalName: org.legal_name || org.name,
      email: org.email,
      country: org.country,
      state: org.state,
      city: org.city,
    },
    exit: {
      type: exitReq.exit_type,
      status: exitReq.status,
      reasonCategory: exitReq.reason_category,
      resignationDate: exitReq.resignation_date,
      lastWorkingDate: exitReq.last_working_date,
      actualExitDate: exitReq.actual_exit_date,
      noticePeriodDays: exitReq.notice_period_days,
    },
    today: new Date().toISOString().split("T")[0],
  });

  // Save generated letter
  const letter = await db.create("generated_letters", {
    exit_request_id: exitRequestId,
    template_id: templateId,
    letter_type: template.letter_type,
    generated_body: generatedBody,
    generated_by: generatedBy,
    issued_date: new Date().toISOString().split("T")[0],
  });

  logger.info(`Letter generated: ${template.letter_type} for exit ${exitRequestId}`);
  return letter;
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export async function listLetters(orgId: number, exitRequestId: string) {
  const db = getDB();

  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const result = await db.findMany("generated_letters", {
    filters: { exit_request_id: exitRequestId },
    limit: 50,
    sort: { field: "created_at", order: "desc" },
  });
  return result.data;
}

export async function getLetter(orgId: number, letterId: string) {
  const db = getDB();

  const letter = await db.findById<any>("generated_letters", letterId);
  if (!letter) {
    throw new NotFoundError("Generated letter", letterId);
  }

  // Verify org ownership via exit request
  const exit = await db.findOne("exit_requests", {
    id: letter.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Generated letter", letterId);
  }

  return letter;
}

// ---------------------------------------------------------------------------
// Send via email
// ---------------------------------------------------------------------------

export async function sendLetter(orgId: number, letterId: string) {
  const db = getDB();

  const letter = await db.findById<any>("generated_letters", letterId);
  if (!letter) {
    throw new NotFoundError("Generated letter", letterId);
  }

  const exit = await db.findOne<any>("exit_requests", {
    id: letter.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Generated letter", letterId);
  }

  const employee = await findUserById(exit.employee_id);
  if (!employee) {
    throw new NotFoundError("Employee", String(exit.employee_id));
  }

  // Send email via nodemailer
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    auth: config.email.user
      ? { user: config.email.user, pass: config.email.password }
      : undefined,
  } as any);

  await transporter.sendMail({
    from: config.email.from,
    to: employee.email,
    subject: `Your ${letter.letter_type.replace("_", " ")} letter`,
    html: letter.generated_body,
  });

  logger.info(`Letter sent to ${employee.email}: ${letter.letter_type} (${letterId})`);
  return { sent: true, to: employee.email };
}
