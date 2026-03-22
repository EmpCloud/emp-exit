import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileSignature,
  Download,
  Send,
  Loader2,
  FileText,
  Plus,
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

export function GeneratedLettersPage() {
  const [searchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [letters, setLetters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({ template_id: "", letter_type: "experience" });
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

      {!exitId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          No exit selected. Pass <code>?exitId=UUID</code> in the URL to view letters for an exit.
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
