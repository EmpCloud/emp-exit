import { lazy } from "react";
import { Route, Navigate, useParams } from "react-router-dom";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ButtonLink } from "@/components/ui/Button";
import { isAdmin, EMPLOYEE_HOME } from "@/lib/auth-store";

// Guards an admin-only page: employees are bounced to their self-service hub
// instead of seeing an org-wide management console (or an empty, role-scoped one).
function AdminRoute({ children }: { children: React.ReactNode }) {
  return isAdmin() ? <>{children}</> : <Navigate to={EMPLOYEE_HOME} replace />;
}

// /exits/:id/resignation has no dedicated page — the resignation details live on
// the exit detail page. Redirect there (preserving the id) instead of 404-ing.
function ExitResignationRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/exits/${id}`} replace />;
}

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-12">
      <section className="surface-card w-full max-w-md p-8 text-center shadow-card" aria-labelledby="not-found-title">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <FileQuestion className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-primary">404</p>
        <h1 id="not-found-title" className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Page Not Found
        </h1>
        <ButtonLink to="/" variant="secondary" className="mt-6 w-full">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          <span>{t("common.back")}</span>
        </ButtonLink>
      </section>
    </main>
  );
}

// Lazy-loaded pages
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);

// Exits
const ExitListPage = lazy(() =>
  import("@/pages/exits/ExitListPage").then((m) => ({ default: m.ExitListPage })),
);
const ExitDetailPage = lazy(() =>
  import("@/pages/exits/ExitDetailPage").then((m) => ({ default: m.ExitDetailPage })),
);
const InitiateExitPage = lazy(() =>
  import("@/pages/exits/InitiateExitPage").then((m) => ({ default: m.InitiateExitPage })),
);
const ResignationPage = lazy(() =>
  import("@/pages/exits/ResignationPage").then((m) => ({ default: m.ResignationPage })),
);
const MyExitPage = lazy(() =>
  import("@/pages/exits/MyExitPage").then((m) => ({ default: m.MyExitPage })),
);

// Checklists
const ChecklistTemplatesPage = lazy(() =>
  import("@/pages/checklists/ChecklistTemplatesPage").then((m) => ({ default: m.ChecklistTemplatesPage })),
);
const ChecklistInstancePage = lazy(() =>
  import("@/pages/checklists/ChecklistInstancePage").then((m) => ({ default: m.ChecklistInstancePage })),
);

// Clearance
const ClearanceDeptPage = lazy(() =>
  import("@/pages/clearance/ClearanceDeptPage").then((m) => ({ default: m.ClearanceDeptPage })),
);
const ClearanceRecordsPage = lazy(() =>
  import("@/pages/clearance/ClearanceRecordsPage").then((m) => ({ default: m.ClearanceRecordsPage })),
);

// Interviews
const InterviewTemplatesPage = lazy(() =>
  import("@/pages/interviews/InterviewTemplatesPage").then((m) => ({ default: m.InterviewTemplatesPage })),
);
const InterviewListPage = lazy(() =>
  import("@/pages/interviews/InterviewListPage").then((m) => ({ default: m.InterviewListPage })),
);
const InterviewDetailPage = lazy(() =>
  import("@/pages/interviews/InterviewDetailPage").then((m) => ({ default: m.InterviewDetailPage })),
);
const MyExitInterviewPage = lazy(() =>
  import("@/pages/interviews/MyExitInterviewPage").then((m) => ({ default: m.MyExitInterviewPage })),
);

// FnF
const FnFListPage = lazy(() =>
  import("@/pages/fnf/FnFListPage").then((m) => ({ default: m.FnFListPage })),
);
const FnFDetailPage = lazy(() =>
  import("@/pages/fnf/FnFDetailPage").then((m) => ({ default: m.FnFDetailPage })),
);

// Assets
const AssetListPage = lazy(() =>
  import("@/pages/assets/AssetListPage").then((m) => ({ default: m.AssetListPage })),
);

// KT
const KTListPage = lazy(() =>
  import("@/pages/kt/KTListPage").then((m) => ({ default: m.KTListPage })),
);
const KTDetailPage = lazy(() =>
  import("@/pages/kt/KTDetailPage").then((m) => ({ default: m.KTDetailPage })),
);

// Letters
const LetterTemplatesPage = lazy(() =>
  import("@/pages/letters/LetterTemplatesPage").then((m) => ({ default: m.LetterTemplatesPage })),
);
const GeneratedLettersPage = lazy(() =>
  import("@/pages/letters/GeneratedLettersPage").then((m) => ({ default: m.GeneratedLettersPage })),
);

// Alumni
const AlumniListPage = lazy(() =>
  import("@/pages/alumni/AlumniListPage").then((m) => ({ default: m.AlumniListPage })),
);
const MyAlumniPage = lazy(() =>
  import("@/pages/alumni/MyAlumniPage").then((m) => ({ default: m.MyAlumniPage })),
);

// Self-service KT
const MyKTPage = lazy(() =>
  import("@/pages/kt/MyKTPage").then((m) => ({ default: m.MyKTPage })),
);

// Buyout
const BuyoutCalculatorPage = lazy(() =>
  import("@/pages/buyout/BuyoutCalculatorPage").then((m) => ({ default: m.BuyoutCalculatorPage })),
);
const BuyoutListPage = lazy(() =>
  import("@/pages/buyout/BuyoutListPage").then((m) => ({ default: m.BuyoutListPage })),
);

// Rehire
const RehireListPage = lazy(() =>
  import("@/pages/rehire/RehireListPage").then((m) => ({ default: m.RehireListPage })),
);
const RehireDetailPage = lazy(() =>
  import("@/pages/rehire/RehireDetailPage").then((m) => ({ default: m.RehireDetailPage })),
);

// Analytics
const AnalyticsPage = lazy(() =>
  import("@/pages/analytics/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })),
);
const AttritionPredictionPage = lazy(() =>
  import("@/pages/analytics/AttritionPredictionPage").then((m) => ({ default: m.AttritionPredictionPage })),
);
const EmployeeRiskDetailPage = lazy(() =>
  import("@/pages/analytics/EmployeeRiskDetailPage").then((m) => ({ default: m.EmployeeRiskDetailPage })),
);
const NPSPage = lazy(() =>
  import("@/pages/analytics/NPSPage").then((m) => ({ default: m.NPSPage })),
);

// Settings
const SettingsPage = lazy(() =>
  import("@/pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

export function AppRoutes() {
  return (
    <>
      {/* Public auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes inside DashboardLayout.
          Self-service pages (/exits/my, /interviews/my, /kt/my, /alumni/my,
          /exits/resign) are open to employees; everything else is wrapped in
          <AdminRoute> so employees are redirected to their own hub. */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />

        {/* Exits */}
        <Route path="/exits" element={<AdminRoute><ExitListPage /></AdminRoute>} />
        <Route path="/exits/new" element={<AdminRoute><InitiateExitPage /></AdminRoute>} />
        <Route path="/exits/resign" element={<ResignationPage />} />
        <Route path="/exits/my" element={<MyExitPage />} />
        <Route path="/exits/:id/resignation" element={<ExitResignationRedirect />} />
        <Route path="/exits/:id" element={<AdminRoute><ExitDetailPage /></AdminRoute>} />

        {/* Checklists */}
        <Route path="/checklists" element={<AdminRoute><ChecklistTemplatesPage /></AdminRoute>} />
        <Route path="/checklists/:id" element={<AdminRoute><ChecklistInstancePage /></AdminRoute>} />

        {/* Clearance */}
        <Route path="/clearance" element={<AdminRoute><ClearanceRecordsPage /></AdminRoute>} />
        <Route path="/clearance/departments" element={<AdminRoute><ClearanceDeptPage /></AdminRoute>} />
        {/* Alias so a /clearance/dept deep-link doesn't 404. */}
        <Route path="/clearance/dept" element={<Navigate to="/clearance/departments" replace />} />

        {/* Interviews */}
        <Route path="/interviews" element={<AdminRoute><InterviewListPage /></AdminRoute>} />
        <Route path="/interviews/templates" element={<AdminRoute><InterviewTemplatesPage /></AdminRoute>} />
        <Route path="/interviews/my" element={<MyExitInterviewPage />} />
        <Route path="/interviews/:id" element={<AdminRoute><InterviewDetailPage /></AdminRoute>} />

        {/* FnF */}
        <Route path="/fnf" element={<AdminRoute><FnFListPage /></AdminRoute>} />
        <Route path="/fnf/:id" element={<AdminRoute><FnFDetailPage /></AdminRoute>} />

        {/* Buyout — the list is admin-only, but the calculator is also the
            employee's self-service "request a buyout" page (it defaults to
            /self-service/my-buyout/*), so it must stay reachable by employees. */}
        <Route path="/buyout" element={<AdminRoute><BuyoutListPage /></AdminRoute>} />
        <Route path="/buyout/calculator" element={<BuyoutCalculatorPage />} />

        {/* Assets */}
        <Route path="/assets" element={<AdminRoute><AssetListPage /></AdminRoute>} />

        {/* KT */}
        <Route path="/kt" element={<AdminRoute><KTListPage /></AdminRoute>} />
        <Route path="/kt/my" element={<MyKTPage />} />
        <Route path="/kt/:id" element={<AdminRoute><KTDetailPage /></AdminRoute>} />

        {/* Letters */}
        <Route path="/letters" element={<AdminRoute><GeneratedLettersPage /></AdminRoute>} />
        <Route path="/letters/templates" element={<AdminRoute><LetterTemplatesPage /></AdminRoute>} />

        {/* Alumni */}
        <Route path="/alumni" element={<AdminRoute><AlumniListPage /></AdminRoute>} />
        <Route path="/alumni/my" element={<MyAlumniPage />} />

        {/* Rehire */}
        <Route path="/rehire" element={<AdminRoute><RehireListPage /></AdminRoute>} />
        <Route path="/rehire/:id" element={<AdminRoute><RehireDetailPage /></AdminRoute>} />

        {/* Analytics */}
        <Route path="/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
        <Route path="/analytics/nps" element={<AdminRoute><NPSPage /></AdminRoute>} />
        <Route path="/analytics/flight-risk" element={<AdminRoute><AttritionPredictionPage /></AdminRoute>} />
        <Route path="/analytics/flight-risk/:employeeId" element={<AdminRoute><EmployeeRiskDetailPage /></AdminRoute>} />

        {/* Settings */}
        <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}
