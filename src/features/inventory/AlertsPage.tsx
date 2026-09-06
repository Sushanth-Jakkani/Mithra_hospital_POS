import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  AlertTriangle,
  Clock,
  Package,
  Boxes,
  Truck,
  ArrowRight,
  ShieldAlert,
  Calendar,
  CheckCircle
} from 'lucide-react'

export default function AlertsPage() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'low_stock' | 'expiring' | 'expired'>('all')

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const { data: meds, error } = await supabase
        .from('medicines')
        .select(`
          id, name, generic_name, reorder_level, minimum_stock, medicine_code, selling_price,
          batches:medicine_batches(id, batch_number, expiry_date, quantity, is_active)
        `)
        .is('deleted_at', null)

      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const in30Days = new Date()
      in30Days.setDate(new Date().getDate() + 30)
      const in30Str = in30Days.toISOString().split('T')[0]

      const in60Days = new Date()
      in60Days.setDate(new Date().getDate() + 60)
      const in60Str = in60Days.toISOString().split('T')[0]

      const generatedAlerts: any[] = []

      ;(meds || []).forEach(med => {
        const totalStock = (med.batches || []).reduce((acc: number, b: any) => acc + (b.quantity || 0), 0)

        // Low Stock / Out of Stock
        if (totalStock === 0) {
          generatedAlerts.push({
            id: `out-${med.id}`,
            medicine_id: med.id,
            medicine_name: med.name,
            type: 'out_of_stock',
            category: 'stock',
            severity: 'critical',
            title: 'OUT OF STOCK',
            message: `${med.name} is completely depleted. Reorder threshold is ${med.reorder_level} units.`,
            stock: totalStock,
            threshold: med.reorder_level,
          })
        } else if (totalStock <= med.reorder_level) {
          generatedAlerts.push({
            id: `low-${med.id}`,
            medicine_id: med.id,
            medicine_name: med.name,
            type: 'low_stock',
            category: 'stock',
            severity: totalStock <= (med.minimum_stock || 5) ? 'critical' : 'warning',
            title: 'LOW STOCK ALERT',
            message: `${med.name} has only ${totalStock} units left (Reorder level: ${med.reorder_level}).`,
            stock: totalStock,
            threshold: med.reorder_level,
          })
        }

        // Batch Expiration Checks
        ;(med.batches || []).forEach((b: any) => {
          if (b.expiry_date) {
            if (b.expiry_date < today) {
              generatedAlerts.push({
                id: `exp-${b.id}`,
                medicine_id: med.id,
                medicine_name: med.name,
                batch_number: b.batch_number,
                expiry_date: b.expiry_date,
                type: 'expired',
                category: 'expiry',
                severity: 'critical',
                title: 'EXPIRED BATCH — DO NOT DISPENSE',
                message: `Batch ${b.batch_number} expired on ${formatDate(b.expiry_date)} with ${b.quantity} unsaleable units.`,
                stock: b.quantity,
              })
            } else if (b.expiry_date <= in60Str) {
              const isVeryClose = b.expiry_date <= in30Str
              generatedAlerts.push({
                id: `soon-${b.id}`,
                medicine_id: med.id,
                medicine_name: med.name,
                batch_number: b.batch_number,
                expiry_date: b.expiry_date,
                type: 'expiring',
                category: 'expiry',
                severity: isVeryClose ? 'critical' : 'warning',
                title: isVeryClose ? 'EXPIRING WITHIN 30 DAYS' : 'EXPIRING WITHIN 60 DAYS',
                message: `Batch ${b.batch_number} expires on ${formatDate(b.expiry_date)} (${b.quantity} units remaining). Prioritize FEFO dispensing.`,
                stock: b.quantity,
              })
            }
          }
        })
      })

      setAlerts(generatedAlerts)
    } catch (err) {
      console.error('Error fetching inventory alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = alerts.filter(a => {
    if (activeTab === 'critical') return a.severity === 'critical'
    if (activeTab === 'low_stock') return a.type === 'low_stock' || a.type === 'out_of_stock'
    if (activeTab === 'expiring') return a.type === 'expiring'
    if (activeTab === 'expired') return a.type === 'expired'
    return true
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Smart Inventory & Expiry Alerts"
        subtitle="Proactive replenishment notifications, batch expiry monitor and clinical drug safety guardrails"
        actions={
          <button
            onClick={() => navigate('/inventory/purchases')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Truck className="w-3.5 h-3.5" />
            Create Purchase Order
          </button>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Tab Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-2 flex items-center gap-1 overflow-x-auto shadow-sm">
          {[
            { id: 'all', label: `All Alerts (${alerts.length})` },
            { id: 'critical', label: `Critical Severity (${alerts.filter(a => a.severity === 'critical').length})` },
            { id: 'low_stock', label: `Low & Depleted Stock (${alerts.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock').length})` },
            { id: 'expiring', label: `Expiring Soon (${alerts.filter(a => a.type === 'expiring').length})` },
            { id: 'expired', label: `Expired Lots (${alerts.filter(a => a.type === 'expired').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts Cards Grid */}
        {loading ? (
          <LoadingState message="Scanning inventory batches and stock levels..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All inventory levels optimal"
            description="No active low-stock or batch expiration alerts for this filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(alert => (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col justify-between transition-all ${
                  alert.severity === 'critical' ? 'border-rose-200 hover:border-rose-300' : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alert.severity === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {alert.title}
                    </span>
                    <StatusBadge status={alert.severity} className="text-[10px]" />
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm">{alert.medicine_name}</h3>
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{alert.message}</p>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
                    <span>Stock: <strong>{alert.stock} units</strong></span>
                    {alert.expiry_date && (
                      <span>Exp: <strong>{formatDate(alert.expiry_date)}</strong></span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate('/inventory/medicines')}
                    className="text-xs font-medium text-gray-600 hover:text-teal-700"
                  >
                    View Medicine
                  </button>
                  <button
                    onClick={() => navigate('/inventory/purchases')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    Create PO <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
