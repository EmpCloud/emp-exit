import { useState, useEffect } from "react";
import {
  GraduationCap,
  Search,
  Linkedin,
  Mail,
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiGet } from "@/api/client";
import toast from "react-hot-toast";
import { getInitials } from "@/lib/utils";

export function AlumniListPage() {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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
    </div>
  );
}
