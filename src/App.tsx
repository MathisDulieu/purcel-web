import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { MotionConfig } from 'motion/react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { persistOptions, queryClient } from '@/lib/query'
import { RealtimeProvider } from '@/lib/realtime'
import { ThemeProvider } from '@/lib/theme'
import { ToastProvider } from '@/components/Toast'
import { AppShell } from '@/components/AppShell'
import { Spinner } from '@/components/ui'
import { LoginPage } from '@/pages/LoginPage'
import { PlanningPage } from '@/pages/PlanningPage'

const ActivitiesPage = lazy(() => import('@/pages/ActivitiesPage').then((module) => ({ default: module.ActivitiesPage })))
const ActivityDetailPage = lazy(() => import('@/pages/ActivityDetailPage').then((module) => ({ default: module.ActivityDetailPage })))
const TransportsPage = lazy(() => import('@/pages/TransportsPage').then((module) => ({ default: module.TransportsPage })))
const TransportDetailPage = lazy(() => import('@/pages/TransportDetailPage').then((module) => ({ default: module.TransportDetailPage })))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage').then((module) => ({ default: module.DocumentsPage })))
const ChatPage = lazy(() => import('@/pages/ChatPage').then((module) => ({ default: module.ChatPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const AdminPage = lazy(() => import('@/pages/AdminPage').then((module) => ({ default: module.AdminPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function Loading() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <Spinner />
    </div>
  )
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

function RequireAuth() {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <RealtimeProvider>
      <AppShell />
    </RealtimeProvider>
  )
}

function RequireAdmin() {
  const { user, isAdmin } = useAuth()
  if (!user) return <Loading />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}

function GuestOnly() {
  const { token } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (token) return <Navigate to={from} replace />
  return <LoginPage />
}

const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly /> },
  {
    element: <RequireAuth />,
    children: [
      { index: true, element: <PlanningPage /> },
      { path: 'activities', element: <Lazy><ActivitiesPage /></Lazy> },
      { path: 'activities/:id', element: <Lazy><ActivityDetailPage /></Lazy> },
      { path: 'transports', element: <Lazy><TransportsPage /></Lazy> },
      { path: 'transports/:id', element: <Lazy><TransportDetailPage /></Lazy> },
      { path: 'documents', element: <Lazy><DocumentsPage /></Lazy> },
      { path: 'chat', element: <Lazy><ChatPage /></Lazy> },
      { path: 'history', element: <Lazy><HistoryPage /></Lazy> },
      { path: 'profile', element: <Lazy><ProfilePage /></Lazy> },
      {
        element: <RequireAdmin />,
        children: [{ path: 'admin', element: <Lazy><AdminPage /></Lazy> }],
      },
      { path: '*', element: <Lazy><NotFoundPage /></Lazy> },
    ],
  },
])

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </ToastProvider>
        </MotionConfig>
      </ThemeProvider>
    </PersistQueryClientProvider>
  )
}
