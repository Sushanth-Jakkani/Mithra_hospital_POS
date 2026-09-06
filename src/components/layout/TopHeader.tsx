import { useAuth } from '@/features/auth/AuthProvider'
import { Bell, Search, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface TopHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function TopHeader({ title, subtitle, actions }: TopHeaderProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    // Fetch unread notification count
    const fetchUnread = async () => {
      if (!profile?.id) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      setUnreadCount(count || 0)
    }

    fetchUnread()

    // Keyboard shortcut for search
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [profile?.id])

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Title */}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {actions}

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden md:inline text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
              Ctrl+K
            </kbd>
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-teal-700">
                {profile?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-gray-700 leading-tight">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
