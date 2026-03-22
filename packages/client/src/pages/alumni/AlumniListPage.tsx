import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Search,
  Linkedin,
  Mail,
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import toast from "react-hot-toast";
import { getInitials } from "@/lib/utils";

export function AlumniListPage() {
  const navigate = useNavigate();
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [rehireModal, setRehireModal] = useState<any>(null);
  const [rehireForm, setRehireForm] = useState({ position: "", department: "", salary: "", notes: "" });
  const [submittingRehire, setSubmittingRehire] = useState(false);
  const perPage = 12;

  async function fetchAlumni() {
    setLoading(true);
    try {
      const res = await apiGet<any>("/alumni", {
        page,
        perPage,
        search: search || undefined,
      });
      if (res.success) {
        const payload = res.data;
        setAlumni(payload?.data || []);
        setTotal(payload?.total || 0);
        setTotalPages(payload?.totalPages || 0);
      }
    } catch {
      toast.error("Failed to load alumni");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlumni();
  }, [page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAlumni();
  }

  async function handleProposeRehire(e: React.FormEvent) {
    e.preventDefault();
    if (!rehireModal) return;
    setSubmittingRehire(true);
    try {
      const res = await apiPost<any>("/rehire", {
        alumni_id: rehireModal.id,
        position: rehireForm.position,
        department: rehireForm.department || undefined,
        salary: Math.round(Number(rehireForm.salary) * 100),
        notes: rehireForm.notes || undefined,
      });
      if (res.success) {
        toast.success("Rehire proposed successfully");
        setRehireModal(null);
        setRehireForm({ position: "", department: "", salary: "", notes: "" });
        navigate("/rehire");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to propose rehire");
    } finally {
      setSubmittingRehire(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alumni Network</h1>
        <p className="mt-1 text-sm text-gray-500">Browse the alumni directory.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alumni by name, email, or designation..."
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : alumni.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <GraduationCap className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          No alumni found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alumni.map((a: any) => {
              const name = a.first_name
                ? `${a.first_name} ${a.last_name || ""}`
                : `Employee #${a.employee_id}`;
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-sm font-semibold">
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{name}</h4>
                      <p className="text-xs text-gray-500">{a.last_designation || "N/A"}</p>
                      {a.last_department && (
                        <p className="text-xs text-gray-400">{a.last_department}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {a.personal_email && (
                      <a
                        href={`mailto:${a.personal_email}`}
                        className="flex items-center gap-2 text-xs text-gray-600 hover:text-rose-600"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {a.personal_email}
                      </a>
                    )}
                    {a.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone className="h-3.5 w-3.5" />
                        {a.phone}
                      </div>
                    )}
                    {a.linkedin_url && (
                      <a
                        href={a.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                        LinkedIn Profile
                      </a>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setRehireModal(a);
                        setRehireForm({ position: "", department: "", salary: "", notes: "" });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Propose Rehire
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rehire Proposal Modal */}
      {rehireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Propose Rehire
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              For: {rehireModal.first_name ? `${rehireModal.first_name} ${rehireModal.last_name || ""}` : `Alumni #${rehireModal.employee_id}`}
            </p>
            <form onSubmit={handleProposeRehire} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                <input
                  type="text"
                  required
                  value={rehireForm.position}
                  onChange={(e) => setRehireForm({ ...rehireForm, position: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="e.g. Senior Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={rehireForm.department}
                  onChange={(e) => setRehireForm({ ...rehireForm, department: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="e.g. Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Salary *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={rehireForm.salary}
                  onChange={(e) => setRehireForm({ ...rehireForm, salary: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Monthly salary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={rehireForm.notes}
                  onChange={(e) => setRehireForm({ ...rehireForm, notes: e.target.value })}
                  rows={2}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRehireModal(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRehire}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submittingRehire ? "Submitting..." : "Propose Rehire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
