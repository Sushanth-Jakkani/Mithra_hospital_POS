import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency } from '@/lib/utils'
import {
  Stethoscope,
  Search,
  Plus,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Building,
  UserCheck,
  X
} from 'lucide-react'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState('all')

  // Add Doctor Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    specialization: '',
    qualification: '',
    registration_number: '',
    phone: '',
    email: '',
    department_id: '',
    consultation_fee: '500',
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [docRes, deptRes] = await Promise.all([
        supabase.from('doctors').select('*, department:departments(name)').order('created_at', { ascending: true }),
        supabase.from('departments').select('*').eq('is_active', true)
      ])
      setDoctors(docRes.data || [])
      setDepartments(deptRes.data || [])
    } catch (err) {
      console.error('Error fetching doctors:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const { error } = await supabase.from('doctors').insert({
        first_name: formData.first_name,
        last_name: formData.last_name,
        specialization: formData.specialization,
        qualification: formData.qualification,
        registration_number: formData.registration_number,
        phone: formData.phone,
        email: formData.email,
        department_id: formData.department_id || null,
        consultation_fee: parseFloat(formData.consultation_fee) || 500,
        is_active: true
      })

      if (error) throw error

      setIsAddModalOpen(false)
      setFormData({
        first_name: '',
        last_name: '',
        specialization: '',
        qualification: '',
        registration_number: '',
        phone: '',
        email: '',
        department_id: '',
        consultation_fee: '500',
      })
      fetchInitialData()
    } catch (err: any) {
      alert('Error creating doctor profile: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredDoctors = doctors.filter(d => {
    const matchesDept = selectedDeptId === 'all' || d.department_id === selectedDeptId
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q || 
      d.full_name?.toLowerCase().includes(q) ||
      d.specialization?.toLowerCase().includes(q) ||
      d.registration_number?.toLowerCase().includes(q)
    return matchesDept && matchesSearch
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Doctors & Consultants"
        subtitle="Medical staff directory, specialty departments and consultation fees"
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Doctor
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
              placeholder="Search by doctor name, specialty, registration #..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Department:</span>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctor Cards Grid */}
        {loading ? (
          <LoadingState message="Loading medical staff directory..." />
        ) : filteredDoctors.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No doctors found"
            description="No consultants match the specified criteria."
            action={{
              label: 'Add First Doctor',
              onClick: () => setIsAddModalOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between hover:border-teal-200 transition-all">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-teal-50 border border-teal-100 text-teal-700 rounded-xl flex items-center justify-center font-bold text-sm">
                        {doc.first_name?.charAt(0)}{doc.last_name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{doc.full_name}</h3>
                        <p className="text-xs text-teal-700 font-medium">{doc.specialization}</p>
                        <p className="text-[10px] text-gray-400">{doc.department?.name || 'General'}</p>
                      </div>
                    </div>
                    <StatusBadge status={doc.is_active ? 'active' : 'inactive'} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      <span>{doc.qualification || 'MBBS'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono text-[11px]">{doc.phone}</span>
                    </div>
                    {doc.registration_number && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono text-[10px] text-gray-500">Reg: {doc.registration_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400">Consultation Fee</span>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(doc.consultation_fee || 500)}</p>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    {doc.doctor_code || 'DR-001'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Add Medical Doctor</h3>
                <p className="text-xs text-gray-500">Register new consultant and OPD schedule profile</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Petra"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Winsburry"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiologist, Dermatologist"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Qualifications</label>
                  <input
                    type="text"
                    placeholder="e.g. MBBS, MD (Cardiology)"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Medical Registration #</label>
                  <input
                    type="text"
                    placeholder="MCI-12345"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98490 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="doctor@mithra.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Consult Fee (₹)</label>
                  <input
                    type="number"
                    placeholder="500"
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
