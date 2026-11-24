import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Plus, Trash2, Edit2, Loader2, X, Check } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/client";
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
  approver_role: string | null;
  sort_order: number;
  is_active: boolean;
}

export function ClearanceDeptPage() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createApproverRole, setCreateApproverRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editApproverRole, setEditApproverRole] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    setLoading(true);
    try {
      const res = await apiGet<Department[]>("/clearance/departments");
      setDepartments(res.data ?? []);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, any> = { name: createName };
      if (createApproverRole) body.approver_role = createApproverRole;

      await apiPost("/clearance/departments", body);
      setShowCreate(false);
      setCreateName("");
      setCreateApproverRole("");
      await loadDepartments();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("clearance.confirmDeleteDept"))) return;
    try {
      await apiDelete(`/clearance/departments/${id}`);
      await loadDepartments();
    } catch {
      // handled
    }
  }

  function startEdit(dept: Department) {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditApproverRole(dept.approver_role || "");
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      const body: Record<string, any> = { name: editName };
      if (editApproverRole) body.approver_role = editApproverRole;

      await apiPut(`/clearance/departments/${id}`, body);
      setEditingId(null);
      await loadDepartments();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(dept: Department) {
    try {
      await apiPut(`/clearance/departments/${dept.id}`, { is_active: !dept.is_active });
      await loadDepartments();
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
          <h1 className="text-2xl font-bold text-foreground">{t("clearance.deptTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("clearance.deptSubtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("clearance.addDepartment")}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t("clearance.addDepartment")}</h3>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {t("clearance.deptNameLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t("clearance.deptNamePlaceholder")}
                  className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {t("clearance.approverRoleLabel")}
                </label>
                <input
                  type="text"
                  value={createApproverRole}
                  onChange={(e) => setCreateApproverRole(e.target.value)}
                  placeholder={t("clearance.approverRolePlaceholder")}
                  className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !createName}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? t("clearance.adding") : t("clearance.add")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments List */}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("clearance.noDepartments")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">{t("clearance.colOrder")}</th>
                <th className="px-6 py-3">{t("clearance.colDepartment")}</th>
                <th className="px-6 py-3">{t("clearance.colApproverRole")}</th>
                <th className="px-6 py-3">{t("common.status")}</th>
                <th className="px-6 py-3 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-muted/50">
                  <td className="px-6 py-3 text-muted-foreground">{dept.sort_order + 1}</td>
                  <td className="px-6 py-3">
                    {editingId === dept.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded border border-border bg-card text-foreground px-2 py-1 text-sm focus:border-rose-500 focus:outline-none"
                      />
                    ) : (
                      <span className="font-medium text-foreground">{dept.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {editingId === dept.id ? (
                      <input
                        type="text"
                        value={editApproverRole}
                        onChange={(e) => setEditApproverRole(e.target.value)}
                        className="rounded border border-border bg-card text-foreground px-2 py-1 text-sm focus:border-rose-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-muted-foreground">{dept.approver_role || "--"}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleToggleActive(dept)}
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer",
                        dept.is_active
                          ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {dept.is_active ? t("common.active") : t("common.inactive")}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === dept.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(dept.id)}
                            disabled={saving}
                            className="rounded p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(dept)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
