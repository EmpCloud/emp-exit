import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  SkipForward,
  Eye,
  Calendar,
} from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

interface InterviewListItem {
  id: string;
  exit_request_id: string;
  template_id: string | null;
  interviewer_id: number | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  overall_rating: number | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  scheduled: {
    bg: "bg-blue-100 text-blue-700",
    label: "Scheduled",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  completed: {
    bg: "bg-green-100 text-green-700",
    label: "Completed",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  skipped: {
    bg: "bg-gray-100 text-gray-600",
    label: "Skipped",
    icon: <SkipForward className="h-3.5 w-3.5" />,
  },
};

export function InterviewListPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInterviews = useCallback(async () => {
    try {
      // The API gets interview per exit, so we fetch from a general list
      // For now we show a placeholder with navigation to detail pages
      setInterviews([]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-rose-600" />
            Exit Interviews
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage scheduled exit interviews.
          </p>
        </div>
        <button
          onClick={() => navigate("/interviews/templates")}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Manage Templates
        </button>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            Exit interviews are managed per exit request
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Navigate to an exit request detail page and go to the interview tab to schedule,
            conduct, or review exit interviews. Use the templates page to manage question
            templates.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/exits")}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
            >
              View Exits
            </button>
            <button
              onClick={() => navigate("/interviews/templates")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Manage Templates
            </button>
          </div>
        </div>

        {/* Status legend */}
        <div className="mt-8 flex items-center justify-center gap-6">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                cfg.bg,
              )}
            >
              {cfg.icon}
              {cfg.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
