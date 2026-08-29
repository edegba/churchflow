import {
  LayoutDashboard,
  Radar,
  Users,
  UserPlus,
  PhoneCall,
  CalendarCheck,
  Network,
  Building2,
  HandHeart,
  MessageSquare,
  CalendarDays,
  Send,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  ready: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, ready: true },
  { label: "Care Radar", to: "/care-radar", icon: Radar, ready: false },
  { label: "Members", to: "/members", icon: Users, ready: true },
  { label: "First Timers", to: "/first-timers", icon: UserPlus, ready: false },
  { label: "Follow-Up", to: "/follow-up", icon: PhoneCall, ready: false },
  { label: "Attendance", to: "/attendance", icon: CalendarCheck, ready: false },
  { label: "Groups", to: "/groups", icon: Network, ready: false },
  { label: "Departments", to: "/departments", icon: Building2, ready: false },
  { label: "Prayer Requests", to: "/prayer-requests", icon: HandHeart, ready: false },
  { label: "Feedback", to: "/feedback", icon: MessageSquare, ready: false },
  { label: "Events", to: "/events", icon: CalendarDays, ready: false },
  { label: "Communication", to: "/communication", icon: Send, ready: false },
  { label: "Reports", to: "/reports", icon: BarChart3, ready: false },
  { label: "Settings", to: "/settings", icon: Settings, ready: true },
];

export const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  church_admin: "Church Admin",
  pastor: "Pastor",
  follow_up_officer: "Follow-up Officer",
  department_leader: "Department Leader",
  group_leader: "Group/Cell Leader",
  finance_officer: "Finance Officer",
};
