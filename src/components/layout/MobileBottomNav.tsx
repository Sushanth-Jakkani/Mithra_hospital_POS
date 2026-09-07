import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Pill,
  CalendarDays,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
  onOpenSidebar: () => void
}

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Patients', path: '/patients', icon: Users },
  { label: 'Pharmacy', path: '/pharmacy/pos', icon: Pill },
  { label: 'Appoints', path: '/appointments', icon: CalendarDays },
]

export default function MobileBottomNav({ onOpenSidebar }: MobileBottomNavProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative group"
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-600 rounded-full" />
              )}
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
                  active
                    ? 'bg-teal-50 text-teal-700 scale-105'
                    : 'text-gray-400 group-active:scale-95'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-teal-700' : 'text-gray-400'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          )
        })}

        {/* More button to open sidebar */}
        <button
          onClick={onOpenSidebar}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 group"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 group-active:scale-95 transition-all duration-200">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-gray-400">More</span>
        </button>
      </div>
    </nav>
  )
}
