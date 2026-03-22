import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isLoggedIn, useAuthStore, extractSSOToken } from "@/lib/auth-store";
import { apiPost } from "@/api/client";

// Layouts (eagerly loaded)
import { DashboardLayout } from "@/components/layout/DashboardLayout";

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

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
    </div>
  );
}

function AuthRedirect() {
  return isLoggedIn() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function SSOGate({ children }: { children: React.ReactNode }) {
  const login = useAuthStore((s) => s.login);
  const [ssoToken] = useState(() => extractSSOToken());
  const [ready, setReady] = useState(!ssoToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ssoToken) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiPost<{
          user: any;
          tokens: { accessToken: string; refreshToken: string };
        }>("/auth/sso", { token: ssoToken });

        if (cancelled) return;

        const { user, tokens } = res.data!;
        login(user, tokens);

        if (window.location.pathname === "/" || window.location.pathname === "/login") {
          window.location.replace("/dashboard");
          return;
        }
        setReady(true);
      } catch (err: any) {
        if (cancelled) return;
        console.error("SSO exchange failed:", err);
        setError("SSO login failed. Please try logging in manually.");
        setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [ssoToken, login]);

  if (!ready) return <PageLoader />;
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/login" className="text-brand-600 underline">Go to login</a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <SSOGate>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect */}
        <Route path="/" element={<AuthRedirect />} />

        {/* Protected routes inside DashboardLayout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Exits */}
          <Route path="/exits" element={<ExitListPage />} />
          <Route path="/exits/new" element={<InitiateExitPage />} />
          <Route path="/exits/resign" element={<ResignationPage />} />
          <Route path="/exits/my" element={<MyExitPage />} />
          <Route path="/exits/:id" element={<ExitDetailPage />} />

          {/* Checklists */}
          <Route path="/checklists" element={<ChecklistTemplatesPage />} />
          <Route path="/checklists/:id" element={<ChecklistInstancePage />} />

          {/* Clearance */}
          <Route path="/clearance" element={<ClearanceRecordsPage />} />
          <Route path="/clearance/departments" element={<ClearanceDeptPage />} />

          {/* Interviews */}
          <Route path="/interviews" element={<InterviewListPage />} />
          <Route path="/interviews/templates" element={<InterviewTemplatesPage />} />
          <Route path="/interviews/my" element={<MyExitInterviewPage />} />
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />

          {/* FnF */}
          <Route path="/fnf" element={<FnFListPage />} />
          <Route path="/fnf/:id" element={<FnFDetailPage />} />

          {/* Buyout */}
          <Route path="/buyout" element={<BuyoutListPage />} />
          <Route path="/buyout/calculator" element={<BuyoutCalculatorPage />} />

          {/* Assets */}
          <Route path="/assets" element={<AssetListPage />} />

          {/* KT */}
          <Route path="/kt" element={<KTListPage />} />
          <Route path="/kt/my" element={<MyKTPage />} />
          <Route path="/kt/:id" element={<KTDetailPage />} />

          {/* Letters */}
          <Route path="/letters" element={<GeneratedLettersPage />} />
          <Route path="/letters/templates" element={<LetterTemplatesPage />} />

          {/* Alumni */}
          <Route path="/alumni" element={<AlumniListPage />} />
          <Route path="/alumni/my" element={<MyAlumniPage />} />

          {/* Rehire */}
          <Route path="/rehire" element={<RehireListPage />} />
          <Route path="/rehire/:id" element={<RehireDetailPage />} />

          {/* Analytics */}
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/analytics/nps" element={<NPSPage />} />
          <Route path="/analytics/flight-risk" element={<AttritionPredictionPage />} />
          <Route path="/analytics/flight-risk/:employeeId" element={<EmployeeRiskDetailPage />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<div className="p-8"><h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1></div>} />
      </Routes>
    </Suspense>
    </SSOGate>
  );
}
