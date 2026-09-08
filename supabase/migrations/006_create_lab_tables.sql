-- Migration: 006_create_lab_tables.sql
-- Description: Create lab_tests and lab_orders tables with RLS and initial seed data

-- 1. Create lab_tests table
CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    test_code TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) DEFAULT 0.00,
    turnaround_hours INT DEFAULT 6,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create lab_orders table
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    order_number TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT NOT NULL,
    patient_number TEXT,
    lab_test_id UUID REFERENCES lab_tests(id),
    lab_test_name TEXT NOT NULL,
    category TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    technician_name TEXT,
    results_notes TEXT,
    file_url TEXT,
    file_name TEXT,
    billed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow public read access for lab_tests" ON lab_tests;
CREATE POLICY "Allow public read access for lab_tests" ON lab_tests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow full access for lab_tests" ON lab_tests;
CREATE POLICY "Allow full access for lab_tests" ON lab_tests FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access for lab_orders" ON lab_orders;
CREATE POLICY "Allow public read access for lab_orders" ON lab_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow full access for lab_orders" ON lab_orders;
CREATE POLICY "Allow full access for lab_orders" ON lab_orders FOR ALL USING (true);

-- 5. Seed initial lab tests if table is empty
INSERT INTO lab_tests (test_code, name, category, price, tax_rate, turnaround_hours, description)
VALUES 
  ('LAB-CBC', 'Complete Blood Count (CBC)', 'Hematology', 350, 0, 4, 'Measures RBC, WBC, Platelets, and Hemoglobin'),
  ('LAB-LIP', 'Lipid Profile', 'Biochemistry', 650, 0, 12, 'Total Cholesterol, HDL, LDL, Triglycerides'),
  ('LAB-HBA1C', 'HbA1c (Glycated Hemoglobin)', 'Biochemistry', 500, 0, 6, 'Average blood sugar level over the past 3 months'),
  ('LAB-LFT', 'Liver Function Test (LFT)', 'Biochemistry', 750, 0, 8, 'Bilirubin, SGOT, SGPT, Alkaline Phosphatase'),
  ('LAB-RFT', 'Renal Function Test (RFT)', 'Biochemistry', 700, 0, 8, 'Urea, Creatinine, Uric Acid'),
  ('LAB-THY', 'Thyroid Profile (T3, T4, TSH)', 'Endocrinology', 850, 0, 24, 'Evaluates thyroid gland activity'),
  ('LAB-CXR', 'Chest X-Ray (PA View)', 'Radiology', 450, 0, 2, 'Digital Chest X-Ray'),
  ('LAB-ECG', 'ECG (12 Lead)', 'Cardiology', 300, 0, 1, 'Standard 12-lead Electrocardiogram')
ON CONFLICT (test_code) DO NOTHING;
