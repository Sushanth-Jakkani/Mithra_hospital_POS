import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Pill,
  Search,
  Plus,
  Trash2,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Barcode,
  Clock,
  User,
  X,
  CreditCard
} from 'lucide-react'

interface CartItem {
  medicine_id: string
  medicine_name: string
  batch_id: string
  batch_number: string
  expiry_date: string
  available_qty: number
  quantity: number
  unit_price: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
}

export default function PharmacyPOSPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prescIdParam = searchParams.get('prescription_id')

  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Medicines & Batches Catalog
  const [medicines, setMedicines] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<any[]>([])

  // Patients
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)

  // Pending Doctor Prescriptions Queue
  const [prescriptionsQueue, setPrescriptionsQueue] = useState<any[]>([])
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'other'>('cash')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [notes, setNotes] = useState('')

  // Receipt Modal State
  const [completedReceipt, setCompletedReceipt] = useState<any>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  useEffect(() => {
    fetchPOSCatalog()
  }, [])

  const fetchPOSCatalog = async () => {
    try {
      setLoading(true)
      const [medRes, catRes, patRes, prescRes] = await Promise.all([
        supabase
          .from('medicines')
          .select(`
            id, medicine_code, barcode, name, generic_name, brand_name, dosage_form, strength,
            selling_price, purchase_price, tax_rate, reorder_level, category_id,
            batches:medicine_batches(id, batch_number, expiry_date, quantity, selling_price, is_active)
          `)
          .eq('is_active', true)
          .order('name'),
        supabase.from('medicine_categories').select('*').order('name'),
        supabase.from('patients').select('*').eq('is_active', true).order('full_name'),
        supabase
          .from('prescriptions')
          .select(`
            id, prescription_number, diagnosis, notes, status, created_at,
            patient:patients(id, full_name, patient_number, mobile),
            doctor:doctors(full_name),
            items:prescription_items(id, medicine_id, medicine_name, dosage, frequency, duration, quantity, instructions)
          `)
          .in('status', ['issued', 'partially_dispensed'])
          .order('created_at', { ascending: false })
      ])

      const meds = medRes.data || []
      setMedicines(meds)
      setCategories(catRes.data || [])
      setPatients(patRes.data || [])
      const prescs = prescRes.data || []
      setPrescriptionsQueue(prescs)

      // If prescription_id passed in URL, load it directly
      if (prescIdParam) {
        const targetPresc = prescs.find(p => p.id === prescIdParam)
        if (targetPresc) {
          loadPrescriptionIntoPOS(targetPresc, meds)
        }
      }
    } catch (err) {
      console.error('Error fetching pharmacy catalog:', err)
    } finally {
      setLoading(false)
    }
  }

  // FEFO Helper: Find earliest valid non-expired batch
  const getFefoBatch = (med: any) => {
    const today = new Date().toISOString().split('T')[0]
    const validBatches = (med.batches || [])
      .filter((b: any) => b.is_active && b.quantity > 0 && b.expiry_date >= today)
      .sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())

    return validBatches.length > 0 ? validBatches[0] : null
  }

  // Add Medicine to Cart with FEFO auto-selection
  const handleAddToCart = (medicine: any, batch?: any) => {
    const today = new Date().toISOString().split('T')[0]
    const chosenBatch = batch || getFefoBatch(medicine)

    if (!chosenBatch) {
      alert(`No valid in-stock non-expired batch found for ${medicine.name}.`)
      return
    }

    if (chosenBatch.expiry_date < today) {
      alert(`Cannot dispense batch ${chosenBatch.batch_number}: Expired on ${formatDate(chosenBatch.expiry_date)}.`)
      return
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(
      item => item.medicine_id === medicine.id && item.batch_id === chosenBatch.id
    )

    const unitPrice = Number(chosenBatch.selling_price || medicine.selling_price || 0)
    const taxRate = Number(medicine.tax_rate || 5)

    if (existingIndex > -1) {
      const current = cart[existingIndex]
      if (current.quantity + 1 > chosenBatch.quantity) {
        alert(`Cannot add more: Available stock for batch ${chosenBatch.batch_number} is ${chosenBatch.quantity}.`)
        return
      }
      const newQty = current.quantity + 1
      const itemTax = (unitPrice * newQty - current.discount) * (taxRate / 100)
      const newTotal = (unitPrice * newQty - current.discount) + itemTax

      const updated = [...cart]
      updated[existingIndex] = {
        ...current,
        quantity: newQty,
        tax_amount: itemTax,
        total: newTotal
      }
      setCart(updated)
      recalcPaid(updated)
    } else {
      const itemTax = (unitPrice * 1) * (taxRate / 100)
      const newItem: CartItem = {
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        batch_id: chosenBatch.id,
        batch_number: chosenBatch.batch_number,
        expiry_date: chosenBatch.expiry_date,
        available_qty: chosenBatch.quantity,
        quantity: 1,
        unit_price: unitPrice,
        discount: 0,
        tax_rate: taxRate,
        tax_amount: itemTax,
        total: unitPrice + itemTax
      }
      const updated = [...cart, newItem]
      setCart(updated)
      recalcPaid(updated)
    }
  }

  // Load Prescribed items into POS
  const loadPrescriptionIntoPOS = (presc: any, allMeds: any[]) => {
    setSelectedPrescription(presc)
    if (presc.patient) {
      setSelectedPatient(presc.patient)
    }

    const newCart: CartItem[] = []
    ;(presc.items || []).forEach((item: any) => {
      const med = allMeds.find(m => m.id === item.medicine_id || m.name.toLowerCase() === item.medicine_name.toLowerCase())
      if (med) {
        const batch = getFefoBatch(med)
        if (batch) {
          const qty = Math.min(item.quantity || 1, batch.quantity)
          const unitPrice = Number(batch.selling_price || med.selling_price || 0)
          const taxRate = Number(med.tax_rate || 5)
          const itemTax = (unitPrice * qty) * (taxRate / 100)

          newCart.push({
            medicine_id: med.id,
            medicine_name: med.name,
            batch_id: batch.id,
            batch_number: batch.batch_number,
            expiry_date: batch.expiry_date,
            available_qty: batch.quantity,
            quantity: qty,
            unit_price: unitPrice,
            discount: 0,
            tax_rate: taxRate,
            tax_amount: itemTax,
            total: (unitPrice * qty) + itemTax
          })
        }
      }
    })

    setCart(newCart)
    recalcPaid(newCart)
  }

  const handleUpdateCartItem = (index: number, field: keyof CartItem, value: any) => {
    const updated = [...cart]
    const item = { ...updated[index], [field]: value }

    if (field === 'quantity') {
      const q = Math.max(1, Math.min(Number(value) || 1, item.available_qty))
      item.quantity = q
    }

    const sub = (item.unit_price * item.quantity) - Number(item.discount || 0)
    item.tax_amount = sub * (item.tax_rate / 100)
    item.total = Math.max(0, sub + item.tax_amount)

    updated[index] = item
    setCart(updated)
    recalcPaid(updated)
  }

  const handleRemoveFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index)
    setCart(updated)
    recalcPaid(updated)
  }

  const recalcPaid = (cartList: CartItem[]) => {
    const total = cartList.reduce((sum, i) => sum + i.total, 0)
    setAmountPaid(total)
  }

  // Cart Calculations
  const subtotal = cart.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0)
  const totalDiscount = cart.reduce((sum, i) => sum + Number(i.discount || 0), 0)
  const totalTax = cart.reduce((sum, i) => sum + i.tax_amount, 0)
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax)
  const changeAmount = Math.max(0, amountPaid - grandTotal)

  // Execute Complete Pharmacy Sale Transaction
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Pharmacy cart is empty.')
      return
    }

    try {
      setIsProcessing(true)

      // 1. Validate stocks and batches
      for (const item of cart) {
        const { data: batch } = await supabase
          .from('medicine_batches')
          .select('id, quantity, expiry_date')
          .eq('id', item.batch_id)
          .single()

        if (!batch || batch.quantity < item.quantity) {
          throw new Error(`Insufficient stock for batch ${item.batch_number}. Available: ${batch?.quantity || 0}`)
        }
      }

      // 2. Create Sale Record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          patient_id: selectedPatient?.id || null,
          prescription_id: selectedPrescription?.id || null,
          subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total_amount: grandTotal,
          payment_method: paymentMethod,
          payment_status: amountPaid >= grandTotal ? 'paid' : 'pending',
          amount_paid: amountPaid,
          change_amount: changeAmount,
          notes: notes || 'Counter Pharmacy Dispensing',
        })
        .select()
        .single()

      if (saleError) throw saleError

      // 3. Create Sale Items and Reduce Batches
      for (const item of cart) {
        await supabase.from('sale_items').insert({
          sale_id: sale.id,
          medicine_id: item.medicine_id,
          batch_id: item.batch_id,
          medicine_name: item.medicine_name,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount,
          tax_amount: item.tax_amount,
          total_amount: item.total,
        })

        // Reduce Batch Inventory
        const { data: currentBatch } = await supabase
          .from('medicine_batches')
          .select('quantity')
          .eq('id', item.batch_id)
          .single()

        const newQty = Math.max(0, (currentBatch?.quantity || 0) - item.quantity)
        await supabase
          .from('medicine_batches')
          .update({ quantity: newQty })
          .eq('id', item.batch_id)

        // Create Inventory Transaction Log
        await supabase.from('inventory_transactions').insert({
          medicine_id: item.medicine_id,
          batch_id: item.batch_id,
          transaction_type: 'sale',
          quantity: item.quantity,
          previous_quantity: currentBatch?.quantity || 0,
          new_quantity: newQty,
          reference_type: 'sale',
          reference_id: sale.id,
          notes: `Dispensed in sale ${sale.sale_number}`,
        })
      }

      // 4. Create Unified Invoice
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          patient_id: selectedPatient?.id || null,
          sale_id: sale.id,
          invoice_type: 'pharmacy',
          subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total_amount: grandTotal,
          notes: 'Pharmacy POS Dispensing Invoice',
        })
        .select()
        .single()

      if (invErr) throw invErr

      // 5. Create Payment
      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          patient_id: selectedPatient?.id || null,
          amount: amountPaid,
          payment_method: paymentMethod,
          payment_status: amountPaid >= grandTotal ? 'paid' : 'pending',
          notes: `Pharmacy payment via ${paymentMethod.toUpperCase()}`,
        })
        .select()
        .single()

      if (payErr) throw payErr

      // 6. Create Receipt
      const { data: receipt, error: rctErr } = await supabase
        .from('receipts')
        .insert({
          invoice_id: invoice.id,
          payment_id: payment.id,
          patient_id: selectedPatient?.id || null,
          receipt_type: 'pharmacy',
          total_amount: grandTotal,
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          change_amount: changeAmount,
          print_count: 1,
          last_printed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (rctErr) throw rctErr

      // 7. Create Original Print Log
      await supabase.from('receipt_print_logs').insert({
        receipt_id: receipt.id,
        print_type: 'original',
        print_number: 1,
        device_info: 'Pharmacy Thermal POS 80mm Counter',
        notes: 'Original pharmacy sale dispensing receipt',
      })

      // 8. Update prescription status if linked
      if (selectedPrescription?.id) {
        await supabase
          .from('prescriptions')
          .update({ status: 'dispensed' })
          .eq('id', selectedPrescription.id)
      }

      // 9. Create Audit Log
      await supabase.from('audit_logs').insert({
        action: 'PHARMACY_SALE_COMPLETED',
        entity_type: 'sale',
        entity_id: sale.id,
        metadata: {
          sale_number: sale.sale_number,
          receipt_number: receipt.receipt_number,
          total: grandTotal,
          items_count: cart.length
        }
      })

      // Show Receipt Modal
      setCompletedReceipt({
        ...receipt,
        sale,
        items: cart,
        patient: selectedPatient
      })
      setShowReceiptModal(true)

      // Refresh Catalog for updated stocks
      fetchPOSCatalog()

    } catch (err: any) {
      alert('Pharmacy sale failed: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = async () => {
    window.print()
    if (completedReceipt?.id) {
      const nextCount = (completedReceipt.print_count || 1) + 1
      await supabase
        .from('receipts')
        .update({
          print_count: nextCount,
          last_printed_at: new Date().toISOString()
        })
        .eq('id', completedReceipt.id)

      await supabase.from('receipt_print_logs').insert({
        receipt_id: completedReceipt.id,
        print_type: 'reprint',
        print_number: nextCount,
        device_info: 'Pharmacy POS Thermal Printer',
        notes: `Reprinted receipt (Copy #${nextCount})`,
      })

      setCompletedReceipt({
        ...completedReceipt,
        print_count: nextCount
      })
    }
  }

  const resetPOS = () => {
    setCart([])
    setSelectedPatient(null)
    setSelectedPrescription(null)
    setAmountPaid(0)
    setNotes('')
    setShowReceiptModal(false)
  }

  const filteredMedicines = medicines.filter(m => {
    const matchesCat = selectedCategory === 'all' || m.category_id === selectedCategory
    const q = searchQuery.toLowerCase()
    const matchesQuery = !q ||
      m.name?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q) ||
      m.medicine_code?.toLowerCase().includes(q) ||
      m.barcode?.includes(q)

    return matchesCat && matchesQuery
  })

  if (loading) {
    return <LoadingState message="Loading Pharmacy POS Counter..." />
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Pharmacy Point of Sale (POS)"
        subtitle="Fast barcode & medicine search, FEFO automated batch allocation, and prescription queue dispensing"
        actions={
          <button
            onClick={() => navigate('/pharmacy/sales')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            Sales History
          </button>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Prescription Queue Notification Banner */}
        {prescriptionsQueue.length > 0 && !selectedPrescription && (
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                {prescriptionsQueue.length}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Doctor Prescriptions In Queue</p>
                <p className="text-[11px] text-gray-600">Pending clinical prescriptions ready for pharmacy dispensing</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-md">
              {prescriptionsQueue.map(pr => (
                <button
                  key={pr.id}
                  onClick={() => loadPrescriptionIntoPOS(pr, medicines)}
                  className="px-2.5 py-1 bg-white border border-teal-300 rounded-lg text-xs font-medium text-teal-800 hover:bg-teal-600 hover:text-white transition-all shadow-2xs whitespace-nowrap"
                >
                  Load {pr.patient?.full_name?.split(' ')[0]} ({pr.prescription_number})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3-Panel POS Layout: LEFT (Catalog & Search) | CENTER (Cart) | RIGHT (Bill Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT 4 COLS: Medicine Search & FEFO Batch Picker */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col h-[750px]">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-teal-600" /> Medicine Search
            </h3>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, generic, barcode..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-gray-100 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap ${
                  selectedCategory === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                All Categories
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap ${
                    selectedCategory === c.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Medicines List with Batch details & FEFO indicator */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredMedicines.map(med => {
                const totalStock = (med.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
                const fefoBatch = getFefoBatch(med)

                return (
                  <div
                    key={med.id}
                    className="p-3 bg-gray-50/70 border border-gray-100 rounded-xl hover:border-teal-300 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900">{med.name}</h4>
                        <p className="text-[10px] text-gray-500 italic">{med.generic_name}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{med.dosage_form} • {med.strength}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-teal-800">{formatCurrency(med.selling_price)}</span>
                        <p className={`text-[10px] font-semibold mt-0.5 ${
                          totalStock === 0 ? 'text-red-600' : totalStock <= med.reorder_level ? 'text-amber-600' : 'text-green-700'
                        }`}>
                          Stock: {totalStock}
                        </p>
                      </div>
                    </div>

                    {/* Batches Preview & FEFO Quick Add */}
                    <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                      {fefoBatch ? (
                        <div className="text-[10px] text-teal-800">
                          <span className="font-semibold">FEFO Batch:</span> {fefoBatch.batch_number} (Exp: {formatDate(fefoBatch.expiry_date)})
                        </div>
                      ) : (
                        <span className="text-[10px] text-red-600 font-medium">No valid batch</span>
                      )}

                      <button
                        onClick={() => handleAddToCart(med)}
                        disabled={!fefoBatch || fefoBatch.quantity === 0}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold transition-colors disabled:opacity-40"
                      >
                        + Add to Cart
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CENTER 5 COLS: Cart Items Table */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col h-[750px]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Pharmacy Cart ({cart.length} items)
                </h3>
              </div>
              {selectedPrescription && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Rx: {selectedPrescription.prescription_number}
                </span>
              )}
            </div>

            {/* Cart Table */}
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs">
                <Pill className="w-8 h-8 text-gray-300 mb-2" />
                <p>No medicines in cart.</p>
                <p className="text-[10px] text-gray-400 mt-1">Select from search or load prescription.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium pb-2">
                      <th className="py-2 px-1">Medicine & Batch</th>
                      <th className="py-2 px-1 w-16 text-center">Qty</th>
                      <th className="py-2 px-1 w-16 text-right">Price</th>
                      <th className="py-2 px-1 w-16 text-right">Total</th>
                      <th className="py-2 px-1 w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cart.map((item, idx) => (
                      <tr key={`${item.medicine_id}-${item.batch_id}`} className="hover:bg-gray-50/50">
                        <td className="py-2 px-1">
                          <p className="font-bold text-gray-900 truncate max-w-[140px]">{item.medicine_name}</p>
                          <p className="text-[10px] text-teal-700 font-mono">
                            {item.batch_number} • Exp: {formatDate(item.expiry_date)}
                          </p>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.available_qty}
                            value={item.quantity}
                            onChange={(e) => handleUpdateCartItem(idx, 'quantity', e.target.value)}
                            className="w-12 px-1 py-1 text-xs border border-gray-200 rounded text-center focus:ring-1 focus:ring-teal-500 font-semibold"
                          />
                        </td>
                        <td className="py-2 px-1 text-right text-gray-700 font-mono text-[11px]">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-2 px-1 text-right font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
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

          {/* RIGHT 3 COLS: Patient Info, Payment & Checkout */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between h-[750px]">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Patient & Settlement
              </h3>

              {/* Patient Selector */}
              {selectedPatient ? (
                <div className="p-2.5 bg-teal-50/60 border border-teal-200 rounded-xl text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">{selectedPatient.full_name}</span>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-[10px] text-teal-700 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {selectedPatient.patient_number} • {selectedPatient.mobile}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Attach patient (Optional)..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setShowPatientDropdown(true)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {showPatientDropdown && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto divide-y divide-gray-50 text-xs">
                      {patients
                        .filter(p => !patientSearch || p.full_name?.toLowerCase().includes(patientSearch.toLowerCase()))
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p)
                              setShowPatientDropdown(false)
                              setPatientSearch('')
                            }}
                            className="p-2 hover:bg-teal-50 cursor-pointer flex justify-between"
                          >
                            <span className="font-medium text-gray-900">{p.full_name}</span>
                            <span className="font-mono text-[10px] text-teal-700">{p.patient_number}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Price Calculations */}
              <div className="space-y-1.5 text-xs border-t border-b border-gray-100 py-2.5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span className="text-green-600">- {formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST / Tax</span>
                  <span>{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Grand Total</span>
                  <span className="text-teal-700 text-base">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['cash', 'card', 'upi'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m as any)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border uppercase transition-all ${
                        paymentMethod === m
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-sm font-bold text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {amountPaid > grandTotal && (
                <div className="flex justify-between p-2 bg-green-50 rounded text-xs font-semibold text-green-800">
                  <span>Change:</span>
                  <span>{formatCurrency(changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Complete Sale Button */}
            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={handleCompleteSale}
                disabled={isProcessing || cart.length === 0}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isProcessing ? (
                  'Dispensing & Deducting Stock...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Pharmacy Sale
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Pharmacy 80mm Thermal Receipt Modal */}
      {showReceiptModal && completedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full p-5 animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 no-print">
              <div className="flex items-center gap-1.5 text-teal-700">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="font-bold text-xs">Pharmacy Sale Complete</h3>
              </div>
              <button
                onClick={resetPOS}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 80mm Thermal Receipt Layout */}
            <div className="py-3 text-[11px] font-mono bg-white text-gray-900 border border-gray-200 p-3 rounded-lg my-2">
              <div className="text-center pb-2 border-b border-dashed border-gray-300">
                <h2 className="font-bold text-xs uppercase">Mithra Superspeciality Hospital</h2>
                <h3 className="font-bold text-[11px] uppercase text-teal-800">Pharmacy Counter</h3>
                <p className="text-[9px] text-gray-500">124 Healthcare Blvd, Jubilee Hills, Hyd</p>
                <p className="text-[9px] text-gray-500">GSTIN: 36AABCM1234F1Z8</p>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    (completedReceipt.print_count || 1) > 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(completedReceipt.print_count || 1) > 1 ? `*** REPRINT (${completedReceipt.print_count}) ***` : 'ORIGINAL RECEIPT'}
                  </span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-gray-300 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Receipt: <strong>{completedReceipt.receipt_number}</strong></span>
                  <span>{formatDate(completedReceipt.created_at || new Date())}</span>
                </div>
                {completedReceipt.patient && (
                  <div className="flex justify-between">
                    <span>Patient: {completedReceipt.patient.full_name}</span>
                    <span>ID: {completedReceipt.patient.patient_number}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-gray-300 space-y-1">
                <div className="flex justify-between font-bold border-b border-gray-200 pb-1 text-[10px]">
                  <span>Medicine / Batch</span>
                  <span>Qty x Price = Amt</span>
                </div>
                {completedReceipt.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <div>
                      <p className="font-bold">{item.medicine_name}</p>
                      <p className="text-[9px] text-gray-500">B: {item.batch_number}</p>
                    </div>
                    <span className="text-right">{item.quantity} x ₹{item.unit_price} = ₹{item.total}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-gray-300 space-y-0.5 text-[10px]">
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
                <div className="flex justify-between font-bold text-xs text-gray-900 pt-1 border-t border-gray-200">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-600 pt-0.5">
                  <span>Payment Method:</span>
                  <span className="uppercase font-bold">{completedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
                {changeAmount > 0 && (
                  <div className="flex justify-between text-[9px] text-green-700 font-bold">
                    <span>Change Return:</span>
                    <span>{formatCurrency(changeAmount)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 text-[9px] text-gray-500">
                <p>Thank you! Get well soon.</p>
                <p>Valid receipt for medicine warranty</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 no-print">
              <button
                onClick={resetPOS}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                New Sale
              </button>
              <button
                onClick={handlePrintReceipt}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print 80mm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
