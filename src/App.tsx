import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthProvider'
import ProtectedRoute from '@/features/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import PatientsPage from '@/features/patients/PatientsPage'
import PatientDetailPage from '@/features/patients/PatientDetailPage'
import AppointmentsPage from '@/features/appointments/AppointmentsPage'
import DoctorsPage from '@/features/doctors/DoctorsPage'
import BillingPage from '@/features/billing/BillingPage'
import NewBillingPage from '@/features/billing/NewBillingPage'
import PharmacyPOSPage from '@/features/pharmacy/PharmacyPOSPage'
import PharmacySalesPage from '@/features/pharmacy/PharmacySalesPage'
import PrescriptionsPage from '@/features/prescriptions/PrescriptionsPage'
import MedicinesPage from '@/features/inventory/MedicinesPage'
import BatchesPage from '@/features/inventory/BatchesPage'
import StockPage from '@/features/inventory/StockPage'
import AlertsPage from '@/features/inventory/AlertsPage'
import SuppliersPage from '@/features/inventory/SuppliersPage'
import PurchaseOrdersPage from '@/features/inventory/PurchaseOrdersPage'
import ReceiptsPage from '@/features/receipts/ReceiptsPage'
import ReportsPage from '@/features/reports/ReportsPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import SettingsPage from '@/features/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              
              <Route path="/appointments" element={<AppointmentsPage />} />
              
              <Route path="/doctors" element={<DoctorsPage />} />
              
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/billing/new" element={<NewBillingPage />} />
              
              <Route path="/pharmacy/pos" element={<PharmacyPOSPage />} />
              <Route path="/pharmacy/sales" element={<PharmacySalesPage />} />
              
              <Route path="/prescriptions" element={<PrescriptionsPage />} />
              
              <Route path="/inventory/medicines" element={<MedicinesPage />} />
              <Route path="/inventory/batches" element={<BatchesPage />} />
              <Route path="/inventory/stock" element={<StockPage />} />
              <Route path="/inventory/alerts" element={<AlertsPage />} />
              <Route path="/inventory/suppliers" element={<SuppliersPage />} />
              <Route path="/inventory/purchases" element={<PurchaseOrdersPage />} />
              
              <Route path="/receipts" element={<ReceiptsPage />} />
              
              <Route path="/reports" element={<ReportsPage />} />
              
              <Route path="/notifications" element={<NotificationsPage />} />
              
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/*" element={<SettingsPage />} />
            </Route>
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
