import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Package,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

const CATEGORIES = [
  { key: "laptop", label: "Laptop" },
  { key: "phone", label: "Phone" },
  { key: "id_card", label: "ID Card" },
  { key: "access_card", label: "Access Card" },
  { key: "vehicle", label: "Vehicle" },
  { key: "furniture", label: "Furniture" },
  { key: "other", label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  returned: { label: "Returned", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  damaged: { label: "Damaged", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  lost: { label: "Lost", color: "bg-red-100 text-red-700", icon: XCircle },
  waived: { label: "Waived", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
};

export function AssetListPage() {
  const [searchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_name: "", asset_tag: "", category: "laptop", replacement_cost: 0 });
  const [submitting, setSubmitting] = useState(false);

  async function fetchAssets() {
    if (!exitId) return;
    setLoading(true);
    try {
      const res = await apiGet<any[]>(`/assets/exit/${exitId}`);
      if (res.success) setAssets(res.data || []);
    } catch {
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, [exitId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!exitId) {
      toast.error("No exit selected. Pass ?exitId= in the URL.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(`/assets/exit/${exitId}`, form);
      toast.success("Asset added");
      setShowForm(false);
      setForm({ asset_name: "", asset_tag: "", category: "laptop", replacement_cost: 0 });
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to add asset");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(assetId: string, status: string) {
    try {
      await apiPut(`/assets/${assetId}`, {
        status,
        returned_date: status === "returned" ? new Date().toISOString().split("T")[0] : undefined,
      });
      toast.success(`Asset marked as ${status}`);
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update asset");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Returns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track company asset returns for exiting employees.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      {!exitId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          No exit selected. Navigate here from an exit detail page, or pass <code>?exitId=UUID</code> in the URL.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Asset</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Asset Name</label>
              <input
                type="text"
                required
                value={form.asset_name}
                onChange={(e) => setForm({ ...form, asset_name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="MacBook Pro 14"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Asset Tag</label>
              <input
                type="text"
                value={form.asset_tag}
                onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="IT-LAP-0042"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Damage / Replacement Cost</label>
              <input
                type="number"
                min={0}
                value={form.replacement_cost}
                onChange={(e) => setForm({ ...form, replacement_cost: Number(e.target.value) })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Asset"}
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

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          No assets tracked yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white -mx-4 lg:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tag</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Return Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assets.map((asset: any) => {
                const sc = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending;
                const Icon = sc.icon;
                return (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{asset.asset_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{asset.asset_tag || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{asset.category?.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", sc.color)}>
                        <Icon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {asset.returned_date ? formatDate(asset.returned_date) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {asset.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(asset.id, "returned")}
                            className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            Returned
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(asset.id, "damaged")}
                            className="rounded bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
                          >
                            Damaged
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(asset.id, "lost")}
                            className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Lost
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
