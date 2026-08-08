import { createBrowserRouter } from 'react-router-dom'
import { AdminLayout } from '@/layouts/admin-layout'
import { ConsumerLayout } from '@/layouts/consumer-layout'
import { MerchantLayout } from '@/layouts/merchant-layout'
import { ProcessorLayout } from '@/layouts/processor-layout'
import AdminDashboardPage from '@/pages/admin/dashboard-page'
import ExplorePage from '@/pages/consumer/explore-page'
import ConsumerHomePage from '@/pages/consumer/home-page'
import OrdersPage from '@/pages/consumer/orders-page'
import CreateSurplusPage from '@/pages/merchant/create-surplus-page'
import MerchantDashboardPage from '@/pages/merchant/dashboard-page'
import MerchantSurplusPage from '@/pages/merchant/surplus-page'
import NotFoundPage from '@/pages/not-found-page'
import ProcessorDashboardPage from '@/pages/processor/dashboard-page'
import RecoveryPage from '@/pages/processor/recovery-page'

export const router = createBrowserRouter([
  { element: <ConsumerLayout />, children: [
    { index: true, element: <ConsumerHomePage /> },
    { path: 'explore', element: <ExplorePage /> },
    { path: 'orders', element: <OrdersPage /> },
  ] },
  { path: 'merchant', element: <MerchantLayout />, children: [
    { index: true, element: <MerchantDashboardPage /> },
    { path: 'surplus', element: <MerchantSurplusPage /> },
    { path: 'surplus/new', element: <CreateSurplusPage /> },
  ] },
  { path: 'processor', element: <ProcessorLayout />, children: [
    { index: true, element: <ProcessorDashboardPage /> },
    { path: 'recovery', element: <RecoveryPage /> },
  ] },
  { path: 'admin', element: <AdminLayout />, children: [
    { index: true, element: <AdminDashboardPage /> },
  ] },
  { path: '*', element: <NotFoundPage /> },
])
