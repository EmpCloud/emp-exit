import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  FileText,
  User,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

const KT_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
};

export function KTListPage() {
  const [searchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [kt, setKt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ title: "", description: "", document_url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);

  async function fetchKT() {
    if (!exitId) return;
    setLoading(true);
    try {
      const res = await apiGet<any>(`/kt/exit/${exitId}`);
      if (res.success) setKt(res.data);
    } catch {
      // KT may not exist yet
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKT();
  }, [exitId]);

  async function handleCreateKT() {
    if (!exitId) return;
    setCreating(true);
    try {
      await apiPost(`/kt/exit/${exitId}`, {});
      toast.success("KT plan created");
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to create KT plan");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`/kt/exit/${exitId}/items`, {
        title: itemForm.title,
        description: itemForm.description || undefined,
        document_url: itemForm.document_url || undefined,
      });
      toast.success("KT item added");
      setShowItemForm(false);
      setItemForm({ title: "", description: "", document_url: "" });
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleItemStatus(itemId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "not_started" : "completed";
    try {
      await apiPut(`/kt/items/${itemId}`, { status: newStatus });
      toast.success(newStatus === "completed" ? "Item completed" : "Item reopened");
      fetchKT();
    } catch (err: any) {
      toast.error("Failed to update item");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Transfer</h1>
          <p className="mt-1 text-sm text-gray-500">Manage knowledge transfer plans and items.</p>
        </div>
        {kt && (
          <button
            onClick={() => setShowItemForm(!showItemForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      {!exitId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          No exit selected. Pass <code>?exitId=UUID</code> in the URL.
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : !kt && exitId ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No KT plan exists for this exit yet.</p>
          <button
            onClick={handleCreateKT}
            disabled={creating}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create KT Plan"}
          </button>
        </div>
      ) : kt ? (
        <>
          {/* KT Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">KT Plan</h3>
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", KT_STATUS[kt.status]?.color || KT_STATUS.not_started.color)}>
                {KT_STATUS[kt.status]?.label || kt.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <span>Successor ID: {kt.assignee_id || "Not assigned"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Due: {kt.due_date ? formatDate(kt.due_date) : "Not set"}</span>
              </div>
            </div>
          </div>

          {/* Add item form */}
          {showItemForm && (
            <form onSubmit={handleAddItem} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Add KT Item</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Handover API documentation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Details about this KT item..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Document URL</label>
                <input
                  type="url"
                  value={itemForm.document_url}
                  onChange={(e) => setItemForm({ ...itemForm, document_url: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="https://docs.google.com/..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Items list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              Items ({kt.items?.length || 0})
            </h3>
            {!kt.items || kt.items.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
                No KT items yet. Add items to track knowledge transfer progress.
              </div>
            ) : (
              <div className="space-y-2">
                {kt.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
                  >
                    <button
                      onClick={() => toggleItemStatus(item.id, item.status)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {item.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 hover:text-rose-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", item.status === "completed" ? "text-gray-400 line-through" : "text-gray-900")}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                      )}
                      {item.document_url && (
                        <a
                          href={item.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          Document
                        </a>
                      )}
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", KT_STATUS[item.status]?.color || "bg-gray-100 text-gray-600")}>
                      {KT_STATUS[item.status]?.label || item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
