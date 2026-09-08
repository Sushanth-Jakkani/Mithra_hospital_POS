import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useHospitalProfile } from '@/lib/useHospitalProfile'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import EmptyState from '@/components/shared/EmptyState'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  FileText,
  Search,
  Plus,
  Pill,
  Trash2,
  Printer,
  User,
  Stethoscope,
  CheckCircle2,
  ArrowRight,
  X
} from 'lucide-react'

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const { profile: hospitalProfile } = useHospitalProfile()
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [medicines, setMedicines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create Prescription Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    diagnosis: '',
    notes: '',
  })

  // Prescription Line Items
  const [items, setItems] = useState<any[]>([
    {
      medicine_id: '',
      medicine_name: '',
      dosage: '1 tablet',
      frequency: '3 times daily',
      duration: '5 days',
      quantity: 15,
      instructions: 'Take after food',
    }
  ])

  // Printable Prescription Modal State
  const [viewPrescription, setViewPrescription] = useState<any>(null)

  useEffect(() => {
    fetchPrescriptions()
    fetchMetadata()
  }, [statusFilter])

  const fetchMetadata = async () => {
    try {
      const [patRes, docRes, medRes] = await Promise.all([
        supabase.from('patients').select('id, full_name, patient_number, mobile, age, gender').eq('is_active', true),
        supabase.from('doctors').select('id, full_name, specialization, qualification, registration_number').eq('is_active', true),
        supabase.from('medicines').select('id, name, dosage_form, strength').eq('is_active', true).order('name')
      ])
      setPatients(patRes.data || [])
      setDoctors(docRes.data || [])
      setMedicines(medRes.data || [])
    } catch (err) {
      console.error('Error fetching metadata:', err)
    }
  }

  const fetchPrescriptions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('prescriptions')
        .select(`
          id, prescription_number, diagnosis, notes, status, created_at,
          patient:patients(id, full_name, patient_number, mobile, age, gender),
          doctor:doctors(id, full_name, specialization, qualification, registration_number),
          items:prescription_items(id, medicine_id, medicine_name, dosage, frequency, duration, quantity, instructions, dispensed_quantity)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setPrescriptions(data || [])
    } catch (err) {
      console.error('Error fetching prescriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        medicine_id: '',
        medicine_name: '',
        dosage: '1 tablet',
        frequency: '2 times daily',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take after meals',
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
        updated[index].medicine_name = med.name
      }
    }
    setItems(updated)
  }

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.patient_id || !formData.doctor_id) {
      alert('Please select patient and doctor.')
      return
    }

    try {
      setIsSaving(true)
      // 1. Create Prescription Header
      const { data: presc, error: prescErr } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: formData.patient_id,
          doctor_id: formData.doctor_id,
          diagnosis: formData.diagnosis,
          notes: formData.notes,
          status: 'issued',
        })
        .select()
        .single()

      if (prescErr) throw prescErr

      // 2. Create Prescription Items
      const itemsToInsert = items.map(item => ({
        prescription_id: presc.id,
        medicine_id: item.medicine_id || null,
        medicine_name: item.medicine_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
        instructions: item.instructions,
      }))

      const { error: itemsErr } = await supabase
        .from('prescription_items')
        .insert(itemsToInsert)

      if (itemsErr) throw itemsErr

      // 3. Create Audit Log
      await supabase.from('audit_logs').insert({
        action: 'PRESCRIPTION_CREATED',
        entity_type: 'prescription',
        entity_id: presc.id,
        metadata: {
          prescription_number: presc.prescription_number,
          diagnosis: formData.diagnosis,
          items_count: items.length
        }
      })

      setIsAddModalOpen(false)
      setFormData({
        patient_id: '',
        doctor_id: '',
        diagnosis: '',
        notes: '',
      })
      setItems([
        {
          medicine_id: '',
          medicine_name: '',
          dosage: '1 tablet',
          frequency: '3 times daily',
          duration: '5 days',
          quantity: 15,
          instructions: 'Take after food',
        }
      ])
      fetchPrescriptions()
    } catch (err: any) {
      alert('Error saving prescription: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredPrescriptions = prescriptions.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.prescription_number?.toLowerCase().includes(q) ||
      p.patient?.full_name?.toLowerCase().includes(q) ||
      p.doctor?.full_name?.toLowerCase().includes(q) ||
      p.diagnosis?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Clinical Prescriptions"
        subtitle="Doctor e-prescribing, medical diagnosis, and direct pharmacy dispensing queue"
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Write Prescription
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
              placeholder="Search Rx #, patient name, doctor or diagnosis..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-[11px] text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Prescriptions</option>
              <option value="issued">Issued / In Queue</option>
              <option value="dispensed">Dispensed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Prescriptions Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Loading clinical prescriptions..." />
          ) : filteredPrescriptions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No prescriptions found"
              description="No clinical prescriptions match your current filter."
              action={{
                label: 'Write New Prescription',
                onClick: () => setIsAddModalOpen(true),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-medium">
                    <th className="py-3 px-4 font-medium">Prescription #</th>
                    <th className="py-3 px-3 font-medium">Date & Time</th>
                    <th className="py-3 px-3 font-medium">Patient</th>
                    <th className="py-3 px-3 font-medium">Doctor</th>
                    <th className="py-3 px-3 font-medium">Diagnosis</th>
                    <th className="py-3 px-3 font-medium">Medicines</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPrescriptions.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {p.prescription_number || 'RXN-000001'}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {formatDateTime(p.created_at)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900">{p.patient?.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.patient?.patient_number}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-800">{p.doctor?.full_name}</p>
                        <p className="text-[10px] text-gray-400">{p.doctor?.specialization}</p>
                      </td>
                      <td className="py-3 px-3 text-gray-700 font-medium max-w-xs truncate">
                        {p.diagnosis || 'Clinical evaluation'}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        <span className="font-semibold text-teal-700">{p.items?.length || 0}</span> items
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewPrescription(p)}
                            className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          >
                            View & Print
                          </button>
                          {p.status === 'issued' && (
                            <button
                              onClick={() => navigate(`/pharmacy/pos?prescription_id=${p.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors shadow-2xs"
                            >
                              <Pill className="w-3 h-3" />
                              Dispense in POS
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Write Prescription Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-3xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Write Clinical Prescription</h3>
                <p className="text-xs text-gray-500">Create electronic prescription for outpatient pharmacy queue</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.patient_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Attending Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Clinical Diagnosis / Complaints <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Viral Fever, Allergic Rhinitis, Type 2 Diabetes..."
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Medicines Line Items */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Prescribed Medications
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-teal-700 font-bold hover:underline"
                  >
                    + Add Medication
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Medicine</label>
                          <select
                            value={item.medicine_id}
                            onChange={(e) => handleUpdateItem(index, 'medicine_id', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
                          >
                            <option value="">-- Select from Medicine Master --</option>
                            {medicines.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Custom / Non-formulary Name</label>
                          <input
                            type="text"
                            placeholder="Type name if not in list"
                            value={item.medicine_name}
                            onChange={(e) => handleUpdateItem(index, 'medicine_name', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500">Dosage</label>
                          <input
                            type="text"
                            placeholder="1 tablet"
                            value={item.dosage}
                            onChange={(e) => handleUpdateItem(index, 'dosage', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500">Frequency</label>
                          <input
                            type="text"
                            placeholder="3 times daily"
                            value={item.frequency}
                            onChange={(e) => handleUpdateItem(index, 'frequency', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500">Duration</label>
                          <input
                            type="text"
                            placeholder="5 days"
                            value={item.duration}
                            onChange={(e) => handleUpdateItem(index, 'duration', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500">Total Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Special instructions (e.g. Take after food, avoid alcohol...)"
                          value={item.instructions}
                          onChange={(e) => handleUpdateItem(index, 'instructions', e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                        />
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

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  General Advice / Doctor Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Dietary precautions, lifestyle advice, next follow-up date..."
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
                  {isSaving ? 'Issuing Prescription...' : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Print Prescription Modal */}
      {viewPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 no-print">
              <h3 className="font-bold text-sm text-gray-900">Medical Prescription</h3>
              <button
                onClick={() => setViewPrescription(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* A4 Printable Prescription Slip */}
            <div className="py-6 px-4 bg-white text-gray-900 border border-gray-200 rounded-xl my-3 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-teal-600">
                <div>
                  <h2 className="text-base font-bold text-teal-800 uppercase">{hospitalProfile.name}</h2>
                  <p className="text-xs text-gray-500">{hospitalProfile.address}</p>
                  <p className="text-xs text-gray-500">Ph: {hospitalProfile.phone} • Emergency: {hospitalProfile.emergency_phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-gray-900">{viewPrescription.doctor?.full_name}</p>
                  <p className="text-xs text-gray-600">{viewPrescription.doctor?.qualification}</p>
                  <p className="text-[10px] text-gray-400">Reg: {viewPrescription.doctor?.registration_number}</p>
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Patient Name</span>
                  <span className="font-bold text-gray-900">{viewPrescription.patient?.full_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Patient ID / Age / Gender</span>
                  <span className="font-semibold text-gray-800">
                    {viewPrescription.patient?.patient_number} • {viewPrescription.patient?.age}y / {viewPrescription.patient?.gender}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block text-[10px]">Prescription # / Date</span>
                  <span className="font-mono font-bold text-teal-700">
                    {viewPrescription.prescription_number} • {formatDate(viewPrescription.created_at)}
                  </span>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="text-xs">
                <span className="font-bold text-teal-800">Diagnosis / Clinical Notes: </span>
                <span className="text-gray-800 font-medium">{viewPrescription.diagnosis}</span>
              </div>

              {/* Rx Medicines */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1">
                  <span className="text-base text-teal-600 font-serif">℞</span> Prescribed Medications
                </h4>

                <div className="space-y-2 text-xs">
                  {viewPrescription.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50/80 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900">{idx + 1}. {item.medicine_name}</p>
                        <p className="text-[11px] text-gray-600">{item.dosage} • {item.frequency} • for {item.duration}</p>
                        {item.instructions && <p className="text-[10px] text-teal-700 font-medium">{item.instructions}</p>}
                      </div>
                      <span className="font-bold text-gray-900 font-mono">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Signature Area */}
              <div className="pt-12 flex justify-between items-end border-t border-gray-200 mt-8 text-xs">
                <div className="text-[10px] text-gray-400">
                  <p>Mithra Electronic Health Record System</p>
                  <p>Valid without physical signature if authenticated</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-gray-400 mb-1" />
                  <p className="font-bold text-gray-800">{viewPrescription.doctor?.full_name}</p>
                  <p className="text-[10px] text-gray-500">Authorized Medical Officer</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 no-print">
              <button
                onClick={() => setViewPrescription(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Prescription (A4)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
