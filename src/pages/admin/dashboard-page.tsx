import { CircleGauge, Scale, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SummaryCard } from '@/components/common/summary-card'
import { Badge } from '@/components/ui/badge'

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader title="Ringkasan Platform" description="Material Flow Ledger dan metrik platform akan dibangun pada M1 dan M6." action={<Badge variant="outline">Placeholder</Badge>} />
      <div className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Aktor contoh" value="12" icon={<UsersRound />} /><SummaryCard label="Surplus tercatat" value="21,5 kg" icon={<Scale />} /><SummaryCard label="Circularity contoh" value="93%" description="Bukan data produksi" icon={<CircleGauge />} /></div>
    </>
  )
}
