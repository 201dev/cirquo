import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return <main className="grid min-h-svh place-items-center p-6 text-center"><div><p className="text-sm font-medium text-primary">404</p><h1 className="mt-2 text-3xl font-semibold">Halaman tidak ditemukan</h1><p className="mt-2 text-muted-foreground">Rute ini belum tersedia di Cirquo.</p><Button asChild className="mt-6"><Link to="/">Kembali ke beranda</Link></Button></div></main>
}
