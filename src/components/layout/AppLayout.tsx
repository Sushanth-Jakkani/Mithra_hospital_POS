import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Slide-in sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-200">
            <Sidebar onClose={() => setSidebarOpen(false)} isMobile />
          </div>
        </>
      )}

      {/* Main content — margin on desktop, full-width on mobile */}
      <main className="lg:ml-64 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <MobileBottomNav onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  )
}
