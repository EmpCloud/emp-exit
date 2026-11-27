import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Package,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { Page, PageActions, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { EmptyState, LoadingState } from "@/components/ui/States";

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
  pending: { label: "Pending", color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300", icon: Clock },
  returned: { label: "Returned", color: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300", icon: CheckCircle2 },
  damaged: { label: "Damaged", color: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300", icon: AlertTriangle },
  lost: { label: "Lost", color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300", icon: XCircle },
  waived: { label: "Waived", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

export function AssetListPage() {
  const [searchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [assets, setAssets] = useState<any[]>([]);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_name: "", asset_tag: "", category: "laptop", replacement_cost: "" });
  const [submitting, setSubmitting] = useState(false);

  async function fetchAssets() {
    setLoading(true);
    try {
      if (exitId) {
        const res = await apiGet<any[]>(`/assets/exit/${exitId}`);
        if (res.success) setAssets(res.data || []);
      } else {
        // No exit selected → show the org-wide asset list.
        const res = await apiGet<any[]>("/assets");
        if (res.success) setAllAssets(res.data || []);
      }
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
      const payload = {
        asset_name: form.asset_name,
        asset_tag: form.asset_tag || undefined,
        category: form.category,
        replacement_cost: form.replacement_cost === "" ? 0 : Number(form.replacement_cost),
      };
      await apiPost(`/assets/exit/${exitId}`, payload);
      toast.success("Asset added");
      setShowForm(false);
      setForm({ asset_name: "", asset_tag: "", category: "laptop", replacement_cost: "" });
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
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Asset Returns</PageTitle>
          <PageDescription>
            Track company asset returns for exiting employees.
          </PageDescription>
        </PageHeaderContent>
        {exitId && (
          <PageActions><Button
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Asset
          </Button></PageActions>
        )}
      </PageHeader>

      {/* Org-wide asset list (shown when no specific exit is selected) */}
      {!exitId && (
        loading ? (
          <LoadingState label="Loading assets" className="surface-card" />
        ) : allAssets.length === 0 ? (
          <EmptyState title="No assets tracked yet" icon={Package} className="surface-card" action={
            <p className="text-sm text-muted-foreground">
              Asset returns are tracked per exit. Open an exit from the{" "}
              <Link to="/exits" className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                Exits list
              </Link>{" "}
              and add the assets to be returned.
            </p>
          } />
        ) : (
          <div className="data-table-shell"><div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Employee</th>
                  <th scope="col">Asset</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {allAssets.map((asset: any) => {
                  const sc = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  const name = asset.employee
                    ? `${asset.employee.first_name} ${asset.employee.last_name}`
                    : "—";
                  return (
                    <tr key={asset.id}>
                      <td>
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        {asset.employee?.designation && (
                          <p className="text-xs text-muted-foreground">{asset.employee.designation}</p>
                        )}
                      </td>
                      <td className="text-muted-foreground">
                        {asset.asset_name}
                        {asset.asset_tag && <span className="ms-1 text-xs text-muted-foreground">({asset.asset_tag})</span>}
                      </td>
                      <td className="capitalize text-muted-foreground">{asset.category?.replace("_", " ")}</td>
                      <td>
                        <span className={cn("status-pill", sc.color)}>
                          <Icon aria-hidden="true" className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/assets?exitId=${asset.exit_request_id}`}
                          className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div></div>
        )
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="surface-card space-y-5 p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold text-foreground">Add Asset</h2><p className="mt-1 text-sm text-muted-foreground">Record the item and its expected return details.</p></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="asset-name">Asset Name</FieldLabel>
              <Input
                id="asset-name"
                type="text"
                required
                value={form.asset_name}
                onChange={(e) => setForm({ ...form, asset_name: e.target.value })}
                placeholder="MacBook Pro 14"
              />
            </div>
            <div>
              <FieldLabel htmlFor="asset-tag">Asset Tag</FieldLabel>
              <Input
                id="asset-tag"
                type="text"
                value={form.asset_tag}
                onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
                placeholder="IT-LAP-0042"
              />
            </div>
            <div>
              <FieldLabel htmlFor="asset-category">Category</FieldLabel>
              <Select
                id="asset-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="replacement-cost">Damage / Replacement Cost</FieldLabel>
              <Input
                id="replacement-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.replacement_cost}
                onChange={(e) => setForm({ ...form, replacement_cost: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Asset"}
            </Button>
            <Button
              type="button"
              onClick={() => setShowForm(false)}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!exitId ? null : loading ? (
        <LoadingState label="Loading assets" className="surface-card" />
      ) : assets.length === 0 ? (
        <EmptyState title="No assets tracked yet." icon={Package} className="surface-card" />
      ) : (
        <div className="data-table-shell"><div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Asset</th><th scope="col">Tag</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Return Date</th><th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset: any) => {
                const sc = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending;
                const Icon = sc.icon;
                return (
                  <tr key={asset.id}>
                    <td className="font-medium text-foreground">{asset.asset_name}</td>
                    <td className="text-muted-foreground">{asset.asset_tag || "—"}</td>
                    <td className="capitalize text-muted-foreground">{asset.category?.replace("_", " ")}</td>
                    <td>
                      <span className={cn("status-pill", sc.color)}>
                        <Icon aria-hidden="true" className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="text-muted-foreground">
                      {asset.returned_date ? formatDate(asset.returned_date) : "—"}
                    </td>
                    <td>
                      {asset.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleStatusUpdate(asset.id, "returned")}
                            variant="ghost" className="min-h-9 px-2 text-xs text-emerald-700 dark:text-emerald-300"
                          >
                            Returned
                          </Button>
                          <Button
                            onClick={() => handleStatusUpdate(asset.id, "damaged")}
                            variant="ghost" className="min-h-9 px-2 text-xs text-amber-700 dark:text-amber-300"
                          >
                            Damaged
                          </Button>
                          <Button
                            onClick={() => handleStatusUpdate(asset.id, "lost")}
                            variant="ghost" className="min-h-9 px-2 text-xs text-red-700 dark:text-red-300"
                          >
                            Lost
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div></div>
      )}
    </Page>
  );
}
