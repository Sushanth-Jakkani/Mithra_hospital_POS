import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatDateTime } from '@/lib/utils'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  Calendar,
  CreditCard,
  ShieldAlert,
  Info
} from 'lucide-react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)

      fetchNotifications()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const handleToggleRead = async (id: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: !currentStatus })
        .eq('id', id)

      fetchNotifications()
    } catch (err) {
      console.error('Error toggling notification:', err)
    }
  }

  const filtered = notifications.filter(n => {
    if (severityFilter !== 'all' && n.severity !== severityFilter) return false
    return true
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Clinical & System Notifications"
        subtitle="Live alerts for low stock, expiring medicine lots, appointment bookings and counter receipts"
        actions={
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All as Read
          </button>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Severity Filter Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 p-2 flex items-center gap-1 overflow-x-auto shadow-sm">
          {[
            { id: 'all', label: `All Alerts (${notifications.length})` },
            { id: 'critical', label: `Critical (${notifications.filter(n => n.severity === 'critical').length})` },
            { id: 'warning', label: `Warnings (${notifications.filter(n => n.severity === 'warning').length})` },
            { id: 'info', label: `Informational (${notifications.filter(n => n.severity === 'info').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSeverityFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                severityFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <LoadingState message="Loading notification feed..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No alerts"
              description="No active notifications for the selected severity level."
            />
          ) : (
            filtered.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleToggleRead(notif.id, notif.is_read)}
                className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all flex items-start gap-4 ${
                  notif.is_read ? 'border-gray-100 opacity-75' : 'border-teal-200 bg-teal-50/10'
                }`}
              >
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                  notif.severity === 'critical' ? 'bg-rose-50 text-rose-600' :
                  notif.severity === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'
                }`}>
                  {notif.severity === 'critical' ? <ShieldAlert className="w-5 h-5" /> :
                   notif.severity === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-xs">{notif.title}</h4>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {formatDateTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                </div>

                {!notif.is_read && (
                  <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
