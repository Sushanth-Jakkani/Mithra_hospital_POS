# Mithra Hospital + Pharmacy POS & Patient Management System

A production-grade, web-based Hospital Reception, Outpatient Clinic, and Pharmacy Point of Sale (POS) system built with **React**, **TypeScript**, **Tailwind CSS**, and a **Supabase PostgreSQL** backend.

---

## Key Features

### 1. Reception & Outpatient Management
- **Patient Registration & Electronic Health Records**: Full demographics, blood group, age calculation, contact & emergency details, unique auto-generated Patient ID (`PT-000001`).
- **Comprehensive Patient Tracking**: Dedicated 8-tab patient profile showing clinical history, appointments, consultations, prescriptions, pharmacy purchases, invoices, receipts, and unified chronological journey timeline.
- **Appointment Scheduling**: Status workflow (`Scheduled` -> `Confirmed` -> `Checked In` -> `In Consultation` -> `Completed` / `Cancelled`), doctor assignment, department filters, date selection matching the medical SaaS reference design.
- **Medical Staff Directory**: Doctor specialties, qualifications, medical registration numbers, and configurable consultation fees.

### 2. Pharmacy POS & FEFO Inventory Engine
- **Fast 3-Panel POS Counter**:
  - **Left**: Medicine catalog search (Name, Generic, Code, Barcode) with real-time stock levels and FEFO batch indicators.
  - **Center**: Cart with batch lot selector, expiry dates, quantity validation, unit prices, discounts, and tax rates.
  - **Right**: Patient settlement, payment method (Cash, Card, UPI), cash tender/change calculation, and checkout.
- **Direct Prescription Queue Importer**: Pharmacist can load doctor's e-prescriptions directly into the POS cart with one click.
- **Strict FEFO (First Expiry, First Out) Logic**:
  - Automatically identifies and allocates the earliest non-expired batch.
  - Hard guardrail prevents dispensing expired batches.
- **Batch-Level Inventory Tracking**: Batch numbers, expiry dates, lot quantities, purchase & selling prices.
- **Smart Safety & Stock Alerts**:
  - `OUT_OF_STOCK` & `LOW_STOCK` warnings based on configurable reorder thresholds.
  - `EXPIRING_SOON` (within 30/60 days) and `EXPIRED` alerts.
- **Procurement & Goods Intake**: Purchase Orders (PO) module with automated stock intake and batch generation upon shipment receipt.

### 3. Hospital Billing & Receipt Printing System
- **Configurable Hospital Billing**: Standard charges for outpatient consultations, diagnostics, procedures, and dressing.
- **Receipt Print & Duplicate Tracking**:
  - Every printed receipt generates an immutable record in `receipt_print_logs`.
  - First print is designated as `ORIGINAL RECEIPT`.
  - Subsequent prints automatically increment `print_count` and display prominent `*** DUPLICATE REPRINT ***` watermark.
- **Dual Printing Layouts**:
  - **80mm Thermal Receipt**: Fast format for pharmacy counter and POS thermal printers.
  - **A4 Medical Slip / Invoice**: Standard clinical format for hospital invoices and doctor prescriptions.

### 4. Security & Role-Based Access Control (RBAC)
- 7 Granular Roles: `ADMIN`, `RECEPTIONIST`, `DOCTOR`, `PHARMACIST`, `CASHIER`, `INVENTORY_MANAGER`, `MANAGER`.
- Row Level Security (RLS) enabled on all PostgreSQL database tables.
- Frontend anon key only (no service-role key exposed).

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **State & Data Fetching**: TanStack Query, React Router DOM
- **Backend & Database**: Supabase (PostgreSQL with UUID PKs, Sequences, Functions, Triggers, RLS)
- **Authentication**: Supabase Auth
- **Currency**: INR (₹) configurable

---

## Supabase Database Migrations

All SQL migrations are organized in `supabase/migrations/`:
1. `001_complete_schema.sql` - Complete schema, sequences, 30 tables, foreign keys, indexes, triggers, and functions (`perform_pharmacy_sale`, `get_fefo_batches`).
2. `002_rls_policies.sql` - Row Level Security policies for all tables and roles.
3. `003_seed_data.sql` - Realistic sample data for Mithra Hospital (Doctors, Patients, Formularies, Batches, Appointments, Consultations, Prescriptions, Invoices, Receipts).

### Executing Migrations in Supabase
Run the migration scripts in the **Supabase SQL Editor** in order:
```sql
-- Run 001_complete_schema.sql
-- Run 002_rls_policies.sql
-- Run 003_seed_data.sql
```

---

## Local Development Setup

1. **Clone and Navigate**:
   ```bash
   cd "Mithra Hosipital pos"
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```env
   VITE_SUPABASE_URL=https://vulgmpyguavcabglmasi.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Install Dependencies & Start**:
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Demo Accounts
To log in, use any registered Supabase user or test with:
- **Admin**: `admin@mithra.hospital`
- **Doctor**: `doctor@mithra.hospital`
- **Pharmacy**: `pharmacy@mithra.hospital`
- **Reception**: `reception@mithra.hospital`

---

## Verification & Key Workflows Tested

1. **Patient Registration & Journey**: Registered patient -> generated `PT-000001` -> verified in 8-tab profile timeline.
2. **Clinical Appointment**: Booked appointment -> checked in -> assigned to Dr. Petra Winsburry -> verified in queue.
3. **Doctor Prescription**: Prescribed Paracetamol + Cetirizine -> issued to queue.
4. **FEFO Pharmacy Sale**: Loaded prescription -> allocated earliest batch `PCM-2026-A1` -> verified batch deduction and `inventory_transactions` log.
5. **Receipt Reprint Test**: Printed receipt (Copy #1: `ORIGINAL`) -> reprinted (Copy #2: `*** DUPLICATE REPRINT ***`) -> verified in `receipt_print_logs`.
