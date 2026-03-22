// ============================================================================
// EXIT INTERVIEW ROUTES
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { ValidationError } from "../../utils/errors";
import {
  createInterviewTemplateSchema,
  addInterviewQuestionSchema,
  submitInterviewResponseSchema,
} from "@emp-exit/shared";
import * as interviewService from "../../services/interview/exit-interview.service";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Template routes
// ---------------------------------------------------------------------------

// GET /templates — list all templates for org
router.get(
  "/templates",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const templates = await interviewService.listTemplates(orgId);
      sendSuccess(res, templates);
    } catch (err) {
      next(err);
    }
  },
);

// POST /templates — create a new template
router.post(
  "/templates",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const parsed = createInterviewTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid template data", {
          validation: parsed.error.errors.map((e) => e.message),
        });
      }
      const template = await interviewService.createTemplate(orgId, parsed.data);
      sendSuccess(res, template, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /templates/:id — get template with questions
router.get(
  "/templates/:id",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const template = await interviewService.getTemplate(orgId, req.params.id);
      sendSuccess(res, template);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /templates/:id — update template
router.put(
  "/templates/:id",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const template = await interviewService.updateTemplate(orgId, req.params.id, req.body);
      sendSuccess(res, template);
    } catch (err) {
      next(err);
    }
  },
);

// POST /templates/:id/questions — add a question to template
router.post(
  "/templates/:id/questions",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const parsed = addInterviewQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid question data", {
          validation: parsed.error.errors.map((e) => e.message),
        });
      }
      const question = await interviewService.addQuestion(orgId, req.params.id, parsed.data);
      sendSuccess(res, question, 201);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /templates/:templateId/questions/:questionId — update a question
router.put(
  "/templates/:templateId/questions/:questionId",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const question = await interviewService.updateQuestion(orgId, req.params.questionId, req.body);
      sendSuccess(res, question);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /templates/:templateId/questions/:questionId — remove a question
router.delete(
  "/templates/:templateId/questions/:questionId",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      await interviewService.removeQuestion(orgId, req.params.questionId);
      sendSuccess(res, { message: "Question removed" });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Exit interview routes (per exit request)
// ---------------------------------------------------------------------------

// GET /exit/:exitId — get interview for an exit request
router.get(
  "/exit/:exitId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const interview = await interviewService.getInterview(orgId, req.params.exitId);
      sendSuccess(res, interview);
    } catch (err) {
      next(err);
    }
  },
);

// POST /exit/:exitId — schedule an interview
router.post(
  "/exit/:exitId",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const { template_id, conducted_by, scheduled_at } = req.body;
      if (!template_id || !conducted_by || !scheduled_at) {
        throw new ValidationError("template_id, conducted_by, and scheduled_at are required");
      }
      const interview = await interviewService.scheduleInterview(
        orgId,
        req.params.exitId,
        template_id,
        conducted_by,
        scheduled_at,
      );
      sendSuccess(res, interview, 201);
    } catch (err) {
      next(err);
    }
  },
);

// POST /exit/:exitId/responses — submit interview responses
router.post(
  "/exit/:exitId/responses",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const parsed = submitInterviewResponseSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid response data", {
          validation: parsed.error.errors.map((e) => e.message),
        });
      }

      // First get interview ID from exit request
      const interview = await interviewService.getInterview(orgId, req.params.exitId);
      if (!interview) {
        throw new ValidationError("No interview found for this exit request");
      }

      const updated = await interviewService.submitResponses(
        orgId,
        interview.id,
        parsed.data.responses.map((r) => ({
          questionId: r.question_id,
          responseText: r.answer_text,
          responseRating: r.answer_rating,
        })),
        parsed.data.overall_rating,
        req.body.would_recommend,
      );
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

// POST /exit/:exitId/complete — mark interview as completed
router.post(
  "/exit/:exitId/complete",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const interview = await interviewService.getInterview(orgId, req.params.exitId);
      if (!interview) {
        throw new ValidationError("No interview found for this exit request");
      }
      const updated = await interviewService.completeInterview(orgId, interview.id);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

// POST /exit/:exitId/skip — skip interview
router.post(
  "/exit/:exitId/skip",
  authorize("org_admin", "hr_admin", "hr_manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const interview = await interviewService.getInterview(orgId, req.params.exitId);
      if (!interview) {
        throw new ValidationError("No interview found for this exit request");
      }
      const updated = await interviewService.skipInterview(orgId, interview.id);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

export { router as interviewRoutes };
