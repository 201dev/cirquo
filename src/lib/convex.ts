import { ConvexReactClient } from 'convex/react'

const convexUrl = import.meta.env.VITE_CONVEX_URL

export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

if (import.meta.env.DEV && !convexClient) {
  console.info('Cirquo berjalan dalam mode placeholder tanpa backend Convex.')
}
