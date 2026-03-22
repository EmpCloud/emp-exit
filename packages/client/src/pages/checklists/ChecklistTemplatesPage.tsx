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
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

const EXIT_TYPES = [
  { value: "", label: "All Types" },
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "end_of_contract", label: "End of Contract" },
  { value: "mutual_separation", label: "Mutual Separation" },
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<TemplateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Create template form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExitType, setFormExitType] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add item form
  const [addingItemToId, setAddingItemToId] = useState<string | null>(null);
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

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, any> = { name: formName };
      if (formDescription) body.description = formDescription;
      if (formExitType) body.exit_type = formExitType;
      if (formIsDefault) body.is_default = true;

      await apiPost("/checklists/templates", body);
      setShowCreateForm(false);
      setFormName("");
      setFormDescription("");
      setFormExitType("");
      setFormIsDefault(false);
      await loadTemplates();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template and all its items?")) return;
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

  async function handleAddItem(e: React.FormEvent, templateId: string) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: itemTitle,
        is_mandatory: itemIsMandatory,
      };
      if (itemDescription) body.description = itemDescription;

      await apiPost(`/checklists/templates/${templateId}/items`, body);
      setAddingItemToId(null);
      setItemTitle("");
      setItemDescription("");
      setItemIsMandatory(true);
      // Reload items
      await toggleExpand(""); // collapse
      await loadTemplates();
      await toggleExpand(templateId); // re-expand
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Remove this item?")) return;
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
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
          <p className="mt-1 text-sm text-gray-500">Manage exit checklist templates and items.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Create Template Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Create Template</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard Exit Checklist"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exit Type</label>
                <select
                  value={formExitType}
                  onChange={(e) => setFormExitType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  {EXIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-sm text-gray-700">Set as default template</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !formName}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No checklist templates yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Template header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(tmpl.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === tmpl.id ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{tmpl.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{tmpl.item_count} items</span>
                      {tmpl.exit_type && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5">
                          {tmpl.exit_type.replace(/_/g, " ")}
                        </span>
                      )}
                      {tmpl.is_default && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">Default</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tmpl.id); }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Delete template"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Expanded items */}
              {expandedId === tmpl.id && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                  {loadingItems ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
                    </div>
                  ) : (
                    <>
                      {expandedItems.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No items in this template.</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {expandedItems.map((item, idx) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-4 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {idx + 1}. {item.title}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-gray-500">{item.description}</p>
                                )}
                                <div className="flex gap-2 mt-0.5">
                                  {item.is_mandatory && (
                                    <span className="text-xs text-red-600">Required</span>
                                  )}
                                  {item.assigned_role && (
                                    <span className="text-xs text-gray-400">
                                      Assigned: {item.assigned_role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="rounded p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add item form */}
                      {addingItemToId === tmpl.id ? (
                        <form
                          onSubmit={(e) => handleAddItem(e, tmpl.id)}
                          className="space-y-3 rounded-lg border border-rose-200 bg-white p-4"
                        >
                          <input
                            type="text"
                            required
                            value={itemTitle}
                            onChange={(e) => setItemTitle(e.target.value)}
                            placeholder="Item title"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <input
                            type="text"
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={itemIsMandatory}
                              onChange={(e) => setItemIsMandatory(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-sm text-gray-700">Mandatory</span>
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={saving || !itemTitle}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              Add Item
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddingItemToId(null)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setAddingItemToId(tmpl.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item
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
