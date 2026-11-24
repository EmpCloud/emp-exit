import { ArrowLeft } from "lucide-react";

export function hasEmpCloudReturnLink() {
  return localStorage.getItem("sso_source") === "empcloud";
}

export function BackToDashboard() {
  const isSSO = hasEmpCloudReturnLink();
  if (!isSSO) return null;

  const returnUrl =
    localStorage.getItem('empcloud_return_url') ||
    'https://test-empcloud.empcloud.com/dashboard';

  return (
    <a
      href={returnUrl}
      aria-label="Back to EMP Cloud"
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-[background-color,color] hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
      <span>EMP Cloud</span>
    </a>
  );
}
