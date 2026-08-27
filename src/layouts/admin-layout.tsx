import {
  BookOpenCheck,
  FileWarning,
  LayoutDashboard,
  MessageSquareWarning,
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
  { href: "/admin/disputes", label: "Sengketa", icon: MessageSquareWarning },
];

export function AdminLayout() {
  return <RoleShell roleLabel="Admin" navigation={navigation} />;
}
