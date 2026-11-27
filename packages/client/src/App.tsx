import { Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { isLoggedIn, useAuthStore, extractSSOToken, homeFor } from "@/lib/auth-store";
import { apiPost } from "@/api/client";
import { AppRoutes } from "@/routes";

function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 py-12 text-center text-muted-foreground"
    >
      <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      </span>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function AuthRedirect() {
  // Send admins to the management dashboard, employees to their self-service hub.
  return isLoggedIn() ? <Navigate to={homeFor()} replace /> : <Navigate to="/login" replace />;
}

function SSOGate({ children }: { children: React.ReactNode }) {
  const login = useAuthStore((s) => s.login);
  const [ssoToken] = useState(() => extractSSOToken());
  const [ready, setReady] = useState(!ssoToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ssoToken) return;

    let cancelled = false;

    // Timeout to prevent infinite loading if the API is unreachable
    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        console.error("SSO exchange timed out after 10s");
        setError("SSO login timed out. The server may be unavailable.");
        setReady(true);
      }
    }, 10000);

    (async () => {
      try {
        const res = await apiPost<{
          user: any;
          tokens: { accessToken: string; refreshToken: string };
        }>("/auth/sso", { token: ssoToken });

        if (cancelled) return;
        clearTimeout(timeout);

        const { user, tokens } = res.data!;
        login(user, tokens);

        if (window.location.pathname === "/" || window.location.pathname === "/login") {
          window.location.replace(homeFor(user));
          return;
        }
        setReady(true);
      } catch (err: any) {
        if (cancelled) return;
        clearTimeout(timeout);
        console.error("SSO exchange failed:", err);
        const message = err?.response?.data?.error?.message || "SSO login failed. Please try logging in manually.";
        setError(message);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [ssoToken, login]);

  if (!ready) return <PageLoader />;
  if (error) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4 py-12">
        <div role="alert" className="surface-card w-full max-w-md p-6 text-center shadow-card sm:p-8">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-5 text-base font-semibold leading-7 text-foreground">{error}</p>
          <a href="/login" className="button-primary mt-6 w-full">
            <span>Go to login</span>
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </a>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <SSOGate>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<AuthRedirect />} />

          {/* All app routes */}
          {AppRoutes()}
        </Routes>
      </Suspense>
    </SSOGate>
  );
}
