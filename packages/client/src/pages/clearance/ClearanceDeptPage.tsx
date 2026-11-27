import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/client";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const [deleteDepartmentId, setDeleteDepartmentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function handleDelete(id: string) {
    setDeleteDepartmentId(id);
  }

  async function confirmDelete() {
    if (!deleteDepartmentId) return;
    setDeleting(true);
    try {
      await apiDelete(`/clearance/departments/${deleteDepartmentId}`);
      setDeleteDepartmentId(null);
      await loadDepartments();
    } catch {
      // handled
    } finally {
      setDeleting(false);
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
    return <div className="surface-card"><LoadingState label={t("common.loading")} /></div>;
  }

  return (
    <div className="app-page">
      <div className="page-header">
        <div className="page-header__content">
          <h1 className="page-title">{t("clearance.deptTitle")}</h1>
          <p className="page-subtitle">
            {t("clearance.deptSubtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="button-primary"
        >
          <Plus className="h-4 w-4" />
          {t("clearance.addDepartment")}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="surface-card border-brand-200 bg-brand-50/35 p-5 dark:border-brand-900 dark:bg-brand-950/20 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t("clearance.addDepartment")}</h3>
            <button onClick={() => setShowCreate(false)} className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("common.cancel")}>
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
                  className="control"
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
                  className="control"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !createName}
                className="button-primary"
              >
                {saving ? t("clearance.adding") : t("clearance.add")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="button-secondary"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments List */}
      {departments.length === 0 ? (
        <div className="surface-card"><EmptyState icon={Shield} title={t("clearance.noDepartments")} /></div>
      ) : (
        <div className="data-table-shell">
          <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t("clearance.colOrder")}</th>
                <th scope="col">{t("clearance.colDepartment")}</th>
                <th scope="col">{t("clearance.colApproverRole")}</th>
                <th scope="col">{t("common.status")}</th>
                <th scope="col" className="text-end">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td className="px-6 py-3 text-muted-foreground">{dept.sort_order + 1}</td>
                  <td className="px-6 py-3">
                    {editingId === dept.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="control"
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
                        className="control"
                      />
                    ) : (
                      <span className="text-muted-foreground">{dept.approver_role || "—"}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleToggleActive(dept)}
                      className={cn(
                        "status-pill min-h-11 cursor-pointer px-3",
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
                            className="grid size-10 place-items-center rounded-lg text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/40"
                            aria-label={t("checklists.saveChanges", { defaultValue: "Save" })}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                            aria-label={t("common.cancel")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(dept)}
                            className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={t("common.edit", { defaultValue: "Edit" })}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                            aria-label={t("common.delete", { defaultValue: "Delete" })}
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
        </div>
      )}
      <ConfirmDialog
        open={deleteDepartmentId !== null}
        title={t("common.delete")}
        message={t("clearance.confirmDeleteDept")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDepartmentId(null)}
      />
    </div>
  );
}
