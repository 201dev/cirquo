import { LayoutDashboard, PackagePlus, Store } from 'lucide-react'
import { RoleShell } from '@/components/common/role-shell'

const navigation = [
  { href: '/merchant', label: 'Ringkasan', icon: LayoutDashboard, end: true },
  { href: '/merchant/surplus', label: 'Rescue Item', icon: Store },
  { href: '/merchant/surplus/new', label: 'Buat Rescue Item', icon: PackagePlus },
]

export function MerchantLayout() {
  return <RoleShell roleLabel="Merchant" navigation={navigation} />
}
