import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import { formatCurrency } from '@/lib/utils'
import {
  Settings,
  Building,
  CreditCard,
  Pill,
  Users,
  Shield,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign
} from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'departments' | 'categories' | 'taxes'>('profile')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Hospital Profile State
  const [profile, setProfile] = useState({
    name: 'Mithra Superspeciality Hospital & Pharmacy',
    tagline: 'Excellence in Compassionate Healthcare',
    address: '124 Healthcare Boulevard, Jubilee Hills, Hyderabad - 500033',
    phone: '+91 40 2345 6789',
    emergency_phone: '+91 40 2345 9999',
    email: 'care@mithrahospital.in',
    website: 'https://mithrahospital.in',
    gstin: '36AABCM1234F1Z8',
    registration_number: 'TS-MED-REG-2024-8842',
    currency: 'INR',
    currency_symbol: '₹',
    receipt_footer: 'Thank you for choosing Mithra Hospital. Get well soon!',
  })

  // Services State
  const [services, setServices] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // New Service Item Form
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('500')
  const [newServiceCategory, setNewServiceCategory] = useState('Consultation')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const [settingRes, srvRes, deptRes, catRes] = await Promise.all([
        supabase.from('settings').select('*').eq('key', 'hospital_profile').maybeSingle(),
        supabase.from('hospital_services').select('*').order('name'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('medicine_categories').select('*').order('name')
      ])

      if (settingRes.data?.value) {
        setProfile({ ...profile, ...(settingRes.data.value as any) })
      }
      setServices(srvRes.data || [])
      setDepartments(deptRes.data || [])
      setCategories(catRes.data || [])
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            key: 'hospital_profile',
            category: 'general',
            value: profile,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        )

      if (error) throw error
      setSuccessMessage('Hospital profile settings updated successfully.')
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err: any) {
      alert('Error saving settings: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newServiceName) return

    try {
      const { error } = await supabase.from('hospital_services').insert({
        name: newServiceName,
        price: parseFloat(newServicePrice) || 0,
        category: newServiceCategory,
        tax_rate: 0,
        is_active: true
      })
      if (error) throw error
      setNewServiceName('')
      setNewServicePrice('500')
      fetchSettings()
    } catch (err: any) {
      alert('Error adding service: ' + err.message)
    }
  }

  const handleDeleteService = async (id: string) => {
    try {
      await supabase.from('hospital_services').delete().eq('id', id)
      fetchSettings()
    } catch (err: any) {
      alert('Error deleting service: ' + err.message)
    }
  }

  if (loading) {
    return <LoadingState message="Loading hospital configuration settings..." />
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Hospital Configuration & Settings"
        subtitle="Branding, hospital identification, tax rates, configurable clinical charges, and formulary categories"
      />

      <div className="px-6 py-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 p-2 flex items-center gap-1 overflow-x-auto shadow-sm">
          {[
            { id: 'profile', label: 'Hospital Profile & Identity' },
            { id: 'services', label: 'Configurable Services & Fees' },
            { id: 'departments', label: 'Clinical Departments' },
            { id: 'categories', label: 'Medicine Categories' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Hospital Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4 max-w-3xl">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
              Hospital Legal Identity & Receipt Header
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hospital Official Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hospital Tagline</label>
                <input
                  type="text"
                  value={profile.tagline}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Physical Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">General Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Emergency 24x7</label>
                <input
                  type="text"
                  value={profile.emergency_phone}
                  onChange={(e) => setProfile({ ...profile, emergency_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registration #</label>
                <input
                  type="text"
                  value={profile.registration_number}
                  onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Default Currency</label>
                <input
                  type="text"
                  value="INR (₹)"
                  disabled
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Receipt Footer Note</label>
              <textarea
                rows={2}
                value={profile.receipt_footer}
                onChange={(e) => setProfile({ ...profile, receipt_footer: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Hospital Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Configurable Hospital Services */}
        {activeTab === 'services' && (
          <div className="space-y-4 max-w-3xl">
            {/* Add Service Form */}
            <form onSubmit={handleAddService} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Service / Procedure Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ECG Test, Consultation, Dressing..."
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Consultation">Consultation</option>
                  <option value="Diagnostic">Diagnostic</option>
                  <option value="Procedure">Procedure</option>
                  <option value="Laboratory">Laboratory</option>
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-700 mb-1">Fee (₹)</label>
                <input
                  type="number"
                  required
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm whitespace-nowrap"
              >
                + Add Service
              </button>
            </form>

            {/* Services List */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Standard Fee (₹)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {services.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 font-bold text-gray-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-gray-600">{s.category || 'General'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-800">{formatCurrency(s.price)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Departments */}
        {activeTab === 'departments' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-2xl space-y-3">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Hospital Clinical Departments</h3>
            <div className="divide-y divide-gray-50 text-xs">
              {departments.map(d => (
                <div key={d.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-900">{d.name}</span>
                    <p className="text-[11px] text-gray-500">{d.description || 'Specialty care'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-green-50 text-green-700 font-semibold">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Categories */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-2xl space-y-3">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Pharmaceutical Formulary Categories</h3>
            <div className="divide-y divide-gray-50 text-xs">
              {categories.map(c => (
                <div key={c.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-900">{c.name}</span>
                    <p className="text-[11px] text-gray-500">{c.description || 'Formulary class'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 font-semibold">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
