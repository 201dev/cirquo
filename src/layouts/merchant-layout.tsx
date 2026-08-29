import {
  BarChart3,
  Bell,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  Store,
} from "lucide-react";
import { RoleShell } from "@/components/common/role-shell";

const navigation = [
  { href: "/merchant", label: "Ringkasan", icon: LayoutDashboard, end: true },
  { href: "/merchant/surplus", label: "Rescue Item", icon: Store, end: true },
  {
    href: "/merchant/surplus/new",
    label: "Buat Rescue Item",
    icon: PackagePlus,
    end: true,
  },
  { href: "/merchant/pickup", label: "Konfirmasi Pickup", icon: PackageCheck },
  { href: "/merchant/impact", label: "Dampak Merchant", icon: BarChart3 },
  { href: "/merchant/notifications", label: "Notifikasi", icon: Bell },
];

export function MerchantLayout() {
  return <RoleShell roleLabel="Merchant" navigation={navigation} />;
}
