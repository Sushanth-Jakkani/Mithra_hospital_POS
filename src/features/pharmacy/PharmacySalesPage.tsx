import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Pill, Search, Plus, Receipt, Eye, Printer, Calendar } from 'lucide-react'

export default function PharmacySalesPage() {
  const navigate = useNavigate()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, sale_number, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, created_at,
          patient:patients(id, full_name, patient_number),
          items:sale_items(id, medicine_name, batch_number, quantity, total_amount)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (err) {
      console.error('Error fetching sales history:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = sales.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.sale_number?.toLowerCase().includes(q) ||
      s.patient?.full_name?.toLowerCase().includes(q) ||
      s.patient?.patient_number?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Pharmacy Sales History"
        subtitle="Dispensed medications log, batch deductions and counter audit trails"
        actions={
          <button
            onClick={() => navigate('/pharmacy/pos')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Open Pharmacy POS
          </button>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sale #, patient name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading pharmacy sales records..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No sales found"
              description="No counter pharmacy sales recorded yet."
              action={{
                label: 'Open Pharmacy POS',
                onClick: () => navigate('/pharmacy/pos'),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Sale #</th>
                    <th className="py-3 px-3 font-medium">Date & Time</th>
                    <th className="py-3 px-3 font-medium">Patient</th>
                    <th className="py-3 px-3 font-medium">Items Dispensed</th>
                    <th className="py-3 px-3 font-medium">Subtotal</th>
                    <th className="py-3 px-3 font-medium">Total Amount</th>
                    <th className="py-3 px-3 font-medium">Payment</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {s.sale_number}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {formatDateTime(s.created_at)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900">{s.patient?.full_name || 'Walk-in Customer'}</p>
                        {s.patient?.patient_number && (
                          <p className="text-[10px] text-gray-400 font-mono">{s.patient.patient_number}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-xs truncate">
                        {s.items?.map((i: any) => `${i.medicine_name} (${i.quantity})`).join(', ')}
                      </td>
                      <td className="py-3 px-3 text-gray-700 font-medium">
                        {formatCurrency(s.subtotal)}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900">
                        {formatCurrency(s.total_amount)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                          {s.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate('/receipts')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                        >
                          <Receipt className="w-3 h-3" />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
