import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  Trash2,
  Search,
  Edit2,
  CheckCircle2,
  X,
  AlertTriangle,
  Stethoscope,
  DollarSign,
  Filter,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface HospitalServiceItem {
  id: string
  name: string
  category: string
  price: number
  tax_rate: number
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const DEFAULT_CATEGORIES = [
  'All',
  'Consultation',
  'Diagnostic',
  'Surgical',
  'Nursing & Procedure',
  'Emergency',
  'Laboratory',
  'General Care',
]

const INITIAL_SERVICES: HospitalServiceItem[] = [
  { id: 'srv-1', name: 'General Doctor Consultation', category: 'Consultation', price: 500, tax_rate: 0, description: 'Standard outpatient consultation', is_active: true },
  { id: 'srv-2', name: 'Specialist Consultation', category: 'Consultation', price: 1000, tax_rate: 0, description: 'Senior consultant specialist appointment', is_active: true },
  { id: 'srv-3', name: 'Emergency Room Triage & Care', category: 'Emergency', price: 1500, tax_rate: 0, description: 'Immediate emergency evaluation and stabilization', is_active: true },
  { id: 'srv-4', name: 'ECG / Electrocardiogram', category: 'Diagnostic', price: 400, tax_rate: 0, description: '12-lead diagnostic ECG scan', is_active: true },
  { id: 'srv-5', name: 'Ultrasound Scan (Abdomen)', category: 'Diagnostic', price: 1200, tax_rate: 0, description: 'Full abdominal ultrasound screening', is_active: true },
  { id: 'srv-6', name: 'Digital Chest X-Ray', category: 'Diagnostic', price: 600, tax_rate: 0, description: 'Single view thoracic radiography', is_active: true },
  { id: 'srv-7', name: 'IV Drip & Medication Admin', category: 'Nursing & Procedure', price: 350, tax_rate: 0, description: 'Saline IV setup and nursing administration', is_active: true },
  { id: 'srv-8', name: 'Wound Dressing & Suturing', category: 'Nursing & Procedure', price: 450, tax_rate: 0, description: 'Minor wound care, cleaning, and suturing', is_active: true },
]

export default function ServiceManager() {
  const [services, setServices] = useState<HospitalServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<HospitalServiceItem | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('Consultation')
  const [formPrice, setFormPrice] = useState('500')
  const [formTaxRate, setFormTaxRate] = useState('0')
  const [formDescription, setFormDescription] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Delete State
  const [deletingService, setDeletingService] = useState<HospitalServiceItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: dbError } = await supabase
        .from('hospital_services')
        .select('*')
        .order('name')

      if (dbError) throw dbError

      if (data && data.length > 0) {
        setServices(data)
      } else {
        setServices(INITIAL_SERVICES)
      }
    } catch (err: any) {
      console.warn('Error fetching hospital_services from DB, using fallback:', err?.message)
      const saved = localStorage.getItem('mithra_admin_services')
      if (saved) {
        setServices(JSON.parse(saved))
      } else {
        setServices(INITIAL_SERVICES)
      }
    } finally {
      setLoading(false)
    }
  }

  const persistServices = (updated: HospitalServiceItem[]) => {
    setServices(updated)
    localStorage.setItem('mithra_admin_services', JSON.stringify(updated))
  }

  // --- Modal Triggers ---
  const openAddModal = () => {
    setEditingService(null)
    setFormName('')
    setFormCategory('Consultation')
    setFormPrice('500')
    setFormTaxRate('0')
    setFormDescription('')
    setFormIsActive(true)
    setIsModalOpen(true)
  }

  const openEditModal = (srv: HospitalServiceItem) => {
    setEditingService(srv)
    setFormName(srv.name)
    setFormCategory(srv.category)
    setFormPrice(String(srv.price))
    setFormTaxRate(String(srv.tax_rate || 0))
    setFormDescription(srv.description || '')
    setFormIsActive(srv.is_active)
    setIsModalOpen(true)
  }

  // --- Save / Create / Edit ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    const priceNum = parseFloat(formPrice) || 0
    const taxNum = parseFloat(formTaxRate) || 0

    try {
      setIsSaving(true)
      setError(null)

      if (editingService) {
        // Update existing service
        const payload = {
          name: formName.trim(),
          category: formCategory,
          price: priceNum,
          tax_rate: taxNum,
          description: formDescription.trim(),
          is_active: formIsActive,
          updated_at: new Date().toISOString(),
        }

        const { error: dbErr } = await supabase
          .from('hospital_services')
          .update(payload)
          .eq('id', editingService.id)

        if (dbErr) {
          console.warn('DB update failed, using local update:', dbErr.message)
        }

        const updated = services.map(s => (s.id === editingService.id ? { ...s, ...payload } : s))
        persistServices(updated)
        setSuccess(`Service "${formName}" updated successfully!`)
      } else {
        // Create new service
        const newServiceObj: HospitalServiceItem = {
          id: `srv-${Date.now()}`,
          name: formName.trim(),
          category: formCategory,
          price: priceNum,
          tax_rate: taxNum,
          description: formDescription.trim(),
          is_active: formIsActive,
          created_at: new Date().toISOString(),
        }

        const { data: inserted, error: dbErr } = await supabase
          .from('hospital_services')
          .insert({
            name: formName.trim(),
            category: formCategory,
            price: priceNum,
            tax_rate: taxNum,
            description: formDescription.trim(),
            is_active: formIsActive,
          })
          .select()
          .single()

        if (dbErr) {
          console.warn('DB insert failed, storing locally:', dbErr.message)
          persistServices([newServiceObj, ...services])
        } else if (inserted) {
          persistServices([inserted, ...services])
        }

        setSuccess(`Service "${formName}" created successfully!`)
      }

      setIsModalOpen(false)
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError('Save error: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // --- Toggle Active Status ---
  const handleToggleActive = async (srv: HospitalServiceItem) => {
    const newStatus = !srv.is_active
    try {
      await supabase
        .from('hospital_services')
        .update({ is_active: newStatus })
        .eq('id', srv.id)

      const updated = services.map(s => (s.id === srv.id ? { ...s, is_active: newStatus } : s))
      persistServices(updated)
    } catch (err: any) {
      console.warn('DB update error:', err)
      const updated = services.map(s => (s.id === srv.id ? { ...s, is_active: newStatus } : s))
      persistServices(updated)
    }
  }

  // --- Delete Service ---
  const handleDelete = async () => {
    if (!deletingService) return
    try {
      setIsDeleting(true)
      await supabase.from('hospital_services').delete().eq('id', deletingService.id)

      const updated = services.filter(s => s.id !== deletingService.id)
      persistServices(updated)
      setSuccess(`Service "${deletingService.name}" removed successfully.`)
      setDeletingService(null)
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError('Delete error: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtering
  const filteredServices = services.filter(srv => {
    const matchesSearch = srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (srv.category && srv.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (srv.description && srv.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCat = selectedCategory === 'All' || srv.category === selectedCategory
    return matchesSearch && matchesCat
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-gray-900">Hospital Services & Pricing</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Add, edit, adjust prices, and delete hospital consultation fees and clinical charges
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-red-100 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Controls: Search & Category Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search service name, category, or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {DEFAULT_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white shadow-sm font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services List Table / Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Service Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium text-gray-600">No services found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try searching or adding a new hospital service</p>
                  </td>
                </tr>
              ) : (
                filteredServices.map(srv => (
                  <tr key={srv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-gray-900 text-xs block">{srv.name}</span>
                        {srv.description && (
                          <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{srv.description}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        {srv.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-teal-700 text-xs">
                        {formatCurrency(srv.price)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(srv)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                          srv.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {srv.is_active ? (
                          <>
                            <ToggleRight className="w-3.5 h-3.5 text-green-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-3.5 h-3.5 text-gray-400" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(srv)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit Service"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingService(srv)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                {editingService ? 'Edit Hospital Service' : 'Add New Hospital Service'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Consultation, MRI Scan"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Nursing & Procedure">Nursing & Procedure</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="General Care">General Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional brief service description..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="formIsActive" className="text-xs text-gray-700 font-medium cursor-pointer">
                  Service is active & available for billing
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Delete Service?</h4>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove <span className="font-semibold text-gray-800">"{deletingService.name}"</span>? This cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setDeletingService(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
