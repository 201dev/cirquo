import { CircleUserRound, Compass, Leaf, ShoppingBag } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const navigation = [
  { href: '/explore', label: 'Jelajah', icon: Compass },
  { href: '/orders', label: 'Pesanan', icon: ShoppingBag },
  { href: '/', label: 'Dampak', icon: Leaf, end: true },
]

export function ConsumerLayout() {
  return (
    <div className="min-h-svh bg-muted/35">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <NavLink to="/" className="text-xl font-semibold text-primary">Cirquo</NavLink>
          <Badge variant="secondary" className="ml-3">Semarang</Badge>
          <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Navigasi konsumen">
            {navigation.map(({ href, label, icon: Icon, end }) => (
              <NavLink key={href} end={end} to={href} className={({ isActive }) => cn('flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}>
                <Icon aria-hidden="true" />{label}
              </NavLink>
            ))}
          </nav>
          <CircleUserRound className="ml-3 text-muted-foreground" aria-label="Akun placeholder" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 sm:pb-8"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Navigasi konsumen seluler">
        {navigation.map(({ href, label, icon: Icon, end }) => (
          <NavLink key={href} end={end} to={href} className={({ isActive }) => cn('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
            <Icon aria-hidden="true" />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
