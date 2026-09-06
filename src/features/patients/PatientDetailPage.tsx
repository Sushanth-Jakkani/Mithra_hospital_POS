import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingState from '@/components/shared/LoadingState'
import Timeline from '@/components/shared/Timeline'
import { formatCurrency, formatDate, formatTime, formatDateTime } from '@/lib/utils'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  FileText,
  CreditCard,
  Pill,
  Clock,
  ArrowLeft,
  Plus,
  Receipt,
  Stethoscope,
  Activity,
  ShieldAlert
} from 'lucide-react'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'appointments' | 'consultations' | 'prescriptions' | 'pharmacy' | 'bills' | 'receipts' | 'timeline'
  >('overview')

  // Related data
  const [appointments, setAppointments] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [timelineItems, setTimelineItems] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      fetchPatientAllData(id)
    }
  }, [id])

  const fetchPatientAllData = async (patientId: string) => {
    try {
      setLoading(true)

      // 1. Fetch Patient
      const { data: pat, error: patErr } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()

      if (patErr) throw patErr
      setPatient(pat)

      // 2. Fetch Appointments
      const { data: apts } = await supabase
        .from('appointments')
        .select(`
          id, appointment_number, appointment_date, appointment_time, reason, status, notes,
          doctor:doctors(id, full_name, specialization)
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })

      setAppointments(apts || [])

      // 3. Fetch Consultations
      const { data: cons } = await supabase
        .from('consultations')
        .select(`
          id, diagnosis, notes, vitals, created_at,
          doctor:doctors(full_name, specialization)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      setConsultations(cons || [])

      // 4. Fetch Prescriptions
      const { data: prescs } = await supabase
        .from('prescriptions')
        .select(`
          id, prescription_number, diagnosis, notes, status, created_at,
          doctor:doctors(full_name),
          items:prescription_items(medicine_name, dosage, frequency, duration, quantity, instructions, dispensed_quantity)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      setPrescriptions(prescs || [])

      // 5. Fetch Pharmacy Sales
      const { data: sls } = await supabase
        .from('sales')
        .select(`
          id, sale_number, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, created_at,
          items:sale_items(medicine_name, batch_number, quantity, unit_price, total_amount)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      setSales(sls || [])

      // 6. Fetch Invoices
      const { data: invs } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, invoice_type, subtotal, discount_amount, tax_amount, total_amount, created_at,
          items:invoice_items(description, quantity, unit_price, total_amount)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      setInvoices(invs || [])

      // 7. Fetch Receipts
      const { data: rcts } = await supabase
        .from('receipts')
        .select(`
          id, receipt_number, receipt_type, total_amount, payment_method, amount_paid, print_count, last_printed_at, created_at
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      setReceipts(rcts || [])

      // Build unified timeline
      const events: any[] = []

      events.push({
        id: `reg-${pat.created_at}`,
        time: pat.created_at,
        title: 'Patient Registered in Mithra Hospital',
        description: `Generated Patient ID ${pat.patient_number}`,
        type: 'info'
      })

      ;(apts || []).forEach((a: any) => {
        events.push({
          id: `apt-${a.id}`,
          time: `${a.appointment_date}T${a.appointment_time}`,
          title: `Appointment Booked (${a.status.toUpperCase()})`,
          description: `With ${a.doctor?.full_name || 'Doctor'} for ${a.reason || 'Checkup'}`,
          type: a.status === 'confirmed' ? 'success' : 'default'
        })
      })

      ;(cons || []).forEach((c: any) => {
        events.push({
          id: `cons-${c.id}`,
          time: c.created_at,
          title: 'Consultation Completed',
          description: `Diagnosis: ${c.diagnosis || 'General Assessment'} by ${c.doctor?.full_name}`,
          type: 'success'
        })
      })

      ;(prescs || []).forEach((pr: any) => {
        events.push({
          id: `pr-${pr.id}`,
          time: pr.created_at,
          title: `Prescription Generated (${pr.prescription_number})`,
          description: `${pr.items?.length || 0} medications prescribed`,
          type: 'info'
        })
      })

      ;(sls || []).forEach((s: any) => {
        events.push({
          id: `sale-${s.id}`,
          time: s.created_at,
          title: `Pharmacy Sale (${s.sale_number})`,
          description: `Total: ${formatCurrency(s.total_amount)} via ${s.payment_method.toUpperCase()}`,
          type: 'success'
        })
      })

      ;(rcts || []).forEach((r: any) => {
        events.push({
          id: `rct-${r.id}`,
          time: r.created_at,
          title: `Receipt Generated (${r.receipt_number})`,
          description: `Total Amount: ${formatCurrency(r.total_amount)} (Printed: ${r.print_count || 1} time${(r.print_count || 1) > 1 ? 's' : ''})`,
          type: 'success'
        })
      })

      events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setTimelineItems(events)

    } catch (err) {
      console.error('Error fetching patient full data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState message="Loading patient clinical history..." />
  }

  if (!patient) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Patient not found.</p>
        <button
          onClick={() => navigate('/patients')}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs"
        >
          Back to Patients List
        </button>
      </div>
    )
  }

  return (
    <div className="pb-12">
      <PageHeader
        title={`${patient.full_name} (${patient.patient_number})`}
        subtitle="Comprehensive electronic patient record, history timeline and financial tracking"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/patients')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              onClick={() => navigate(`/billing/new?patient_id=${patient.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              New Hospital Bill
            </button>
          </div>
        }
      />

      <div className="px-6 py-4 space-y-4">
        {/* Patient Profile Header Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-teal-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-sm">
                {patient.full_name?.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-gray-900">{patient.full_name}</h2>
                  <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                    {patient.patient_number}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                    {patient.blood_group || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  {patient.age ? `${patient.age} years old` : 'Age N/A'} • {patient.gender} • DOB: {patient.date_of_birth ? formatDate(patient.date_of_birth) : 'Not recorded'}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-600">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-teal-600" /> {patient.mobile}
                  </span>
                  {patient.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-teal-600" /> {patient.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" /> {patient.address ? `${patient.address}, ${patient.city}` : patient.city || 'Hyderabad'}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Contact Pill */}
            {patient.emergency_contact_name && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs min-w-[220px]">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-600" /> Emergency Contact
                </p>
                <p className="font-semibold text-gray-900 mt-0.5">{patient.emergency_contact_name}</p>
                <p className="text-gray-600 font-mono text-[11px]">{patient.emergency_contact_phone || 'No phone'}</p>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-gray-100 mt-5 pt-3">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'appointments', label: `Appointments (${appointments.length})` },
              { id: 'consultations', label: `Consultations (${consultations.length})` },
              { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})` },
              { id: 'pharmacy', label: `Pharmacy (${sales.length})` },
              { id: 'bills', label: `Bills & Invoices (${invoices.length})` },
              { id: 'receipts', label: `Receipts (${receipts.length})` },
              { id: 'timeline', label: 'Activity Timeline' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          {/* 1. Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                {/* Clinical Summary */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                    Latest Consultation Assessment
                  </h3>
                  {consultations.length > 0 ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                        <div className="flex justify-between font-semibold text-gray-900 mb-1">
                          <span>{consultations[0].diagnosis || 'Clinical Diagnosis'}</span>
                          <span className="text-gray-400">{formatDate(consultations[0].created_at)}</span>
                        </div>
                        <p className="text-gray-600">{consultations[0].notes || 'No notes recorded.'}</p>
                        {consultations[0].vitals && (
                          <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-4 gap-2 text-[11px]">
                            {Object.entries(consultations[0].vitals).map(([k, v]) => (
                              <div key={k}>
                                <span className="text-gray-400 uppercase">{k}: </span>
                                <span className="font-semibold text-gray-800">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-3">No consultations recorded for this patient.</p>
                  )}
                </div>

                {/* Recent Prescriptions */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                    Active Medications / Prescriptions
                  </h3>
                  {prescriptions.length > 0 ? (
                    <div className="space-y-2">
                      {prescriptions[0].items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-teal-50/40 rounded-lg border border-teal-100 text-xs">
                          <div>
                            <p className="font-bold text-teal-900">{item.medicine_name}</p>
                            <p className="text-[11px] text-gray-500">{item.dosage} • {item.frequency} • {item.duration}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-semibold text-teal-800">Qty: {item.quantity}</span>
                            <p className="text-[10px] text-gray-400">{item.instructions}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-3">No active prescriptions.</p>
                  )}
                </div>
              </div>

              {/* Sidebar Quick Timeline */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
                  Patient Journey Timeline
                </h3>
                <Timeline items={timelineItems.slice(0, 5)} />
              </div>
            </div>
          )}

          {/* 2. Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 pb-2">
                    <th className="py-2">Date & Time</th>
                    <th className="py-2">Doctor</th>
                    <th className="py-2">Reason</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-medium text-gray-900">
                        {formatDate(a.appointment_date)} at {formatTime(`1970-01-01T${a.appointment_time}`)}
                      </td>
                      <td className="py-2.5 text-gray-700">{a.doctor?.full_name} ({a.doctor?.specialization})</td>
                      <td className="py-2.5 text-gray-600">{a.reason || 'General'}</td>
                      <td className="py-2.5"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Consultations Tab */}
          {activeTab === 'consultations' && (
            <div className="space-y-3">
              {consultations.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-xs">
                  <div className="flex justify-between font-bold text-gray-900 mb-1">
                    <span>{c.diagnosis}</span>
                    <span className="text-gray-400 font-normal">{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="text-gray-600 mt-1">{c.notes}</p>
                  <p className="text-[11px] text-teal-700 font-medium mt-2">Consultant: {c.doctor?.full_name}</p>
                </div>
              ))}
            </div>
          )}

          {/* 4. Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              {prescriptions.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-teal-700">{p.prescription_number}</span>
                      <span className="text-gray-400 ml-2">by {p.doctor?.full_name}</span>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {p.items?.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-gray-50 rounded-lg">
                        <p className="font-bold text-gray-900">{item.medicine_name}</p>
                        <p className="text-gray-600 text-[11px]">{item.dosage} • {item.frequency} for {item.duration}</p>
                        <p className="text-gray-400 text-[10px] mt-1">{item.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. Pharmacy Sales Tab */}
          {activeTab === 'pharmacy' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 pb-2">
                    <th className="py-2">Sale Number</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Items</th>
                    <th className="py-2">Total Amount</th>
                    <th className="py-2">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map(s => (
                    <tr key={s.id}>
                      <td className="py-2.5 font-mono text-teal-700 font-medium">{s.sale_number}</td>
                      <td className="py-2.5 text-gray-600">{formatDate(s.created_at)}</td>
                      <td className="py-2.5 text-gray-600">{s.items?.length || 0} items</td>
                      <td className="py-2.5 font-bold text-gray-900">{formatCurrency(s.total_amount)}</td>
                      <td className="py-2.5 uppercase text-gray-500 font-semibold">{s.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Bills & Invoices */}
          {activeTab === 'bills' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 pb-2">
                    <th className="py-2">Invoice #</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="py-2.5 font-mono text-teal-700 font-medium">{inv.invoice_number}</td>
                      <td className="py-2.5 uppercase font-semibold text-gray-600">{inv.invoice_type}</td>
                      <td className="py-2.5 text-gray-600">{formatDate(inv.created_at)}</td>
                      <td className="py-2.5 font-bold text-gray-900">{formatCurrency(inv.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. Receipts Tab */}
          {activeTab === 'receipts' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 pb-2">
                    <th className="py-2">Receipt #</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Print Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {receipts.map(r => (
                    <tr key={r.id}>
                      <td className="py-2.5 font-mono text-teal-700 font-semibold">{r.receipt_number}</td>
                      <td className="py-2.5 text-gray-600">{formatDateTime(r.created_at)}</td>
                      <td className="py-2.5 font-bold text-gray-900">{formatCurrency(r.total_amount)}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (r.print_count || 1) > 1 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(r.print_count || 1) > 1 ? `Reprint (${r.print_count})` : 'Original (1)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 8. Activity Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-2xl">
              <Timeline items={timelineItems} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
