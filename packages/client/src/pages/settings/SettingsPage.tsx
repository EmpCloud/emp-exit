import { useState, useEffect } from "react";
import { Settings, Loader2, Save } from "lucide-react";
import { apiGet, apiPut } from "@/api/client";
import toast from "react-hot-toast";

export function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    default_notice_period_days: 30,
    auto_initiate_clearance: true,
    require_exit_interview: true,
    fnf_approval_required: true,
    alumni_opt_in_default: true,
  });

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await apiGet<any>("/settings");
      if (res.success && res.data) {
        setSettings(res.data);
        setForm({
          default_notice_period_days: res.data.default_notice_period_days ?? 30,
          auto_initiate_clearance: Boolean(res.data.auto_initiate_clearance),
          require_exit_interview: Boolean(res.data.require_exit_interview),
          fnf_approval_required: Boolean(res.data.fnf_approval_required),
          alumni_opt_in_default: Boolean(res.data.alumni_opt_in_default),
        });
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiPut<any>("/settings", form);
      if (res.success) {
        setSettings(res.data);
        toast.success("Settings saved");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to save settings");
    } finally {
      setSaving(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exit Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure notice periods, clearance, FnF, and alumni defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
        {/* Notice Period */}
        <div>
          <label className="block text-sm font-medium text-gray-900">
            Default Notice Period (days)
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            Applied when initiating an exit if no custom period is specified.
          </p>
          <input
            type="number"
            min={0}
            max={365}
            value={form.default_notice_period_days}
            onChange={(e) => setForm({ ...form, default_notice_period_days: Number(e.target.value) })}
            className="mt-2 block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <hr className="border-gray-100" />

        {/* Toggle: Auto-initiate clearance */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Auto-Initiate Clearance</label>
            <p className="text-xs text-gray-500">
              Automatically create clearance records when an exit moves to clearance stage.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, auto_initiate_clearance: !form.auto_initiate_clearance })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.auto_initiate_clearance ? "bg-rose-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.auto_initiate_clearance ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Toggle: Require exit interview */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Require Exit Interview</label>
            <p className="text-xs text-gray-500">
              Exit interview must be completed before exit can be finalized.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, require_exit_interview: !form.require_exit_interview })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.require_exit_interview ? "bg-rose-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.require_exit_interview ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Toggle: FnF approval required */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">FnF Approval Required</label>
            <p className="text-xs text-gray-500">
              Full & Final settlement requires HR admin approval before processing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, fnf_approval_required: !form.fnf_approval_required })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.fnf_approval_required ? "bg-rose-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.fnf_approval_required ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Toggle: Alumni opt-in default */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Alumni Opt-In Default</label>
            <p className="text-xs text-gray-500">
              Automatically opt employees into the alumni network upon exit completion.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, alumni_opt_in_default: !form.alumni_opt_in_default })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.alumni_opt_in_default ? "bg-rose-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.alumni_opt_in_default ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <hr className="border-gray-100" />

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
