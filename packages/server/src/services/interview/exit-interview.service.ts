// ============================================================================
// EXIT INTERVIEW SERVICE
// Manages interview templates, questions, scheduling, and responses.
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import { getDB } from "../../db/adapters";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { InterviewStatus } from "@emp-exit/shared";
import type {
  ExitInterviewTemplate,
  ExitInterviewQuestion,
  ExitInterview,
  ExitInterviewResponse,
  InterviewQuestionType,
} from "@emp-exit/shared";

// ---------------------------------------------------------------------------
// Template CRUD
// ---------------------------------------------------------------------------

export async function createTemplate(
  orgId: number,
  data: { name: string; description?: string; is_default?: boolean },
): Promise<ExitInterviewTemplate> {
  const db = getDB();

  // If marking as default, unset any existing default for this org
  if (data.is_default) {
    await db.updateMany("exit_interview_templates", { organization_id: orgId, is_default: true }, { is_default: false });
  }

  const template = await db.create<ExitInterviewTemplate>("exit_interview_templates", {
    id: uuidv4(),
    organization_id: orgId,
    name: data.name,
    description: data.description || null,
    is_default: data.is_default ?? false,
    is_active: true,
  });

  logger.info(`Interview template created: ${template.id} for org ${orgId}`);
  return template;
}

export async function listTemplates(orgId: number): Promise<ExitInterviewTemplate[]> {
  const db = getDB();
  const result = await db.findMany<ExitInterviewTemplate>("exit_interview_templates", {
    filters: { organization_id: orgId },
    sort: { field: "created_at", order: "desc" },
    limit: 100,
  });
  return result.data;
}

export async function getTemplate(
  orgId: number,
  templateId: string,
): Promise<ExitInterviewTemplate & { questions: ExitInterviewQuestion[] }> {
  const db = getDB();
  const template = await db.findOne<ExitInterviewTemplate>("exit_interview_templates", {
    id: templateId,
    organization_id: orgId,
  });
  if (!template) throw new NotFoundError("Interview template", templateId);

  const questionsResult = await db.findMany<ExitInterviewQuestion>("exit_interview_questions", {
    filters: { template_id: templateId },
    sort: { field: "sort_order", order: "asc" },
    limit: 200,
  });

  return { ...template, questions: questionsResult.data };
}

export async function updateTemplate(
  orgId: number,
  templateId: string,
  data: { name?: string; description?: string; is_default?: boolean; is_active?: boolean },
): Promise<ExitInterviewTemplate> {
  const db = getDB();
  const existing = await db.findOne<ExitInterviewTemplate>("exit_interview_templates", {
    id: templateId,
    organization_id: orgId,
  });
  if (!existing) throw new NotFoundError("Interview template", templateId);

  if (data.is_default) {
    await db.updateMany("exit_interview_templates", { organization_id: orgId, is_default: true }, { is_default: false });
  }

  const updated = await db.update<ExitInterviewTemplate>("exit_interview_templates", templateId, data);
  logger.info(`Interview template updated: ${templateId}`);
  return updated;
}

// ---------------------------------------------------------------------------
// Question management
// ---------------------------------------------------------------------------

export async function addQuestion(
  orgId: number,
  templateId: string,
  data: {
    question_text: string;
    question_type: InterviewQuestionType;
    options?: string;
    sort_order?: number;
    is_required?: boolean;
  },
): Promise<ExitInterviewQuestion> {
  const db = getDB();

  // Verify template belongs to org
  const template = await db.findOne<ExitInterviewTemplate>("exit_interview_templates", {
    id: templateId,
    organization_id: orgId,
  });
  if (!template) throw new NotFoundError("Interview template", templateId);

  // Auto-assign sort_order if not provided
  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const count = await db.count("exit_interview_questions", { template_id: templateId });
    sortOrder = count;
  }

  const question = await db.create<ExitInterviewQuestion>("exit_interview_questions", {
    id: uuidv4(),
    template_id: templateId,
    question_text: data.question_text,
    question_type: data.question_type,
    options: data.options || null,
    sort_order: sortOrder,
    is_required: data.is_required ?? true,
  });

  logger.info(`Question added to template ${templateId}: ${question.id}`);
  return question;
}

export async function updateQuestion(
  orgId: number,
  questionId: string,
  data: {
    question_text?: string;
    question_type?: InterviewQuestionType;
    options?: string;
    sort_order?: number;
    is_required?: boolean;
  },
): Promise<ExitInterviewQuestion> {
  const db = getDB();

  // Verify question exists and belongs to org's template
  const question = await db.findById<ExitInterviewQuestion>("exit_interview_questions", questionId);
  if (!question) throw new NotFoundError("Interview question", questionId);

  const template = await db.findOne<ExitInterviewTemplate>("exit_interview_templates", {
    id: question.template_id,
    organization_id: orgId,
  });
  if (!template) throw new NotFoundError("Interview template", question.template_id);

  // exit_interview_questions has no updated_at column, so we delete + recreate via raw update
  const updateData: Record<string, any> = {};
  if (data.question_text !== undefined) updateData.question_text = data.question_text;
  if (data.question_type !== undefined) updateData.question_type = data.question_type;
  if (data.options !== undefined) updateData.options = data.options;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  if (data.is_required !== undefined) updateData.is_required = data.is_required;

  await db.raw(
    `UPDATE exit_interview_questions SET ${Object.keys(updateData).map((k) => `${k} = ?`).join(", ")} WHERE id = ?`,
    [...Object.values(updateData), questionId],
  );

  const updated = await db.findById<ExitInterviewQuestion>("exit_interview_questions", questionId);
  logger.info(`Question updated: ${questionId}`);
  return updated!;
}

export async function removeQuestion(orgId: number, questionId: string): Promise<void> {
  const db = getDB();

  const question = await db.findById<ExitInterviewQuestion>("exit_interview_questions", questionId);
  if (!question) throw new NotFoundError("Interview question", questionId);

  const template = await db.findOne<ExitInterviewTemplate>("exit_interview_templates", {
    id: question.template_id,
    organization_id: orgId,
  });
  if (!template) throw new NotFoundError("Interview template", question.template_id);

  await db.delete("exit_interview_questions", questionId);
  logger.info(`Question removed: ${questionId} from template ${question.template_id}`);
}

// ---------------------------------------------------------------------------
// Interview scheduling & lifecycle
// ---------------------------------------------------------------------------

export async function scheduleInterview(
  orgId: number,
  exitRequestId: string,
  templateId: string,
  conductedBy: number,
  scheduledAt: string,
): Promise<ExitInterview> {
  const db = getDB();

  // Verify exit request exists and belongs to org
  const exitReq = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  // Verify template exists
  const template = await db.findOne<ExitInterviewTemplate>("exit_interview_templates", {
    id: templateId,
    organization_id: orgId,
  });
  if (!template) throw new NotFoundError("Interview template", templateId);

  // Check if interview already exists for this exit
  const existing = await db.findOne<ExitInterview>("exit_interviews", {
    exit_request_id: exitRequestId,
  });
  if (existing) throw new ConflictError("Interview already scheduled for this exit request");

  const interview = await db.create<ExitInterview>("exit_interviews", {
    id: uuidv4(),
    exit_request_id: exitRequestId,
    template_id: templateId,
    interviewer_id: conductedBy,
    scheduled_date: scheduledAt,
    status: "scheduled" as InterviewStatus,
  });

  logger.info(`Interview scheduled: ${interview.id} for exit ${exitRequestId}`);
  return interview;
}

export async function getInterview(
  orgId: number,
  exitRequestId: string,
): Promise<(ExitInterview & { responses: (ExitInterviewResponse & { question?: ExitInterviewQuestion })[] }) | null> {
  const db = getDB();

  // Verify exit request belongs to org
  const exitReq = await db.findOne<any>("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", exitRequestId);

  const interview = await db.findOne<ExitInterview>("exit_interviews", {
    exit_request_id: exitRequestId,
  });
  if (!interview) return null;

  // Get responses with questions
  const responsesResult = await db.findMany<ExitInterviewResponse>("exit_interview_responses", {
    filters: { interview_id: interview.id },
    limit: 200,
  });

  const responses = await Promise.all(
    responsesResult.data.map(async (r) => {
      const question = await db.findById<ExitInterviewQuestion>("exit_interview_questions", r.question_id);
      return { ...r, question: question || undefined };
    }),
  );

  return { ...interview, responses };
}

export async function submitResponses(
  orgId: number,
  interviewId: string,
  responses: { questionId: string; responseText?: string; responseRating?: number }[],
  overallRating?: number,
  wouldRecommend?: boolean,
): Promise<ExitInterview> {
  const db = getDB();

  const interview = await db.findById<ExitInterview>("exit_interviews", interviewId);
  if (!interview) throw new NotFoundError("Exit interview", interviewId);

  // Verify org ownership through exit request
  const exitReq = await db.findOne<any>("exit_requests", {
    id: interview.exit_request_id,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", interview.exit_request_id);

  if (interview.status === "completed") {
    throw new ConflictError("Interview responses already submitted");
  }

  // Delete any existing responses (allow re-submission before completion)
  await db.deleteMany("exit_interview_responses", { interview_id: interviewId });

  // Insert new responses
  for (const resp of responses) {
    await db.create<ExitInterviewResponse>("exit_interview_responses", {
      id: uuidv4(),
      interview_id: interviewId,
      question_id: resp.questionId,
      answer_text: resp.responseText || null,
      answer_rating: resp.responseRating || null,
    });
  }

  // Build summary from would_recommend
  const summaryParts: string[] = [];
  if (wouldRecommend !== undefined) {
    summaryParts.push(`Would recommend: ${wouldRecommend ? "Yes" : "No"}`);
  }

  // Update interview with overall rating and summary
  const updated = await db.update<ExitInterview>("exit_interviews", interviewId, {
    overall_rating: overallRating || null,
    summary: summaryParts.length > 0 ? summaryParts.join("\n") : interview.summary,
  });

  logger.info(`Interview responses submitted: ${interviewId}, ${responses.length} responses`);
  return updated;
}

export async function completeInterview(orgId: number, interviewId: string): Promise<ExitInterview> {
  const db = getDB();

  const interview = await db.findById<ExitInterview>("exit_interviews", interviewId);
  if (!interview) throw new NotFoundError("Exit interview", interviewId);

  const exitReq = await db.findOne<any>("exit_requests", {
    id: interview.exit_request_id,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", interview.exit_request_id);

  if (interview.status === "completed") {
    throw new ConflictError("Interview already completed");
  }

  const updated = await db.update<ExitInterview>("exit_interviews", interviewId, {
    status: "completed" as InterviewStatus,
    completed_date: new Date().toISOString().split("T")[0],
  });

  logger.info(`Interview completed: ${interviewId}`);
  return updated;
}

export async function skipInterview(orgId: number, interviewId: string): Promise<ExitInterview> {
  const db = getDB();

  const interview = await db.findById<ExitInterview>("exit_interviews", interviewId);
  if (!interview) throw new NotFoundError("Exit interview", interviewId);

  const exitReq = await db.findOne<any>("exit_requests", {
    id: interview.exit_request_id,
    organization_id: orgId,
  });
  if (!exitReq) throw new NotFoundError("Exit request", interview.exit_request_id);

  if (interview.status === "completed") {
    throw new ConflictError("Cannot skip a completed interview");
  }

  const updated = await db.update<ExitInterview>("exit_interviews", interviewId, {
    status: "skipped" as InterviewStatus,
  });

  logger.info(`Interview skipped: ${interviewId}`);
  return updated;
}

// ---------------------------------------------------------------------------
// NPS Calculation
// ---------------------------------------------------------------------------

interface NPSResult {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  totalResponses: number;
  trend: { month: string; nps: number }[];
}

/**
 * Calculate NPS from exit interviews.
 * Uses overall_rating: 9-10 = Promoter, 7-8 = Passive, 1-6 = Detractor.
 * NPS = %Promoters - %Detractors (range -100 to +100).
 */
export async function calculateNPS(
  orgId: number,
  dateRange?: { from?: string; to?: string },
): Promise<NPSResult> {
  const db = getDB();

  // Get all completed interviews for this org with an overall_rating
  let query = `
    SELECT ei.overall_rating, ei.completed_date
    FROM exit_interviews ei
    JOIN exit_requests er ON er.id = ei.exit_request_id
    WHERE er.organization_id = ?
      AND ei.status = 'completed'
      AND ei.overall_rating IS NOT NULL
  `;
  const params: any[] = [orgId];

  if (dateRange?.from) {
    query += ` AND ei.completed_date >= ?`;
    params.push(dateRange.from);
  }
  if (dateRange?.to) {
    query += ` AND ei.completed_date <= ?`;
    params.push(dateRange.to);
  }

  query += ` ORDER BY ei.completed_date ASC`;

  const rawResult = await db.raw<any>(query, params);
  const rows: any[] = Array.isArray(rawResult) && Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const row of rows) {
    const rating = Number(row.overall_rating);
    if (rating >= 9) {
      promoters++;
    } else if (rating >= 7) {
      passives++;
    } else {
      detractors++;
    }
  }

  const totalResponses = rows.length;
  const nps = totalResponses > 0
    ? Math.round(((promoters - detractors) / totalResponses) * 100)
    : 0;

  // Calculate monthly trend
  const monthlyData = new Map<string, { promoters: number; passives: number; detractors: number }>();
  for (const row of rows) {
    if (!row.completed_date) continue;
    const date = new Date(row.completed_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { promoters: 0, passives: 0, detractors: 0 });
    }
    const m = monthlyData.get(monthKey)!;
    const rating = Number(row.overall_rating);
    if (rating >= 9) m.promoters++;
    else if (rating >= 7) m.passives++;
    else m.detractors++;
  }

  const trend: { month: string; nps: number }[] = [];
  for (const [month, data] of monthlyData) {
    const total = data.promoters + data.passives + data.detractors;
    const monthNps = total > 0
      ? Math.round(((data.promoters - data.detractors) / total) * 100)
      : 0;
    trend.push({ month, nps: monthNps });
  }

  return { nps, promoters, passives, detractors, totalResponses, trend };
}

/**
 * Get monthly NPS trend over time.
 */
export async function getNPSTrend(
  orgId: number,
  months: number = 12,
): Promise<{ month: string; nps: number; responses: number }[]> {
  const db = getDB();

  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);
  const fromStr = fromDate.toISOString().split("T")[0];

  const query = `
    SELECT ei.overall_rating, ei.completed_date
    FROM exit_interviews ei
    JOIN exit_requests er ON er.id = ei.exit_request_id
    WHERE er.organization_id = ?
      AND ei.status = 'completed'
      AND ei.overall_rating IS NOT NULL
      AND ei.completed_date >= ?
    ORDER BY ei.completed_date ASC
  `;

  const rawResult = await db.raw<any>(query, [orgId, fromStr]);
  const rows: any[] = Array.isArray(rawResult) && Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;

  const monthlyData = new Map<string, { promoters: number; passives: number; detractors: number }>();

  // Pre-fill all months
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData.set(key, { promoters: 0, passives: 0, detractors: 0 });
  }

  for (const row of rows) {
    if (!row.completed_date) continue;
    const date = new Date(row.completed_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { promoters: 0, passives: 0, detractors: 0 });
    }
    const m = monthlyData.get(monthKey)!;
    const rating = Number(row.overall_rating);
    if (rating >= 9) m.promoters++;
    else if (rating >= 7) m.passives++;
    else m.detractors++;
  }

  const result: { month: string; nps: number; responses: number }[] = [];
  for (const [month, data] of monthlyData) {
    const total = data.promoters + data.passives + data.detractors;
    const nps = total > 0
      ? Math.round(((data.promoters - data.detractors) / total) * 100)
      : 0;
    result.push({ month, nps, responses: total });
  }

  return result;
}
