import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  Activity,
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  CreditCard,
  Pill,
  FileText,
  Package,
  Receipt,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Boxes,
  AlertTriangle,
  Truck,
  ShoppingCart,
  ClipboardList,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  permission?: string
  children?: { label: string; path: string }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Appointments', path: '/appointments', icon: CalendarDays, permission: 'appointments.view' },
  { label: 'Patients', path: '/patients', icon: Users, permission: 'patients.view' },
  { label: 'Doctors', path: '/doctors', icon: Stethoscope },
  { label: 'Hospital Billing', path: '/billing', icon: CreditCard, permission: 'billing.view' },
  { label: 'Pharmacy POS', path: '/pharmacy/pos', icon: Pill, permission: 'pharmacy.view' },
  { label: 'Prescriptions', path: '/prescriptions', icon: FileText, permission: 'prescriptions.view' },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: Package,
    permission: 'inventory.view',
    children: [
      { label: 'Medicines', path: '/inventory/medicines' },
      { label: 'Batches', path: '/inventory/batches' },
      { label: 'Stock Overview', path: '/inventory/stock' },
      { label: 'Expiry Alerts', path: '/inventory/alerts' },
      { label: 'Suppliers', path: '/inventory/suppliers' },
      { label: 'Purchase Orders', path: '/inventory/purchases' },
    ],
  },
  { label: 'Receipts', path: '/receipts', icon: Receipt, permission: 'receipts.view' },
  { label: 'Reports', path: '/reports', icon: BarChart3, permission: 'reports.view' },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export default function Sidebar() {
  const { profile, signOut, hasPermission, isRole } = useAuth()
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState<string[]>(['/inventory'])

  const toggleExpand = (path: string) => {
    setExpandedItems(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    )
  }

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const canAccess = (item: NavItem) => {
    if (isRole('ADMIN')) return true
    if (!item.permission) return true
    return hasPermission(item.permission)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-tight">Mithra Hospital</h1>
          <p className="text-[10px] text-gray-400 leading-tight">POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.filter(canAccess).map((item) => {
          const Icon = item.icon
          const isActive = isActiveRoute(item.path)
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedItems.includes(item.path)

          if (hasChildren) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleExpand(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 pl-4 border-l border-gray-100 mt-0.5 space-y-0.5">
                    {item.children!.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            'block px-3 py-1.5 rounded-md text-xs transition-colors',
                            isActive
                              ? 'bg-teal-50 text-teal-700 font-medium'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-semibold">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {profile?.role || 'Loading...'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
