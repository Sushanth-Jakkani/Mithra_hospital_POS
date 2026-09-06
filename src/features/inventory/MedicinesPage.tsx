import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  Layers,
  AlertTriangle,
  X,
  Filter
} from 'lucide-react'

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatId, setSelectedCatId] = useState('all')

  // Add/Edit Medicine Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    brand_name: '',
    category_id: '',
    dosage_form: 'tablet',
    strength: '500mg',
    unit: 'Strip of 10',
    manufacturer: '',
    reorder_level: '20',
    minimum_stock: '10',
    maximum_stock: '500',
    purchase_price: '15',
    selling_price: '25',
    tax_rate: '5',
    prescription_required: false,
    barcode: '',
  })

  useEffect(() => {
    fetchMedicines()
  }, [])

  const fetchMedicines = async () => {
    try {
      setLoading(true)
      const [medRes, catRes] = await Promise.all([
        supabase
          .from('medicines')
          .select(`
            *, category:medicine_categories(name),
            batches:medicine_batches(id, batch_number, expiry_date, quantity)
          `)
          .is('deleted_at', null)
          .order('name'),
        supabase.from('medicine_categories').select('*').order('name')
      ])

      setMedicines(medRes.data || [])
      setCategories(catRes.data || [])
    } catch (err) {
      console.error('Error fetching medicines:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingMedicine(null)
    setFormData({
      name: '',
      generic_name: '',
      brand_name: '',
      category_id: categories[0]?.id || '',
      dosage_form: 'tablet',
      strength: '500mg',
      unit: 'Strip of 10',
      manufacturer: '',
      reorder_level: '20',
      minimum_stock: '10',
      maximum_stock: '500',
      purchase_price: '15',
      selling_price: '25',
      tax_rate: '5',
      prescription_required: false,
      barcode: '',
    })
    setIsModalOpen(true)
  }

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const payload = {
        name: formData.name,
        generic_name: formData.generic_name,
        brand_name: formData.brand_name,
        category_id: formData.category_id || null,
        dosage_form: formData.dosage_form,
        strength: formData.strength,
        unit: formData.unit,
        manufacturer: formData.manufacturer,
        reorder_level: parseInt(formData.reorder_level) || 20,
        minimum_stock: parseInt(formData.minimum_stock) || 10,
        maximum_stock: parseInt(formData.maximum_stock) || 500,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 5,
        prescription_required: formData.prescription_required,
        barcode: formData.barcode || null,
        is_active: true
      }

      if (editingMedicine?.id) {
        const { error } = await supabase
          .from('medicines')
          .update(payload)
          .eq('id', editingMedicine.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('medicines')
          .insert(payload)
        if (error) throw error
      }

      setIsModalOpen(false)
      fetchMedicines()
    } catch (err: any) {
      alert('Error saving medicine: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = medicines.filter(m => {
    const matchesCat = selectedCatId === 'all' || m.category_id === selectedCatId
    const q = searchQuery.toLowerCase()
    const matchesQ = !q ||
      m.name?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q) ||
      m.medicine_code?.toLowerCase().includes(q)
    return matchesCat && matchesQ
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Medicine Master Catalog"
        subtitle="Pharmaceutical inventory formulary, dosage strengths, reorder levels and pricing"
        actions={
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Medicine
          </button>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Filter Controls */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine name, generic, code..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-[11px] text-gray-400">Category:</span>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading formulary catalog..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No medicines found"
              description="No pharmaceutical records match the search criteria."
              action={{
                label: 'Add First Medicine',
                onClick: handleOpenAdd,
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Code</th>
                    <th className="py-3 px-3 font-medium">Medicine Name</th>
                    <th className="py-3 px-3 font-medium">Category</th>
                    <th className="py-3 px-3 font-medium">Dosage / Strength</th>
                    <th className="py-3 px-3 font-medium">Total Stock</th>
                    <th className="py-3 px-3 font-medium">Reorder Level</th>
                    <th className="py-3 px-3 font-medium">Purchase / Selling</th>
                    <th className="py-3 px-3 font-medium">Rx Req</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(m => {
                    const totalQty = (m.batches || []).reduce((acc: number, b: any) => acc + (b.quantity || 0), 0)
                    const isLow = totalQty <= m.reorder_level

                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {m.medicine_code || 'MED-0001'}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900">{m.name}</p>
                          <p className="text-[10px] text-gray-400 italic">{m.generic_name}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {m.category?.name || 'General'}
                        </td>
                        <td className="py-3 px-3 text-gray-700 capitalize">
                          {m.dosage_form} • {m.strength}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            totalQty === 0 ? 'bg-red-50 text-red-700 border border-red-200' :
                            isLow ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {totalQty} units
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-mono">
                          {m.reorder_level}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="text-gray-400">{formatCurrency(m.purchase_price)}</span> / <span className="font-bold text-gray-900">{formatCurrency(m.selling_price)}</span>
                        </td>
                        <td className="py-3 px-3">
                          {m.prescription_required ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">Rx</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">OTC</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingMedicine(m)
                              setFormData({
                                name: m.name,
                                generic_name: m.generic_name || '',
                                brand_name: m.brand_name || '',
                                category_id: m.category_id || '',
                                dosage_form: m.dosage_form || 'tablet',
                                strength: m.strength || '',
                                unit: m.unit || '',
                                manufacturer: m.manufacturer || '',
                                reorder_level: String(m.reorder_level || 20),
                                minimum_stock: String(m.minimum_stock || 10),
                                maximum_stock: String(m.maximum_stock || 500),
                                purchase_price: String(m.purchase_price || 0),
                                selling_price: String(m.selling_price || 0),
                                tax_rate: String(m.tax_rate || 5),
                                prescription_required: m.prescription_required || false,
                                barcode: m.barcode || '',
                              })
                              setIsModalOpen(true)
                            }}
                            className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Medicine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {editingMedicine ? 'Edit Medicine Formulary' : 'Add New Medicine Formulary'}
                </h3>
                <p className="text-xs text-gray-500">Configure pharmaceutical item specifications and reorder thresholds</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Medicine Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 500mg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Generic / Chemical Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acetaminophen"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dosage Form</label>
                  <select
                    value={formData.dosage_form}
                    onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none capitalize"
                  >
                    {['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'other'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="500mg, 10ml, etc."
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (GST %)</label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Threshold Level</label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Cipla, Sun Pharma"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="EAN-13 / Code 128"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="rxReq"
                  checked={formData.prescription_required}
                  onChange={(e) => setFormData({ ...formData, prescription_required: e.target.checked })}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="rxReq" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Prescription Required (Schedule H / Rx drug)
                </label>
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
                  {isSaving ? 'Saving...' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
