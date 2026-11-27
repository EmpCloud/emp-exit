import { useState, useEffect } from "react";
import { GraduationCap, Save, CheckCircle2 } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import { useAuthStore } from "@/lib/auth-store";
import toast from "react-hot-toast";
import { LoadingState } from "@/components/ui/States";

export function MyAlumniPage() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    personal_email: "",
    phone: "",
    linkedin_url: "",
  });
  const [optInExitId, setOptInExitId] = useState("");
  const [optingIn, setOptingIn] = useState(false);

  async function fetchProfile() {
    setLoading(true);
    try {
      // Try to find own alumni profile by listing and filtering
      const res = await apiGet<any>("/alumni", { perPage: 100 });
      if (res.success && res.data?.data) {
        const myProfile = res.data.data.find(
          (a: any) => a.employee_id === user?.empcloudUserId,
        );
        if (myProfile) {
          setProfile(myProfile);
          setForm({
            personal_email: myProfile.personal_email || "",
            phone: myProfile.phone || "",
            linkedin_url: myProfile.linkedin_url || "",
          });
        }
      }
    } catch {
      // Profile may not exist
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleOptIn(e: React.FormEvent) {
    e.preventDefault();
    if (!optInExitId.trim()) {
      toast.error("Please enter your exit request ID");
      return;
    }
    setOptingIn(true);
    try {
      const res = await apiPost<any>("/alumni/opt-in", {
        exitRequestId: optInExitId.trim(),
      });
      if (res.success) {
        toast.success("Opted into alumni network");
        setProfile(res.data);
        setForm({
          personal_email: res.data?.personal_email || "",
          phone: res.data?.phone || "",
          linkedin_url: res.data?.linkedin_url || "",
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to opt in");
    } finally {
      setOptingIn(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiPut<any>("/alumni/my", form);
      if (res.success) {
        setProfile(res.data);
        toast.success("Profile updated");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading alumni profile" />;
  }

  return (
    <div className="app-page">
      <header className="page-header">
        <div className="page-header__content">
          <p className="page-header__eyebrow">Alumni</p>
          <h1 className="page-title">My Alumni Profile</h1>
          <p className="page-subtitle">
          Manage your alumni network profile and stay connected.
        </p>
        </div>
      </header>

      {!profile ? (
        <section className="surface-card p-6 sm:p-8">
          <div className="text-center mb-6">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">Join the Alumni Network</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Opt in to stay connected with your former organization.
            </p>
          </div>

          <form onSubmit={handleOptIn} className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Exit Request ID
              </label>
              <input
                type="text"
                value={optInExitId}
                onChange={(e) => setOptInExitId(e.target.value)}
                required
                placeholder="Enter your exit request UUID"
                className="control mt-1"
              />
            </div>
            <button
              type="submit"
              disabled={optingIn}
              className="button-primary w-full"
            >
              {optingIn ? "Opting in..." : "Opt In to Alumni Network"}
            </button>
          </form>
        </section>
      ) : (
        <form onSubmit={handleSave} className="surface-card space-y-6 p-5 sm:p-6">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">You are part of the alumni network</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Personal Email</label>
              <input
                type="email"
                value={form.personal_email}
                onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
                className="control mt-1"
                placeholder="your.email@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="control mt-1"
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground">LinkedIn URL</label>
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                className="control mt-1"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <span>Last designation: {profile.last_designation || "N/A"}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Department: {profile.last_department || "N/A"}</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="button-primary"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </form>
      )}
    </div>
  );
}
