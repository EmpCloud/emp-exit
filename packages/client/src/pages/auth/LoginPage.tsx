import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DoorOpen, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useLogin } from "@/api/hooks";
import { useAuthStore, homeFor } from "@/lib/auth-store";
import toast from "react-hot-toast";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const loginMutation = useLogin();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await loginMutation.mutateAsync({ email, password });
      if (res.success) {
        login(res.data.user, res.data.tokens);
        toast.success(`Welcome back, ${res.data.user.firstName}!`);
        navigate(homeFor(res.data.user));
      } else {
        setLoginError(res.error?.message || "Login failed");
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error?.message || "Login failed. Check your credentials.");
    }
  }

  return (
    <main className="flex min-h-dvh bg-background">
      {/* Left panel — brand */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 px-12 py-16 lg:flex lg:w-[54%] lg:items-center lg:justify-center xl:px-20">
        <div aria-hidden="true" className="absolute -start-24 -top-24 size-80 rounded-full bg-white/5 blur-2xl" />
        <div aria-hidden="true" className="absolute -bottom-36 -end-24 size-[30rem] rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative max-w-xl text-white">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
              <DoorOpen className="size-7 text-white" aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold tracking-tight">EMP Exit</span>
          </div>
          <h1 className="mb-5 max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Streamline employee exit management
          </h1>
          <p className="max-w-lg text-lg leading-8 text-brand-100">
            Manage resignations, clearance, knowledge transfer, FnF settlements,
            exit interviews, and alumni networking -- all in one place.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4" aria-label="EMP Exit capabilities">
            {[
              "Exit workflows",
              "Clearance tracking",
              "KT management",
              "FnF settlement",
              "Exit interviews",
              "Alumni network",
              "Letter generation",
              "Analytics",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm font-medium text-brand-50">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-200 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Right panel — form */}
      <section className="relative flex w-full items-center justify-center overflow-hidden bg-background px-4 py-24 sm:px-6 lg:w-[46%] lg:py-16">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/0.08),transparent_38%)] dark:bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/0.12),transparent_42%)]" />
        {/* Theme toggle — pinned top-right (login is outside DashboardLayout) */}
        <div className="absolute end-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-border bg-card/80 p-1 shadow-sm backdrop-blur-sm sm:end-6 sm:top-6">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="grid size-11 place-items-center rounded-xl bg-primary shadow-md">
              <DoorOpen className="size-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold text-foreground">EMP Exit</span>
          </div>

          <div className="surface-card p-6 shadow-card sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Sign in to manage employee exits</p>

            {sessionExpired && (
              <div role="status" className="mt-5 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm leading-5 text-foreground">
                <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-warning" aria-hidden="true" />
                <span>Your session has expired. Please log in again.</span>
              </div>
            )}

            {loginError && (
              <div id="login-error" role="alert" className="mt-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm leading-5 text-danger dark:text-red-300">
                <AlertCircle className="mt-0.5 size-4 flex-shrink-0" aria-hidden="true" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5" aria-busy={loginMutation.isPending}>
              <div>
                <label htmlFor="email" className="field-label">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoginError(null);
                  }}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  aria-invalid={Boolean(loginError)}
                  aria-describedby={loginError ? "login-error" : undefined}
                  className="control"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError(null);
                    }}
                    required
                    autoComplete="current-password"
                    aria-invalid={Boolean(loginError)}
                    aria-describedby={loginError ? "login-error" : undefined}
                    className="control pe-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute end-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full"
              >
                {loginMutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Part of the EMP HRMS ecosystem
          </p>
        </div>
      </section>
    </main>
  );
}
