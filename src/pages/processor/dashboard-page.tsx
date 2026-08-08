import { Recycle, Scale, Sprout } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SummaryCard } from '@/components/common/summary-card'
import { Badge } from '@/components/ui/badge'

export default function ProcessorDashboardPage() {
  return (
    <>
      <PageHeader title="Ringkasan Organic Processor" description="Data contoh Phase 0; intake dan outcome logging hadir di M5." action={<Badge variant="outline">Placeholder</Badge>} />
      <div className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Antrean" value="1 batch" icon={<Recycle />} /><SummaryCard label="Intake" value="8,2 kg" icon={<Scale />} /><SummaryCard label="Recovered" value="7,6 kg" icon={<Sprout />} /></div>
    </>
  )
}
