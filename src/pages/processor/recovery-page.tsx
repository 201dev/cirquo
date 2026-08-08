import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKg, recoveryBatches } from '@/constants/mock-data'

export default function RecoveryPage() {
  return (
    <>
      <PageHeader title="Antrean Recovery" description="Circular Routing dan aksi intake belum aktif pada Phase 0." />
      <div className="grid gap-4">{recoveryBatches.map((batch) => <Card key={batch.id} className="shadow-none"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>{batch.itemName}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Dari {batch.merchantName}</p></div><Badge variant="secondary">{batch.status}</Badge></CardHeader><CardContent><p className="text-2xl font-semibold">{formatKg(batch.offeredWeightGrams)}</p><p className="text-sm text-muted-foreground">Berat yang dinyatakan Merchant</p></CardContent></Card>)}</div>
    </>
  )
}
