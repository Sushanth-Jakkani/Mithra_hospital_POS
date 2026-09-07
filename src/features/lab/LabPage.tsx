import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import StatusBadge from '@/components/shared/StatusBadge'
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
  TestTube
} from 'lucide-react'

// Mock Seed Lab Tests if database is empty
const INITIAL_LAB_TESTS = [
  { id: 'lt-1', test_code: 'LAB-CBC', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 350, tax_rate: 0, turnaround_hours: 4, description: 'Measures RBC, WBC, Platelets, and Hemoglobin' },
  { id: 'lt-2', test_code: 'LAB-LIP', name: 'Lipid Profile', category: 'Biochemistry', price: 650, tax_rate: 0, turnaround_hours: 12, description: 'Total Cholesterol, HDL, LDL, Triglycerides' },
  { id: 'lt-3', test_code: 'LAB-HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', price: 500, tax_rate: 0, turnaround_hours: 6, description: 'Average blood sugar level over the past 3 months' },
  { id: 'lt-4', test_code: 'LAB-LFT', name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 750, tax_rate: 0, turnaround_hours: 8, description: 'Bilirubin, SGOT, SGPT, Alkaline Phosphatase' },
  { id: 'lt-5', test_code: 'LAB-RFT', name: 'Renal Function Test (RFT)', category: 'Biochemistry', price: 700, tax_rate: 0, turnaround_hours: 8, description: 'Urea, Creatinine, Uric Acid' },
  { id: 'lt-6', test_code: 'LAB-THY', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 850, tax_rate: 0, turnaround_hours: 24, description: 'Evaluates thyroid gland activity' },
  { id: 'lt-7', test_code: 'LAB-CXR', name: 'Chest X-Ray (PA View)', category: 'Radiology', price: 450, tax_rate: 0, turnaround_hours: 2, description: 'Digital Chest X-Ray' },
  { id: 'lt-8', test_code: 'LAB-ECG', name: 'ECG (12 Lead)', category: 'Cardiology', price: 300, tax_rate: 0, turnaround_hours: 1, description: 'Standard 12-lead Electrocardiogram' },
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
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'orders' | 'tests'>('orders')
  const [loading, setLoading] = useState(false)

  // Data state
  const [orders, setOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem('mithra_lab_orders')
    return saved ? JSON.parse(saved) : INITIAL_LAB_ORDERS
  })
  const [tests, setTests] = useState<any[]>(() => {
    const saved = localStorage.getItem('mithra_lab_tests')
    return saved ? JSON.parse(saved) : INITIAL_LAB_TESTS
  })
  const [patients, setPatients] = useState<any[]>([])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState<any>(null)

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedTestId, setSelectedTestId] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  // New Test Form
  const [testForm, setTestForm] = useState({
    name: '',
    category: 'Biochemistry',
    price: 500,
    turnaround_hours: 6,
    description: ''
  })

  // Save to LocalStorage helper
  useEffect(() => {
    localStorage.setItem('mithra_lab_orders', JSON.stringify(orders))
  }, [orders])

  useEffect(() => {
    localStorage.setItem('mithra_lab_tests', JSON.stringify(tests))
  }, [tests])

  // Fetch real patients from Supabase
  useEffect(() => {
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
    fetchPatients()
  }, [])

  // Add New Lab Order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    const pat = patients.find(p => p.id === selectedPatientId)
    const test = tests.find(t => t.id === selectedTestId)

    if (!pat || !test) {
      alert('Please select both a patient and a lab test.')
      return
    }

    const newOrder = {
      id: `lo-${Date.now()}`,
      order_number: `LAB-2026-${String(orders.length + 1).padStart(3, '0')}`,
      patient_id: pat.id,
      patient_name: pat.full_name,
      patient_number: pat.patient_number,
      lab_test_name: test.name,
      category: test.category,
      price: Number(test.price),
      status: 'pending',
      technician_name: profile?.full_name || 'Lab Technician',
      results_notes: orderNotes || 'Order created. Pending sample collection.',
      billed: false,
      created_at: new Date().toISOString()
    }

    setOrders([newOrder, ...orders])
    setShowOrderModal(false)
    setSelectedPatientId('')
    setSelectedTestId('')
    setOrderNotes('')
  }

  // Update Order Status
  const handleUpdateStatus = (orderId: string, newStatus: string, notesUpdate?: string) => {
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus,
          results_notes: notesUpdate !== undefined ? notesUpdate : o.results_notes,
          technician_name: profile?.full_name || o.technician_name
        }
      }
      return o
    }))
    setShowResultModal(null)
  }

  // Add New Test Catalog item
  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!testForm.name) return

    const newTest = {
      id: `lt-${Date.now()}`,
      test_code: `LAB-${testForm.name.slice(0, 3).toUpperCase()}`,
      name: testForm.name,
      category: testForm.category,
      price: Number(testForm.price),
      tax_rate: 0,
      turnaround_hours: Number(testForm.turnaround_hours),
      description: testForm.description,
      is_active: true,
      created_at: new Date().toISOString()
    }

    setTests([...tests, newTest])
    setShowTestModal(false)
    setTestForm({ name: '', category: 'Biochemistry', price: 500, turnaround_hours: 6, description: '' })
  }

  // Delete test
  const handleDeleteTest = (id: string) => {
    if (confirm('Are you sure you want to delete this lab test from catalog?')) {
      setTests(tests.filter(t => t.id !== id))
    }
  }

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.patient_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.lab_test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="pb-16 space-y-6">
      <PageHeader
        title="Laboratory Management"
        subtitle="Manage patient diagnostic tests, laboratory orders, and clinical test catalog"
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
                onClick={() => setShowTestModal(true)}
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

                        {order.results_notes && (
                          <div className="mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs text-gray-700">
                            <span className="font-semibold text-gray-900">Lab Notes / Results: </span>
                            {order.results_notes}
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
                            onClick={() => setShowResultModal(order)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Enter Results & Complete
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
                    onClick={() => handleDeleteTest(test.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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

      {/* MODAL 2: ADD TEST TO CATALOG */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TestTube className="w-5 h-5 text-purple-600" />
                Add New Lab Test to Catalog
              </h2>
              <button onClick={() => setShowTestModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4">
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
                  Save Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ENTER TEST RESULTS */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Complete Lab Test & Enter Results
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
                onClick={() => {
                  const el = document.getElementById('resultNotesInput') as HTMLTextAreaElement
                  handleUpdateStatus(showResultModal.id, 'completed', el ? el.value : 'Test completed.')
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
