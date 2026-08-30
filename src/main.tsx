import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProviders } from '@/app/providers'
import { getLocale } from '@/lib/i18n'

const root = document.getElementById('root')

if (!root) throw new Error('Elemen root aplikasi tidak ditemukan.')
document.documentElement.lang = getLocale()

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
