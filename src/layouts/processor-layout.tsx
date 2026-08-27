import { History, LayoutDashboard, Recycle } from "lucide-react";
import { RoleShell } from "@/components/common/role-shell";

const navigation = [
  { href: "/processor", label: "Ringkasan", icon: LayoutDashboard, end: true },
  { href: "/processor/recovery", label: "Antrean Recovery", icon: Recycle },
  { href: "/processor/history", label: "Riwayat Outcome", icon: History },
];

export function ProcessorLayout() {
  return <RoleShell roleLabel="Organic Processor" navigation={navigation} />;
}
