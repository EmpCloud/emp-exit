import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/client";
import { cn } from "@/lib/utils";

// value -> i18n key, resolved via t() at render.
const EXIT_TYPE_KEYS: { value: string; key: string }[] = [
  { value: "", key: "checklists.allTypes" },
  { value: "resignation", key: "checklists.type.resignation" },
  { value: "termination", key: "checklists.type.termination" },
  { value: "retirement", key: "checklists.type.retirement" },
  { value: "end_of_contract", key: "checklists.type.end_of_contract" },
  { value: "mutual_separation", key: "checklists.type.mutual_separation" },
  { value: "absconding", key: "checklists.type.absconding" },
];

interface Template {
  id: string;
  name: string;
  description: string | null;
  exit_type: string | null;
  is_default: boolean;
  is_active: boolean;
  item_count: number;
  created_at: string;
  items?: TemplateItem[];
}

interface TemplateItem {
  id: string;
  title: string;
  description: string | null;
  assigned_role: string | null;
  sort_order: number;
  is_mandatory: boolean;
}

export function ChecklistTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<TemplateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Create / edit template form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExitType, setFormExitType] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add / edit item form
  const [addingItemToId, setAddingItemToId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemIsMandatory, setItemIsMandatory] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await apiGet<Template[]>("/checklists/templates");
      setTemplates(res.data ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(templateId: string) {
    if (expandedId === templateId) {
      setExpandedId(null);
      setExpandedItems([]);
      return;
    }
    setExpandedId(templateId);
    setLoadingItems(true);
    try {
      const res = await apiGet<any>(`/checklists/templates/${templateId}`);
      setExpandedItems(res.data?.items ?? []);
    } catch {
      setExpandedItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  function resetTemplateForm() {
    setShowCreateForm(false);
    setEditingTemplateId(null);
    setFormName("");
    setFormDescription("");
    setFormExitType("");
    setFormIsDefault(false);
  }

  function startEditTemplate(tmpl: Template) {
    setEditingTemplateId(tmpl.id);
    setShowCreateForm(false);
    setFormName(tmpl.name);
    setFormDescription(tmpl.description || "");
    setFormExitType(tmpl.exit_type || "");
    setFormIsDefault(Boolean(tmpl.is_default));
  }

  async function handleSubmitTemplateForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: formName,
        description: formDescription || null,
        exit_type: formExitType || null,
        is_default: formIsDefault,
      };

      if (editingTemplateId) {
        await apiPut(`/checklists/templates/${editingTemplateId}`, body);
      } else {
        await apiPost("/checklists/templates", body);
      }
      resetTemplateForm();
      await loadTemplates();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm(t("checklists.confirmDeleteTemplate"))) return;
    try {
      await apiDelete(`/checklists/templates/${id}`);
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedItems([]);
      }
      await loadTemplates();
    } catch {
      // handled
    }
  }

  function resetItemForm() {
    setAddingItemToId(null);
    setEditingItemId(null);
    setItemTitle("");
    setItemDescription("");
    setItemIsMandatory(true);
  }

  function startEditItem(item: TemplateItem) {
    setEditingItemId(item.id);
    setAddingItemToId(null);
    setItemTitle(item.title);
    setItemDescription(item.description || "");
    setItemIsMandatory(Boolean(item.is_mandatory));
  }

  async function refreshExpanded(templateId: string) {
    setLoadingItems(true);
    try {
      const res = await apiGet<any>(`/checklists/templates/${templateId}`);
      setExpandedItems(res.data?.items ?? []);
    } catch {
      setExpandedItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleSubmitItemForm(e: React.FormEvent, templateId: string) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: itemTitle,
        is_mandatory: itemIsMandatory,
        description: itemDescription || null,
      };

      if (editingItemId) {
        await apiPut(`/checklists/items/${editingItemId}`, body);
      } else {
        await apiPost(`/checklists/templates/${templateId}/items`, body);
      }
      resetItemForm();
      await loadTemplates();
      await refreshExpanded(templateId);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm(t("checklists.confirmDeleteItem"))) return;
    try {
      await apiDelete(`/checklists/items/${itemId}`);
      setExpandedItems((prev) => prev.filter((i) => i.id !== itemId));
      await loadTemplates();
    } catch {
      // handled
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600 dark:text-rose-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("checklists.templatesTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("checklists.templatesSubtitle")}</p>
        </div>
        <button
          onClick={() => {
            resetTemplateForm();
            setShowCreateForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("checklists.newTemplate")}
        </button>
      </div>

      {/* Create / Edit Template Form */}
      {(showCreateForm || editingTemplateId) && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editingTemplateId ? t("checklists.editTemplate") : t("checklists.createTemplate")}
            </h3>
            <button onClick={resetTemplateForm} className="text-muted-foreground hover:text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmitTemplateForm} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("checklists.nameLabel")}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("checklists.namePlaceholder")}
                  className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("checklists.exitTypeLabel")}</label>
                <select
                  value={formExitType}
                  onChange={(e) => setFormExitType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  {EXIT_TYPE_KEYS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("checklists.descriptionLabel")}</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("checklists.descriptionPlaceholder")}
                className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-border text-rose-600 dark:text-rose-400 focus:ring-rose-500"
              />
              <span className="text-sm text-muted-foreground">{t("checklists.setDefault")}</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !formName}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? t("checklists.saving") : editingTemplateId ? t("checklists.saveChanges") : t("common.create")}
              </button>
              <button
                type="button"
                onClick={resetTemplateForm}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("checklists.noTemplates")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Template header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpand(tmpl.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === tmpl.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{tmpl.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {tmpl.item_count > 0 && <span>{t("checklists.itemsCount", { count: tmpl.item_count })}</span>}
                      {tmpl.exit_type && (
                        <span className="rounded bg-muted px-1.5 py-0.5">
                          {t(`checklists.type.${tmpl.exit_type}`)}
                        </span>
                      )}
                      {Boolean(tmpl.is_default) && (
                        <span className="rounded bg-rose-100 dark:bg-rose-950/40 px-1.5 py-0.5 text-rose-700 dark:text-rose-300">{t("checklists.default")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditTemplate(tmpl); }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                    title={t("checklists.editTemplateTitle")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tmpl.id); }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500"
                    title={t("checklists.deleteTemplateTitle")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded items */}
              {expandedId === tmpl.id && (
                <div className="border-t border-border bg-muted/50/50 px-5 py-4">
                  {loadingItems ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-rose-600 dark:text-rose-400" />
                    </div>
                  ) : (
                    <>
                      {expandedItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">{t("checklists.noItemsInTemplate")}</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {expandedItems.map((item, idx) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg bg-card border border-border px-4 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {idx + 1}. {item.title}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                )}
                                <div className="flex gap-2 mt-0.5">
                                  {Boolean(item.is_mandatory) && (
                                    <span className="text-xs text-red-600 dark:text-red-400">{t("checklists.required")}</span>
                                  )}
                                  {item.assigned_role && (
                                    <span className="text-xs text-muted-foreground">
                                      {t("checklists.assigned", { role: item.assigned_role })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditItem(item)}
                                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                                  title={t("checklists.editItemTitle")}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="rounded p-1 text-muted-foreground hover:text-red-500"
                                  title={t("checklists.deleteItemTitle")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add / Edit item form */}
                      {addingItemToId === tmpl.id || (editingItemId && expandedItems.some((i) => i.id === editingItemId)) ? (
                        <form
                          onSubmit={(e) => handleSubmitItemForm(e, tmpl.id)}
                          className="space-y-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-card p-4"
                        >
                          <p className="text-xs font-semibold text-muted-foreground">
                            {editingItemId ? t("checklists.editItem") : t("checklists.addItem")}
                          </p>
                          <input
                            type="text"
                            required
                            value={itemTitle}
                            onChange={(e) => setItemTitle(e.target.value)}
                            placeholder={t("checklists.itemTitlePlaceholder")}
                            className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <input
                            type="text"
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            placeholder={t("checklists.itemDescPlaceholder")}
                            className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={itemIsMandatory}
                              onChange={(e) => setItemIsMandatory(e.target.checked)}
                              className="h-4 w-4 rounded border-border text-rose-600 dark:text-rose-400 focus:ring-rose-500"
                            />
                            <span className="text-sm text-muted-foreground">{t("checklists.mandatory")}</span>
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={saving || !itemTitle}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              {saving ? t("checklists.saving") : editingItemId ? t("checklists.saveChanges") : t("checklists.addItemButton")}
                            </button>
                            <button
                              type="button"
                              onClick={resetItemForm}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50"
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            resetItemForm();
                            setAddingItemToId(tmpl.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300"
                        >
                          <Plus className="h-4 w-4" />
                          {t("checklists.addItemButton")}
                        </button>
                      )}
                    </>
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
