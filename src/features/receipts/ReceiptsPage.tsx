import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useHospitalProfile } from '@/lib/useHospitalProfile'
import {
  Receipt,
  Search,
  Printer,
  FileText,
  Clock,
  History,
  CheckCircle,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useHospitalLogo } from '@/lib/useHospitalLogo'

export default function ReceiptsPage() {
  const logoUrl = useHospitalLogo()
  const { profile: hospitalProfile } = useHospitalProfile()
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Print / View Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [printLogs, setPrintLogs] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    fetchReceipts()
  }, [typeFilter])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('receipts')
        .select(`
          *,
          patient:patients(id, full_name, patient_number, mobile),
          invoice:invoices(id, invoice_number, invoice_type, subtotal, discount_amount, tax_amount, total_amount, items:invoice_items(*))
        `)
        .order('created_at', { ascending: false })

      if (typeFilter !== 'all') {
        query = query.eq('receipt_type', typeFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setReceipts(data || [])
    } catch (err) {
      console.error('Error fetching receipts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenReceiptModal = async (receipt: any) => {
    setSelectedReceipt(receipt)
    setIsModalOpen(true)

    // Fetch print audit logs for this receipt
    try {
      const { data } = await supabase
        .from('receipt_print_logs')
        .select('*')
        .eq('receipt_id', receipt.id)
        .order('printed_at', { ascending: false })

      setPrintLogs(data || [])
    } catch (err) {
      console.error('Error fetching print logs:', err)
    }
  }

  const handlePrintOrReprint = async () => {
    if (!selectedReceipt) return

    try {
      setIsPrinting(true)
      const currentCount = selectedReceipt.print_count || 1
      const isReprint = currentCount >= 1
      const newCount = currentCount + 1

      // 1. Trigger native print
      window.print()

      // 2. Update Receipt in DB
      await supabase
        .from('receipts')
        .update({
          print_count: newCount,
          last_printed_at: new Date().toISOString()
        })
        .eq('id', selectedReceipt.id)

      // 3. Log Print Audit Event
      await supabase.from('receipt_print_logs').insert({
        receipt_id: selectedReceipt.id,
        print_type: isReprint ? 'reprint' : 'original',
        print_number: newCount,
        device_info: navigator.userAgent.substring(0, 100),
        notes: isReprint ? `Receipt reprinted (Print #${newCount})` : 'Original counter print',
      })

      // 4. Update Audit Log
      await supabase.from('audit_logs').insert({
        action: isReprint ? 'RECEIPT_REPRINTED' : 'RECEIPT_PRINTED',
        entity_type: 'receipt',
        entity_id: selectedReceipt.id,
        metadata: {
          receipt_number: selectedReceipt.receipt_number,
          print_count: newCount,
          print_type: isReprint ? 'REPRINT' : 'ORIGINAL'
        }
      })

      // Update Local State
      setSelectedReceipt({
        ...selectedReceipt,
        print_count: newCount,
        last_printed_at: new Date().toISOString()
      })

      // Refresh list
      fetchReceipts()

      // Refresh print logs
      const { data } = await supabase
        .from('receipt_print_logs')
        .select('*')
        .eq('receipt_id', selectedReceipt.id)
        .order('printed_at', { ascending: false })
      setPrintLogs(data || [])

    } catch (err: any) {
      alert('Error recording reprint audit log: ' + err.message)
    } finally {
      setIsPrinting(false)
    }
  }

  const filtered = receipts.filter(r => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      r.receipt_number?.toLowerCase().includes(q) ||
      r.patient?.full_name?.toLowerCase().includes(q) ||
      r.patient?.patient_number?.toLowerCase().includes(q) ||
      r.invoice?.invoice_number?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Receipts & Print Audit History"
        subtitle="Immutable financial receipts, duplicate prevention, and strict reprint tracking logs"
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
              placeholder="Search receipt #, invoice #, or patient..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-[11px] text-gray-400">Department:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Receipts</option>
              <option value="hospital">Hospital Outpatient</option>
              <option value="pharmacy">Pharmacy Counter</option>
            </select>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading financial receipt records..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No receipts found"
              description="No receipts recorded."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Receipt #</th>
                    <th className="py-3 px-3 font-medium">Type</th>
                    <th className="py-3 px-3 font-medium">Patient</th>
                    <th className="py-3 px-3 font-medium">Invoice #</th>
                    <th className="py-3 px-3 font-medium">Total Amount</th>
                    <th className="py-3 px-3 font-medium">Payment</th>
                    <th className="py-3 px-3 font-medium">Print Status</th>
                    <th className="py-3 px-3 font-medium">Last Printed</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(r => {
                    const count = r.print_count || 1
                    const isReprint = count > 1

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {r.receipt_number || 'RCT-000001'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.receipt_type === 'pharmacy' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'
                          }`}>
                            {r.receipt_type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-900">{r.patient?.full_name || 'Walk-in'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{r.patient?.patient_number}</p>
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-600">
                          {r.invoice?.invoice_number || 'INV-0001'}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {formatCurrency(r.total_amount)}
                        </td>
                        <td className="py-3 px-3 uppercase font-semibold text-gray-600">
                          {r.payment_method}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isReprint ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {isReprint ? `REPRINT (${count})` : 'ORIGINAL (1)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                          {r.last_printed_at ? formatDateTime(r.last_printed_at) : formatDateTime(r.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReceiptModal(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            View & Print
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

      {/* Printable Receipt & Audit Log Modal */}
      {isModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 no-print">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Official Hospital Receipt</h3>
                <p className="text-xs text-gray-500">Includes complete print history and watermark tracking</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Area */}
            <div className="py-4 text-xs font-mono bg-white text-gray-900 border border-gray-200 p-4 rounded-xl my-3 space-y-3">
              <div className="text-center pb-3 border-b border-dashed border-gray-300">
                {logoUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden mx-auto mb-2 bg-gray-50 border border-gray-100 flex items-center justify-center p-0.5">
                    <img src={logoUrl} alt="Hospital Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <h2 className="font-bold text-sm uppercase">Mithra Superspeciality Hospital</h2>
                <p className="text-[10px] text-gray-500">124 Healthcare Boulevard, Jubilee Hills, Hyderabad - 500033</p>
                <p className="text-[10px] text-gray-500">Ph: +91 40 2345 6789 • GSTIN: 36AABCM1234F1Z8</p>
                <h2 className="font-bold text-sm uppercase">{hospitalProfile.name}</h2>
                <p className="text-[10px] text-gray-500">{hospitalProfile.address}</p>
                <p className="text-[10px] text-gray-500">Ph: {hospitalProfile.phone} • GSTIN: {hospitalProfile.gstin}</p>
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${
                    (selectedReceipt.print_count || 1) > 1 ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 font-extrabold tracking-widest' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(selectedReceipt.print_count || 1) > 1 ? '*** DUPLICATE REPRINT ***' : 'ORIGINAL RECEIPT'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-dashed border-gray-300">
                <div>
                  <p>Receipt #: <strong>{selectedReceipt.receipt_number}</strong></p>
                  <p>Invoice #: <strong>{selectedReceipt.invoice?.invoice_number || 'INV-0001'}</strong></p>
                  <p>Date: {formatDateTime(selectedReceipt.created_at)}</p>
                </div>
                <div className="text-right">
                  <p>Patient: <strong>{selectedReceipt.patient?.full_name || 'Walk-in'}</strong></p>
                  <p>ID: {selectedReceipt.patient?.patient_number || 'N/A'}</p>
                  <p>Print Copy: <strong>#{(selectedReceipt.print_count || 1)}</strong></p>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-gray-300 space-y-1">
                <div className="flex justify-between font-bold border-b border-gray-200 pb-1 text-[11px]">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                {selectedReceipt.invoice?.items?.length > 0 ? (
                  selectedReceipt.invoice.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{item.description} (x{item.quantity})</span>
                      <span>{formatCurrency(item.total_amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-[11px]">
                    <span>{selectedReceipt.receipt_type === 'pharmacy' ? 'Pharmacy Dispensed Items' : 'Hospital Outpatient Services'}</span>
                    <span>{formatCurrency(selectedReceipt.total_amount)}</span>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-sm text-gray-900">
                  <span>TOTAL AMOUNT PAID:</span>
                  <span>{formatCurrency(selectedReceipt.total_amount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Payment Mode:</span>
                  <span className="uppercase font-bold">{selectedReceipt.payment_method}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-gray-400">
                <p>{hospitalProfile.receipt_footer}</p>
                <p>Generated via Secure Antigravity Healthcare POS</p>
              </div>
            </div>

            {/* Print Logs Audit Section */}
            <div className="mt-4 pt-3 border-t border-gray-100 no-print space-y-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-teal-600" /> Immutable Print Audit Trail ({printLogs.length} logs)
              </h4>

              <div className="max-h-32 overflow-y-auto space-y-1.5 text-[11px] pr-1">
                {printLogs.map(log => (
                  <div key={log.id} className="flex justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-bold text-gray-800 uppercase">{log.print_type}</span>
                      <span className="text-gray-500 ml-2 font-mono">(Copy #{log.print_number})</span>
                      <p className="text-[10px] text-gray-400 truncate max-w-xs">{log.device_info}</p>
                    </div>
                    <span className="text-gray-500 font-mono text-[10px]">{formatDateTime(log.printed_at)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 no-print">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={handlePrintOrReprint}
                disabled={isPrinting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                {(selectedReceipt.print_count || 1) >= 1 ? 'Reprint (Tracked)' : 'Print Original'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
