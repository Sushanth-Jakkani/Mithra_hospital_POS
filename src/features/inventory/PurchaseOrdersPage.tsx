import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Truck,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Boxes,
  X,
  FileCheck
} from 'lucide-react'

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [medicines, setMedicines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create PO Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
  })

  const [items, setItems] = useState<any[]>([
    {
      medicine_id: '',
      quantity: 100,
      purchase_price: 15,
      tax_amount: 0,
      total_amount: 1500,
      batch_number: 'LOT-' + Math.floor(1000 + Math.random() * 9000),
      expiry_date: '2028-06-30'
    }
  ])

  // Receive Goods Modal
  const [receivePO, setReceivePO] = useState<any>(null)
  const [isReceiving, setIsReceiving] = useState(false)

  useEffect(() => {
    fetchPOs()
    fetchMetadata()
  }, [statusFilter])

  const fetchMetadata = async () => {
    try {
      const [supRes, medRes] = await Promise.all([
        supabase.from('suppliers').select('id, name, company').eq('is_active', true).order('name'),
        supabase.from('medicines').select('id, name, purchase_price').eq('is_active', true).order('name')
      ])
      setSuppliers(supRes.data || [])
      setMedicines(medRes.data || [])
    } catch (err) {
      console.error('Error fetching PO metadata:', err)
    }
  }

  const fetchPOs = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('purchase_orders')
        .select(`
          id, po_number, order_date, expected_date, status, total_amount, notes, created_at,
          supplier:suppliers(id, name, company),
          items:purchase_order_items(id, medicine_id, quantity, received_quantity, purchase_price, total_amount, batch_number, expiry_date, medicine:medicines(name))
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setPurchaseOrders(data || [])
    } catch (err) {
      console.error('Error fetching purchase orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        medicine_id: '',
        quantity: 50,
        purchase_price: 20,
        tax_amount: 0,
        total_amount: 1000,
        batch_number: 'LOT-' + Math.floor(1000 + Math.random() * 9000),
        expiry_date: '2028-12-31'
      }
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index][field] = value

    if (field === 'medicine_id') {
      const med = medicines.find(m => m.id === value)
      if (med) {
        updated[index].purchase_price = Number(med.purchase_price || 15)
      }
    }

    const q = Number(updated[index].quantity || 1)
    const p = Number(updated[index].purchase_price || 0)
    updated[index].total_amount = q * p

    setItems(updated)
  }

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.supplier_id) {
      alert('Please select a supplier.')
      return
    }

    try {
      setIsSaving(true)
      const totalAmount = items.reduce((sum, i) => sum + i.total_amount, 0)

      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          supplier_id: formData.supplier_id,
          order_date: formData.order_date,
          expected_date: formData.expected_date || null,
          status: 'ordered',
          total_amount: totalAmount,
          notes: formData.notes,
        })
        .select()
        .single()

      if (poErr) throw poErr

      const itemsToInsert = items.map(item => ({
        purchase_order_id: po.id,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        received_quantity: 0,
        purchase_price: item.purchase_price,
        tax_amount: 0,
        total_amount: item.total_amount,
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
      }))

      const { error: itemsErr } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert)

      if (itemsErr) throw itemsErr

      setIsModalOpen(false)
      fetchPOs()
    } catch (err: any) {
      alert('Error creating PO: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Receive Goods Workflow: Auto-creates batches and logs transactions
  const handleConfirmReceive = async (po: any) => {
    try {
      setIsReceiving(true)

      // 1. Loop through items, create batches, log inventory transaction
      for (const item of po.items || []) {
        const batchNum = item.batch_number || `BATCH-PO-${po.po_number?.split('-')[1] || '01'}`
        const expDate = item.expiry_date || '2028-12-31'

        // Create Batch
        const { data: batch, error: bErr } = await supabase
          .from('medicine_batches')
          .insert({
            medicine_id: item.medicine_id,
            batch_number: batchNum,
            expiry_date: expDate,
            quantity: item.quantity,
            purchase_price: item.purchase_price,
            selling_price: item.purchase_price * 1.5, // 50% markup
            supplier_id: po.supplier_id,
            purchase_order_id: po.id,
            is_active: true
          })
          .select()
          .single()

        if (bErr) throw bErr

        // Create Transaction Log
        await supabase.from('inventory_transactions').insert({
          medicine_id: item.medicine_id,
          batch_id: batch.id,
          transaction_type: 'purchase',
          quantity: item.quantity,
          previous_quantity: 0,
          new_quantity: item.quantity,
          reference_type: 'purchase_order',
          reference_id: po.id,
          notes: `Goods received against PO ${po.po_number}`,
        })

        // Update item received qty
        await supabase
          .from('purchase_order_items')
          .update({ received_quantity: item.quantity })
          .eq('id', item.id)
      }

      // 2. Mark PO as received
      await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', po.id)

      // 3. Audit Log
      await supabase.from('audit_logs').insert({
        action: 'PURCHASE_ORDER_RECEIVED',
        entity_type: 'purchase_order',
        entity_id: po.id,
        metadata: {
          po_number: po.po_number,
          total_amount: po.total_amount,
        }
      })

      setReceivePO(null)
      fetchPOs()
    } catch (err: any) {
      alert('Error receiving purchase order items: ' + err.message)
    } finally {
      setIsReceiving(false)
    }
  }

  const filtered = purchaseOrders.filter(po => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      po.po_number?.toLowerCase().includes(q) ||
      po.supplier?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Purchase Orders & Procurement"
        subtitle="Wholesale medicine purchase orders, shipment intake and automatic batch lot replenishment"
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Purchase Order
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
              placeholder="Search PO #, vendor name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-[11px] text-gray-400">PO Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Orders</option>
              <option value="ordered">Ordered (In Transit)</option>
              <option value="received">Received (Stocked)</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* PO List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading procurement purchase orders..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No purchase orders"
              description="No procurement orders recorded."
              action={{
                label: 'Create New PO',
                onClick: () => setIsModalOpen(true),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">PO #</th>
                    <th className="py-3 px-3 font-medium">Order Date</th>
                    <th className="py-3 px-3 font-medium">Distributor / Supplier</th>
                    <th className="py-3 px-3 font-medium">Items Ordered</th>
                    <th className="py-3 px-3 font-medium">Total Amount</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(po => (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {po.po_number || 'PO-000001'}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {formatDate(po.order_date)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900">{po.supplier?.name}</p>
                        <p className="text-[10px] text-gray-400">{po.supplier?.company}</p>
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-xs truncate">
                        {po.items?.map((i: any) => `${i.medicine?.name || 'Medicine'} (${i.quantity})`).join(', ')}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900 font-mono">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status === 'ordered' && (
                          <button
                            onClick={() => setReceivePO(po)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-2xs"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Receive Goods
                          </button>
                        )}
                        {po.status === 'received' && (
                          <span className="text-[11px] font-semibold text-green-700 flex items-center justify-end gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Stocked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-3xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Create Procurement Purchase Order</h3>
                <p className="text-xs text-gray-500">Order wholesale pharmaceutical lots from registered distributors</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Vendor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company || 'Distributor'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Order Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Line Items */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Order Line Items
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-teal-700 font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-12 gap-2 text-xs items-center">
                      <div className="col-span-4">
                        <label className="block text-[10px] text-gray-500 mb-0.5">Medicine</label>
                        <select
                          value={item.medicine_id}
                          onChange={(e) => handleUpdateItem(index, 'medicine_id', e.target.value)}
                          required
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                        >
                          <option value="">-- Choose Medicine --</option>
                          {medicines.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-gray-500 mb-0.5">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white text-center"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-gray-500 mb-0.5">Unit Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchase_price}
                          onChange={(e) => handleUpdateItem(index, 'purchase_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white text-right"
                        />
                      </div>

                      <div className="col-span-3 text-right">
                        <span className="block text-[10px] text-gray-400">Total</span>
                        <span className="font-bold text-gray-900 font-mono">{formatCurrency(item.total_amount)}</span>
                      </div>

                      <div className="col-span-1 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Total Order Value: <strong className="text-gray-900 font-mono text-sm">{formatCurrency(items.reduce((s, i) => s + i.total_amount, 0))}</strong>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? 'Placing Order...' : 'Place Purchase Order'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive PO Confirmation Modal */}
      {receivePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Confirm Stock Intake</h3>
            <p className="text-xs text-gray-500 mb-4">
              Receiving PO <strong>{receivePO.po_number}</strong> from <strong>{receivePO.supplier?.name}</strong> will automatically generate batch records and increase inventory levels.
            </p>

            <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs mb-4">
              {receivePO.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.medicine?.name}</span>
                  <span className="font-bold text-gray-900 font-mono">+{item.quantity} units</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceivePO(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReceiving}
                onClick={() => handleConfirmReceive(receivePO)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isReceiving ? 'Stocking...' : 'Confirm Intake & Update Batches'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
