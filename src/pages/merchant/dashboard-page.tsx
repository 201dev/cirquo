import { CircleDollarSign, PackageCheck, Scale } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SummaryCard } from '@/components/common/summary-card'
import { Badge } from '@/components/ui/badge'

export default function MerchantDashboardPage() {
  return (
    <>
      <PageHeader title="Ringkasan Merchant" description="Data contoh Phase 0; belum terhubung ke Convex atau Material Flow Ledger." action={<Badge variant="outline">Placeholder</Badge>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Rescue Item aktif" value="2" icon={<PackageCheck />} />
        <SummaryCard label="Berat tercatat" value="5,3 kg" icon={<Scale />} />
        <SummaryCard label="Pendapatan" value="Rp126.000" icon={<CircleDollarSign />} />
      </div>
    </>
  )
}
