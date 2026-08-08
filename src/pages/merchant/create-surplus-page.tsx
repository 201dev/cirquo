import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function CreateSurplusPage() {
  return (
    <>
      <PageHeader title="Buat Rescue Item" description="Form placeholder Phase 0. Persistensi, validasi Zod, dan Dynamic Rescue Pricing hadir di M2." />
      <Card className="max-w-2xl shadow-none"><CardContent className="pt-6">
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); toast.info('Mode placeholder: belum ada data yang disimpan.') }}>
          <div className="space-y-2"><Label htmlFor="name">Nama Rescue Item</Label><Input id="name" name="name" placeholder="Contoh: Roti artisan sore hari" required /></div>
          <div className="space-y-2"><Label htmlFor="description">Deskripsi</Label><Textarea id="description" name="description" rows={3} placeholder="Jelaskan kondisi dan isi paket." /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quantity">Jumlah unit</Label><Input id="quantity" name="quantity" type="number" min="1" inputMode="numeric" required /></div><div className="space-y-2"><Label htmlFor="weight">Berat per unit (gram)</Label><Input id="weight" name="weight" type="number" min="1" inputMode="numeric" required /></div></div>
          <Button type="submit">Pratinjau placeholder</Button>
        </form>
      </CardContent></Card>
    </>
  )
}
