import {
  BookOpenCheck,
  Bell,
  FileWarning,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { RoleShell } from "@/components/common/role-shell";

const navigation = [
  {
    href: "/admin",
    label: "Ringkasan Platform",
    icon: LayoutDashboard,
    end: true,
  },
  {
    href: "/admin/verifications",
    label: "Verifikasi Mitra",
    icon: ShieldCheck,
  },
  { href: "/admin/moderation", label: "Moderasi", icon: FileWarning },
  { href: "/admin/ledger", label: "Material Flow Ledger", icon: BookOpenCheck },
  { href: "/admin/notifications", label: "Notifikasi", icon: Bell },
];

export function AdminLayout() {
  return <RoleShell roleLabel="Admin" navigation={navigation} />;
}
