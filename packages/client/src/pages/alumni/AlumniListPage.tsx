import { useState, useEffect, useRef, type ReactNode } from "react";
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
  Plus,
  Info,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import toast from "react-hot-toast";
import { getInitials, formatDate } from "@/lib/utils";
import { EmptyState, LoadingState } from "@/components/ui/States";

function ModalShell({
  titleId,
  onClose,
  busy = false,
  children,
}: {
  titleId: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.requestAnimationFrame(() => {
      const firstControl = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      (firstControl ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busyRef.current) closeRef.current();
      }}
    >
      <div
        ref={dialogRef}
        className="surface-card w-full max-w-md p-6 shadow-floating"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

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

  // Manually adding alumni — HR picks from completed/cancelled exits and
  // POSTs /alumni which resolves the employee_id from the exit row.
  const [addModal, setAddModal] = useState(false);
  const [exits, setExits] = useState<any[]>([]);
  const [loadingExits, setLoadingExits] = useState(false);
  const [selectedExitId, setSelectedExitId] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  async function fetchExitsForPicker() {
    setLoadingExits(true);
    try {
      // Pull recently-completed exits — those are the candidates for
      // alumni profiles (an employee who hasn't actually left isn't an
      // alum yet).
      const res = await apiGet<any>("/exits", { perPage: 100, status: "completed" });
      if (res.success) setExits(res.data?.data ?? []);
    } catch {
      setExits([]);
    } finally {
      setLoadingExits(false);
    }
  }

  function openAddModal() {
    setAddModal(true);
    setSelectedExitId("");
    fetchExitsForPicker();
  }

  async function handleAddAlumni(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExitId) return;
    setSubmittingAdd(true);
    try {
      const res = await apiPost<any>("/alumni", { exit_request_id: selectedExitId });
      if (res.success) {
        toast.success("Alumni profile added");
        setAddModal(false);
        setSelectedExitId("");
        fetchAlumni();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to add alumni profile");
    } finally {
      setSubmittingAdd(false);
    }
  }

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
    <div className="app-page">
      <header className="page-header">
        <div className="page-header__content">
          <p className="page-header__eyebrow">Alumni & Insights</p>
          <h1 className="page-title">Alumni Network</h1>
          <p className="page-subtitle">Browse the alumni directory.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="button-primary"
        >
          <Plus className="h-4 w-4" />
          Add Alumni
        </button>
      </header>

      {/* Search */}
      <form onSubmit={handleSearch} className="surface-card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            aria-label="Search alumni"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alumni by name, email, or designation..."
            className="control ps-10"
          />
        </div>
        <button
          type="submit"
          className="button-primary"
        >
          Search
        </button>
      </form>

      {loading ? (
        <LoadingState label="Loading alumni" />
      ) : alumni.length === 0 ? (
        <div className="surface-card">
          <EmptyState icon={GraduationCap} title="No alumni yet" />
          <p className="mx-auto -mt-8 max-w-md px-6 pb-8 text-center text-sm text-muted-foreground">
            Alumni profiles are created when a departing employee opts in
            via their self-service portal. You can also add one manually
            from a completed exit using the <strong>Add Alumni</strong>{" "}
            button above.
          </p>
          <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <Info className="h-3.5 w-3.5" />
            Tip: only completed exits can be promoted to alumni.
          </div>
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
                  className="surface-card surface-card--interactive p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm font-semibold">
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-foreground truncate">{name}</h4>
                      <p className="text-xs text-muted-foreground">{a.last_designation || "N/A"}</p>
                      {a.last_department && (
                        <p className="text-xs text-muted-foreground">{a.last_department}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {a.personal_email && (
                      <a
                        href={`mailto:${a.personal_email}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-rose-600 dark:text-rose-400"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {a.personal_email}
                      </a>
                    )}
                    {a.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {a.phone}
                      </div>
                    )}
                    {a.linkedin_url && (
                      <a
                        href={a.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                        LinkedIn Profile
                      </a>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => {
                        setRehireModal(a);
                        setRehireForm({ position: "", department: "", salary: "", notes: "" });
                      }}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-950/70"
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="button-secondary size-11 p-0"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="button-secondary size-11 p-0"
                  aria-label="Next page"
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
        <ModalShell titleId="rehire-proposal-title" busy={submittingRehire} onClose={() => setRehireModal(null)}>
            <h2 id="rehire-proposal-title" className="mb-4 text-lg font-semibold text-foreground">
              Propose Rehire
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              For: {rehireModal.first_name ? `${rehireModal.first_name} ${rehireModal.last_name || ""}` : `Alumni #${rehireModal.employee_id}`}
            </p>
            <form onSubmit={handleProposeRehire} className="space-y-4">
              <div>
                <label htmlFor="rehire-position" className="block text-sm font-medium text-muted-foreground mb-1">Position *</label>
                <input
                  id="rehire-position"
                  type="text"
                  required
                  value={rehireForm.position}
                  onChange={(e) => setRehireForm({ ...rehireForm, position: e.target.value })}
                  className="control"
                  placeholder="e.g. Senior Engineer"
                />
              </div>
              <div>
                <label htmlFor="rehire-department" className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
                <input
                  id="rehire-department"
                  type="text"
                  value={rehireForm.department}
                  onChange={(e) => setRehireForm({ ...rehireForm, department: e.target.value })}
                  className="control"
                  placeholder="e.g. Engineering"
                />
              </div>
              <div>
                <label htmlFor="rehire-salary" className="block text-sm font-medium text-muted-foreground mb-1">Proposed Salary *</label>
                <input
                  id="rehire-salary"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={rehireForm.salary}
                  onChange={(e) => setRehireForm({ ...rehireForm, salary: e.target.value })}
                  className="control"
                  placeholder="Monthly salary"
                />
              </div>
              <div>
                <label htmlFor="rehire-notes" className="block text-sm font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  id="rehire-notes"
                  value={rehireForm.notes}
                  onChange={(e) => setRehireForm({ ...rehireForm, notes: e.target.value })}
                  rows={2}
                  className="control min-h-24 py-3"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRehireModal(null)}
                  className="button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRehire}
                  className="button-primary"
                >
                  {submittingRehire ? "Submitting..." : "Propose Rehire"}
                </button>
              </div>
            </form>
        </ModalShell>
      )}

      {/* Add Alumni modal — HR picks a completed exit and POSTs /alumni
          which resolves the employee_id from the exit row server-side. */}
      {addModal && (
        <ModalShell titleId="add-alumni-title" busy={submittingAdd} onClose={() => setAddModal(false)}>
            <h2 id="add-alumni-title" className="mb-1 text-lg font-semibold text-foreground">Add Alumni Profile</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pick a completed exit to add to the alumni directory.
            </p>
            <form onSubmit={handleAddAlumni} className="space-y-4">
              <div>
                <label htmlFor="alumni-exit" className="block text-sm font-medium text-muted-foreground mb-1">
                  Exit *
                </label>
                {loadingExits ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading exits...
                  </div>
                ) : exits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No completed exits available. Complete an exit first to
                    promote that employee to alumni.
                  </p>
                ) : (
                  <select
                    id="alumni-exit"
                    required
                    value={selectedExitId}
                    onChange={(e) => setSelectedExitId(e.target.value)}
                    className="control"
                  >
                    <option value="">Select an exit...</option>
                    {exits.map((ex: any) => {
                      const name = ex.employee
                        ? `${ex.employee.first_name} ${ex.employee.last_name}`
                        : `Exit ${ex.id.slice(0, 8)}`;
                      const lwd = ex.last_working_date ? formatDate(ex.last_working_date) : "no LWD";
                      return (
                        <option key={ex.id} value={ex.id}>
                          {name} — {lwd}
                          {ex.employee?.emp_code ? ` · ${ex.employee.emp_code}` : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  className="button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd || !selectedExitId || exits.length === 0}
                  className="button-primary"
                >
                  {submittingAdd ? "Adding..." : "Add to Alumni"}
                </button>
              </div>
            </form>
        </ModalShell>
      )}
    </div>
  );
}
