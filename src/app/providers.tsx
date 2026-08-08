import type { ReactNode } from 'react'
import { ConvexProvider } from 'convex/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { convexClient } from '@/lib/convex'

export function AppProviders({ children }: { children: ReactNode }) {
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster richColors closeButton />
    </ThemeProvider>
  )

  return convexClient ? <ConvexProvider client={convexClient}>{content}</ConvexProvider> : content
}
