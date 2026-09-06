import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Boxes,
  Search,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowUpDown,
  History,
  TrendingDown
} from 'lucide-react'

export default function StockPage() {
  const [medicines, setMedicines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState('all')

  // Overview KPIs
  const [metrics, setMetrics] = useState({
    totalFormularies: 0,
    totalStockValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })

  useEffect(() => {
    fetchStockOverview()
  }, [])

  const fetchStockOverview = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('medicines')
        .select(`
          *, category:medicine_categories(name),
          batches:medicine_batches(id, batch_number, expiry_date, quantity, purchase_price, selling_price)
        `)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error

      const meds = data || []
      setMedicines(meds)

      let totalVal = 0
      let low = 0
      let out = 0

      meds.forEach(m => {
        const qty = (m.batches || []).reduce((acc: number, b: any) => {
          totalVal += (b.quantity || 0) * (b.selling_price || m.selling_price || 0)
          return acc + (b.quantity || 0)
        }, 0)

        if (qty === 0) out++
        else if (qty <= m.reorder_level) low++
      })

      setMetrics({
        totalFormularies: meds.length,
        totalStockValuation: totalVal,
        lowStockCount: low,
        outOfStockCount: out,
      })

    } catch (err) {
      console.error('Error fetching stock overview:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = medicines.filter(m => {
    const totalQty = (m.batches || []).reduce((acc: number, b: any) => acc + (b.quantity || 0), 0)

    if (stockFilter === 'low' && (totalQty > m.reorder_level || totalQty === 0)) return false
    if (stockFilter === 'out' && totalQty > 0) return false
    if (stockFilter === 'optimal' && totalQty <= m.reorder_level) return false

    const q = searchQuery.toLowerCase()
    return (
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q) ||
      m.medicine_code?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Inventory Stock Overview"
        subtitle="Live pharmacy valuation, stock thresholds, inventory transactions and replenishment tracking"
      />

      <div className="px-6 py-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Medicines"
            value={metrics.totalFormularies}
            change="Formulary items"
            icon={Package}
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
          />
          <StatCard
            title="Total Stock Value"
            value={formatCurrency(metrics.totalStockValuation)}
            change="Current retail asset value"
            icon={Boxes}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Low Stock Items"
            value={metrics.lowStockCount}
            change="Below reorder threshold"
            changeType="negative"
            icon={AlertTriangle}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            title="Out of Stock"
            value={metrics.outOfStockCount}
            change="Replenishment needed"
            changeType="negative"
            icon={TrendingDown}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine or generic name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-[11px] text-gray-400">Stock Status:</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Items</option>
              <option value="optimal">In Stock (Optimal)</option>
              <option value="low">Low Stock Alerts</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Stock Overview Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading inventory stock valuation..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No inventory records"
              description="No stock records match the selected status."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Code</th>
                    <th className="py-3 px-3 font-medium">Medicine</th>
                    <th className="py-3 px-3 font-medium">Active Batches</th>
                    <th className="py-3 px-3 font-medium">Current Stock</th>
                    <th className="py-3 px-3 font-medium">Reorder Level</th>
                    <th className="py-3 px-3 font-medium">Inventory Value</th>
                    <th className="py-3 px-3 font-medium">Stock Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(m => {
                    const totalQty = (m.batches || []).reduce((acc: number, b: any) => acc + (b.quantity || 0), 0)
                    const totalValue = (m.batches || []).reduce((acc: number, b: any) => acc + (b.quantity * (b.selling_price || m.selling_price)), 0)
                    const isOut = totalQty === 0
                    const isLow = !isOut && totalQty <= m.reorder_level

                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {m.medicine_code}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900">{m.name}</p>
                          <p className="text-[10px] text-gray-400">{m.category?.name || 'General'}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-600 font-mono">
                          {m.batches?.length || 0} batch lots
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {totalQty} units
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-mono">
                          {m.reorder_level}
                        </td>
                        <td className="py-3 px-3 font-bold text-teal-900">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="py-3 px-3">
                          {isOut ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Low Stock ({totalQty}/{m.reorder_level})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                              Optimal
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
