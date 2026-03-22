import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Star,
  ToggleLeft,
  AlignLeft,
  List,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/client";
import { cn } from "@/lib/utils";
import type {
  ExitInterviewTemplate,
  ExitInterviewQuestion,
  InterviewQuestionType,
} from "@emp-exit/shared";

const QUESTION_TYPES: { value: InterviewQuestionType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Text", icon: <AlignLeft className="h-4 w-4" /> },
  { value: "rating", label: "Rating", icon: <Star className="h-4 w-4" /> },
  { value: "multiple_choice", label: "Multiple Choice", icon: <List className="h-4 w-4" /> },
  { value: "yes_no", label: "Yes / No", icon: <ToggleLeft className="h-4 w-4" /> },
];

interface TemplateWithQuestions extends ExitInterviewTemplate {
  questions: ExitInterviewQuestion[];
}

export function InterviewTemplatesPage() {
  const [templates, setTemplates] = useState<ExitInterviewTemplate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<TemplateWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  // Template form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDefault, setFormDefault] = useState(false);

  // Question form state
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<InterviewQuestionType>("text");
  const [qOptions, setQOptions] = useState("");
  const [qRequired, setQRequired] = useState(true);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiGet<ExitInterviewTemplate[]>("/interviews/templates");
      setTemplates(res.data || []);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplate = useCallback(async (id: string) => {
    try {
      const res = await apiGet<TemplateWithQuestions>(`/interviews/templates/${id}`);
      setExpandedTemplate(res.data || null);
    } catch {
      setError("Failed to load template details");
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (expandedId) {
      fetchTemplate(expandedId);
    } else {
      setExpandedTemplate(null);
    }
  }, [expandedId, fetchTemplate]);

  const handleCreateTemplate = async () => {
    if (!formName.trim()) return;
    try {
      await apiPost("/interviews/templates", {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        is_default: formDefault,
      });
      setShowCreate(false);
      setFormName("");
      setFormDesc("");
      setFormDefault(false);
      await fetchTemplates();
    } catch {
      setError("Failed to create template");
    }
  };

  const handleUpdateTemplate = async (id: string) => {
    try {
      await apiPut(`/interviews/templates/${id}`, {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        is_default: formDefault,
      });
      setEditingTemplate(null);
      setFormName("");
      setFormDesc("");
      setFormDefault(false);
      await fetchTemplates();
      if (expandedId === id) await fetchTemplate(id);
    } catch {
      setError("Failed to update template");
    }
  };

  const startEditTemplate = (t: ExitInterviewTemplate) => {
    setEditingTemplate(t.id);
    setFormName(t.name);
    setFormDesc(t.description || "");
    setFormDefault(t.is_default);
    setShowCreate(false);
  };

  const resetQuestionForm = () => {
    setQText("");
    setQType("text");
    setQOptions("");
    setQRequired(true);
    setShowAddQuestion(false);
    setEditingQuestionId(null);
  };

  const handleAddQuestion = async () => {
    if (!expandedId || !qText.trim()) return;
    try {
      await apiPost(`/interviews/templates/${expandedId}/questions`, {
        question_text: qText.trim(),
        question_type: qType,
        options: qType === "multiple_choice" ? qOptions.trim() : undefined,
        is_required: qRequired,
      });
      resetQuestionForm();
      await fetchTemplate(expandedId);
    } catch {
      setError("Failed to add question");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!expandedId || !editingQuestionId || !qText.trim()) return;
    try {
      await apiPut(`/interviews/templates/${expandedId}/questions/${editingQuestionId}`, {
        question_text: qText.trim(),
        question_type: qType,
        options: qType === "multiple_choice" ? qOptions.trim() : undefined,
        is_required: qRequired,
      });
      resetQuestionForm();
      await fetchTemplate(expandedId);
    } catch {
      setError("Failed to update question");
    }
  };

  const startEditQuestion = (q: ExitInterviewQuestion) => {
    setEditingQuestionId(q.id);
    setQText(q.question_text);
    setQType(q.question_type);
    setQOptions(q.options || "");
    setQRequired(q.is_required);
    setShowAddQuestion(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!expandedId) return;
    try {
      await apiDelete(`/interviews/templates/${expandedId}/questions/${questionId}`);
      await fetchTemplate(expandedId);
    } catch {
      setError("Failed to delete question");
    }
  };

  const handleDragEnd = async () => {
    if (
      dragIndex === null ||
      dragOverIndex === null ||
      dragIndex === dragOverIndex ||
      !expandedTemplate
    )
      return;

    const questions = [...expandedTemplate.questions];
    const [moved] = questions.splice(dragIndex, 1);
    questions.splice(dragOverIndex, 0, moved);

    // Optimistic update
    setExpandedTemplate({ ...expandedTemplate, questions });

    // Persist new sort orders
    try {
      for (let i = 0; i < questions.length; i++) {
        if (questions[i].sort_order !== i) {
          await apiPut(
            `/interviews/templates/${expandedId}/questions/${questions[i].id}`,
            { sort_order: i },
          );
        }
      }
      if (expandedId) await fetchTemplate(expandedId);
    } catch {
      setError("Failed to reorder questions");
    }

    setDragIndex(null);
    setDragOverIndex(null);
  };

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
            Interview Templates
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage exit interview question templates.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingTemplate(null);
            setFormName("");
            setFormDesc("");
            setFormDefault(false);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Create / Edit Template Form */}
      {(showCreate || editingTemplate) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTemplate ? "Edit Template" : "Create Template"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="e.g. Standard Exit Interview"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="Optional description..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formDefault}
                onChange={(e) => setFormDefault(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-gray-700">Set as default template</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={
                  editingTemplate
                    ? () => handleUpdateTemplate(editingTemplate)
                    : handleCreateTemplate
                }
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                {editingTemplate ? "Save Changes" : "Create Template"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingTemplate(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">No templates yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first exit interview template.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Template header row */}
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === t.id ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      {t.is_default && (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                          Default
                        </span>
                      )}
                      {!t.is_active && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="mt-0.5 text-sm text-gray-500">{t.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditTemplate(t);
                  }}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              {/* Expanded: Questions */}
              {expandedId === t.id && expandedTemplate && (
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Questions ({expandedTemplate.questions.length})
                    </h3>
                    <button
                      onClick={() => {
                        resetQuestionForm();
                        setShowAddQuestion(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add Question
                    </button>
                  </div>

                  {/* Question list */}
                  {expandedTemplate.questions.length === 0 && !showAddQuestion && (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No questions yet. Add your first question.
                    </p>
                  )}

                  <div className="space-y-2">
                    {expandedTemplate.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverIndex(idx);
                        }}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border bg-white px-4 py-3 transition-colors",
                          dragOverIndex === idx && dragIndex !== idx
                            ? "border-rose-300 bg-rose-50"
                            : "border-gray-200",
                        )}
                      >
                        <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-grab text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400">
                              Q{idx + 1}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              {QUESTION_TYPES.find((qt) => qt.value === q.question_type)?.icon}
                              {QUESTION_TYPES.find((qt) => qt.value === q.question_type)?.label}
                            </span>
                            {q.is_required && (
                              <span className="text-xs text-red-500">Required</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-900">{q.question_text}</p>
                          {q.options && (
                            <p className="mt-1 text-xs text-gray-500">
                              Options: {q.options}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditQuestion(q)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add / Edit Question Form */}
                  {showAddQuestion && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-white p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        {editingQuestionId ? "Edit Question" : "Add Question"}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Question Text
                          </label>
                          <textarea
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            placeholder="Enter your question..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Question Type
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              {QUESTION_TYPES.map((qt) => (
                                <button
                                  key={qt.value}
                                  onClick={() => setQType(qt.value)}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                    qType === qt.value
                                      ? "border-rose-300 bg-rose-50 text-rose-700"
                                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                                  )}
                                >
                                  {qt.icon}
                                  {qt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs mt-6">
                              <input
                                type="checkbox"
                                checked={qRequired}
                                onChange={(e) => setQRequired(e.target.checked)}
                                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                              />
                              <span className="text-gray-700">Required</span>
                            </label>
                          </div>
                        </div>
                        {qType === "multiple_choice" && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={qOptions}
                              onChange={(e) => setQOptions(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              placeholder="e.g. Very Satisfied, Satisfied, Neutral, Dissatisfied"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={editingQuestionId ? handleUpdateQuestion : handleAddQuestion}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors"
                          >
                            <Check className="h-3 w-3" />
                            {editingQuestionId ? "Save" : "Add"}
                          </button>
                          <button
                            onClick={resetQuestionForm}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
