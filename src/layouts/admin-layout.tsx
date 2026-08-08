import { LayoutDashboard } from 'lucide-react'
import { RoleShell } from '@/components/common/role-shell'

const navigation = [{ href: '/admin', label: 'Ringkasan Platform', icon: LayoutDashboard, end: true }]

export function AdminLayout() {
  return <RoleShell roleLabel="Admin" navigation={navigation} />
}
