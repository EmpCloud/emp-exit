import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserMinus, Loader2 } from "lucide-react";
import { apiPost } from "@/api/client";
import { homeFor } from "@/lib/auth-store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { Page, PageDescription, PageHeader, PageHeaderContent, PageTitle } from "@/components/ui/Page";

const REASON_CATEGORIES = [
  { value: "better_opportunity", label: "Better Opportunity" },
  { value: "compensation", label: "Compensation" },
  { value: "relocation", label: "Relocation" },
  { value: "personal", label: "Personal Reasons" },
  { value: "health", label: "Health" },
  { value: "higher_education", label: "Higher Education" },
  { value: "other", label: "Other" },
];

export function ResignationPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [reasonCategory, setReasonCategory] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [resignationDate, setResignationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [lastWorkingDate, setLastWorkingDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const body: Record<string, any> = {
        reason_category: reasonCategory,
        resignation_date: resignationDate,
      };
      if (reasonDetail) body.reason_detail = reasonDetail;
      if (lastWorkingDate) body.last_working_date = lastWorkingDate;

      await apiPost("/self-service/resign", body);
      setSuccess(true);
      setTimeout(() => navigate("/exits/my"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to submit resignation");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Page>
        <PageHeader><PageHeaderContent><PageTitle>Submit Resignation</PageTitle></PageHeaderContent></PageHeader>
        <Card className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="py-10 text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><UserMinus aria-hidden="true" className="size-7" /></span>
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">Resignation Submitted</h2>
          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            Your resignation has been submitted successfully. Redirecting to your exit status...
          </p>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader><PageHeaderContent><PageTitle>Submit Resignation</PageTitle><PageDescription>Submit your resignation request.</PageDescription></PageHeaderContent></PageHeader>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
        <Card><CardContent className="space-y-5 pt-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Reason Category */}
          <div>
            <FieldLabel htmlFor="reason_category">
              Reason for Leaving <span className="text-red-500">*</span>
            </FieldLabel>
            <Select
              id="reason_category"
              required
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
            >
              <option value="" disabled>Select a reason…</option>
              {REASON_CATEGORIES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </div>

          {/* Reason Detail */}
          <div>
            <FieldLabel htmlFor="reason_detail">
              Additional Details
            </FieldLabel>
            <Textarea
              id="reason_detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={4}
              placeholder="Please share any additional details about your decision..."
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="resignation_date">
                Resignation Date <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="resignation_date"
                type="date"
                required
                value={resignationDate}
                onChange={(e) => setResignationDate(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="last_working_date">
                Preferred Last Working Date
              </FieldLabel>
              <Input
                id="last_working_date"
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Subject to notice period requirements.
              </p>
            </div>
          </div>
        </CardContent></Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting || !resignationDate || !reasonCategory}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            Submit Resignation
          </Button>
          <Button
            type="button"
            onClick={() => navigate(homeFor())}
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Page>
  );
}
