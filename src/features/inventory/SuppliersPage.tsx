import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building,
  User,
  X
} from 'lucide-react'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Add Supplier Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    contact_person: '',
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const { error } = await supabase.from('suppliers').insert({
        name: formData.name,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        gstin: formData.gstin,
        contact_person: formData.contact_person,
        is_active: true
      })

      if (error) throw error

      setIsModalOpen(false)
      setFormData({
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        contact_person: '',
      })
      fetchSuppliers()
    } catch (err: any) {
      alert('Error creating supplier: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = suppliers.filter(s => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.company?.toLowerCase().includes(q) ||
      s.contact_person?.toLowerCase().includes(q) ||
      s.gstin?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Pharmaceutical Distributors & Suppliers"
        subtitle="Wholesale medicine vendors, procurement contacts and GST tax compliance records"
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Supplier
          </button>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor name, company, GSTIN..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Suppliers Grid */}
        {loading ? (
          <LoadingState message="Loading supplier directory..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers registered"
            description="Add your first pharmaceutical distributor."
            action={{
              label: 'Add Supplier',
              onClick: () => setIsModalOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3 hover:border-teal-200 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{s.name}</h3>
                    <p className="text-xs text-teal-700 font-medium">{s.company || 'Distributor'}</p>
                  </div>
                  <div className="w-8 h-8 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Contact: {s.contact_person || 'Representative'}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{s.phone}</span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                </div>

                {s.gstin && (
                  <div className="pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-500">
                    GSTIN: <strong>{s.gstin}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Add Pharmaceutical Distributor</h3>
                <p className="text-xs text-gray-500">Register new medicine vendor for purchase ordering</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Supplier / Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Life Sciences"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Entity</label>
                  <input
                    type="text"
                    placeholder="Apex Lifecare Pvt Ltd"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Sales Representative"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 40 4455 6677"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="orders@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="36AAACA1234E1Z1"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Warehouse Address</label>
                <textarea
                  rows={2}
                  placeholder="Street, Industrial Area, City..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
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
                  {isSaving ? 'Registering...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
