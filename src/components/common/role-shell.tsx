import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { NavigationItem } from '@/types/navigation'

interface RoleShellProps {
  roleLabel: string
  navigation: NavigationItem[]
  children?: ReactNode
}

function RoleNavigation({ navigation }: { navigation: NavigationItem[] }) {
  return (
    <nav aria-label="Navigasi utama" className="space-y-1">
      {navigation.map(({ href, icon: Icon, label, end }) => (
        <NavLink
          key={href}
          end={end}
          to={href}
          className={({ isActive }) => cn(
            'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
          )}
        >
          <Icon aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function RoleShell({ roleLabel, navigation, children }: RoleShellProps) {
  return (
    <div className="min-h-svh bg-muted/35">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar p-5 lg:block">
        <NavLink to="/" className="text-xl font-semibold text-primary">Cirquo</NavLink>
        <Badge variant="secondary" className="mt-3">{roleLabel}</Badge>
        <div className="mt-8"><RoleNavigation navigation={navigation} /></div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Buka navigasi">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader><SheetTitle className="text-left text-primary">Cirquo</SheetTitle></SheetHeader>
              <Badge variant="secondary" className="mt-3">{roleLabel}</Badge>
              <div className="mt-8"><RoleNavigation navigation={navigation} /></div>
            </SheetContent>
          </Sheet>
          <p className="font-medium">{roleLabel}</p>
          <Badge variant="outline" className="ml-auto">Mode placeholder</Badge>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
