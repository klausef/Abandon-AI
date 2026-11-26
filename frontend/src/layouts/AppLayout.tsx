import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getNavigationItem } from '../app/navigation'
import { AppHeader } from '../components/navigation/AppHeader'
import { Sidebar } from '../components/navigation/Sidebar'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function AppLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const location = useLocation()
  const currentItem = getNavigationItem(location.pathname)
  const pageTitle = currentItem?.label ?? 'Page not found'
  const pageDescription =
    currentItem?.description ?? 'The requested workspace is unavailable'

  useDocumentTitle(pageTitle)

  return (
    <div className="min-h-screen bg-command-950 text-slate-200">
      <a
        className="fixed top-3 left-3 z-[70] -translate-y-20 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition-transform focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>

      <Sidebar
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
      />

      <div className="min-h-screen lg:pl-[17.5rem]">
        <AppHeader
          description={pageDescription}
          onMenuOpen={() => setIsNavigationOpen(true)}
          title={pageTitle}
        />

        <main
          className="command-grid min-h-[calc(100vh-7.75rem)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10"
          id="main-content"
        >
          <div className="mx-auto w-full max-w-[92rem]">
            <Outlet />
          </div>
        </main>

        <footer className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-800/70 bg-command-950 px-4 py-3 text-[0.6875rem] text-slate-600 sm:px-6 lg:px-8">
          <span>Public Space Safety Command · Phases 1–6</span>
          <span className="hidden sm:inline">Mock environment · No live integrations</span>
        </footer>
      </div>
    </div>
  )
}
