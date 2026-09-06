import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatDate, formatTime } from '@/lib/utils'
import {
  Search,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Stethoscope,
  ChevronDown,
  X
} from 'lucide-react'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // New Appointment Form State
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    department_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00',
    reason: '',
    notes: '',
  })

  // Cancel Dialog
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [activeTab, searchQuery, selectedDoctorId, selectedDate])

  const fetchInitialData = async () => {
    try {
      const [docRes, patRes, deptRes] = await Promise.all([
        supabase.from('doctors').select('id, full_name, specialization, department_id').eq('is_active', true),
        supabase.from('patients').select('id, full_name, patient_number, mobile').eq('is_active', true).order('full_name'),
        supabase.from('departments').select('id, name').eq('is_active', true)
      ])
      setDoctors(docRes.data || [])
      setPatients(patRes.data || [])
      setDepartments(deptRes.data || [])
    } catch (err) {
      console.error('Error fetching doctors/patients:', err)
    }
  }

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('appointments')
        .select(`
          id, appointment_number, appointment_date, appointment_time, reason, status, notes,
          patient:patients(id, full_name, mobile, patient_number, gender, age),
          doctor:doctors(id, full_name, specialization),
          department:departments(id, name)
        `)
        .order('appointment_time', { ascending: true })

      if (selectedDate) {
        query = query.eq('appointment_date', selectedDate)
      }

      if (selectedDoctorId !== 'all') {
        query = query.eq('doctor_id', selectedDoctorId)
      }

      if (activeTab === 'confirmed') {
        query = query.in('status', ['confirmed', 'checked_in', 'in_consultation'])
      } else if (activeTab === 'pending') {
        query = query.eq('status', 'scheduled')
      } else if (activeTab === 'cancelled') {
        query = query.in('status', ['cancelled', 'no_show'])
      }

      const { data, error } = await query

      if (error) throw error

      let filtered = data || []
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter((apt: any) => 
          apt.patient?.full_name?.toLowerCase().includes(q) ||
          apt.doctor?.full_name?.toLowerCase().includes(q) ||
          apt.reason?.toLowerCase().includes(q) ||
          apt.appointment_number?.toLowerCase().includes(q)
        )
      }

      setAppointments(filtered)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const { data, error } = await supabase.from('appointments').insert({
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id,
        department_id: formData.department_id || null,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time + ':00',
        reason: formData.reason,
        notes: formData.notes,
        status: 'confirmed',
      }).select().single()

      if (error) throw error

      setIsAddModalOpen(false)
      setFormData({
        patient_id: '',
        doctor_id: '',
        department_id: '',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '09:00',
        reason: '',
        notes: '',
      })
      fetchAppointments()
    } catch (err: any) {
      alert(err.message || 'Failed to create appointment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      fetchAppointments()
    } catch (err: any) {
      alert('Failed to update status: ' + err.message)
    } finally {
      setActionLoading(false)
      setCancelTargetId(null)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === appointments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(appointments.map(a => a.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Counts for tabs
  const countAll = appointments.length
  const countConfirmed = appointments.filter(a => ['confirmed', 'checked_in', 'in_consultation'].includes(a.status)).length
  const countPending = appointments.filter(a => a.status === 'scheduled').length
  const countCancelled = appointments.filter(a => ['cancelled', 'no_show'].includes(a.status)).length

  return (
    <div className="pb-12">
      <PageHeader
        title="Appointments"
        subtitle="Manage outpatient bookings, queue check-ins and clinical schedules"
      />

      <div className="px-6 py-4 space-y-4">
        {/* Top Control Bar: Tabs, Search, Date & Add Appointment */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          {/* Status Tabs matching reference design */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'confirmed'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'pending'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'cancelled'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cancelled
            </button>
          </div>

          {/* Search, Date Picker & Add Action */}
          <div className="flex items-center gap-2.5 flex-1 max-w-xl justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, doctor or reason..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
              <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Appointment
            </button>
          </div>
        </div>

        {/* Appointments Table matching reference design */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading appointments..." />
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No appointments found"
              description="No outpatient bookings match your selected criteria for this date."
              action={{
                label: 'Book New Appointment',
                onClick: () => setIsAddModalOpen(true),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === appointments.length && appointments.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="py-3 px-3 font-medium">Name</th>
                    <th className="py-3 px-3 font-medium">Date</th>
                    <th className="py-3 px-3 font-medium">Time</th>
                    <th className="py-3 px-3 font-medium">Doctor</th>
                    <th className="py-3 px-3 font-medium">Treatment</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map((apt) => {
                    const isSelected = selectedIds.includes(apt.id)
                    return (
                      <tr
                        key={apt.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-50/40' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(apt.id)}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-900">{apt.patient?.full_name || 'Patient'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {apt.patient?.patient_number} • {apt.patient?.mobile}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {formatDate(apt.appointment_date)}
                        </td>
                        <td className="py-3 px-3 text-gray-700 font-medium">
                          {formatTime(`1970-01-01T${apt.appointment_time}`)}
                        </td>
                        <td className="py-3 px-3 text-gray-800 font-medium">
                          {apt.doctor?.full_name}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {apt.doctor?.specialization}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 max-w-xs truncate">
                          {apt.reason || 'General Outpatient Check-up'}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={apt.status} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {apt.status === 'scheduled' && (
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                                className="px-2 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded transition-colors"
                              >
                                Check In
                              </button>
                            )}
                            {apt.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'checked_in')}
                                className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                              >
                                Send to Doctor
                              </button>
                            )}
                            {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                              <button
                                onClick={() => setCancelTargetId(apt.id)}
                                className="px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
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

      {/* Add Appointment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Book New Appointment</h3>
                <p className="text-xs text-gray-500">Schedule outpatient visit with clinical doctor</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_number}) - {p.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assigning Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => {
                    const doc = doctors.find(d => d.id === e.target.value)
                    setFormData({
                      ...formData,
                      doctor_id: e.target.value,
                      department_id: doc?.department_id || formData.department_id
                    })
                  }}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Appointment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Time Slot <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason / Treatment Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Routine Check-up, Skin Allergy, Cardiac Consult..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Clinical Notes / Reception Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes for doctor..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
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
                  {isSaving ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        onConfirm={() => cancelTargetId && handleUpdateStatus(cancelTargetId, 'cancelled')}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? The patient will be notified and slot made available."
        confirmLabel="Yes, Cancel"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}
