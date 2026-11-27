import { useState, useEffect, useId, useRef } from "react";
import {
  FileSignature,
  Plus,
  Edit3,
  Eye,
  X,
  Code,
  Trash2,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/client";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { Page, PageActions, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";
import { EmptyState, LoadingState } from "@/components/ui/States";

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
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    letter_type: "experience",
    name: "",
    body_template: "",
    is_default: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const previewTitleId = useId();
  const previewCloseRef = useRef<HTMLButtonElement>(null);
  const previewDialogRef = useRef<HTMLDivElement>(null);
  const previewReturnFocusRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!preview) return;
    previewReturnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => previewCloseRef.current?.focus());
    const handlePreviewKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
        return;
      }
      if (event.key !== "Tab" || !previewDialogRef.current) return;
      const focusable = Array.from(previewDialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handlePreviewKeyDown);
    return () => {
      document.removeEventListener("keydown", handlePreviewKeyDown);
      document.body.style.overflow = previousOverflow;
      previewReturnFocusRef.current?.focus();
    };
  }, [preview]);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/letters/templates/${deleteTarget.id}`);
      toast.success("Template deleted");
      setDeleteTarget(null);
      await fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to delete template");
    } finally {
      setDeleting(false);
    }
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
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Letter Templates</PageTitle>
          <PageDescription>
            Manage experience, relieving, and NOC letter templates using Handlebars syntax.
          </PageDescription>
        </PageHeaderContent>
        <PageActions><Button
          onClick={openNew}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          New Template
        </Button></PageActions>
      </PageHeader>

      {/* Variable reference */}
      <details className="surface-card overflow-hidden">
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-5 text-sm font-semibold text-foreground marker:text-primary">
          <Code aria-hidden="true" className="h-4 w-4 text-primary" />
          Template Variable Reference
        </summary>
        <div className="border-t border-border px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {VARIABLES.map((v) => (
              <div key={v.var} className="text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 text-rose-600 dark:text-rose-400 font-mono">{v.var}</code>
                <span className="ms-1 text-muted-foreground">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <div ref={previewDialogRef} className="surface-card relative max-h-[85dvh] w-full max-w-3xl overflow-auto p-5 shadow-floating sm:p-6" role="dialog" aria-modal="true" aria-labelledby={previewTitleId}>
            <button ref={previewCloseRef} type="button" onClick={() => setPreview(null)} className="absolute end-4 top-4 grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("common.close")}>
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <h2 id={previewTitleId} className="mb-2 pe-12 text-lg font-semibold text-foreground">{preview.name}</h2>
            <p className="text-xs text-muted-foreground mb-4">Type: {preview.letter_type?.replace("_", " ")}</p>
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground font-mono">{preview.body_template}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="surface-card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {editing ? "Edit Template" : "New Template"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="letter-type">Letter Type</FieldLabel>
              <Select id="letter-type"
                value={form.letter_type}
                onChange={(e) => setForm({ ...form, letter_type: e.target.value })}
              >
                {LETTER_TYPES.map((lt) => (
                  <option key={lt.key} value={lt.key}>{lt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="template-name">Template Name</FieldLabel>
              <Input id="template-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Standard Experience Letter"
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="template-body">
              Body Template (Handlebars)
            </FieldLabel>
            <Textarea id="template-body"
              required
              value={form.body_template}
              onChange={(e) => setForm({ ...form, body_template: e.target.value })}
              rows={12}
              className="min-h-72 font-mono"
              placeholder="<h1>Experience Letter</h1>&#10;<p>This is to certify that {{employee.fullName}} was employed at {{organization.name}}...</p>"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-border text-rose-600 dark:text-rose-400 focus:ring-rose-500"
            />
            <label htmlFor="is_default" className="text-sm text-muted-foreground">Set as default</label>
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Saving..." : editing ? "Update Template" : "Create Template"}
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

      {/* Templates list */}
      {loading ? (
        <LoadingState label="Loading letter templates" className="surface-card" />
      ) : templates.length === 0 ? (
        <EmptyState title="No letter templates yet." description="Create one to get started." icon={FileSignature} className="surface-card" action={<Button onClick={openNew}><Plus aria-hidden="true" className="size-4" />New Template</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: any) => (
            <article key={t.id} className="surface-card surface-card--interactive flex min-h-44 flex-col p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    {t.letter_type?.replace("_", " ")}
                    {t.is_default && (
                      <span className="status-pill ms-2 border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300">Default</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-1 pt-5">
                <Button
                  onClick={() => setPreview(t)}
                  variant="ghost" className="min-h-9 px-2.5 text-xs"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </Button>
                <Button
                  onClick={() => openEdit(t)}
                  variant="ghost" className="min-h-9 px-2.5 text-xs"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  onClick={() => setDeleteTarget(t)}
                  variant="ghost" className="min-h-9 px-2.5 text-xs text-danger"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete letter template?"
        message={`"${deleteTarget?.name ?? ""}" will be removed and can no longer be used to generate letters.`}
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Page>
  );
}
