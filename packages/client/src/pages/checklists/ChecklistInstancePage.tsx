import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  ClipboardCheck,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/api/client";
import { cn } from "@/lib/utils";

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  waived: "bg-amber-100 text-amber-700",
  na: "bg-gray-50 text-gray-400",
};

const STATUS_OPTIONS = ["pending", "in_progress", "completed", "waived", "na"];

interface Template {
  id: string;
  name: string;
  item_count: number;
}

export function ChecklistInstancePage() {
  const { id: exitId } = useParams<{ id: string }>();
  const [checklist, setChecklist] = useState<any>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    load();
  }, [exitId]);

  async function load() {
    setLoading(true);
    try {
      const [checklistRes, templatesRes] = await Promise.all([
        apiGet<any>(`/checklists/exit/${exitId}`),
        apiGet<Template[]>("/checklists/templates"),
      ]);
      setChecklist(checklistRes.data);
      setTemplates(templatesRes.data ?? []);
      if (templatesRes.data && templatesRes.data.length > 0) {
        setSelectedTemplate(templatesRes.data[0].id);
      }
    } catch {
      setChecklist(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
      await apiPost("/checklists/generate", {
        exit_request_id: exitId,
        template_id: selectedTemplate,
      });
      await load();
    } catch {
      // handled
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateItem(itemId: string, status: string) {
    try {
      await apiPatch(`/checklists/items/${itemId}`, { status });
      // Optimistically update
      if (checklist) {
        setChecklist({
          ...checklist,
          items: checklist.items.map((i: any) =>
            i.id === itemId ? { ...i, status } : i,
          ),
        });
      }
      await load();
    } catch {
      // handled
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  const hasItems = checklist && checklist.items && checklist.items.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/exits"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to exits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Exit Checklist</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and update checklist items for this exit.
        </p>
      </div>

      {/* Generate from template */}
      {templates.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Generate Checklist from Template</h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.item_count} items)
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedTemplate}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </button>
          </div>
          {hasItems && (
            <p className="mt-2 text-xs text-amber-600">
              Warning: generating will replace the current checklist items.
            </p>
          )}
        </div>
      )}

      {/* Checklist items */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {!hasItems ? (
          <div className="px-6 py-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No checklist items yet. Generate from a template above.</p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {checklist.completed} / {checklist.total} completed ({checklist.progress}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all"
                  style={{ width: `${checklist.progress}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {checklist.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3 flex-1">
                    {item.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          item.status === "completed"
                            ? "text-gray-400 line-through"
                            : "text-gray-900",
                        )}
                      >
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500">{item.description}</p>
                      )}
                      {item.remarks && (
                        <p className="text-xs text-gray-400 italic mt-0.5">{item.remarks}</p>
                      )}
                    </div>
                  </div>
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateItem(item.id, e.target.value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer",
                      CHECKLIST_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600",
                    )}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
