import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Layers,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck,
  X
} from 'lucide-react'

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [medicines, setMedicines] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Add Batch Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    medicine_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: '50',
    purchase_price: '15',
    selling_price: '25',
    supplier_id: '',
  })

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      setLoading(true)
      const [batchRes, medRes, supRes] = await Promise.all([
        supabase
          .from('medicine_batches')
          .select(`
            *, medicine:medicines(id, name, medicine_code, dosage_form, strength, reorder_level),
            supplier:suppliers(id, name, company)
          `)
          .order('expiry_date', { ascending: true }),
        supabase.from('medicines').select('id, name, dosage_form, strength, purchase_price, selling_price').eq('is_active', true).order('name'),
        supabase.from('suppliers').select('id, name, company').eq('is_active', true).order('name')
      ])

      setBatches(batchRes.data || [])
      setMedicines(medRes.data || [])
      setSuppliers(supRes.data || [])
    } catch (err) {
      console.error('Error fetching batches:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const qty = parseInt(formData.quantity) || 0
      const { data: batch, error } = await supabase
        .from('medicine_batches')
        .insert({
          medicine_id: formData.medicine_id,
          batch_number: formData.batch_number,
          expiry_date: formData.expiry_date,
          quantity: qty,
          purchase_price: parseFloat(formData.purchase_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0,
          supplier_id: formData.supplier_id || null,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      // Log opening inventory transaction
      await supabase.from('inventory_transactions').insert({
        medicine_id: formData.medicine_id,
        batch_id: batch.id,
        transaction_type: 'opening_stock',
        quantity: qty,
        previous_quantity: 0,
        new_quantity: qty,
        notes: `New batch ${formData.batch_number} received into stock`,
      })

      setIsModalOpen(false)
      fetchBatches()
    } catch (err: any) {
      alert('Error creating batch: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const in60Days = new Date()
  in60Days.setDate(new Date().getDate() + 60)
  const in60Str = in60Days.toISOString().split('T')[0]

  const filtered = batches.filter(b => {
    const isExpired = b.expiry_date < today
    const isExpiring = !isExpired && b.expiry_date <= in60Str
    const isGood = !isExpired && !isExpiring

    if (statusFilter === 'expired' && !isExpired) return false
    if (statusFilter === 'expiring' && !isExpiring) return false
    if (statusFilter === 'good' && !isGood) return false

    const q = searchQuery.toLowerCase()
    return (
      !q ||
      b.batch_number?.toLowerCase().includes(q) ||
      b.medicine?.name?.toLowerCase().includes(q) ||
      b.supplier?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Medicine Batch Management"
        subtitle="Batch-level inventory tracking, FEFO expiration monitoring and supplier lots"
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Batch
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
              placeholder="Search batch #, medicine name, supplier..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-[11px] text-gray-400">Batch Health:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Batches</option>
              <option value="good">Good Condition</option>
              <option value="expiring">Expiring Soon (≤ 60 Days)</option>
              <option value="expired">Expired (Unsaleable)</option>
            </select>
          </div>
        </div>

        {/* Batches Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading batch lot records..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No batches found"
              description="No batches match the selected criteria."
              action={{
                label: 'Add First Batch',
                onClick: () => setIsModalOpen(true),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Batch #</th>
                    <th className="py-3 px-3 font-medium">Medicine Name</th>
                    <th className="py-3 px-3 font-medium">Expiry Date (FEFO)</th>
                    <th className="py-3 px-3 font-medium">Batch Stock</th>
                    <th className="py-3 px-3 font-medium">Purchase / Selling</th>
                    <th className="py-3 px-3 font-medium">Supplier</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(b => {
                    const isExp = b.expiry_date < today
                    const isSoon = !isExp && b.expiry_date <= in60Str

                    return (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {b.batch_number}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900">{b.medicine?.name}</p>
                          <p className="text-[10px] text-gray-400">{b.medicine?.dosage_form} • {b.medicine?.strength}</p>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={isExp ? 'text-red-700 font-bold' : isSoon ? 'text-amber-700 font-bold' : 'text-gray-700 font-medium'}>
                            {formatDate(b.expiry_date)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.quantity === 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {b.quantity} units
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="text-gray-400">{formatCurrency(b.purchase_price)}</span> / <span className="font-bold text-gray-900">{formatCurrency(b.selling_price)}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {b.supplier?.name || 'Direct Wholesale'}
                        </td>
                        <td className="py-3 px-3">
                          {isExp ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3" /> Expired
                            </span>
                          ) : isSoon ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> Expiring Soon
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" /> Good Condition
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

      {/* Add Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Add Medicine Batch Lot</h3>
                <p className="text-xs text-gray-500">Log incoming manufacturing batch with expiration date</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Medicine <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.medicine_id}
                  onChange={(e) => {
                    const med = medicines.find(m => m.id === e.target.value)
                    setFormData({
                      ...formData,
                      medicine_id: e.target.value,
                      purchase_price: String(med?.purchase_price || 15),
                      selling_price: String(med?.selling_price || 25),
                    })
                  }}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Select Medicine --</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Batch Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PCM-2026-B1"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Purchase (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Selling (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Distributor / Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.company || 'Distributor'})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
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
                  {isSaving ? 'Adding...' : 'Add Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
