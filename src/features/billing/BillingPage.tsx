import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  CreditCard,
  Search,
  Plus,
  Receipt,
  Eye,
  Printer,
  FileText,
  Filter,
  CheckCircle2
} from 'lucide-react'

export default function BillingPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    fetchInvoices()
  }, [typeFilter])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('invoices')
        .select(`
          id, invoice_number, invoice_type, subtotal, discount_amount, tax_amount, total_amount, created_at,
          patient:patients(id, full_name, patient_number, mobile),
          receipts:receipts(id, receipt_number, print_count, payment_method)
        `)
        .order('created_at', { ascending: false })

      if (typeFilter !== 'all') {
        query = query.eq('invoice_type', typeFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setInvoices(data || [])
    } catch (err) {
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.patient?.full_name?.toLowerCase().includes(q) ||
      inv.patient?.patient_number?.toLowerCase().includes(q) ||
      inv.receipts?.[0]?.receipt_number?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Hospital Billing & Invoices"
        subtitle="Manage OPD billing, outpatient procedures, and financial receipt logs"
        actions={
          <button
            onClick={() => navigate('/billing/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Hospital Bill
          </button>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, patient name or receipt #..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-[11px] text-gray-400">Department Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Invoices</option>
              <option value="hospital">Hospital Outpatient</option>
              <option value="pharmacy">Pharmacy Counter</option>
            </select>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading hospital invoices..." />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No invoices found"
              description="No billing records match your search."
              action={{
                label: 'Create First Bill',
                onClick: () => navigate('/billing/new'),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Invoice #</th>
                    <th className="py-3 px-3 font-medium">Type</th>
                    <th className="py-3 px-3 font-medium">Patient</th>
                    <th className="py-3 px-3 font-medium">Date</th>
                    <th className="py-3 px-3 font-medium">Subtotal</th>
                    <th className="py-3 px-3 font-medium">Discount</th>
                    <th className="py-3 px-3 font-medium">Total Amount</th>
                    <th className="py-3 px-3 font-medium">Receipt Info</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredInvoices.map((inv) => {
                    const receipt = inv.receipts?.[0]
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-teal-700">
                          {inv.invoice_number || 'INV-000001'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.invoice_type === 'pharmacy' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'
                          }`}>
                            {inv.invoice_type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-900">{inv.patient?.full_name || 'Walk-in'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{inv.patient?.patient_number}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {formatDateTime(inv.created_at)}
                        </td>
                        <td className="py-3 px-3 text-gray-700 font-medium">
                          {formatCurrency(inv.subtotal)}
                        </td>
                        <td className="py-3 px-3 text-gray-500">
                          {inv.discount_amount > 0 ? formatCurrency(inv.discount_amount) : '-'}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {formatCurrency(inv.total_amount)}
                        </td>
                        <td className="py-3 px-3">
                          {receipt ? (
                            <div className="flex flex-col">
                              <span className="font-mono text-[11px] text-gray-800 font-semibold">{receipt.receipt_number}</span>
                              <span className={`text-[10px] font-medium ${
                                (receipt.print_count || 1) > 1 ? 'text-amber-600 font-bold' : 'text-gray-400'
                              }`}>
                                {(receipt.print_count || 1) > 1 ? `Reprint (${receipt.print_count})` : 'Original (1)'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate('/receipts')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                          >
                            <Receipt className="w-3 h-3" />
                            Receipt History
                          </button>
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
