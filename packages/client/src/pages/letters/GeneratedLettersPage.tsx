import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  FileSignature,
  Download,
  Send,
  Loader2,
  FileText,
  Plus,
  Settings2,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import { api } from "@/api/client";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

const LETTER_TYPES: Record<string, string> = {
  experience: "Experience Letter",
  relieving: "Relieving Letter",
  service_certificate: "Service Certificate",
  noc: "NOC",
};

interface ExitOption {
  id: string;
  status: string;
  exit_type: string;
  last_working_date: string | null;
  employee?: {
    first_name: string;
    last_name: string;
    emp_code: string | null;
    designation: string | null;
  } | null;
}

export function GeneratedLettersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [letters, setLetters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({ template_id: "", letter_type: "experience" });

  // Same in-page picker pattern as the KT page: when no exit is in the URL
  // we fetch the list and let the user pick one instead of greeting them
  // with a "?exitId=UUID in the URL" hint.
  const [exitOptions, setExitOptions] = useState<ExitOption[]>([]);
  const [loadingExits, setLoadingExits] = useState(false);
  useEffect(() => {
    if (exitId) return;
    let cancelled = false;
    (async () => {
      setLoadingExits(true);
      try {
        const res = await apiGet<any>("/exits", { perPage: 100 });
        if (!cancelled) setExitOptions(res.data?.data ?? []);
      } catch {
        if (!cancelled) setExitOptions([]);
      } finally {
        if (!cancelled) setLoadingExits(false);
      }
    })();
    return () => { cancelled = true; };
  }, [exitId]);

  function selectExit(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("exitId", id);
    setSearchParams(next);
  }
  const [generating, setGenerating] = useState(false);

  async function fetchLetters() {
    if (!exitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet<any[]>(`/letters/exit/${exitId}`);
      if (res.success) setLetters(res.data || []);
    } catch {
      toast.error("Failed to load letters");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await apiGet<any[]>("/letters/templates");
      if (res.success) setTemplates(res.data || []);
    } catch { /* ok */ }
  }

  useEffect(() => {
    fetchLetters();
    fetchTemplates();
  }, [exitId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!generateForm.template_id) {
      toast.error("Select a template");
      return;
    }
    setGenerating(true);
    try {
      await apiPost(`/letters/exit/${exitId}/generate`, {
        template_id: generateForm.template_id,
        letter_type: generateForm.letter_type,
      });
      toast.success("Letter generated");
      setShowGenerate(false);
      fetchLetters();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to generate letter");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(letterId: string, letterType: string) {
    try {
      const response = await api.get(`/letters/${letterId}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${letterType}_letter.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download letter");
    }
  }

  async function handleSend(letterId: string) {
    try {
      await apiPost(`/letters/${letterId}/send`);
      toast.success("Letter sent to employee");
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to send letter");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generated Letters</h1>
          <p className="mt-1 text-sm text-gray-500">View, download, and send generated exit letters.</p>
        </div>
        <div className="flex items-center gap-2">
          {exitId && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("exitId");
                setSearchParams(next);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Switch exit
            </button>
          )}
          {/* "Manage templates" — letter templates live at /letters/templates
              but there was no UI link to it from anywhere, so users couldn't
              find the create-template flow. */}
          <Link
            to="/letters/templates"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Settings2 className="h-4 w-4" />
            Manage Templates
          </Link>
          {exitId && (
            <button
              onClick={() => setShowGenerate(!showGenerate)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
              Generate Letter
            </button>
          )}
        </div>
      </div>

      {/* In-page exit picker — shown only when no exit is selected via the URL.
          Clicking a row sets ?exitId=... and the rest of the page renders
          letters for that exit. */}
      {!exitId && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Select an exit</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Pick the exit you want to view or generate letters for.
            </p>
          </div>
          {loadingExits ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : exitOptions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              No exits found. Initiate an exit first to generate its letters.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {exitOptions.map((exit) => {
                const name = exit.employee
                  ? `${exit.employee.first_name} ${exit.employee.last_name}`
                  : "(unknown employee)";
                return (
                  <li key={exit.id}>
                    <button
                      type="button"
                      onClick={() => selectExit(exit.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-rose-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {exit.employee?.emp_code ? `${exit.employee.emp_code} · ` : ""}
                          {exit.exit_type.replace(/_/g, " ")}
                          {exit.last_working_date ? ` · LWD ${formatDate(exit.last_working_date)}` : ""}
                        </p>
                      </div>
                      <span className={
                        exit.status === "completed"
                          ? "shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 capitalize"
                          : exit.status === "active"
                            ? "shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 capitalize"
                            : "shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 capitalize"
                      }>
                        {exit.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {showGenerate && (
        <form onSubmit={handleGenerate} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Generate Letter</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Template</label>
              <select
                value={generateForm.template_id}
                onChange={(e) => {
                  const tpl = templates.find((t) => t.id === e.target.value);
                  setGenerateForm({
                    template_id: e.target.value,
                    letter_type: tpl?.letter_type || "experience",
                  });
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">Select a template...</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.letter_type?.replace("_", " ")})
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  No templates configured.{" "}
                  <Link to="/letters/templates" className="font-medium text-rose-600 hover:underline">
                    Create a template
                  </Link>{" "}
                  to start generating letters.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={generating}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
            <button
              type="button"
              onClick={() => setShowGenerate(false)}
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
      ) : letters.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <FileSignature className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          No letters generated yet.
        </div>
      ) : (
        <div className="space-y-3">
          {letters.map((letter: any) => (
            <div
              key={letter.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
                  <FileText className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {LETTER_TYPES[letter.letter_type] || letter.letter_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    Generated {letter.created_at ? formatDate(letter.created_at) : ""}
                    {letter.issued_date && ` | Issued ${formatDate(letter.issued_date)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(letter.id, letter.letter_type)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => handleSend(letter.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
