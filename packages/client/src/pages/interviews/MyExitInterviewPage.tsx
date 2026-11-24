import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Star,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";
import { getUser } from "@/lib/auth-store";
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
}

interface TemplateWithQuestions extends ExitInterviewTemplate {
  questions: ExitInterviewQuestion[];
}

export function MyExitInterviewPage() {
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [template, setTemplate] = useState<TemplateWithQuestions | null>(null);
  const [exitId, setExitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Response form state
  const [answers, setAnswers] = useState<
    Record<string, { text?: string; rating?: number }>
  >({});
  const [overallRating, setOverallRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const user = getUser();

  const fetchMyInterview = useCallback(async () => {
    try {
      // One self-service call resolves MY exit, my interview, and its template
      // (with questions) — no exitId in the URL, no admin-only template fetch.
      const res = await apiGet<{
        interview: InterviewDetail | null;
        template: TemplateWithQuestions | null;
      }>("/self-service/my-interview");

      const data = res.data?.interview ?? null;
      if (!data) {
        setLoading(false);
        return;
      }
      setExitId(data.exit_request_id);
      setInterview(data);
      setTemplate(res.data?.template ?? null);

      // Pre-fill existing responses. If the employee has already answered, lock
      // the form even if HR hasn't formally marked it completed yet, so a reload
      // shows their submission instead of an editable blank form.
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
        setSubmitted(true);
      }
    } catch {
      // No exit found — employee might not have an active exit
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyInterview();
  }, [fetchMyInterview]);

  const questions = template?.questions || [];
  const isCompleted = interview?.status === "completed";
  const isSkipped = interview?.status === "skipped";
  const isReadOnly = isCompleted || isSkipped || submitted;

  const handleAnswerChange = (questionId: string, field: "text" | "rating", value: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!exitId) return;
    setSubmitting(true);
    try {
      const responses = questions.map((q) => ({
        question_id: q.id,
        answer_text: answers[q.id]?.text || undefined,
        answer_rating: answers[q.id]?.rating || undefined,
      }));

      await apiPost("/self-service/my-interview/responses", {
        responses,
        overall_rating: overallRating || undefined,
        would_recommend: wouldRecommend,
      });

      setSubmitted(true);
      await fetchMyInterview();
    } catch {
      setError("Failed to submit your responses. Please try again.");
    } finally {
      setSubmitting(false);
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
            rows={4}
            disabled={isReadOnly}
            className="control min-h-28 resize-y py-3 disabled:bg-muted/50 disabled:text-muted-foreground"
            placeholder="Share your thoughts..."
          />
        );

      case "rating":
        return (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                disabled={isReadOnly}
                onClick={() => handleAnswerChange(q.id, "rating", star)}
                className={cn(
                  "grid size-11 place-items-center rounded-lg transition-[color,transform] focus-visible:ring-2 focus-visible:ring-ring",
                  isReadOnly ? "cursor-default" : "cursor-pointer hover:scale-125",
                )}
              >
                <Star
                  className={cn(
                    "h-8 w-8",
                    (answer.rating || 0) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/50 hover:text-amber-200",
                  )}
                />
              </button>
            ))}
            {answer.rating && (
              <span className="ms-3 text-sm font-medium text-muted-foreground">{answer.rating} / 5</span>
            )}
          </div>
        );

      case "multiple_choice": {
        const options = q.options ? q.options.split(",").map((o) => o.trim()).filter(Boolean) : [];
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  answer.text === opt
                    ? "border-rose-300 bg-rose-50 dark:bg-rose-950/40"
                    : "border-border hover:border-border hover:bg-muted/50",
                  isReadOnly && "cursor-default",
                )}
              >
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
          <div className="flex gap-4">
            {[
              { val: "Yes", bg: "border-green-300 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" },
              { val: "No", bg: "border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" },
            ].map((opt) => (
              <button
                key={opt.val}
                disabled={isReadOnly}
                onClick={() => handleAnswerChange(q.id, "text", opt.val)}
                className={cn(
                  "min-h-11 flex-1 rounded-lg border-2 px-6 py-3 text-sm font-medium transition-[background-color,border-color,color]",
                  answer.text === opt.val
                    ? opt.bg
                    : "border-border text-muted-foreground hover:border-border",
                  isReadOnly && "cursor-default",
                )}
              >
                {opt.val}
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

  // No interview scheduled (covers both "no active exit" and "exit but no
  // interview yet" — in both cases there is nothing for the employee to fill in)
  if (!interview) {
    return (
      <div className="app-page">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MessageSquare className="size-6 text-primary" />
            My Exit Interview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Submit your exit interview responses.</p>
        </div>
        <div className="surface-card"><EmptyState icon={Clock} title="Interview not yet scheduled" description="Your exit interview has not been scheduled yet. HR will reach out soon." /></div>
      </div>
    );
  }

  return (
    <div className="app-page mx-auto max-w-3xl">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 mb-3">
          <MessageSquare className="h-7 w-7 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="page-title">Exit Interview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {template?.name || "Please share your feedback"} — your responses help us improve.
        </p>
        {interview.scheduled_date && (
          <p className="mt-1 text-xs text-muted-foreground">
            Scheduled: {formatDate(interview.scheduled_date)}
          </p>
        )}
      </div>

      {/* Success message */}
      {(submitted || isCompleted) && (
        <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {isCompleted ? "Interview completed" : "Responses submitted successfully"}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">Thank you for your feedback.</p>
          </div>
        </div>
      )}

      {isSkipped && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">This interview has been skipped.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ms-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, idx) => (
          <div key={q.id} className="surface-card p-6">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-sm font-bold text-rose-700 dark:text-rose-300 flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground text-base">
                  {q.question_text}
                  {Boolean(Number(q.is_required)) && <span className="ms-1 text-red-500">*</span>}
                </p>
                <div className="mt-4">{renderQuestionInput(q)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall feedback */}
      {questions.length > 0 && (
        <div className="surface-card p-6">
          <h3 className="font-semibold text-foreground mb-5">Overall Feedback</h3>

          {/* Overall rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              How would you rate your overall experience? (1-10)
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  disabled={isReadOnly}
                  onClick={() => setOverallRating(num)}
                  className={cn(
                    "grid size-11 place-items-center rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow]",
                    overallRating >= num
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted",
                    isReadOnly && "cursor-default",
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Would recommend */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Would you recommend this company as a good place to work?
            </label>
            <div className="flex gap-4">
              {[
                { val: true, label: "Yes, I would", color: "border-green-300 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" },
                { val: false, label: "No, I wouldn't", color: "border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  disabled={isReadOnly}
                  onClick={() => setWouldRecommend(opt.val)}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border-2 px-6 py-3 text-sm font-medium transition-[background-color,border-color,color]",
                    wouldRecommend === opt.val
                      ? opt.color
                      : "border-border text-muted-foreground hover:border-border",
                    isReadOnly && "cursor-default",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit button */}
      {!isReadOnly && questions.length > 0 && (
        <div className="text-center pb-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="button-primary px-8"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit My Responses"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Your responses are confidential and will be used to improve the workplace.
          </p>
        </div>
      )}
    </div>
  );
}
