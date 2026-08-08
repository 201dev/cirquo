import { LayoutDashboard, Recycle } from 'lucide-react'
import { RoleShell } from '@/components/common/role-shell'

const navigation = [
  { href: '/processor', label: 'Ringkasan', icon: LayoutDashboard, end: true },
  { href: '/processor/recovery', label: 'Antrean Recovery', icon: Recycle },
]

export function ProcessorLayout() {
  return <RoleShell roleLabel="Organic Processor" navigation={navigation} />
}
