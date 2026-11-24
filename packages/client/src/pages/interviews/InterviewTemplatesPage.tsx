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
} from "@emp-exit/shared";
import { InterviewQuestionType } from "@emp-exit/shared";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const QUESTION_TYPES: { value: InterviewQuestionType; label: string; icon: React.ReactNode }[] = [
  { value: InterviewQuestionType.TEXT, label: "Text", icon: <AlignLeft className="h-4 w-4" /> },
  { value: InterviewQuestionType.RATING, label: "Rating", icon: <Star className="h-4 w-4" /> },
  { value: InterviewQuestionType.MULTIPLE_CHOICE, label: "Multiple Choice", icon: <List className="h-4 w-4" /> },
  { value: InterviewQuestionType.YES_NO, label: "Yes / No", icon: <ToggleLeft className="h-4 w-4" /> },
];

interface TemplateWithQuestions extends ExitInterviewTemplate {
  questions: ExitInterviewQuestion[];
}

// Normalize a comma-separated options string: trim each value and drop blanks,
// so a stray trailing comma (e.g. "a, b,") doesn't create an empty option.
function cleanOptions(raw: string): string {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .join(",");
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
  const [qType, setQType] = useState<InterviewQuestionType>(InterviewQuestionType.TEXT);
  const [qOptions, setQOptions] = useState("");
  const [qRequired, setQRequired] = useState(true);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

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
    setQType(InterviewQuestionType.TEXT);
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
        options: qType === "multiple_choice" ? cleanOptions(qOptions) : undefined,
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
        options: qType === "multiple_choice" ? cleanOptions(qOptions) : undefined,
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

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    setDeleteTemplateTarget({ id: templateId, name: templateName });
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateTarget) return;
    setDeletingTemplate(true);
    const templateId = deleteTemplateTarget.id;
    try {
      await apiDelete(`/interviews/templates/${templateId}`);
      if (expandedId === templateId) {
        setExpandedId(null);
        setExpandedTemplate(null);
      }
      if (editingTemplate === templateId) {
        setEditingTemplate(null);
      }
      setDeleteTemplateTarget(null);
      await fetchTemplates();
    } catch {
      setError("Failed to delete template");
    } finally {
      setDeletingTemplate(false);
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
    return <div className="surface-card"><LoadingState /></div>;
  }

  return (
    <div className="app-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__content">
          <h1 className="page-title flex items-center gap-2">
            <MessageSquare className="size-6 text-primary" />
            Interview Templates
          </h1>
          <p className="page-subtitle">
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
          className="button-primary"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ms-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Create / Edit Template Form */}
      {(showCreate || editingTemplate) && (
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {editingTemplate ? "Edit Template" : "Create Template"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="control"
                placeholder="e.g. Standard Exit Interview"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                className="control min-h-24 py-3"
                placeholder="Optional description..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formDefault}
                onChange={(e) => setFormDefault(e.target.checked)}
                className="rounded border-border text-rose-600 dark:text-rose-400 focus:ring-rose-500"
              />
              <span className="text-muted-foreground">Set as default template</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={
                  editingTemplate
                    ? () => handleUpdateTemplate(editingTemplate)
                    : handleCreateTemplate
                }
                className="button-primary"
              >
                {editingTemplate ? "Save Changes" : "Create Template"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingTemplate(null);
                }}
                className="button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="surface-card"><EmptyState icon={MessageSquare} title="No templates yet" description="Create your first exit interview template." /></div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="surface-card overflow-hidden"
            >
              {/* Template header row */}
              <div
                className="flex min-h-16 cursor-pointer items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === t.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{t.name}</span>
                      {Boolean(t.is_default) && (
                        <span className="inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                          Default
                        </span>
                      )}
                      {!t.is_active && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditTemplate(t);
                    }}
                    className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Edit template"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(t.id, t.name);
                    }}
                    className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/40"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded: Questions */}
              {expandedId === t.id && expandedTemplate && (
                <div className="border-t border-border bg-muted/50 px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Questions ({expandedTemplate.questions.length})
                    </h3>
                    <button
                      onClick={() => {
                        resetQuestionForm();
                        setShowAddQuestion(true);
                      }}
                      className="button-secondary px-3 text-xs text-primary"
                    >
                      <Plus className="h-3 w-3" />
                      Add Question
                    </button>
                  </div>

                  {/* Question list */}
                  {expandedTemplate.questions.length === 0 && !showAddQuestion && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
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
                          "flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors",
                          dragOverIndex === idx && dragIndex !== idx
                            ? "border-rose-300 bg-rose-50 dark:bg-rose-950/40"
                            : "border-border",
                        )}
                      >
                        <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-grab text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Q{idx + 1}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {QUESTION_TYPES.find((qt) => qt.value === q.question_type)?.icon}
                              {QUESTION_TYPES.find((qt) => qt.value === q.question_type)?.label}
                            </span>
                            {Boolean(q.is_required) && (
                              <span className="text-xs text-red-500">Required</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-foreground">{q.question_text}</p>
                          {q.options && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Options: {q.options}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditQuestion(q)}
                            className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Edit question"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/40"
                            aria-label="Delete question"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add / Edit Question Form */}
                  {showAddQuestion && (
                    <div className="mt-3 rounded-xl border border-brand-200 bg-card p-4 shadow-sm dark:border-brand-900">
                      <h4 className="text-sm font-medium text-foreground mb-3">
                        {editingQuestionId ? "Edit Question" : "Add Question"}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Question Text
                          </label>
                          <textarea
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            rows={2}
                            className="control min-h-20 resize-y py-3"
                            placeholder="Enter your question..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Question Type
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              {QUESTION_TYPES.map((qt) => (
                                <button
                                  key={qt.value}
                                  onClick={() => setQType(qt.value)}
                                  className={cn(
                                    "min-h-11 flex items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                                    qType === qt.value
                                      ? "border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                                      : "border-border text-muted-foreground hover:bg-muted/50",
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
                                className="rounded border-border text-rose-600 dark:text-rose-400 focus:ring-rose-500"
                              />
                              <span className="text-muted-foreground">Required</span>
                            </label>
                          </div>
                        </div>
                        {qType === "multiple_choice" && (
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={qOptions}
                              onChange={(e) => setQOptions(e.target.value)}
                              className="control"
                              placeholder="e.g. Very Satisfied, Satisfied, Neutral, Dissatisfied"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={editingQuestionId ? handleUpdateQuestion : handleAddQuestion}
                            className="button-primary px-3 text-xs"
                          >
                            <Check className="h-3 w-3" />
                            {editingQuestionId ? "Save" : "Add"}
                          </button>
                          <button
                            onClick={resetQuestionForm}
                            className="button-secondary px-3 text-xs"
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
      <ConfirmDialog
        open={deleteTemplateTarget !== null}
        title="Delete interview template?"
        message={`Delete template “${deleteTemplateTarget?.name ?? ""}” and all its questions? This cannot be undone.`}
        confirmLabel="Delete template"
        cancelLabel="Cancel"
        tone="danger"
        loading={deletingTemplate}
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setDeleteTemplateTarget(null)}
      />
    </div>
  );
}
