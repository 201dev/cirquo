/* eslint-disable react/only-export-components -- the router intentionally owns lazy route components. */
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/layouts/admin-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { ConsumerLayout } from "@/layouts/consumer-layout";
import { MerchantLayout } from "@/layouts/merchant-layout";
import { ProcessorLayout } from "@/layouts/processor-layout";
import {
  GuestRoute,
  PostAuthRoute,
  ProtectedRoute,
  PublicRoute,
  RoleRoute,
} from "@/components/common/route-guards";
import NotFoundPage from "@/pages/not-found-page";
import RouteErrorPage from "@/pages/route-error-page";
import WelcomePage from "@/pages/welcome-page";

const AdminDashboardPage = lazy(() => import("@/pages/admin/dashboard-page"));
const LoginPage = lazy(() => import("@/pages/auth/login-page"));
const OnboardingPage = lazy(() => import("@/pages/auth/onboarding-page"));
const RegisterFormPage = lazy(() => import("@/pages/auth/register-form-page"));
const RegisterPage = lazy(() => import("@/pages/auth/register-page"));
const LedgerPage = lazy(() => import("@/pages/admin/ledger-page"));
const OperationsPage = lazy(() => import("@/pages/admin/operations-page"));
const ReviewQueuePage = lazy(() => import("@/pages/admin/review-queue-page"));
const ExplorePage = lazy(() => import("@/pages/consumer/explore-page"));
const CheckoutPage = lazy(() => import("@/pages/consumer/checkout-page"));
const ConsumerHomePage = lazy(() => import("@/pages/consumer/home-page"));
const CategoryPage = lazy(() => import("@/pages/consumer/category-page"));
const ConsumerMerchantPage = lazy(() => import("@/pages/consumer/merchant-page"));
const ImpactPage = lazy(() => import("@/pages/consumer/impact-page"));
const ItemDetailPage = lazy(() => import("@/pages/consumer/item-detail-page"));
const OrderDetailPage = lazy(
  () => import("@/pages/consumer/order-detail-page"),
);
const OrdersPage = lazy(() => import("@/pages/consumer/orders-page"));
const ProfilePage = lazy(() => import("@/pages/consumer/profile-page"));
const CreateSurplusPage = lazy(
  () => import("@/pages/merchant/create-surplus-page"),
);
const MerchantDashboardPage = lazy(
  () => import("@/pages/merchant/dashboard-page"),
);
const MerchantImpactPage = lazy(() => import("@/pages/merchant/impact-page"));
const PickupPage = lazy(() => import("@/pages/merchant/pickup-page"));
const SurplusDetailPage = lazy(
  () => import("@/pages/merchant/surplus-detail-page"),
);
const MerchantSurplusPage = lazy(() => import("@/pages/merchant/surplus-page"));
const ProcessorDashboardPage = lazy(
  () => import("@/pages/processor/dashboard-page"),
);
const ProcessorHistoryPage = lazy(
  () => import("@/pages/processor/history-page"),
);
const ProcessorProfilePage = lazy(
  () => import("@/pages/processor/profile-page"),
);
const RecoveryDetailPage = lazy(
  () => import("@/pages/processor/recovery-detail-page"),
);
const RecoveryPage = lazy(() => import("@/pages/processor/recovery-page"));
const PendingVerificationPage = lazy(
  () => import("@/pages/auth/pending-verification-page"),
);
const NotificationsPage = lazy(() => import("@/pages/notifications-page"));
const routes = [
  // --- Guest-only routes (login, register) ---
  {
    element: <GuestRoute />,
    children: [
      { path: "welcome", element: <WelcomePage /> },
      {
        element: <AuthLayout />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "admin/login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          {
            path: "register/consumer",
            element: <RegisterFormPage role="consumer" />,
          },
          {
            path: "register/merchant",
            element: <RegisterFormPage role="merchant" />,
          },
          {
            path: "register/processor",
            element: <RegisterFormPage role="processor" />,
          },
        ],
      },
    ],
  },

  // --- Authenticated-only: onboarding (inside AuthLayout) ---
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "auth/continue", element: <PostAuthRoute /> },
          {
            path: "merchant/onboarding",
            element: <OnboardingPage role="merchant" />,
          },
          {
            path: "processor/onboarding",
            element: <OnboardingPage role="processor" />,
          },
          {
            path: "pending-verification",
            element: <PendingVerificationPage />,
          },
        ],
      },
    ],
  },

  // --- Consumer routes ---
  // The shell is shared. Browsing is open to visitors; anything tied to an
  // account sits behind RoleRoute one level deeper, so a signed-out visitor who
  // opens /orders directly still gets sent to login.
  {
    element: <PublicRoute />,
    children: [
      {
        element: <ConsumerLayout />,
        children: [
          { index: true, element: <ConsumerHomePage /> },
          { path: "category/:categorySlug", element: <CategoryPage /> },
          { path: "merchant/:merchantId", element: <ConsumerMerchantPage /> },
          { path: "discover", element: <ExplorePage /> },
          { path: "explore", element: <ExplorePage /> },
          { path: "item/:id", element: <ItemDetailPage /> },
          {
            element: <RoleRoute role="consumer" />,
            children: [
              { path: "orders", element: <OrdersPage /> },
              { path: "orders/:id", element: <OrderDetailPage /> },
              { path: "checkout/:orderId", element: <CheckoutPage /> },
              { path: "impact", element: <ImpactPage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "notifications", element: <NotificationsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // --- Merchant routes ---
  {
    element: <RoleRoute role="merchant" />,
    children: [
      {
        path: "merchant",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <MerchantDashboardPage /> },
          { path: "surplus", element: <MerchantSurplusPage /> },
          { path: "impact", element: <MerchantImpactPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          {
            element: <RoleRoute role="merchant" requiresVerified />,
            children: [
              { path: "surplus/new", element: <CreateSurplusPage /> },
              { path: "surplus/:id", element: <SurplusDetailPage /> },
              { path: "pickup", element: <PickupPage /> },
            ],
          },
        ],
      },
    ],
  },

  // --- Processor routes ---
  {
    element: <RoleRoute role="processor" />,
    children: [
      {
        path: "processor",
        element: <ProcessorLayout />,
        children: [
          { index: true, element: <ProcessorDashboardPage /> },
          { path: "history", element: <ProcessorHistoryPage /> },
          { path: "profile", element: <ProcessorProfilePage /> },
          { path: "notifications", element: <NotificationsPage /> },
          {
            element: <RoleRoute role="processor" requiresVerified />,
            children: [
              { path: "recovery", element: <RecoveryPage /> },
              { path: "recovery/:id", element: <RecoveryDetailPage /> },
            ],
          },
        ],
      },
    ],
  },

  // --- Admin routes ---
  {
    element: <RoleRoute role="admin" />,
    children: [
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          {
            path: "verifications",
            element: <ReviewQueuePage type="verifications" />,
          },
          {
            path: "moderation",
            element: <ReviewQueuePage type="moderation" />,
          },
          { path: "ledger", element: <LedgerPage /> },
          { path: "operations", element: <OperationsPage /> },
          { path: "notifications", element: <NotificationsPage /> },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
];

export const router = createBrowserRouter([
  { errorElement: <RouteErrorPage />, children: routes },
]);
