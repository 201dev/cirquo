import { Clock3, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatIdr, formatKg, rescueItems } from '@/constants/mock-data'

export default function ExplorePage() {
  return (
    <>
      <PageHeader title="Jelajah Rescue Item" description="Mapbox dan data realtime akan dihubungkan pada M3." action={<Badge variant="outline">Data contoh</Badge>} />
      <div className="grid gap-4 sm:grid-cols-2">
        {rescueItems.map((item) => (
          <Card key={item.id} className="shadow-none">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div><CardTitle>{item.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.merchantName}</p></div>
                <Badge>{item.remainingQuantity} tersisa</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p><span className="text-xl font-semibold text-primary">{formatIdr(item.currentPrice)}</span> <s className="ml-2 text-sm text-muted-foreground">{formatIdr(item.originalPrice)}</s></p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock3 />{item.pickupWindow}</span>
                <span className="flex items-center gap-1"><MapPin />{formatKg(item.weightPerItemGrams)} / unit</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
