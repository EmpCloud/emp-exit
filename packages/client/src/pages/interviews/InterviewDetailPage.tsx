import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Star,
  ArrowLeft,
  Send,
  CheckCircle2,
  SkipForward,
  Clock,
  User,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import type {
  ExitInterview,
  ExitInterviewResponse,
  ExitInterviewQuestion,
  ExitInterviewTemplate,
  InterviewQuestionType,
} from "@emp-exit/shared";
import { EmptyState, LoadingState } from "@/components/ui/States";

interface InterviewDetail extends ExitInterview {
  responses: (ExitInterviewResponse & { question?: ExitInterviewQuestion })[];
  interviewer?: { first_name: string; last_name: string; designation: string | null } | null;
}

interface TemplateWithQuestions extends ExitInterviewTemplate {
  questions: ExitInterviewQuestion[];
}

export function InterviewDetailPage() {
  const { id: exitId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [template, setTemplate] = useState<TemplateWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Response form state
  const [answers, setAnswers] = useState<
    Record<string, { text?: string; rating?: number }>
  >({});
  const [overallRating, setOverallRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    if (!exitId) return;
    try {
      const res = await apiGet<InterviewDetail>(`/interviews/exit/${exitId}`);
      const data = res.data;
      setInterview(data || null);

      if (data?.template_id) {
        const tRes = await apiGet<TemplateWithQuestions>(
          `/interviews/templates/${data.template_id}`,
        );
        setTemplate(tRes.data || null);
      }

      // Pre-fill answers from existing responses
      if (data?.responses?.length) {
        const filled: Record<string, { text?: string; rating?: number }> = {};
        for (const r of data.responses) {
          filled[r.question_id] = {
            text: r.answer_text || undefined,
            rating: r.answer_rating || undefined,
          };
        }
        setAnswers(filled);
        if (data.overall_rating) setOverallRating(data.overall_rating);
        if (data.summary?.includes("Would recommend: Yes")) setWouldRecommend(true);
        if (data.summary?.includes("Would recommend: No")) setWouldRecommend(false);
      }
    } catch {
      setError("Failed to load interview data");
    } finally {
      setLoading(false);
    }
  }, [exitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const questions = template?.questions || [];
  const isCompleted = interview?.status === "completed";
  const isSkipped = interview?.status === "skipped";
  const isReadOnly = isCompleted || isSkipped;

  const handleAnswerChange = (questionId: string, field: "text" | "rating", value: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
  };

  const handleSubmitResponses = async () => {
    if (!exitId) return;
    setSubmitting(true);
    try {
      const responses = questions.map((q) => ({
        question_id: q.id,
        answer_text: answers[q.id]?.text || undefined,
        answer_rating: answers[q.id]?.rating || undefined,
      }));

      await apiPost(`/interviews/exit/${exitId}/responses`, {
        responses,
        overall_rating: overallRating || undefined,
        would_recommend: wouldRecommend,
      });

      await fetchData();
    } catch {
      setError("Failed to submit responses");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!exitId) return;
    try {
      await apiPost(`/interviews/exit/${exitId}/complete`);
      await fetchData();
    } catch {
      setError("Failed to complete interview");
    }
  };

  const handleSkip = async () => {
    if (!exitId) return;
    try {
      await apiPost(`/interviews/exit/${exitId}/skip`);
      await fetchData();
    } catch {
      setError("Failed to skip interview");
    }
  };

  const renderQuestionInput = (q: ExitInterviewQuestion) => {
    const answer = answers[q.id] || {};

    switch (q.question_type as InterviewQuestionType) {
      case "text":
        return (
          <textarea
            value={answer.text || ""}
            onChange={(e) => handleAnswerChange(q.id, "text", e.target.value)}
            rows={3}
            disabled={isReadOnly}
            className="control min-h-24 resize-y py-3 disabled:bg-muted/50 disabled:text-muted-foreground"
            placeholder="Type your answer..."
          />
        );

      case "rating":
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                disabled={isReadOnly}
                onClick={() => handleAnswerChange(q.id, "rating", star)}
                className={cn(
                  "p-0.5 transition-colors",
                  isReadOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
                )}
              >
                <Star
                  className={cn(
                    "h-7 w-7",
                    (answer.rating || 0) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/50",
                  )}
                />
              </button>
            ))}
            {answer.rating && (
              <span className="ms-2 text-sm text-muted-foreground">{answer.rating}/5</span>
            )}
          </div>
        );

      case "multiple_choice": {
        const options = q.options ? q.options.split(",").map((o) => o.trim()).filter(Boolean) : [];
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={opt}
                  checked={answer.text === opt}
                  onChange={() => handleAnswerChange(q.id, "text", opt)}
                  disabled={isReadOnly}
                  className="border-border text-rose-600 dark:text-rose-400 focus:ring-rose-500"
                />
                <span className="text-sm text-muted-foreground">{opt}</span>
              </label>
            ))}
          </div>
        );
      }

      case "yes_no":
        return (
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                disabled={isReadOnly}
                onClick={() => handleAnswerChange(q.id, "text", opt)}
                className={cn(
                  "rounded-lg border px-6 py-2 text-sm font-medium transition-colors",
                  answer.text === opt
                    ? opt === "Yes"
                      ? "border-green-300 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                      : "border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                    : "border-border text-muted-foreground hover:bg-muted/50",
                  isReadOnly && "cursor-default",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="surface-card"><LoadingState /></div>;
  }

  if (!interview) {
    return (
      <div className="app-page">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="surface-card"><EmptyState icon={MessageSquare} title="No interview found" description="No exit interview has been scheduled for this exit request." /></div>
      </div>
    );
  }

  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    scheduled: {
      bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
      text: "Scheduled",
      icon: <Clock className="h-4 w-4" />,
    },
    completed: {
      bg: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
      text: "Completed",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    skipped: {
      bg: "bg-muted text-muted-foreground",
      text: "Skipped",
      icon: <SkipForward className="h-4 w-4" />,
    },
  };

  const status = statusConfig[interview.status] || statusConfig.scheduled;

  return (
    <div className="app-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__content">
          <button
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="page-title flex items-center gap-2">
            <MessageSquare className="size-6 text-primary" />
            Exit Interview
          </h1>
          <p className="page-subtitle">
            {template?.name || "Interview"} — Exit #{exitId?.slice(0, 8)}
          </p>
        </div>
        <span
          className={cn(
            "status-pill",
            status.bg,
          )}
        >
          {status.icon}
          {status.text}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ms-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Interview metadata */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {interview.scheduled_date && (
          <div className="surface-card p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scheduled</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatDate(interview.scheduled_date)}
            </p>
          </div>
        )}
        {interview.completed_date && (
          <div className="surface-card p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatDate(interview.completed_date)}
            </p>
          </div>
        )}
        {interview.interviewer_id && (
          <div className="surface-card p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Interviewer</p>
            <p className="mt-1 text-sm font-medium text-foreground flex items-center gap-1">
              <User className="h-4 w-4 text-muted-foreground" />
              {interview.interviewer
                ? `${interview.interviewer.first_name} ${interview.interviewer.last_name}`
                : `ID: ${interview.interviewer_id}`}
            </p>
          </div>
        )}
      </div>

      {/* A completed/skipped interview with no recorded answers — make it
          explicit instead of showing a blank, fillable-looking form. */}
      {isReadOnly && (!interview.responses || interview.responses.length === 0) && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-300">
          {isSkipped
            ? "This interview was skipped — no responses were recorded."
            : "This interview is marked completed, but no responses were recorded."}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="surface-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {q.question_text}
                  {Boolean(Number(q.is_required)) && <span className="ms-1 text-red-500">*</span>}
                </p>
                <div className="mt-3">{renderQuestionInput(q)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall rating & would recommend */}
      {questions.length > 0 && (
        <div className="surface-card p-5">
          <h3 className="font-medium text-foreground mb-4">Overall Feedback</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Overall Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    disabled={isReadOnly}
                    onClick={() => setOverallRating(star)}
                    className={cn(
                      "grid size-11 place-items-center rounded-lg text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      overallRating >= star
                        ? "bg-rose-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted",
                      isReadOnly && "cursor-default",
                    )}
                  >
                    {star}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Would you recommend this company?
              </label>
              <div className="flex gap-3">
                {[
                  { val: true, label: "Yes", color: "border-green-300 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" },
                  { val: false, label: "No", color: "border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" },
                ].map((opt) => (
                  <button
                    key={String(opt.val)}
                    disabled={isReadOnly}
                    onClick={() => setWouldRecommend(opt.val)}
                    className={cn(
                      "min-h-11 rounded-lg border px-6 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      wouldRecommend === opt.val ? opt.color : "border-border text-muted-foreground hover:bg-muted/50",
                      isReadOnly && "cursor-default",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isReadOnly && questions.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmitResponses}
            disabled={submitting}
            className="button-primary"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Responses"}
          </button>
          <button
            onClick={handleComplete}
            className="button-secondary border-green-300 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-300 dark:hover:bg-green-950/40"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Interview
          </button>
          <button
            onClick={handleSkip}
            className="button-secondary"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
