import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calculator,
  ClipboardCheck,
  DollarSign,
  DoorOpen,
  FileSignature,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "nav.overview",
    items: [{ to: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "nav.exitOperations",
    items: [
      { to: "/exits", label: "nav.exits", icon: DoorOpen },
      { to: "/checklists", label: "nav.checklists", icon: ClipboardCheck },
      { to: "/clearance", label: "nav.clearance", icon: ShieldCheck },
    ],
  },
  {
    label: "nav.settlement",
    items: [
      { to: "/interviews", label: "nav.interviews", icon: MessageSquare },
      { to: "/fnf", label: "nav.fnf", icon: Calculator },
      { to: "/buyout", label: "nav.buyout", icon: DollarSign },
    ],
  },
  {
    label: "nav.handoverAssets",
    items: [
      { to: "/assets", label: "nav.assets", icon: Package },
      { to: "/kt", label: "nav.kt", icon: BookOpen },
      { to: "/letters", label: "nav.letters", icon: FileSignature },
    ],
  },
  {
    label: "nav.alumniInsights",
    items: [
      { to: "/alumni", label: "nav.alumni", icon: GraduationCap },
      { to: "/rehire", label: "nav.rehire", icon: UserPlus },
      { to: "/analytics", label: "nav.analytics", icon: BarChart3, exact: true },
      { to: "/analytics/flight-risk", label: "nav.flightRisk", icon: AlertTriangle },
    ],
  },
  {
    label: "nav.administration",
    items: [{ to: "/settings", label: "nav.settings", icon: Settings }],
  },
];

export const EMPLOYEE_NAV_GROUPS: NavGroup[] = [
  {
    label: "nav.selfService",
    items: [
      { to: "/exits/my", label: "nav.myExit", icon: UserMinus },
      { to: "/interviews/my", label: "nav.myInterview", icon: MessageSquare },
      { to: "/kt/my", label: "nav.myKt", icon: BookOpen },
      { to: "/alumni/my", label: "nav.alumni", icon: GraduationCap },
    ],
  },
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
