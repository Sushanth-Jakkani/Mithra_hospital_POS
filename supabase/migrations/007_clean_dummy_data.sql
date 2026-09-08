-- ====================================================================
-- 007_clean_dummy_data.sql: Clean All Dummy / Sample Data for Client Production
-- ====================================================================
-- Run this script in your Supabase SQL Editor to wipe out all sample
-- test data (patients, doctors, appointments, sales, invoices, prescriptions, 
-- receipts, lab orders, inventory batches) and reset ID sequences back to 1.
-- ====================================================================

-- 1. Truncate all operational data tables safely
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'receipt_print_logs', 
    'payments', 
    'receipts', 
    'invoices',
    'inventory_transactions', 
    'sale_items', 
    'sales',
    'purchase_order_items', 
    'purchase_orders', 
    'prescription_items',
    'prescriptions', 
    'consultations', 
    'appointment_status_history',
    'appointments', 
    'lab_orders', 
    'medicine_batches', 
    'medicines',
    'medicine_categories', 
    'suppliers', 
    'patients', 
    'doctors',
    'notifications', 
    'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = tbl
    ) THEN
      EXECUTE format('TRUNCATE TABLE %I CASCADE;', tbl);
    END IF;
  END LOOP;
END $$;

-- 2. Reset all auto-increment number sequences back to 1 safely
DO $$
DECLARE
  seq text;
  seqs text[] := ARRAY[
    'patient_number_seq',
    'appointment_number_seq',
    'prescription_number_seq',
    'invoice_number_seq',
    'receipt_number_seq',
    'sale_number_seq',
    'po_number_seq',
    'payment_number_seq',
    'medicine_code_seq',
    'doctor_code_seq'
  ];
BEGIN
  FOREACH seq IN ARRAY seqs LOOP
    IF EXISTS (
      SELECT 1 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public' 
        AND sequence_name = seq
    ) THEN
      EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1;', seq);
    END IF;
  END LOOP;
END $$;

-- 3. Ensure Default Hospital Profile Setting exists
INSERT INTO settings (key, category, value)
VALUES (
  'hospital_profile',
  'general',
  jsonb_build_object(
    'hospital_name', 'Mithra Superspeciality Hospital',
    'tagline', 'POS & Patient Management System',
    'address', '124 Healthcare Boulevard, Jubilee Hills, Hyderabad - 500033',
    'phone', '+91 40 2345 6789',
    'email', 'contact@mithrahospital.com',
    'gstin', '36AABCM1234F1Z8',
    'currency', 'INR (₹)'
  )
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- Done! The database is now clean and ready for fresh production client usage.
