// ==========================================
// Core Types for Mithra Hospital POS
// ==========================================

// Roles
export type UserRole = 
  | 'ADMIN' 
  | 'RECEPTIONIST' 
  | 'DOCTOR' 
  | 'PHARMACIST' 
  | 'CASHIER' 
  | 'INVENTORY_MANAGER' 
  | 'MANAGER'
  | 'LAB_TECH'

// Gender
export type Gender = 'male' | 'female' | 'other'

// Blood Groups
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown'

// Appointment Status
export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'checked_in' 
  | 'in_consultation' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'

// Prescription Status
export type PrescriptionStatus = 
  | 'draft' 
  | 'issued' 
  | 'partially_dispensed' 
  | 'dispensed' 
  | 'cancelled'

// Payment Method
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'other'

// Payment Status
export type PaymentStatus = 'paid' | 'partially_paid' | 'pending' | 'refunded'

// Invoice Type
export type InvoiceType = 'hospital' | 'pharmacy'

// Transaction Type
export type InventoryTransactionType = 
  | 'purchase' 
  | 'sale' 
  | 'return' 
  | 'adjustment' 
  | 'damage' 
  | 'expired' 
  | 'transfer' 
  | 'opening_stock'

// Purchase Order Status
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

// Print Type
export type PrintType = 'original' | 'reprint' | 'pdf_export'

// Alert Severity
export type AlertSeverity = 'info' | 'warning' | 'critical'

// Alert Type
export type AlertType = 
  | 'low_stock' 
  | 'out_of_stock' 
  | 'expiring_soon' 
  | 'expired' 
  | 'large_stock_change' 
  | 'negative_stock_attempt'

// Dosage Form
export type DosageForm = 
  | 'tablet' 
  | 'capsule' 
  | 'syrup' 
  | 'injection' 
  | 'cream' 
  | 'ointment' 
  | 'drops' 
  | 'other'

// ==========================================
// Database Models
// ==========================================

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
  organization_id?: string
  branch_id?: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  gstin?: string
  registration_number?: string
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  organization_id: string
  name: string
  address?: string
  phone?: string
  email?: string
  is_main: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  description?: string
  organization_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  patient_number: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth?: string
  age?: number
  gender: Gender
  mobile: string
  email?: string
  blood_group?: BloodGroup
  address?: string
  city?: string
  state?: string
  postal_code?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
  organization_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Doctor {
  id: string
  profile_id?: string
  doctor_code: string
  first_name: string
  last_name: string
  full_name: string
  specialization: string
  qualification?: string
  registration_number?: string
  phone: string
  email?: string
  department_id?: string
  department?: Department
  consultation_fee: number
  organization_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  appointment_number: string
  patient_id: string
  patient?: Patient
  doctor_id: string
  doctor?: Doctor
  department_id?: string
  department?: Department
  appointment_date: string
  appointment_time: string
  reason?: string
  status: AppointmentStatus
  notes?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface Consultation {
  id: string
  appointment_id: string
  appointment?: Appointment
  patient_id: string
  patient?: Patient
  doctor_id: string
  doctor?: Doctor
  diagnosis?: string
  notes?: string
  vitals?: Record<string, unknown>
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface Prescription {
  id: string
  prescription_number: string
  patient_id: string
  patient?: Patient
  doctor_id: string
  doctor?: Doctor
  consultation_id?: string
  appointment_id?: string
  diagnosis?: string
  notes?: string
  status: PrescriptionStatus
  items?: PrescriptionItem[]
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface PrescriptionItem {
  id: string
  prescription_id: string
  medicine_id: string
  medicine?: Medicine
  medicine_name: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions?: string
  dispensed_quantity?: number
  created_at: string
}

export interface MedicineCategory {
  id: string
  name: string
  description?: string
  organization_id?: string
  created_at: string
}

export interface Medicine {
  id: string
  medicine_code: string
  barcode?: string
  name: string
  generic_name?: string
  brand_name?: string
  category_id?: string
  category?: MedicineCategory
  dosage_form: DosageForm
  strength?: string
  unit?: string
  manufacturer?: string
  reorder_level: number
  minimum_stock: number
  maximum_stock: number
  tax_rate: number
  selling_price: number
  purchase_price: number
  prescription_required: boolean
  organization_id?: string
  is_active: boolean
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface MedicineBatch {
  id: string
  medicine_id: string
  medicine?: Medicine
  batch_number: string
  expiry_date: string
  quantity: number
  purchase_price: number
  selling_price: number
  supplier_id?: string
  purchase_order_id?: string
  organization_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  company?: string
  phone?: string
  email?: string
  address?: string
  gstin?: string
  contact_person?: string
  organization_id?: string
  is_active: boolean
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  supplier?: Supplier
  order_date: string
  expected_date?: string
  status: PurchaseOrderStatus
  total_amount: number
  notes?: string
  items?: PurchaseOrderItem[]
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  medicine_id: string
  medicine?: Medicine
  batch_number?: string
  expiry_date?: string
  quantity: number
  received_quantity?: number
  purchase_price: number
  tax_amount: number
  total_amount: number
  created_at: string
}

export interface HospitalService {
  id: string
  name: string
  description?: string
  category?: string
  price: number
  tax_rate: number
  organization_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LabTest {
  id: string
  test_code: string
  name: string
  category: string
  price: number
  tax_rate: number
  description?: string
  turnaround_hours?: number
  is_active: boolean
  created_at: string
}

export interface LabOrder {
  id: string
  order_number: string
  patient_id: string
  patient?: Patient
  lab_test_id?: string
  lab_test_name: string
  category?: string
  price: number
  status: 'pending' | 'sample_collected' | 'completed' | 'cancelled'
  technician_name?: string
  results_notes?: string
  billed: boolean
  created_at: string
  updated_at?: string
}

export interface Sale {
  id: string
  sale_number: string
  patient_id?: string
  patient?: Patient
  prescription_id?: string
  prescription?: Prescription
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  amount_paid: number
  change_amount: number
  notes?: string
  items?: SaleItem[]
  performed_by?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  medicine_id: string
  medicine?: Medicine
  batch_id: string
  batch?: MedicineBatch
  medicine_name: string
  batch_number: string
  expiry_date: string
  quantity: number
  unit_price: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  invoice_type: InvoiceType
  patient_id: string
  patient?: Patient
  sale_id?: string
  appointment_id?: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  notes?: string
  items?: InvoiceItem[]
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  reference_type?: string
  reference_id?: string
  created_at: string
}

export interface Payment {
  id: string
  payment_number: string
  invoice_id: string
  invoice?: Invoice
  patient_id: string
  patient?: Patient
  amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  transaction_reference?: string
  received_by?: string
  notes?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface Receipt {
  id: string
  receipt_number: string
  invoice_id: string
  invoice?: Invoice
  payment_id: string
  payment?: Payment
  patient_id: string
  patient?: Patient
  receipt_type: InvoiceType
  total_amount: number
  payment_method: PaymentMethod
  amount_paid: number
  change_amount: number
  print_count: number
  last_printed_at?: string
  last_printed_by?: string
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface ReceiptPrintLog {
  id: string
  receipt_id: string
  receipt?: Receipt
  printed_by: string
  printed_by_name?: string
  printed_at: string
  print_type: PrintType
  print_number: number
  device_info?: string
  notes?: string
}

export interface InventoryTransaction {
  id: string
  medicine_id: string
  medicine?: Medicine
  batch_id?: string
  batch?: MedicineBatch
  transaction_type: InventoryTransactionType
  quantity: number
  previous_quantity: number
  new_quantity: number
  reference_type?: string
  reference_id?: string
  performed_by?: string
  notes?: string
  organization_id?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id?: string
  type: AlertType | string
  title: string
  message: string
  severity: AlertSeverity
  is_read: boolean
  metadata?: Record<string, unknown>
  organization_id?: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  user_name?: string
  action: string
  entity_type: string
  entity_id?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  device_info?: string
  organization_id?: string
  created_at: string
}

export interface Settings {
  id: string
  key: string
  value: unknown
  category: string
  organization_id?: string
  updated_at: string
}

// ==========================================
// UI Helper Types
// ==========================================

export interface StatCardData {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ComponentType<{ className?: string }>
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface FilterOption {
  label: string
  value: string
}

export interface SearchResult {
  type: 'patient' | 'appointment' | 'medicine' | 'prescription' | 'invoice' | 'receipt'
  id: string
  title: string
  subtitle: string
  url: string
}

// Pharmacy POS
export interface CartItem {
  medicine_id: string
  medicine_name: string
  batch_id: string
  batch_number: string
  expiry_date: string
  quantity: number
  available_quantity: number
  unit_price: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
}

// Dashboard
export interface DashboardStats {
  todayAppointments: number
  todayPatients: number
  todayRevenue: number
  todayPharmacySales: number
  lowStock: number
  expiringSoon: number
  pendingPayments: number
  todayPrescriptions: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}
