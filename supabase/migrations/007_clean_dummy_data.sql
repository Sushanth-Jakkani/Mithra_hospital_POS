-- ====================================================================
-- 007_clean_dummy_data.sql: Clean All Dummy / Sample Data for Client Production
-- ====================================================================
-- Run this script in your Supabase SQL Editor to wipe out all sample
-- test data (patients, doctors, appointments, sales, invoices, prescriptions, 
-- receipts, lab orders, inventory batches) and reset ID sequences back to 1.
-- ====================================================================

-- 1. Truncate / Delete operational transaction tables (ordered by foreign key dependency)
TRUNCATE TABLE IF EXISTS receipt_print_logs CASCADE;
TRUNCATE TABLE IF EXISTS payments CASCADE;
TRUNCATE TABLE IF EXISTS receipts CASCADE;
TRUNCATE TABLE IF EXISTS invoices CASCADE;
TRUNCATE TABLE IF EXISTS inventory_transactions CASCADE;
TRUNCATE TABLE IF EXISTS sale_items CASCADE;
TRUNCATE TABLE IF EXISTS sales CASCADE;
TRUNCATE TABLE IF EXISTS purchase_order_items CASCADE;
TRUNCATE TABLE IF EXISTS purchase_orders CASCADE;
TRUNCATE TABLE IF EXISTS prescription_items CASCADE;
TRUNCATE TABLE IF EXISTS prescriptions CASCADE;
TRUNCATE TABLE IF EXISTS consultations CASCADE;
TRUNCATE TABLE IF EXISTS appointment_status_history CASCADE;
TRUNCATE TABLE IF EXISTS appointments CASCADE;

-- 2. Clear lab orders (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lab_orders') THEN
    TRUNCATE TABLE lab_orders CASCADE;
  END IF;
END $$;

-- 3. Clear inventory batches, medicines, categories, suppliers
TRUNCATE TABLE IF EXISTS medicine_batches CASCADE;
TRUNCATE TABLE IF EXISTS medicines CASCADE;
TRUNCATE TABLE IF EXISTS medicine_categories CASCADE;
TRUNCATE TABLE IF EXISTS suppliers CASCADE;

-- 4. Clear patient and doctor directories
TRUNCATE TABLE IF EXISTS patients CASCADE;
TRUNCATE TABLE IF EXISTS doctors CASCADE;

-- 5. Clear notifications and audit logs
TRUNCATE TABLE IF EXISTS notifications CASCADE;
TRUNCATE TABLE IF EXISTS audit_logs CASCADE;

-- 6. Reset all auto-increment number sequences back to 1
ALTER SEQUENCE IF EXISTS patient_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS appointment_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS prescription_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS invoice_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS receipt_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sale_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS po_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payment_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS medicine_code_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS doctor_code_seq RESTART WITH 1;

-- 7. Ensure Default Hospital Profile Setting exists
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
