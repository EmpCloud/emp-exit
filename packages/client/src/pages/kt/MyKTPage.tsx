import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

const KT_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
};

export function MyKTPage() {
  const [searchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [kt, setKt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", document_url: "" });
  const [submitting, setSubmitting] = useState(false);

  async function fetchKT() {
    if (!exitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet<any>(`/kt/exit/${exitId}`);
      if (res.success) setKt(res.data);
    } catch {
      // KT not found
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKT();
  }, [exitId]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`/kt/exit/${exitId}/items`, {
        title: form.title,
        description: form.description || undefined,
        document_url: form.document_url || undefined,
      });
      toast.success("KT item added");
      setShowForm(false);
      setForm({ title: "", description: "", document_url: "" });
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleItem(itemId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "not_started" : "completed";
    try {
      await apiPut(`/kt/items/${itemId}`, { status: newStatus });
      toast.success(newStatus === "completed" ? "Item completed" : "Item reopened");
      fetchKT();
    } catch {
      toast.error("Failed to update item");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Knowledge Transfer</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your knowledge transfer items.
          </p>
        </div>
        {kt && (
          <button
            onClick={() => setShowForm(!showForm)}
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

      {!kt && exitId ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">No KT plan found for your exit.</p>
          <p className="mt-1 text-xs text-gray-400">Contact your HR team to set up a knowledge transfer plan.</p>
        </div>
      ) : kt ? (
        <>
          {/* KT info */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">KT Plan Overview</h3>
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", KT_STATUS[kt.status]?.color)}>
                {KT_STATUS[kt.status]?.label}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Due: {kt.due_date ? formatDate(kt.due_date) : "Not set"}
              </span>
              <span>
                {kt.items?.filter((i: any) => i.status === "completed").length || 0}/{kt.items?.length || 0} completed
              </span>
            </div>
          </div>

          {/* Add item form */}
          {showForm && (
            <form onSubmit={handleAddItem} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Add KT Item</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Handover deployment documentation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Document URL</label>
                <input
                  type="url"
                  value={form.document_url}
                  onChange={(e) => setForm({ ...form, document_url: e.target.value })}
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
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Items */}
          <div className="space-y-2">
            {!kt.items || kt.items.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 text-sm">
                No KT items yet.
              </div>
            ) : (
              kt.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <button
                    onClick={() => toggleItem(item.id, item.status)}
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
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
