import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  CreditCard,
  Search,
  Plus,
  Trash2,
  Printer,
  ArrowLeft,
  CheckCircle2,
  User,
  Activity,
  AlertCircle,
  X
} from 'lucide-react'

import { useHospitalLogo } from '@/lib/useHospitalLogo'

interface BillItem {
  id: string
  service_id?: string
  description: string
  quantity: number
  unit_price: number
  discount: number
  tax_rate: number
  total: number
}

export default function NewBillingPage() {
  const navigate = useNavigate()
  const logoUrl = useHospitalLogo()
  const [searchParams] = useSearchParams()
  const defaultPatientId = searchParams.get('patient_id')

  const [patients, setPatients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Patient search
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)

  // Bill Items
  const [items, setItems] = useState<BillItem[]>([])

  // Bill Summary
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'other'>('cash')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [notes, setNotes] = useState('')

  // Generated receipt modal state
  const [completedReceipt, setCompletedReceipt] = useState<any>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  // Lab Orders for selected patient
  const [patientLabOrders, setPatientLabOrders] = useState<any[]>([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Update available lab orders whenever selectedPatient changes
  useEffect(() => {
    if (!selectedPatient) {
      setPatientLabOrders([])
      return
    }

    const fetchPatientLabs = async () => {
      let dbUnbilled: any[] = []
      try {
        const { data } = await supabase
          .from('lab_orders')
          .select('*')
          .or(`patient_id.eq.${selectedPatient.id},patient_number.eq.${selectedPatient.patient_number}`)
          .eq('billed', false)
          .neq('status', 'cancelled')

        if (data && data.length > 0) {
          dbUnbilled = data
        }
      } catch (err) {
        console.warn('Could not fetch lab orders from DB:', err)
      }

      const saved = localStorage.getItem('mithra_lab_orders')
      let localUnbilled: any[] = []
      if (saved) {
        try {
          const allOrders = JSON.parse(saved)
          localUnbilled = allOrders.filter(
            (o: any) =>
              !o.id?.startsWith('lo-') &&
              (o.patient_id === selectedPatient.id ||
               o.patient_number === selectedPatient.patient_number ||
               o.patient_name === selectedPatient.full_name) &&
              !o.billed &&
              o.status !== 'cancelled'
          )
        } catch {
          localUnbilled = []
        }
      }

      // Merge unique lab orders by ID
      const mergedMap = new Map()
      dbUnbilled.forEach(o => mergedMap.set(o.id, o))
      localUnbilled.forEach(o => {
        if (!mergedMap.has(o.id)) mergedMap.set(o.id, o)
      })

      setPatientLabOrders(Array.from(mergedMap.values()))
    }

    fetchPatientLabs()
  }, [selectedPatient])

  const handleAddLabOrderToBill = async (labOrder: any) => {
    const newItem: BillItem = {
      id: `lab-${labOrder.id}-${Date.now()}`,
      service_id: labOrder.id,
      description: `[Lab Test] ${labOrder.lab_test_name}`,
      quantity: 1,
      unit_price: Number(labOrder.price),
      discount: 0,
      tax_rate: 0,
      total: Number(labOrder.price),
    }

    const updated = [...items, newItem]
    setItems(updated)
    recalculatePaid(updated)

    // Update DB billed status
    try {
      await supabase
        .from('lab_orders')
        .update({ billed: true, updated_at: new Date().toISOString() })
        .eq('id', labOrder.id)
    } catch (e) {
      console.warn('Error updating lab_orders DB billed state:', e)
    }

    // Mark lab order as billed locally
    const saved = localStorage.getItem('mithra_lab_orders')
    if (saved) {
      try {
        const allOrders = JSON.parse(saved)
        const updatedOrders = allOrders.map((o: any) => o.id === labOrder.id ? { ...o, billed: true } : o)
        localStorage.setItem('mithra_lab_orders', JSON.stringify(updatedOrders))
      } catch (e) {
        console.error('Error updating lab order billed state', e)
      }
    }
    setPatientLabOrders(prev => prev.filter(o => o.id !== labOrder.id))
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [patRes, srvRes] = await Promise.all([
        supabase.from('patients').select('*').eq('is_active', true).order('full_name'),
        supabase.from('hospital_services').select('*').eq('is_active', true).order('name')
      ])

      const pats = patRes.data || []
      const srvs = srvRes.data || []
      setPatients(pats)
      setServices(srvs)

      if (defaultPatientId) {
        const found = pats.find(p => p.id === defaultPatientId)
        if (found) {
          setSelectedPatient(found)
        }
      }

      // Add one default consultation item
      if (srvs.length > 0) {
        const first = srvs[0]
        setItems([
          {
            id: '1',
            service_id: first.id,
            description: first.name,
            quantity: 1,
            unit_price: Number(first.price || 500),
            discount: 0,
            tax_rate: Number(first.tax_rate || 0),
            total: Number(first.price || 500),
          }
        ])
        setAmountPaid(Number(first.price || 500))
      }
    } catch (err) {
      console.error('Error fetching billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddServiceItem = (serviceId: string) => {
    const srv = services.find(s => s.id === serviceId)
    if (!srv) return

    const newItem: BillItem = {
      id: String(Date.now()),
      service_id: srv.id,
      description: srv.name,
      quantity: 1,
      unit_price: Number(srv.price),
      discount: 0,
      tax_rate: Number(srv.tax_rate || 0),
      total: Number(srv.price),
    }

    const updated = [...items, newItem]
    setItems(updated)
    recalculatePaid(updated)
  }

  const handleUpdateItem = (id: string, field: keyof BillItem, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const next = { ...item, [field]: value }
        const itemSub = Number(next.unit_price) * Number(next.quantity) - Number(next.discount)
        const itemTax = itemSub * (Number(next.tax_rate) / 100)
        next.total = Math.max(0, itemSub + itemTax)
        return next
      }
      return item
    })
    setItems(updated)
    recalculatePaid(updated)
  }

  const handleRemoveItem = (id: string) => {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    recalculatePaid(updated)
  }

  const recalculatePaid = (itemList: BillItem[]) => {
    const grand = itemList.reduce((sum, i) => sum + i.total, 0)
    setAmountPaid(grand)
  }

  // Calculations
  const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0)
  const totalDiscount = items.reduce((sum, i) => sum + Number(i.discount), 0)
  const totalTax = items.reduce((sum, i) => {
    const taxable = (i.unit_price * i.quantity) - i.discount
    return sum + (taxable * (i.tax_rate / 100))
  }, 0)
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax)
  const changeAmount = Math.max(0, amountPaid - grandTotal)

  const handleCreateBill = async () => {
    if (!selectedPatient) {
      alert('Please select or register a patient for this hospital bill.')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one service or procedure item.')
      return
    }

    try {
      setIsProcessing(true)

      // 1. Create Invoice
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          patient_id: selectedPatient.id,
          invoice_type: 'hospital',
          subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total_amount: grandTotal,
          notes: notes || 'Hospital Outpatient Services Bill',
        })
        .select()
        .single()

      if (invError) throw invError

      // 2. Create Invoice Items
      const invoiceItemsToInsert = items.map(i => ({
        invoice_id: invoice.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_amount: i.discount,
        tax_amount: (i.unit_price * i.quantity - i.discount) * (i.tax_rate / 100),
        total_amount: i.total,
        reference_type: 'service',
        reference_id: i.service_id || null,
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsToInsert)

      if (itemsError) throw itemsError

      // 3. Create Payment
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          patient_id: selectedPatient.id,
          amount: amountPaid,
          payment_method: paymentMethod,
          payment_status: amountPaid >= grandTotal ? 'paid' : 'pending',
          notes: `Hospital bill payment via ${paymentMethod.toUpperCase()}`,
        })
        .select()
        .single()

      if (payError) throw payError

      // 4. Create Receipt
      const { data: receipt, error: rctError } = await supabase
        .from('receipts')
        .insert({
          invoice_id: invoice.id,
          payment_id: payment.id,
          patient_id: selectedPatient.id,
          receipt_type: 'hospital',
          total_amount: grandTotal,
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          change_amount: changeAmount,
          print_count: 1,
          last_printed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (rctError) throw rctError

      // 5. Create Initial Print Log (ORIGINAL)
      await supabase.from('receipt_print_logs').insert({
        receipt_id: receipt.id,
        print_type: 'original',
        print_number: 1,
        device_info: navigator.userAgent.substring(0, 100),
        notes: 'Original hospital billing counter receipt',
      })

      // 6. Create Audit Log
      await supabase.from('audit_logs').insert({
        action: 'HOSPITAL_BILL_CREATED',
        entity_type: 'receipt',
        entity_id: receipt.id,
        metadata: {
          invoice_id: invoice.id,
          receipt_number: receipt.receipt_number,
          patient: selectedPatient.full_name,
          total: grandTotal,
        }
      })

      setCompletedReceipt({
        ...receipt,
        invoice,
        items,
        patient: selectedPatient
      })
      setShowReceiptModal(true)

    } catch (err: any) {
      alert('Billing generation failed: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = async () => {
    window.print()
    if (completedReceipt?.id) {
      // Increment reprint count on consecutive prints
      const newCount = (completedReceipt.print_count || 1) + 1
      await supabase
        .from('receipts')
        .update({
          print_count: newCount,
          last_printed_at: new Date().toISOString()
        })
        .eq('id', completedReceipt.id)

      await supabase.from('receipt_print_logs').insert({
        receipt_id: completedReceipt.id,
        print_type: 'reprint',
        print_number: newCount,
        device_info: navigator.userAgent.substring(0, 100),
        notes: `Receipt reprinted (Print #${newCount})`,
      })

      setCompletedReceipt({
        ...completedReceipt,
        print_count: newCount,
      })
    }
  }

  if (loading) {
    return <LoadingState message="Loading hospital billing POS..." />
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Create Hospital Bill"
        subtitle="Reception & cashier counter billing for outpatient services, procedures and consultations"
        actions={
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Invoices
          </button>
        }
      />

      <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Patient Selector & Service Line Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient Selection Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              1. Patient Information
            </h3>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-teal-50/50 border border-teal-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                    {selectedPatient.full_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-sm">{selectedPatient.full_name}</p>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                        {selectedPatient.patient_number}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      {selectedPatient.mobile} • {selectedPatient.gender} ({selectedPatient.age}y)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="px-3 py-1 text-xs text-teal-700 hover:bg-teal-100 rounded-lg transition-colors font-medium"
                >
                  Change Patient
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type patient name, phone number, or patient ID to search..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    setShowPatientDropdown(true)
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />

                {showPatientDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                    {patients
                      .filter(p => 
                        !patientSearch ||
                        p.full_name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
                        p.patient_number?.toLowerCase().includes(patientSearch.toLowerCase()) ||
                        p.mobile?.includes(patientSearch)
                      )
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p)
                            setShowPatientDropdown(false)
                            setPatientSearch('')
                          }}
                          className="p-3 hover:bg-teal-50/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-gray-900">{p.full_name}</span>
                            <span className="text-gray-500 ml-2 font-mono">({p.mobile})</span>
                          </div>
                          <span className="font-mono text-teal-700 font-semibold">{p.patient_number}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Lab Tests for Patient Banner */}
          {selectedPatient && patientLabOrders.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-600 text-white rounded-lg font-bold text-xs">🧪</span>
                  <div>
                    <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider">
                      Pending Unbilled Lab Tests ({patientLabOrders.length})
                    </h4>
                    <p className="text-[11px] text-purple-700">
                      Lab tests requested for {selectedPatient.full_name}. Add to bill in 1-click:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    patientLabOrders.forEach(lo => handleAddLabOrderToBill(lo))
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                >
                  + Add All Lab Tests to Bill
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {patientLabOrders.map((lo) => (
                  <div
                    key={lo.id}
                    className="bg-white border border-purple-100 p-3 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-900 block">{lo.lab_test_name}</span>
                      <span className="text-[11px] text-purple-600 font-semibold">{formatCurrency(lo.price)}</span>
                      <span className="text-[10px] text-gray-400 block">{lo.status.replace('_', ' ').toUpperCase()} • {lo.technician_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddLabOrderToBill(lo)}
                      className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded text-xs transition-colors"
                    >
                      + Add to Bill
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Line Items */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                2. Hospital Services & Procedures
              </h3>
              {/* Add Service Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddServiceItem(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer font-medium"
                >
                  <option value="">+ Add Service / Procedure</option>
                  {services.map(srv => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} — {formatCurrency(srv.price)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 text-xs">
                No items added. Select a service from the dropdown above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium">
                      <th className="py-2 px-2">Service Description</th>
                      <th className="py-2 px-2 w-16">Qty</th>
                      <th className="py-2 px-2 w-24">Price (₹)</th>
                      <th className="py-2 px-2 w-20">Disc (₹)</th>
                      <th className="py-2 px-2 w-24 text-right">Total</th>
                      <th className="py-2 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 font-medium text-gray-900"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-center focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-right focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-right focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Right Col: Bill Summary, Payment & Complete */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              3. Payment & Settlement
            </h3>

            {/* Price Calculations */}
            <div className="space-y-2 text-xs border-b border-gray-100 pb-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Discount</span>
                <span className="text-green-600 font-semibold">- {formatCurrency(totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax Amount (GST)</span>
                <span>{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Grand Total</span>
                <span className="text-teal-700 text-base">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'card', label: 'Card / POS' },
                  { id: 'upi', label: 'UPI / GPay' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      paymentMethod === m.id
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Paid & Change */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {amountPaid > grandTotal && (
                <div className="flex justify-between p-2.5 bg-green-50 rounded-lg text-xs font-semibold text-green-800">
                  <span>Change to Return:</span>
                  <span>{formatCurrency(changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleCreateBill}
              disabled={isProcessing || !selectedPatient || items.length === 0}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                'Processing Bill & Generating Receipt...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Generate Invoice & Receipt
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {showReceiptModal && completedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 no-print">
              <div className="flex items-center gap-2 text-teal-700">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-sm">Bill Generated Successfully</h3>
              </div>
              <button
                onClick={() => {
                  setShowReceiptModal(false)
                  navigate('/billing')
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Body (Thermal 80mm / A4 compliant) */}
            <div className="py-4 text-xs font-mono bg-white text-gray-900 border border-gray-200 p-4 rounded-xl my-3">
              <div className="text-center pb-3 border-b border-dashed border-gray-300">
                {logoUrl && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden mx-auto mb-2 bg-gray-50 border border-gray-100 flex items-center justify-center p-0.5">
                    <img src={logoUrl} alt="Hospital Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <h2 className="font-bold text-base tracking-wider uppercase">Mithra Superspeciality Hospital</h2>
                <p className="text-[10px] text-gray-500">124 Healthcare Boulevard, Jubilee Hills, Hyd</p>
                <p className="text-[10px] text-gray-500">Ph: +91 40 2345 6789 • GSTIN: 36AABCM1234F1Z8</p>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    (completedReceipt.print_count || 1) > 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(completedReceipt.print_count || 1) > 1 ? `*** REPRINT (${completedReceipt.print_count}) ***` : 'ORIGINAL RECEIPT'}
                  </span>
                </div>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Receipt #: <strong>{completedReceipt.receipt_number}</strong></span>
                  <span>Date: {formatDateTime(completedReceipt.created_at || new Date())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patient: <strong>{completedReceipt.patient?.full_name}</strong></span>
                  <span>ID: {completedReceipt.patient?.patient_number}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1.5">
                <div className="flex justify-between font-bold border-b border-gray-200 pb-1 text-[11px]">
                  <span>Item Description</span>
                  <span>Qty x Rate = Total</span>
                </div>
                {completedReceipt.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="max-w-[180px] truncate">{item.description}</span>
                    <span>{item.quantity} x ₹{item.unit_price} = ₹{item.total}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount:</span>
                    <span>- {formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-200">
                  <span>TOTAL AMOUNT:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 pt-1">
                  <span>Payment Method:</span>
                  <span className="uppercase font-bold">{completedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
                {changeAmount > 0 && (
                  <div className="flex justify-between text-[10px] text-green-700 font-bold">
                    <span>Change Returned:</span>
                    <span>{formatCurrency(changeAmount)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 text-[10px] text-gray-500">
                <p>Thank you for choosing Mithra Hospital.</p>
                <p>Wish you a speedy recovery!</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 no-print">
              <button
                onClick={() => {
                  setShowReceiptModal(false)
                  navigate('/billing')
                }}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrintReceipt}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt (Tracked)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
