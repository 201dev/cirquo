import { Leaf, Scale, WalletCards } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SummaryCard } from '@/components/common/summary-card'
import { Badge } from '@/components/ui/badge'

export default function ConsumerHomePage() {
  return (
    <>
      <PageHeader title="Dampakmu" description="Pratinjau Phase 0 — angka berikut adalah data contoh, belum berasal dari Material Flow Ledger." action={<Badge variant="outline">Placeholder</Badge>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Rescued" value="2,4 kg" description="Contoh tampilan" icon={<Scale />} />
        <SummaryCard label="Estimasi CO2e" value="5,8 kg" description="Metodologi hadir di M6" icon={<Leaf />} />
        <SummaryCard label="Hemat" value="Rp84.000" description="Contoh tampilan" icon={<WalletCards />} />
      </div>
    </>
  )
}
