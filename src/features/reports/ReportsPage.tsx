import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  CreditCard,
  Pill,
  Users,
  Package,
  Clock,
  Filter,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react'

export default function ReportsPage() {
  const [reportType, setReportType] = useState<
    'sales' | 'pharmacy' | 'billing' | 'patients' | 'appointments' | 'stock' | 'expiry' | 'purchases'
  >('sales')

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7days' | '30days'>('7days')
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryStats, setSummaryStats] = useState({
    totalCount: 0,
    totalAmount: 0,
    average: 0
  })

  useEffect(() => {
    fetchReportData()
  }, [reportType, dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // Calculate date boundary
      const now = new Date()
      let startDate = new Date()

      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0)
      } else if (dateRange === 'yesterday') {
        startDate.setDate(now.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
      } else if (dateRange === '7days') {
        startDate.setDate(now.getDate() - 7)
      } else if (dateRange === '30days') {
        startDate.setDate(now.getDate() - 30)
      }

      const isoStart = startDate.toISOString()

      let rows: any[] = []
      let totalAmt = 0

      if (reportType === 'sales' || reportType === 'billing') {
        const { data } = await supabase
          .from('invoices')
          .select('*, patient:patients(full_name, patient_number)')
          .gte('created_at', isoStart)
          .order('created_at', { ascending: false })

        rows = data || []
        totalAmt = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0)
      } else if (reportType === 'pharmacy') {
        const { data } = await supabase
          .from('sales')
          .select('*, patient:patients(full_name, patient_number)')
          .gte('created_at', isoStart)
          .order('created_at', { ascending: false })

        rows = data || []
        totalAmt = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0)
      } else if (reportType === 'patients') {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .gte('created_at', isoStart)
          .order('created_at', { ascending: false })

        rows = data || []
      } else if (reportType === 'appointments') {
        const { data } = await supabase
          .from('appointments')
          .select('*, patient:patients(full_name, patient_number), doctor:doctors(full_name, specialization)')
          .order('appointment_date', { ascending: false })

        rows = data || []
      } else if (reportType === 'stock') {
        const { data } = await supabase
          .from('medicines')
          .select('*, category:medicine_categories(name), batches:medicine_batches(quantity, selling_price)')
          .is('deleted_at', null)

        rows = (data || []).map(m => {
          const qty = (m.batches || []).reduce((s: number, b: any) => s + (b.quantity || 0), 0)
          const val = (m.batches || []).reduce((s: number, b: any) => s + ((b.quantity || 0) * (b.selling_price || m.selling_price)), 0)
          return { ...m, totalStock: qty, stockValue: val }
        })
        totalAmt = rows.reduce((s, r) => s + r.stockValue, 0)
      } else if (reportType === 'expiry') {
        const { data } = await supabase
          .from('medicine_batches')
          .select('*, medicine:medicines(name, strength)')
          .order('expiry_date', { ascending: true })

        rows = data || []
      } else if (reportType === 'purchases') {
        const { data } = await supabase
          .from('purchase_orders')
          .select('*, supplier:suppliers(name, company)')
          .order('order_date', { ascending: false })

        rows = data || []
        totalAmt = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0)
      }

      setReportData(rows)
      setSummaryStats({
        totalCount: rows.length,
        totalAmount: totalAmt,
        average: rows.length > 0 ? (totalAmt / rows.length) : 0
      })

    } catch (err) {
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (reportData.length === 0) return

    const headers = Object.keys(reportData[0]).filter(k => typeof reportData[0][k] !== 'object')
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `mithra_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Hospital & Pharmacy Reports"
        subtitle="Operational analytics, financial collections, patient turnover and stock valuation metrics"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Report Selector Tabs & Date Filter */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          {/* Report Category */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'sales', label: 'All Revenue' },
              { id: 'pharmacy', label: 'Pharmacy Sales' },
              { id: 'billing', label: 'Hospital Bills' },
              { id: 'patients', label: 'Patients' },
              { id: 'appointments', label: 'Appointments' },
              { id: 'stock', label: 'Stock Valuation' },
              { id: 'expiry', label: 'Expiry Monitor' },
              { id: 'purchases', label: 'Procurement' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  reportType === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-600 ml-1" />
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDateRange(d.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  dateRange === d.id ? 'bg-white text-teal-800 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Records</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Value / Revenue</span>
            <p className="text-2xl font-bold text-teal-700 mt-1">{formatCurrency(summaryStats.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Average Ticket Size</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summaryStats.average)}</p>
          </div>
        </div>

        {/* Dynamic Report Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Aggregating clinical and financial reports..." />
          ) : reportData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No data records found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    {reportType === 'sales' || reportType === 'billing' ? (
                      <>
                        <th className="py-3 px-4 font-medium">Invoice #</th>
                        <th className="py-3 px-3 font-medium">Date</th>
                        <th className="py-3 px-3 font-medium">Type</th>
                        <th className="py-3 px-3 font-medium">Patient</th>
                        <th className="py-3 px-3 font-medium">Subtotal</th>
                        <th className="py-3 px-3 font-medium">Discount</th>
                        <th className="py-3 px-3 font-medium">Total (₹)</th>
                      </>
                    ) : reportType === 'pharmacy' ? (
                      <>
                        <th className="py-3 px-4 font-medium">Sale #</th>
                        <th className="py-3 px-3 font-medium">Date</th>
                        <th className="py-3 px-3 font-medium">Patient</th>
                        <th className="py-3 px-3 font-medium">Payment Method</th>
                        <th className="py-3 px-3 font-medium">Total Amount (₹)</th>
                      </>
                    ) : reportType === 'stock' ? (
                      <>
                        <th className="py-3 px-4 font-medium">Medicine Name</th>
                        <th className="py-3 px-3 font-medium">Category</th>
                        <th className="py-3 px-3 font-medium">Total Units</th>
                        <th className="py-3 px-3 font-medium">Retail Price</th>
                        <th className="py-3 px-3 font-medium">Total Valuation (₹)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 font-medium">Reference ID</th>
                        <th className="py-3 px-3 font-medium">Date / Time</th>
                        <th className="py-3 px-3 font-medium">Entity Name</th>
                        <th className="py-3 px-3 font-medium">Details</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      {reportType === 'sales' || reportType === 'billing' ? (
                        <>
                          <td className="py-2.5 px-4 font-mono font-bold text-teal-700">{row.invoice_number}</td>
                          <td className="py-2.5 px-3 text-gray-600">{formatDate(row.created_at)}</td>
                          <td className="py-2.5 px-3 uppercase font-semibold text-[10px] text-gray-700">{row.invoice_type}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-900">{row.patient?.full_name || 'Walk-in'}</td>
                          <td className="py-2.5 px-3 font-mono">{formatCurrency(row.subtotal)}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-500">{formatCurrency(row.discount_amount)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{formatCurrency(row.total_amount)}</td>
                        </>
                      ) : reportType === 'pharmacy' ? (
                        <>
                          <td className="py-2.5 px-4 font-mono font-bold text-teal-700">{row.sale_number}</td>
                          <td className="py-2.5 px-3 text-gray-600">{formatDateTime(row.created_at)}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-900">{row.patient?.full_name || 'Walk-in'}</td>
                          <td className="py-2.5 px-3 uppercase font-semibold text-gray-700">{row.payment_method}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{formatCurrency(row.total_amount)}</td>
                        </>
                      ) : reportType === 'stock' ? (
                        <>
                          <td className="py-2.5 px-4 font-bold text-gray-900">{row.name}</td>
                          <td className="py-2.5 px-3 text-gray-600">{row.category?.name || 'General'}</td>
                          <td className="py-2.5 px-3 font-bold text-teal-800">{row.totalStock} units</td>
                          <td className="py-2.5 px-3 font-mono">{formatCurrency(row.selling_price)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{formatCurrency(row.stockValue)}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-4 font-mono font-semibold">{row.id?.substring(0, 8)}</td>
                          <td className="py-2.5 px-3 text-gray-600">{formatDate(row.created_at || row.order_date || row.appointment_date)}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{row.full_name || row.name || row.supplier?.name || 'Item'}</td>
                          <td className="py-2.5 px-3 text-gray-600">{row.specialization || row.reason || row.status || '-'}</td>
                        </>
                      )}
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
