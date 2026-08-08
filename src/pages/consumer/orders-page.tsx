import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatIdr, orders } from '@/constants/mock-data'

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Pesanan" description="Riwayat reservasi contoh untuk memvalidasi layout." />
      {orders.map((order) => (
        <Card key={order.id} className="shadow-none">
          <CardHeader className="flex-row items-start justify-between"><div><CardTitle>{order.itemName}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{order.merchantName}</p></div><Badge>{order.status}</Badge></CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">Kode pickup contoh</p><p className="font-mono text-2xl font-semibold tracking-widest">{order.pickupCode}</p></div><p className="font-semibold">{formatIdr(order.totalPrice)}</p></CardContent>
        </Card>
      ))}
    </>
  )
}
