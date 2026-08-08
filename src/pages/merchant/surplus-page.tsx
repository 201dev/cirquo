import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatIdr, rescueItems } from '@/constants/mock-data'

export default function MerchantSurplusPage() {
  return (
    <>
      <PageHeader title="Rescue Item" description="Kelola surplus yang akan masuk ke alur circular." action={<Button asChild><Link to="/merchant/surplus/new"><Plus />Buat</Link></Button>} />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Rescue Item</TableHead><TableHead>Harga</TableHead><TableHead>Sisa</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{rescueItems.map((item) => <TableRow key={item.id}><TableCell><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.pickupWindow}</p></TableCell><TableCell>{formatIdr(item.currentPrice)}</TableCell><TableCell>{item.remainingQuantity}</TableCell><TableCell><Badge variant="secondary">{item.status}</Badge></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </>
  )
}
