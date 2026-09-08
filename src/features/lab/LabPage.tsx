import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  FlaskConical,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Filter,
  Trash2,
  Edit2,
  X,
  CreditCard,
  TestTube,
  Upload,
  Paperclip,
  ExternalLink,
  Download,
  Printer,
} from 'lucide-react'
import { useHospitalLogo } from '@/lib/useHospitalLogo'

// Mock Seed Lab Tests if database is empty
const INITIAL_LAB_TESTS = [
  { id: 'lt-1', test_code: 'LAB-CBC', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 350, tax_rate: 0, turnaround_hours: 4, description: 'Measures RBC, WBC, Platelets, and Hemoglobin', is_active: true },
  { id: 'lt-2', test_code: 'LAB-LIP', name: 'Lipid Profile', category: 'Biochemistry', price: 650, tax_rate: 0, turnaround_hours: 12, description: 'Total Cholesterol, HDL, LDL, Triglycerides', is_active: true },
  { id: 'lt-3', test_code: 'LAB-HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', price: 500, tax_rate: 0, turnaround_hours: 6, description: 'Average blood sugar level over the past 3 months', is_active: true },
  { id: 'lt-4', test_code: 'LAB-LFT', name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 750, tax_rate: 0, turnaround_hours: 8, description: 'Bilirubin, SGOT, SGPT, Alkaline Phosphatase', is_active: true },
  { id: 'lt-5', test_code: 'LAB-RFT', name: 'Renal Function Test (RFT)', category: 'Biochemistry', price: 700, tax_rate: 0, turnaround_hours: 8, description: 'Urea, Creatinine, Uric Acid', is_active: true },
  { id: 'lt-6', test_code: 'LAB-THY', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 850, tax_rate: 0, turnaround_hours: 24, description: 'Evaluates thyroid gland activity', is_active: true },
  { id: 'lt-7', test_code: 'LAB-CXR', name: 'Chest X-Ray (PA View)', category: 'Radiology', price: 450, tax_rate: 0, turnaround_hours: 2, description: 'Digital Chest X-Ray', is_active: true },
  { id: 'lt-8', test_code: 'LAB-ECG', name: 'ECG (12 Lead)', category: 'Cardiology', price: 300, tax_rate: 0, turnaround_hours: 1, description: 'Standard 12-lead Electrocardiogram', is_active: true },
]

// Mock Initial Lab Orders
const INITIAL_LAB_ORDERS = [
  {
    id: 'lo-101',
    order_number: 'LAB-2026-001',
    patient_id: 'pat-1',
    patient_name: 'Rajesh Kumar',
    patient_number: 'PAT-2026-001',
    lab_test_name: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    price: 350,
    status: 'completed',
    technician_name: 'Lab Tech Alex',
    results_notes: 'Hemoglobin: 14.2 g/dL (Normal), WBC: 7,500 /uL, Platelets: 250,000 /uL',
    billed: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'lo-102',
    order_number: 'LAB-2026-002',
    patient_id: 'pat-2',
    patient_name: 'Priya Sharma',
    patient_number: 'PAT-2026-002',
    lab_test_name: 'Lipid Profile',
    category: 'Biochemistry',
    price: 650,
    status: 'sample_collected',
    technician_name: 'Lab Tech Alex',
    results_notes: 'Fasting blood sample collected at 08:30 AM. Processing in centrifuge.',
    billed: false,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'lo-103',
    order_number: 'LAB-2026-003',
    patient_id: 'pat-1',
    patient_name: 'Rajesh Kumar',
    patient_number: 'PAT-2026-001',
    lab_test_name: 'Thyroid Profile (T3, T4, TSH)',
    category: 'Endocrinology',
    price: 850,
    status: 'pending',
    technician_name: 'Lab Tech Alex',
    results_notes: 'Patient requested test before evening doctor consultation.',
    billed: false,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString()
  }
]

export default function LabPage() {
  const navigate = useNavigate()
  const logoUrl = useHospitalLogo()
  const [searchParams] = useSearchParams()
  const urlPatientId = searchParams.get('patient_id')

  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'orders' | 'tests'>('orders')
  const [loading, setLoading] = useState(true)

  // Data state
  const [orders, setOrders] = useState<any[]>([])
  const [tests, setTests] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState<any>(null)
  const [showPrintModal, setShowPrintModal] = useState<any>(null)
  const [editingTest, setEditingTest] = useState<any>(null)

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedTestId, setSelectedTestId] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  // Report File Upload state in Result Modal
  const [resultFile, setResultFile] = useState<File | null>(null)
  const [uploadingReport, setUploadingReport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New Test Form
  const [testForm, setTestForm] = useState({
    name: '',
    category: 'Biochemistry',
    price: 500,
    turnaround_hours: 6,
    description: ''
  })

  // Synchronize with Supabase Database
  useEffect(() => {
    fetchLabData()
    fetchPatients()
  }, [])

  useEffect(() => {
    if (urlPatientId && patients.length > 0) {
      const match = patients.find(p => p.id === urlPatientId)
      if (match) {
        setSelectedPatientId(match.id)
        setShowOrderModal(true)
      }
    }
  }, [urlPatientId, patients])

  const fetchLabData = async () => {
    try {
      setLoading(true)

      // Fetch lab_tests
      const { data: dbTests, error: testErr } = await supabase
        .from('lab_tests')
        .select('*')
        .order('name')

      if (!testErr && dbTests && dbTests.length > 0) {
        setTests(dbTests)
      } else {
        const savedTests = localStorage.getItem('mithra_lab_tests')
        setTests(savedTests ? JSON.parse(savedTests) : INITIAL_LAB_TESTS)
      }

      // Fetch lab_orders
      const { data: dbOrders, error: orderErr } = await supabase
        .from('lab_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!orderErr && dbOrders && dbOrders.length > 0) {
        setOrders(dbOrders)
      } else {
        const savedOrders = localStorage.getItem('mithra_lab_orders')
        setOrders(savedOrders ? JSON.parse(savedOrders) : INITIAL_LAB_ORDERS)
      }

    } catch (err) {
      console.warn('Error fetching lab data from Supabase DB:', err)
      const savedTests = localStorage.getItem('mithra_lab_tests')
      const savedOrders = localStorage.getItem('mithra_lab_orders')
      setTests(savedTests ? JSON.parse(savedTests) : INITIAL_LAB_TESTS)
      setOrders(savedOrders ? JSON.parse(savedOrders) : INITIAL_LAB_ORDERS)
    } finally {
      setLoading(false)
    }
  }

  // Fetch real patients from Supabase
  const fetchPatients = async () => {
    try {
      const { data } = await supabase.from('patients').select('id, full_name, patient_number, mobile')
      if (data && data.length > 0) {
        setPatients(data)
      } else {
        setPatients([
          { id: 'pat-1', full_name: 'Rajesh Kumar', patient_number: 'PAT-2026-001', mobile: '9876543210' },
          { id: 'pat-2', full_name: 'Priya Sharma', patient_number: 'PAT-2026-002', mobile: '9876543211' },
          { id: 'pat-3', full_name: 'Anil Verma', patient_number: 'PAT-2026-003', mobile: '9876543212' },
        ])
      }
    } catch (err) {
      console.error('Error fetching patients:', err)
    }
  }

  const persistOrdersLocal = (newOrders: any[]) => {
    setOrders(newOrders)
    localStorage.setItem('mithra_lab_orders', JSON.stringify(newOrders))
  }

  const persistTestsLocal = (newTests: any[]) => {
    setTests(newTests)
    localStorage.setItem('mithra_lab_tests', JSON.stringify(newTests))
  }

  // --- Add New Lab Order (DB + Local) ---
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    const pat = patients.find(p => p.id === selectedPatientId)
    const test = tests.find(t => t.id === selectedTestId)

    if (!pat || !test) {
      alert('Please select both a patient and a lab test.')
      return
    }

    const orderNumber = `LAB-2026-${String(orders.length + 1).padStart(3, '0')}`

    const newOrderPayload = {
      order_number: orderNumber,
      patient_id: pat.id,
      patient_name: pat.full_name,
      patient_number: pat.patient_number,
      lab_test_id: test.id,
      lab_test_name: test.name,
      category: test.category,
      price: Number(test.price),
      status: 'pending',
      technician_name: profile?.full_name || 'Lab Technician',
      results_notes: orderNotes || 'Order created. Pending sample collection.',
      billed: false,
    }

    try {
      const { data: dbOrder, error: dbErr } = await supabase
        .from('lab_orders')
        .insert(newOrderPayload)
        .select()
        .single()

      if (dbErr) {
        console.warn('DB insert error for lab_order:', dbErr.message)
        const fallbackOrder = {
          id: `lo-${Date.now()}`,
          ...newOrderPayload,
          created_at: new Date().toISOString()
        }
        persistOrdersLocal([fallbackOrder, ...orders])
      } else if (dbOrder) {
        persistOrdersLocal([dbOrder, ...orders])
      }
    } catch (err) {
      const fallbackOrder = {
        id: `lo-${Date.now()}`,
        ...newOrderPayload,
        created_at: new Date().toISOString()
      }
      persistOrdersLocal([fallbackOrder, ...orders])
    }

    setShowOrderModal(false)
    setSelectedPatientId('')
    setSelectedTestId('')
    setOrderNotes('')
  }

  // --- Update Order Status & Upload File ---
  const handleUpdateStatus = async (orderId: string, newStatus: string, notesUpdate?: string, fileToUpload?: File | null) => {
    try {
      setUploadingReport(true)

      let fileUrl = ''
      let fileName = ''

      if (fileToUpload) {
        fileName = fileToUpload.name

        // Try storage upload first
        try {
          const fileExt = fileName.split('.').pop()
          const storagePath = `reports/lab-${orderId}-${Date.now()}.${fileExt}`

          const { error: storageErr } = await supabase.storage
            .from('lab_reports')
            .upload(storagePath, fileToUpload, { upsert: true })

          if (!storageErr) {
            const { data } = supabase.storage.from('lab_reports').getPublicUrl(storagePath)
            fileUrl = data.publicUrl
          } else {
            throw storageErr
          }
        } catch (stErr) {
          console.warn('Lab report storage upload failed, using Data URL fallback:', stErr)
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(fileToUpload)
          })
        }
      }

      const existing = orders.find(o => o.id === orderId)
      const finalFileUrl = fileUrl || (existing ? existing.file_url : '')
      const finalFileName = fileName || (existing ? existing.file_name : '')
      const finalNotes = notesUpdate !== undefined ? notesUpdate : (existing ? existing.results_notes : '')

      const updatePayload = {
        status: newStatus,
        results_notes: finalNotes,
        technician_name: profile?.full_name || (existing ? existing.technician_name : 'Lab Technician'),
        file_url: finalFileUrl,
        file_name: finalFileName,
        updated_at: new Date().toISOString(),
      }

      // Update in Supabase DB
      const { error: dbErr } = await supabase
        .from('lab_orders')
        .update(updatePayload)
        .eq('id', orderId)

      if (dbErr) {
        console.warn('DB update order error:', dbErr.message)
      }

      const updatedList = orders.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            ...updatePayload,
          }
        }
        return o
      })

      persistOrdersLocal(updatedList)
      setShowResultModal(null)
      setResultFile(null)
    } catch (err: any) {
      alert('Error saving test results: ' + err.message)
    } finally {
      setUploadingReport(false)
    }
  }

  // --- Add/Update Lab Test Catalog Item (DB + Local) ---
  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testForm.name) return

    const payload = {
      test_code: editingTest ? editingTest.test_code : `LAB-${testForm.name.slice(0, 3).toUpperCase()}`,
      name: testForm.name,
      category: testForm.category,
      price: Number(testForm.price),
      tax_rate: 0,
      turnaround_hours: Number(testForm.turnaround_hours),
      description: testForm.description,
      is_active: true,
    }

    try {
      if (editingTest) {
        const { error: dbErr } = await supabase
          .from('lab_tests')
          .update(payload)
          .eq('id', editingTest.id)

        if (dbErr) console.warn('DB edit lab test error:', dbErr.message)

        const updated = tests.map(t => t.id === editingTest.id ? { ...t, ...payload } : t)
        persistTestsLocal(updated)
      } else {
        const { data: inserted, error: dbErr } = await supabase
          .from('lab_tests')
          .insert(payload)
          .select()
          .single()

        if (dbErr) {
          console.warn('DB insert lab test error:', dbErr.message)
          const fallback = { id: `lt-${Date.now()}`, ...payload, created_at: new Date().toISOString() }
          persistTestsLocal([...tests, fallback])
        } else if (inserted) {
          persistTestsLocal([...tests, inserted])
        }
      }
    } catch (err) {
      const fallback = { id: `lt-${Date.now()}`, ...payload, created_at: new Date().toISOString() }
      persistTestsLocal([...tests, fallback])
    }

    setShowTestModal(false)
    setEditingTest(null)
    setTestForm({ name: '', category: 'Biochemistry', price: 500, turnaround_hours: 6, description: '' })
  }

  const openAddTestModal = () => {
    setEditingTest(null)
    setTestForm({ name: '', category: 'Biochemistry', price: 500, turnaround_hours: 6, description: '' })
    setShowTestModal(true)
  }

  const openEditTestModal = (t: any) => {
    setEditingTest(t)
    setTestForm({
      name: t.name,
      category: t.category,
      price: t.price,
      turnaround_hours: t.turnaround_hours || 6,
      description: t.description || ''
    })
    setShowTestModal(true)
  }

  // Delete test
  const handleDeleteTest = async (id: string) => {
    if (confirm('Are you sure you want to delete this lab test from catalog?')) {
      try {
        await supabase.from('lab_tests').delete().eq('id', id)
      } catch (err) {
        console.warn('DB delete error:', err)
      }
      const updated = tests.filter(t => t.id !== id)
      persistTestsLocal(updated)
    }
  }

  // Delete Order
  const handleDeleteOrder = async (id: string) => {
    if (confirm('Are you sure you want to remove this lab order record?')) {
      try {
        await supabase.from('lab_orders').delete().eq('id', id)
      } catch (err) {
        console.warn('DB delete error:', err)
      }
      const updated = orders.filter(o => o.id !== id)
      persistOrdersLocal(updated)
    }
  }

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      (o.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.patient_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.lab_test_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.order_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        )
      case 'sample_collected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <TestTube className="w-3 h-3" /> Sample Collected
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <X className="w-3 h-3" /> Cancelled
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <LoadingState message="Loading laboratory catalog and patient test orders from database..." />
  }

  return (
    <div className="pb-16 space-y-6">
      <PageHeader
        title="Laboratory Management"
        subtitle="Manage patient diagnostic tests, laboratory orders, report uploads, and clinical test catalog"
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'orders' ? (
              <button
                onClick={() => setShowOrderModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Assign Lab Test
              </button>
            ) : (
              <button
                onClick={openAddTestModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Lab Test
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'orders'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          Patient Lab Orders
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'tests'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TestTube className="w-4 h-4" />
          Test Catalog
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 font-bold">
            {tests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: LAB ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, ID, or lab test..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Sample</option>
                <option value="sample_collected">Sample Collected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders List / Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No lab orders found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting search or status filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 sm:p-5 hover:bg-purple-50/40 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Patient & Test details */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-gray-900">{order.patient_name}</span>
                          <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                            {order.patient_number}
                          </span>
                          {renderStatusBadge(order.status)}
                          {order.billed ? (
                            <span className="text-[11px] font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> Included in Bill
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                              Unbilled
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                          <span>🧪 {order.lab_test_name}</span>
                          <span className="text-xs text-gray-400 font-normal">({order.category})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span>Order: <strong className="text-gray-700">{order.order_number}</strong></span>
                          <span>Fee: <strong className="text-purple-700">{formatCurrency(order.price)}</strong></span>
                          <span>Tech: <strong className="text-gray-700">{order.technician_name || 'Lab User'}</strong></span>
                          <span>Date: {formatDateTime(order.created_at)}</span>
                        </div>

                        {/* Results Notes */}
                        {order.results_notes && (
                          <div className="mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs text-gray-700">
                            <span className="font-semibold text-gray-900">Lab Notes / Results: </span>
                            {order.results_notes}
                          </div>
                        )}

                        {/* File Attachment / Lab Report download */}
                        {order.file_url && (
                          <div className="mt-2 flex items-center gap-2">
                            <a
                              href={order.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>View Attached Lab Report ({order.file_name || 'Report.pdf'})</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'sample_collected', 'Blood/specimen sample collected by lab user.')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                          >
                            Collect Sample
                          </button>
                        )}

                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setShowResultModal(order)
                              setResultFile(null)
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Upload Report & Complete
                          </button>
                        )}

                        <button
                          onClick={() => setShowPrintModal(order)}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                          title="Print Official Diagnostic Report"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Report
                        </button>

                        {!order.billed && order.status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/billing/new?patient_id=${order.patient_id}`)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                            title="Bill this Lab Test"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Bill Now
                          </button>
                        )}

                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'cancelled', 'Order cancelled by lab technician.')}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-medium transition-all"
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Order Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEST CATALOG */}
      {activeTab === 'tests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    {test.test_code}
                  </span>
                  <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded">
                    {test.category}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-1">{test.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{test.description || 'Standard diagnostic lab test procedure.'}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Price</span>
                  <span className="text-lg font-bold text-purple-700">{formatCurrency(test.price)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    ⏱️ {test.turnaround_hours || 4} hrs TAT
                  </span>
                  <button
                    onClick={() => openEditTestModal(test)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                    title="Edit Test Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete Test"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: ASSIGN LAB TEST TO PATIENT */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-600" />
                Assign Lab Test to Patient
              </h2>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_number}) - {p.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Lab Test *</label>
                <select
                  required
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="">-- Choose Diagnostic Test --</option>
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {formatCurrency(t.price)} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Clinical Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Fasting required, urgent result needed for surgery..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
                >
                  Create Lab Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT TEST IN CATALOG */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TestTube className="w-5 h-5 text-purple-600" />
                {editingTest ? 'Edit Lab Test Details' : 'Add New Lab Test to Catalog'}
              </h2>
              <button onClick={() => setShowTestModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Test Name *</label>
                <input
                  type="text"
                  required
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="e.g. Vitamin D3 (25-OH)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={testForm.category}
                    onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="Cardiology">Cardiology</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Turnaround Time (Hours)</label>
                <input
                  type="number"
                  min="1"
                  value={testForm.turnaround_hours}
                  onChange={(e) => setTestForm({ ...testForm, turnaround_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Clinical purpose or instructions for patient..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
                >
                  {editingTest ? 'Update Test' : 'Save Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ENTER TEST RESULTS & UPLOAD REPORT FILE */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Complete Lab Test & Upload Report
              </h2>
              <button onClick={() => setShowResultModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-purple-900">
              <p><strong>Patient:</strong> {showResultModal.patient_name} ({showResultModal.patient_number})</p>
              <p><strong>Test:</strong> {showResultModal.lab_test_name}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Laboratory Findings & Report Notes *</label>
              <textarea
                rows={4}
                defaultValue={showResultModal.results_notes || ''}
                id="resultNotesInput"
                placeholder="Enter quantitative values, findings, or observations..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* File Upload Section for Lab Report Document */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Attach Lab Report / Document (PDF, Image)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-200 bg-purple-50/50 hover:bg-purple-50 p-4 rounded-xl text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                {resultFile ? (
                  <p className="text-xs font-semibold text-purple-900">
                    Selected: {resultFile.name} ({(resultFile.size / 1024).toFixed(0)} KB)
                  </p>
                ) : showResultModal.file_name ? (
                  <p className="text-xs text-purple-800">
                    Current Attachment: <strong className="font-semibold">{showResultModal.file_name}</strong> (Click to change)
                  </p>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-purple-900">Click to upload scanned lab report or PDF</p>
                    <p className="text-[10px] text-gray-400">PDF, PNG, JPG supported</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setResultFile(e.target.files[0])
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowResultModal(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploadingReport}
                onClick={() => {
                  const el = document.getElementById('resultNotesInput') as HTMLTextAreaElement
                  handleUpdateStatus(showResultModal.id, 'completed', el ? el.value : 'Test completed.', resultFile)
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploadingReport ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading & Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save & Complete Test</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: OFFICIAL PRINTABLE DIAGNOSTIC LAB REPORT */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 print:hidden">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-600" />
                Official Laboratory Report Preview
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button onClick={() => setShowPrintModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Layout */}
            <div className="p-6 border border-gray-200 rounded-xl bg-white space-y-6 text-gray-900 print:border-none print:p-0">
              {/* Header */}
              <div className="border-b-2 border-purple-600 pb-4 text-center">
                {logoUrl && (
                  <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-2 bg-gray-50 border border-purple-100 flex items-center justify-center p-0.5 shadow-xs">
                    <img src={logoUrl} alt="Hospital Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <h1 className="text-xl font-extrabold text-purple-900 uppercase tracking-wide">Mithra Hospital & Diagnostic Center</h1>
                <p className="text-xs text-gray-600 mt-1">Multi-Specialty Healthcare • Department of Clinical Pathology & Diagnostics</p>
                <p className="text-[11px] text-gray-400">Phone: +91 98765 43210 • Email: lab@mithrahospital.com</p>
              </div>

              {/* Title Badge */}
              <div className="bg-purple-50 text-purple-900 font-bold text-xs uppercase px-3 py-1.5 rounded-md text-center border border-purple-200">
                Diagnostic Laboratory Report — {showPrintModal.category || 'Clinical Pathology'}
              </div>

              {/* Patient & Report Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-1">
                  <p><span className="text-gray-500">Patient Name:</span> <strong>{showPrintModal.patient_name}</strong></p>
                  <p><span className="text-gray-500">Patient ID:</span> <strong className="font-mono">{showPrintModal.patient_number || 'N/A'}</strong></p>
                  <p><span className="text-gray-500">Referred By:</span> <strong>Staff / Outpatient Dept</strong></p>
                </div>
                <div className="space-y-1">
                  <p><span className="text-gray-500">Order Number:</span> <strong className="font-mono text-purple-700">{showPrintModal.order_number}</strong></p>
                  <p><span className="text-gray-500">Order Date:</span> <strong>{formatDateTime(showPrintModal.created_at)}</strong></p>
                  <p><span className="text-gray-500">Status:</span> <strong className="uppercase text-emerald-700">{showPrintModal.status}</strong></p>
                </div>
              </div>

              {/* Diagnostic Test Details Table */}
              <div>
                <table className="w-full text-left text-xs border border-gray-200">
                  <thead className="bg-purple-100 text-purple-950 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5 border-b border-gray-200">Test Name</th>
                      <th className="p-2.5 border-b border-gray-200">Category</th>
                      <th className="p-2.5 border-b border-gray-200 text-right">Standard Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 font-bold text-gray-900">{showPrintModal.lab_test_name}</td>
                      <td className="p-2.5 text-gray-600">{showPrintModal.category || 'General'}</td>
                      <td className="p-2.5 text-right font-semibold text-purple-800">{formatCurrency(showPrintModal.price)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Findings & Notes */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-900 uppercase">Clinical Observations / Findings Notes:</h4>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 whitespace-pre-wrap">
                  {showPrintModal.results_notes || 'No preliminary notes recorded for this test order.'}
                </div>
              </div>

              {showPrintModal.file_url && (
                <div className="text-xs text-purple-900 bg-purple-50 p-3 rounded-xl border border-purple-200">
                  📎 <strong>Attached Digital Report:</strong> {showPrintModal.file_name || 'Report.pdf'}
                </div>
              )}

              {/* Signatures */}
              <div className="pt-8 flex items-center justify-between text-xs text-gray-600 border-t border-gray-200">
                <div className="text-center">
                  <p className="font-bold text-gray-900">{showPrintModal.technician_name || 'Lab Technician'}</p>
                  <p className="text-[10px] text-gray-400">Medical Technologist / Operator</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900">Dr. S. Ramanathan, MD</p>
                  <p className="text-[10px] text-gray-400">Chief Consultant Pathologist</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 print:hidden">
              <button
                onClick={() => setShowPrintModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
