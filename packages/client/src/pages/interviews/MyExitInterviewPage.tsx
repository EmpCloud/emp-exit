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
      // Fetch self-service exit to find the user's active exit request
      const exitRes = await apiGet<any>("/self-service/my-exit");
      const myExit = exitRes.data;
      if (!myExit?.id) {
        setLoading(false);
        return;
      }
      setExitId(myExit.id);

      // Fetch interview for this exit
      const intRes = await apiGet<InterviewDetail>(`/interviews/exit/${myExit.id}`);
      const data = intRes.data;
      setInterview(data || null);

      if (data?.template_id) {
        const tRes = await apiGet<TemplateWithQuestions>(
          `/interviews/templates/${data.template_id}`,
        );
        setTemplate(tRes.data || null);
      }

      // Pre-fill existing responses
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

      await apiPost(`/interviews/exit/${exitId}/responses`, {
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:bg-gray-50 disabled:text-gray-500"
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
                  "p-1 transition-all",
                  isReadOnly ? "cursor-default" : "cursor-pointer hover:scale-125",
                )}
              >
                <Star
                  className={cn(
                    "h-8 w-8",
                    (answer.rating || 0) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300 hover:text-amber-200",
                  )}
                />
              </button>
            ))}
            {answer.rating && (
              <span className="ml-3 text-sm font-medium text-gray-600">{answer.rating} / 5</span>
            )}
          </div>
        );

      case "multiple_choice": {
        const options = q.options ? q.options.split(",").map((o) => o.trim()) : [];
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  answer.text === opt
                    ? "border-rose-300 bg-rose-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
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
                  className="border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      }

      case "yes_no":
        return (
          <div className="flex gap-4">
            {[
              { val: "Yes", bg: "border-green-300 bg-green-50 text-green-700" },
              { val: "No", bg: "border-red-300 bg-red-50 text-red-700" },
            ].map((opt) => (
              <button
                key={opt.val}
                disabled={isReadOnly}
                onClick={() => handleAnswerChange(q.id, "text", opt.val)}
                className={cn(
                  "flex-1 rounded-lg border-2 px-6 py-3 text-sm font-medium transition-all",
                  answer.text === opt.val
                    ? opt.bg
                    : "border-gray-200 text-gray-500 hover:border-gray-300",
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
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    );
  }

  // No active exit
  if (!exitId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-rose-600" />
            My Exit Interview
          </h1>
          <p className="mt-1 text-sm text-gray-500">Submit your exit interview responses.</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">No active exit request</h3>
          <p className="mt-1 text-sm text-gray-500">
            You do not have an active exit request with a scheduled interview.
          </p>
        </div>
      </div>
    );
  }

  // No interview scheduled
  if (!interview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-rose-600" />
            My Exit Interview
          </h1>
          <p className="mt-1 text-sm text-gray-500">Submit your exit interview responses.</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">Interview not yet scheduled</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your exit interview has not been scheduled yet. HR will reach out soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 mb-3">
          <MessageSquare className="h-7 w-7 text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Exit Interview</h1>
        <p className="mt-1 text-sm text-gray-500">
          {template?.name || "Please share your feedback"} — your responses help us improve.
        </p>
        {interview.scheduled_date && (
          <p className="mt-1 text-xs text-gray-400">
            Scheduled: {formatDate(interview.scheduled_date)}
          </p>
        )}
      </div>

      {/* Success message */}
      {(submitted || isCompleted) && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              {isCompleted ? "Interview completed" : "Responses submitted successfully"}
            </p>
            <p className="text-xs text-green-600">Thank you for your feedback.</p>
          </div>
        </div>
      )}

      {isSkipped && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-gray-500 flex-shrink-0" />
          <p className="text-sm text-gray-600">This interview has been skipped.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700 flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-base">
                  {q.question_text}
                  {q.is_required && <span className="ml-1 text-red-500">*</span>}
                </p>
                <div className="mt-4">{renderQuestionInput(q)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall feedback */}
      {questions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5">Overall Feedback</h3>

          {/* Overall rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you rate your overall experience? (1-10)
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  disabled={isReadOnly}
                  onClick={() => setOverallRating(num)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-all",
                    overallRating >= num
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200",
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Would you recommend this company as a good place to work?
            </label>
            <div className="flex gap-4">
              {[
                { val: true, label: "Yes, I would", color: "border-green-300 bg-green-50 text-green-700" },
                { val: false, label: "No, I wouldn't", color: "border-red-300 bg-red-50 text-red-700" },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  disabled={isReadOnly}
                  onClick={() => setWouldRecommend(opt.val)}
                  className={cn(
                    "flex-1 rounded-lg border-2 px-6 py-3 text-sm font-medium transition-all",
                    wouldRecommend === opt.val
                      ? opt.color
                      : "border-gray-200 text-gray-500 hover:border-gray-300",
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
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit My Responses"}
          </button>
          <p className="mt-2 text-xs text-gray-400">
            Your responses are confidential and will be used to improve the workplace.
          </p>
        </div>
      )}
    </div>
  );
}
