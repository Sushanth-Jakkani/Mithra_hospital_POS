import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils'
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Activity,
  ChevronRight,
  UserPlus,
  Filter,
  X
} from 'lucide-react'

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')

  // Add Patient Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    age: '',
    gender: 'female',
    mobile: '',
    email: '',
    blood_group: 'O+',
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  })

  useEffect(() => {
    fetchPatients()
  }, [bloodGroupFilter, genderFilter])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (bloodGroupFilter !== 'all') {
        query = query.eq('blood_group', bloodGroupFilter)
      }

      if (genderFilter !== 'all') {
        query = query.eq('gender', genderFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setPatients(data || [])
    } catch (err) {
      console.error('Error fetching patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const ageVal = formData.age ? parseInt(formData.age, 10) : undefined

      const { data, error } = await supabase.from('patients').insert({
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth || null,
        age: ageVal,
        gender: formData.gender,
        mobile: formData.mobile,
        email: formData.email || null,
        blood_group: formData.blood_group,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        notes: formData.notes,
        is_active: true
      }).select().single()

      if (error) throw error

      setIsAddModalOpen(false)
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        age: '',
        gender: 'female',
        mobile: '',
        email: '',
        blood_group: 'O+',
        address: '',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: '',
      })
      fetchPatients()
      if (data?.id) {
        navigate(`/patients/${data.id}`)
      }
    } catch (err: any) {
      alert('Error creating patient: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredPatients = patients.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.patient_number?.toLowerCase().includes(q) ||
      p.mobile?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Patients Management"
        subtitle="Complete medical registration, tracking and clinical history records"
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register Patient
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
              placeholder="Search by Patient ID, Name, Mobile or Email..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="text-[11px] text-gray-400">Blood:</span>
              <select
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">All Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="text-[11px] text-gray-400">Gender:</span>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patient Records Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading patient records..." />
          ) : filteredPatients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No patients found"
              description="No patient records match the current filters. Register your first patient to begin."
              action={{
                label: 'Register New Patient',
                onClick: () => setIsAddModalOpen(true),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Patient ID</th>
                    <th className="py-3 px-3 font-medium">Name</th>
                    <th className="py-3 px-3 font-medium">Age / Gender</th>
                    <th className="py-3 px-3 font-medium">Contact</th>
                    <th className="py-3 px-3 font-medium">Blood Group</th>
                    <th className="py-3 px-3 font-medium">Location</th>
                    <th className="py-3 px-3 font-medium">Registered</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPatients.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="hover:bg-teal-50/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-teal-700">
                        {p.patient_number || 'PT-000001'}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900">{p.full_name}</p>
                        <p className="text-[10px] text-gray-400">{p.emergency_contact_name ? `Emergency: ${p.emergency_contact_name}` : 'No emergency contact'}</p>
                      </td>
                      <td className="py-3 px-3 text-gray-700 capitalize">
                        {p.age ? `${p.age} yrs` : 'N/A'} • {p.gender}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-gray-800 font-mono text-[11px]">{p.mobile}</p>
                        {p.email && <p className="text-[10px] text-gray-400">{p.email}</p>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                          {p.blood_group || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {p.city || 'Hyderabad'}
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/patients/${p.id}`)
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                        >
                          View Profile
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

      {/* Register Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Register New Patient</h3>
                <p className="text-xs text-gray-500">Generate unique hospital patient ID and electronic health profile</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
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
                    placeholder="e.g. Doe"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => {
                      const dob = e.target.value
                      let calculatedAge = ''
                      if (dob) {
                        const bDate = new Date(dob)
                        const today = new Date()
                        let age = today.getFullYear() - bDate.getFullYear()
                        if (today.getMonth() < bDate.getMonth() || (today.getMonth() === bDate.getMonth() && today.getDate() < bDate.getDate())) {
                          age--
                        }
                        calculatedAge = String(age)
                      }
                      setFormData({ ...formData, date_of_birth: dob, age: calculatedAge })
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Age (Years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="patient@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="Apartment, Street, Area"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    placeholder="500081"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="Relative / Guardian name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
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
                  {isSaving ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
