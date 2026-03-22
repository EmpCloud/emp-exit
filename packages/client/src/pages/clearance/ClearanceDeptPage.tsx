import { useEffect, useState } from "react";
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
    if (!confirm("Delete this clearance department?")) return;
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
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clearance Departments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage departments that must sign off during employee exit clearance.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Add Department</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. IT / Systems"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approver Role
                </label>
                <input
                  type="text"
                  value={createApproverRole}
                  onChange={(e) => setCreateApproverRole(e.target.value)}
                  placeholder="e.g. it_admin"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !createName}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments List */}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No clearance departments configured yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Approver Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500">{dept.sort_order + 1}</td>
                  <td className="px-6 py-3">
                    {editingId === dept.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-rose-500 focus:outline-none"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{dept.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {editingId === dept.id ? (
                      <input
                        type="text"
                        value={editApproverRole}
                        onChange={(e) => setEditApproverRole(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-rose-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-600">{dept.approver_role || "--"}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleToggleActive(dept)}
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer",
                        dept.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {dept.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === dept.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(dept.id)}
                            disabled={saving}
                            className="rounded p-1.5 text-green-600 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(dept)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
