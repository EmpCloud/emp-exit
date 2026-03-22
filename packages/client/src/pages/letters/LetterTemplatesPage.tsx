import { useState, useEffect } from "react";
import {
  FileSignature,
  Plus,
  Edit3,
  Eye,
  Loader2,
  X,
  Code,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const LETTER_TYPES = [
  { key: "experience", label: "Experience Letter" },
  { key: "relieving", label: "Relieving Letter" },
  { key: "service_certificate", label: "Service Certificate" },
  { key: "noc", label: "No Objection Certificate" },
];

const VARIABLES = [
  { var: "{{employee.firstName}}", desc: "First name" },
  { var: "{{employee.lastName}}", desc: "Last name" },
  { var: "{{employee.fullName}}", desc: "Full name" },
  { var: "{{employee.email}}", desc: "Email" },
  { var: "{{employee.empCode}}", desc: "Employee code" },
  { var: "{{employee.designation}}", desc: "Designation" },
  { var: "{{employee.dateOfJoining}}", desc: "Date of joining" },
  { var: "{{organization.name}}", desc: "Org name" },
  { var: "{{organization.legalName}}", desc: "Legal name" },
  { var: "{{organization.city}}", desc: "City" },
  { var: "{{exit.lastWorkingDate}}", desc: "Last working date" },
  { var: "{{exit.resignationDate}}", desc: "Resignation date" },
  { var: "{{exit.reasonCategory}}", desc: "Reason category" },
  { var: "{{today}}", desc: "Today's date" },
];

export function LetterTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [form, setForm] = useState({
    letter_type: "experience",
    name: "",
    body_template: "",
    is_default: false,
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await apiGet<any[]>("/letters/templates");
      if (res.success) setTemplates(res.data || []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  function openEdit(t: any) {
    setEditing(t);
    setForm({
      letter_type: t.letter_type,
      name: t.name,
      body_template: t.body_template,
      is_default: t.is_default,
    });
    setShowForm(true);
  }

  function openNew() {
    setEditing(null);
    setForm({ letter_type: "experience", name: "", body_template: "", is_default: false });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await apiPut(`/letters/templates/${editing.id}`, form);
        toast.success("Template updated");
      } else {
        await apiPost("/letters/templates", form);
        toast.success("Template created");
      }
      setShowForm(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Letter Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage experience, relieving, and NOC letter templates using Handlebars syntax.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Variable reference */}
      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 flex items-center gap-2">
          <Code className="h-4 w-4" />
          Template Variable Reference
        </summary>
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VARIABLES.map((v) => (
              <div key={v.var} className="text-xs">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-rose-600 font-mono">{v.var}</code>
                <span className="ml-1 text-gray-500">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreview(null)}>
          <div className="relative mx-4 max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{preview.name}</h3>
            <p className="text-xs text-gray-500 mb-4">Type: {preview.letter_type?.replace("_", " ")}</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{preview.body_template}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? "Edit Template" : "New Template"}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Letter Type</label>
              <select
                value={form.letter_type}
                onChange={(e) => setForm({ ...form, letter_type: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {LETTER_TYPES.map((lt) => (
                  <option key={lt.key} value={lt.key}>{lt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Template Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="Standard Experience Letter"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Body Template (Handlebars)
            </label>
            <textarea
              required
              value={form.body_template}
              onChange={(e) => setForm({ ...form, body_template: e.target.value })}
              rows={12}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="<h1>Experience Letter</h1>&#10;<p>This is to certify that {{employee.fullName}} was employed at {{organization.name}}...</p>"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700">Set as default</label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editing ? "Update Template" : "Create Template"}
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

      {/* Templates list */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <FileSignature className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          No letter templates yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: any) => (
            <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
                  <p className="mt-1 text-xs text-gray-500 capitalize">
                    {t.letter_type?.replace("_", " ")}
                    {t.is_default && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">Default</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setPreview(t)}
                  className="inline-flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="inline-flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
