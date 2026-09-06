-- ==========================================================
-- 003_seed_data.sql: Realistic Seed Data for Mithra Hospital
-- ==========================================================

-- Schema safety migrations to guarantee organization_id and all columns exist on every table
ALTER TABLE IF EXISTS organizations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS branches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS departments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS prescriptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS prescription_items ADD COLUMN IF NOT EXISTS dispensed_quantity INT DEFAULT 0;
ALTER TABLE IF EXISTS hospital_services ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS medicine_categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS medicines ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS medicines ADD COLUMN IF NOT EXISTS prescription_required BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS medicines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS medicine_batches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS receipts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS notifications ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

DO $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
  v_dept_cardio UUID;
  v_dept_gen UUID;
  v_dept_pedia UUID;
  v_dept_derma UUID;
  v_dept_ortho UUID;
  
  v_doc_petra UUID;
  v_doc_olivia UUID;
  v_doc_damian UUID;
  v_doc_chloe UUID;
  v_doc_samuel UUID;

  v_pat_caren UUID;
  v_pat_edgar UUID;
  v_pat_ocean UUID;
  v_pat_shane UUID;
  v_pat_queen UUID;
  v_pat_alice UUID;
  v_pat_mikhail UUID;
  v_pat_mateus UUID;
  v_pat_pari UUID;
  v_pat_oscar UUID;

  v_cat_analgesic UUID;
  v_cat_antibiotic UUID;
  v_cat_antacid UUID;
  v_cat_antihistamine UUID;
  v_cat_cardio UUID;

  v_med_pcm UUID;
  v_med_amx UUID;
  v_med_cet UUID;
  v_med_pan UUID;
  v_med_met UUID;
  v_med_aml UUID;
  v_med_ibu UUID;
  v_med_azt UUID;

  v_sup_apex UUID;
  v_sup_medpharma UUID;

  v_batch_pcm1 UUID;
  v_batch_pcm2 UUID;
  v_batch_amx1 UUID;
  v_batch_cet1 UUID;
  v_batch_pan1 UUID;

  v_apt_caren UUID;
  v_apt_edgar UUID;
  v_apt_ocean UUID;
  v_apt_shane UUID;

  v_presc_caren UUID;
  v_invoice_caren UUID;
  v_payment_caren UUID;
  v_receipt_caren UUID;
BEGIN
  -- 1. Organization & Branch
  INSERT INTO organizations (name) VALUES ('Mithra Superspeciality Hospital') RETURNING id INTO v_org_id;
  INSERT INTO branches (organization_id, name, address, is_main) 
  VALUES (v_org_id, 'Central Medical Hub', '124 Healthcare Boulevard, Jubilee Hills, Hyderabad - 500033', true)
  RETURNING id INTO v_branch_id;

  -- 2. Settings
  INSERT INTO settings (key, category, organization_id, value) VALUES
  ('hospital_profile', 'general', v_org_id, jsonb_build_object(
    'name', 'Mithra Superspeciality Hospital & Pharmacy',
    'tagline', 'Excellence in Compassionate Care',
    'address', '124 Healthcare Boulevard, Jubilee Hills, Hyderabad - 500033',
    'phone', '+91 40 2345 6789',
    'emergency_phone', '+91 40 2345 9999',
    'email', 'care@mithrahospital.in',
    'website', 'https://mithrahospital.in',
    'gstin', '36AABCM1234F1Z8',
    'registration_number', 'TS-MED-REG-2024-8842',
    'currency', 'INR',
    'currency_symbol', '₹',
    'receipt_footer', 'Thank you for choosing Mithra Hospital. Get well soon!'
  )),
  ('tax_settings', 'finance', v_org_id, jsonb_build_object(
    'default_tax_rate', 5.0,
    'consultation_tax_rate', 0.0,
    'pharmacy_tax_rate', 5.0,
    'enable_gst', true
  ))
  ON CONFLICT (key) DO NOTHING;

  -- 3. Departments
  INSERT INTO departments (organization_id, name, description) VALUES
  (v_org_id, 'General Medicine', 'Primary care, adult health, preventative consultations') RETURNING id INTO v_dept_gen;
  INSERT INTO departments (organization_id, name, description) VALUES
  (v_org_id, 'Cardiology', 'Comprehensive cardiovascular diagnostics and treatment') RETURNING id INTO v_dept_cardio;
  INSERT INTO departments (organization_id, name, description) VALUES
  (v_org_id, 'Pediatrics', 'Comprehensive child healthcare from neonatal to adolescent') RETURNING id INTO v_dept_pedia;
  INSERT INTO departments (organization_id, name, description) VALUES
  (v_org_id, 'Dermatology', 'Skin, hair and cosmetic medical therapies') RETURNING id INTO v_dept_derma;
  INSERT INTO departments (organization_id, name, description) VALUES
  (v_org_id, 'Orthopedics', 'Bone, joint and musculoskeletal healthcare') RETURNING id INTO v_dept_ortho;

  -- 4. Doctors
  INSERT INTO doctors (organization_id, department_id, first_name, last_name, specialization, qualification, registration_number, phone, email, consultation_fee)
  VALUES (v_org_id, v_dept_gen, 'Petra', 'Winsburry', 'General Physician', 'MBBS, MD (Gen Med)', 'MCI-88219', '+91 98490 12345', 'dr.petra@mithrahospital.in', 500.00) RETURNING id INTO v_doc_petra;

  INSERT INTO doctors (organization_id, department_id, first_name, last_name, specialization, qualification, registration_number, phone, email, consultation_fee)
  VALUES (v_org_id, v_dept_cardio, 'Olivia', 'Martinez', 'Interventional Cardiologist', 'MBBS, MD, DM (Cardiology)', 'MCI-77341', '+91 98490 23456', 'dr.olivia@mithrahospital.in', 800.00) RETURNING id INTO v_doc_olivia;

  INSERT INTO doctors (organization_id, department_id, first_name, last_name, specialization, qualification, registration_number, phone, email, consultation_fee)
  VALUES (v_org_id, v_dept_pedia, 'Damian', 'Sanchez', 'Consultant Pediatrician', 'MBBS, DCH, DNB (Pediatrics)', 'MCI-66129', '+91 98490 34567', 'dr.damian@mithrahospital.in', 600.00) RETURNING id INTO v_doc_damian;

  INSERT INTO doctors (organization_id, department_id, first_name, last_name, specialization, qualification, registration_number, phone, email, consultation_fee)
  VALUES (v_org_id, v_dept_derma, 'Chloe', 'Harrington', 'Consultant Dermatologist', 'MBBS, MD (DVL)', 'MCI-55912', '+91 98490 45678', 'dr.chloe@mithrahospital.in', 700.00) RETURNING id INTO v_doc_chloe;

  INSERT INTO doctors (organization_id, department_id, first_name, last_name, specialization, qualification, registration_number, phone, email, consultation_fee)
  VALUES (v_org_id, v_dept_cardio, 'Samuel', 'Thompson', 'Cardiac Electrophysiologist', 'MBBS, MD, FACC', 'MCI-44183', '+91 98490 56789', 'dr.samuel@mithrahospital.in', 900.00) RETURNING id INTO v_doc_samuel;

  -- 5. Patients
  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone)
  VALUES 
  (v_org_id, 'Caren', 'Simpson', '1992-05-14', 32, 'female', '+91 98765 43210', 'caren.simpson@email.com', 'O+', 'Flat 402, Green Meadows', 'Hyderabad', 'Telangana', '500081', 'George Simpson', '+91 98765 43219') RETURNING id INTO v_pat_caren;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone)
  VALUES 
  (v_org_id, 'Edgar', 'Marrow', '1985-11-23', 38, 'male', '+91 98765 43211', 'edgar.marrow@email.com', 'A+', 'Plot 18, Road No. 45', 'Hyderabad', 'Telangana', '500033', 'Helen Marrow', '+91 98765 43218') RETURNING id INTO v_pat_edgar;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone)
  VALUES 
  (v_org_id, 'Ocean Jane', 'Lupre', '2018-03-10', 6, 'female', '+91 98765 43212', 'jane.lupre@email.com', 'B+', 'Villa 7, Palm County', 'Hyderabad', 'Telangana', '500084', 'David Lupre', '+91 98765 43217') RETURNING id INTO v_pat_ocean;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone)
  VALUES 
  (v_org_id, 'Shane', 'Riddick', '1998-08-19', 26, 'male', '+91 98765 43213', 'shane.riddick@email.com', 'AB+', 'House 12-4, Madhapur', 'Hyderabad', 'Telangana', '500081', 'Sarah Riddick', '+91 98765 43216') RETURNING id INTO v_pat_shane;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone)
  VALUES 
  (v_org_id, 'Queen', 'Lawriston', '1976-02-28', 48, 'female', '+91 98765 43214', 'queen.lawriston@email.com', 'O-', 'Tower B, Silicon Heights', 'Hyderabad', 'Telangana', '500081', 'Albert Lawriston', '+91 98765 43215') RETURNING id INTO v_pat_queen;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code)
  VALUES 
  (v_org_id, 'Alice', 'Mitchell', '1995-12-04', 28, 'female', '+91 98765 43220', 'alice.m@email.com', 'A-', 'Apt 101, Lakeview', 'Hyderabad', 'Telangana', '500034') RETURNING id INTO v_pat_alice;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code)
  VALUES 
  (v_org_id, 'Mikhail', 'Morozov', '1968-07-15', 56, 'male', '+91 98765 43221', 'mikhail.m@email.com', 'B-', 'Flat 304, Cyber Residency', 'Hyderabad', 'Telangana', '500081') RETURNING id INTO v_pat_mikhail;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code)
  VALUES 
  (v_org_id, 'Mateus', 'Fernandes', '2019-09-21', 4, 'male', '+91 98765 43222', 'mateus.parent@email.com', 'O+', 'Plot 89, Gachibowli', 'Hyderabad', 'Telangana', '500032') RETURNING id INTO v_pat_mateus;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code)
  VALUES 
  (v_org_id, 'Pari', 'Desai', '2001-04-09', 23, 'female', '+91 98765 43223', 'pari.desai@email.com', 'AB-', 'Block C, Fortune Towers', 'Hyderabad', 'Telangana', '500084') RETURNING id INTO v_pat_pari;

  INSERT INTO patients (organization_id, first_name, last_name, date_of_birth, age, gender, mobile, email, blood_group, address, city, state, postal_code)
  VALUES 
  (v_org_id, 'Oscar', 'Ali', '1989-10-12', 34, 'male', '+91 98765 43224', 'oscar.ali@email.com', 'O+', 'Lane 3, Banjara Hills', 'Hyderabad', 'Telangana', '500034') RETURNING id INTO v_pat_oscar;

  -- 6. Hospital Services
  INSERT INTO hospital_services (organization_id, name, description, category, price, tax_rate) VALUES
  (v_org_id, 'General Consultation', 'Routine Outpatient Consultation', 'Consultation', 500.00, 0.0),
  (v_org_id, 'Specialist Cardiology Consultation', 'Cardiac specialist assessment', 'Consultation', 800.00, 0.0),
  (v_org_id, 'Pediatric Consultation', 'Pediatric outpatient clinic visit', 'Consultation', 600.00, 0.0),
  (v_org_id, 'Dermatology Consultation', 'Skin evaluation & dermoscopy', 'Consultation', 700.00, 0.0),
  (v_org_id, '12-Lead Electrocardiogram (ECG)', 'Standard cardiac rhythm assessment', 'Diagnostic', 350.00, 0.0),
  (v_org_id, 'Blood Glucose Monitoring (RBS)', 'Instant fingerstick blood sugar test', 'Laboratory', 80.00, 0.0),
  (v_org_id, 'Wound Dressing (Minor)', 'Sterile antiseptic wound care & dressing', 'Procedure', 250.00, 0.0),
  (v_org_id, 'Nebulization Session', 'Single bronchodilator inhalation therapy', 'Procedure', 150.00, 0.0);

  -- 7. Medicine Categories
  INSERT INTO medicine_categories (organization_id, name, description) VALUES
  (v_org_id, 'Analgesics & Antipyretics', 'Pain and fever management medications') RETURNING id INTO v_cat_analgesic;
  INSERT INTO medicine_categories (organization_id, name, description) VALUES
  (v_org_id, 'Antibiotics & Antimicrobials', 'Bacterial infection treatments') RETURNING id INTO v_cat_antibiotic;
  INSERT INTO medicine_categories (organization_id, name, description) VALUES
  (v_org_id, 'Antacids & Gastrointestinal', 'Acid reflux and digestive relief') RETURNING id INTO v_cat_antacid;
  INSERT INTO medicine_categories (organization_id, name, description) VALUES
  (v_org_id, 'Antihistamines & Allergy', 'Allergy, rhinitis and urticaria relief') RETURNING id INTO v_cat_antihistamine;
  INSERT INTO medicine_categories (organization_id, name, description) VALUES
  (v_org_id, 'Cardiovascular & Hypertension', 'Heart and blood pressure management') RETURNING id INTO v_cat_cardio;

  -- 8. Suppliers
  INSERT INTO suppliers (organization_id, name, company, phone, email, address, gstin, contact_person)
  VALUES 
  (v_org_id, 'Apex Life Sciences Distributors', 'Apex Lifecare Pvt Ltd', '+91 40 4455 6677', 'orders@apexlifecare.com', 'Plot 44, IDA Kukatpally, Hyderabad', '36AAACA1234E1Z1', 'Rajesh Sharma') RETURNING id INTO v_sup_apex;
  INSERT INTO suppliers (organization_id, name, company, phone, email, address, gstin, contact_person)
  VALUES 
  (v_org_id, 'MedPharma Wholesale Logistics', 'MedPharma India Ltd', '+91 40 7788 9900', 'supplies@medpharma.in', 'Unit 12, Logistics Park, Shamshabad', '36BBBCB5678K1Z3', 'Kiran Varma') RETURNING id INTO v_sup_medpharma;

  -- 9. Medicines
  INSERT INTO medicines (organization_id, category_id, name, generic_name, brand_name, dosage_form, strength, unit, manufacturer, reorder_level, minimum_stock, maximum_stock, tax_rate, purchase_price, selling_price, prescription_required)
  VALUES
  (v_org_id, v_cat_analgesic, 'Paracetamol 500mg', 'Paracetamol / Acetaminophen', 'Calpol / Dolo', 'tablet', '500mg', 'Strip of 10', 'GlaxoSmithKline', 20, 10, 500, 5.0, 12.00, 20.00, false) RETURNING id INTO v_med_pcm;

  INSERT INTO medicines (organization_id, category_id, name, generic_name, brand_name, dosage_form, strength, unit, manufacturer, reorder_level, minimum_stock, maximum_stock, tax_rate, purchase_price, selling_price, prescription_required)
  VALUES
  (v_org_id, v_cat_antibiotic, 'Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Novamox / Mox', 'capsule', '500mg', 'Strip of 10', 'Cipla Ltd', 20, 10, 300, 5.0, 55.00, 85.00, true) RETURNING id INTO v_med_amx;

  INSERT INTO medicines (organization_id, category_id, name, generic_name, brand_name, dosage_form, strength, unit, manufacturer, reorder_level, minimum_stock, maximum_stock, tax_rate, purchase_price, selling_price, prescription_required)
  VALUES
  (v_org_id, v_cat_antihistamine, 'Cetirizine 10mg', 'Cetirizine Hydrochloride', 'Cetzine / Alerid', 'tablet', '10mg', 'Strip of 10', 'Dr. Reddys Laboratories', 15, 10, 400, 5.0, 18.00, 35.00, false) RETURNING id INTO v_med_cet;

  INSERT INTO medicines (organization_id, category_id, name, generic_name, brand_name, dosage_form, strength, unit, manufacturer, reorder_level, minimum_stock, maximum_stock, tax_rate, purchase_price, selling_price, prescription_required)
  VALUES
  (v_org_id, v_cat_antacid, 'Pantoprazole 40mg', 'Pantoprazole Sodium', 'Pan 40 / Pantocid', 'tablet', '40mg', 'Strip of 15', 'Alkem Laboratories', 25, 10, 400, 5.0, 70.00, 110.00, true) RETURNING id INTO v_med_pan;

  INSERT INTO medicines (organization_id, category_id, name, generic_name, brand_name, dosage_form, strength, unit, manufacturer, reorder_level, minimum_stock, maximum_stock, tax_rate, purchase_price, selling_price, prescription_required)
  VALUES
  (v_org_id, v_cat_cardio, 'Amlodipine 5mg', 'Amlodipine Besylate', 'Amlong / Stamlo', 'tablet', '5mg', 'Strip of 14', 'Micro Labs', 15, 10, 300, 5.0, 30.00, 52.00, true) RETURNING id INTO v_med_aml;

  -- 10. Medicine Batches (Key FEFO & Low-stock demonstration)
  -- Paracetamol Batch A (earlier expiry 2026-12-01, qty 10)
  INSERT INTO medicine_batches (organization_id, medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price, supplier_id)
  VALUES (v_org_id, v_med_pcm, 'PCM-2026-A1', '2026-12-01', 10, 12.00, 20.00, v_sup_apex) RETURNING id INTO v_batch_pcm1;

  -- Paracetamol Batch B (later expiry 2027-06-01, qty 20)
  INSERT INTO medicine_batches (organization_id, medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price, supplier_id)
  VALUES (v_org_id, v_med_pcm, 'PCM-2027-B2', '2027-06-01', 20, 12.50, 20.00, v_sup_apex) RETURNING id INTO v_batch_pcm2;

  -- Amoxicillin (Low Stock Test: stock 5, reorder 20 -> triggers Low Stock alert!)
  INSERT INTO medicine_batches (organization_id, medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price, supplier_id)
  VALUES (v_org_id, v_med_amx, 'AMX-2026-L1', '2026-10-15', 5, 55.00, 85.00, v_sup_medpharma) RETURNING id INTO v_batch_amx1;

  -- Cetirizine (Good stock: qty 45)
  INSERT INTO medicine_batches (organization_id, medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price, supplier_id)
  VALUES (v_org_id, v_med_cet, 'CET-2027-C1', '2027-09-30', 45, 18.00, 35.00, v_sup_apex) RETURNING id INTO v_batch_cet1;

  -- Pantoprazole (Good stock: qty 60)
  INSERT INTO medicine_batches (organization_id, medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price, supplier_id)
  VALUES (v_org_id, v_med_pan, 'PAN-2027-P1', '2027-08-31', 60, 70.00, 110.00, v_sup_medpharma) RETURNING id INTO v_batch_pan1;

  -- Initial opening inventory transactions
  INSERT INTO inventory_transactions (medicine_id, batch_id, transaction_type, quantity, previous_quantity, new_quantity, notes)
  VALUES
  (v_med_pcm, v_batch_pcm1, 'OPENING_STOCK', 10, 0, 10, 'Initial seed opening batch A'),
  (v_med_pcm, v_batch_pcm2, 'OPENING_STOCK', 20, 0, 20, 'Initial seed opening batch B'),
  (v_med_amx, v_batch_amx1, 'OPENING_STOCK', 5, 0, 5, 'Initial seed opening batch Amox (Low Stock)'),
  (v_med_cet, v_batch_cet1, 'OPENING_STOCK', 45, 0, 45, 'Initial seed opening batch Cetirizine'),
  (v_med_pan, v_batch_pan1, 'OPENING_STOCK', 60, 0, 60, 'Initial seed opening batch Pantoprazole');

  -- 11. Appointments matching reference design
  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_caren, v_doc_petra, v_dept_gen, CURRENT_DATE, '09:00:00', 'Routine Check Up', 'confirmed', 'Follow-up for seasonal wellness check') RETURNING id INTO v_apt_caren;

  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_edgar, v_doc_olivia, v_dept_cardio, CURRENT_DATE, '10:30:00', 'Cardiac Consultation', 'confirmed', 'Evaluation of mild chest discomfort during exertion') RETURNING id INTO v_apt_edgar;

  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_ocean, v_doc_damian, v_dept_pedia, CURRENT_DATE, '11:00:00', 'Pediatric Check-Up', 'scheduled', '6-year developmental screening') RETURNING id INTO v_apt_ocean;

  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_shane, v_doc_chloe, v_dept_derma, CURRENT_DATE, '13:00:00', 'Skin Allergy', 'cancelled', 'Patient requested reschedule to next week') RETURNING id INTO v_apt_shane;

  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_queen, v_doc_petra, v_dept_gen, CURRENT_DATE, '14:30:00', 'Follow-Up Visit', 'confirmed', 'Post-viral fever recovery review');

  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_alice, v_doc_samuel, v_dept_cardio, CURRENT_DATE, '15:00:00', 'Cardiac Consultation', 'confirmed', 'Palpitations review');

  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_mikhail, v_doc_samuel, v_dept_cardio, CURRENT_DATE, '16:00:00', 'Cardiac Consultation', 'confirmed', 'Blood pressure regulation');

  INSERT INTO appointments (organization_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status, notes)
  VALUES 
  (v_org_id, v_pat_pari, v_doc_chloe, v_dept_derma, CURRENT_DATE, '16:30:00', 'Skin Allergy', 'cancelled', 'Rescheduled due to exam');

  -- 12. Consultation & Prescription for Caren Simpson
  INSERT INTO consultations (organization_id, appointment_id, patient_id, doctor_id, diagnosis, notes, vitals)
  VALUES (v_org_id, v_apt_caren, v_pat_caren, v_doc_petra, 'Mild Upper Respiratory Tract Symptoms & Fatigue', 'Patient advised adequate hydration, rest, and 5-day symptomatic medication course.', jsonb_build_object(
    'bp', '120/80 mmHg',
    'pulse', '74 bpm',
    'temperature', '98.6 F',
    'spO2', '99%',
    'weight', '58 kg'
  ));

  INSERT INTO prescriptions (organization_id, appointment_id, patient_id, doctor_id, diagnosis, notes, status)
  VALUES (v_org_id, v_apt_caren, v_pat_caren, v_doc_petra, 'Mild Upper Respiratory Tract Symptoms', 'Take medicines strictly as prescribed after meals.', 'dispensed')
  RETURNING id INTO v_presc_caren;

  INSERT INTO prescription_items (prescription_id, medicine_id, medicine_name, dosage, frequency, duration, quantity, instructions, dispensed_quantity)
  VALUES
  (v_presc_caren, v_med_pcm, 'Paracetamol 500mg', '1 tablet', '3 times daily', '3 days', 9, 'Take after meals for fever/body ache', 9),
  (v_presc_caren, v_med_cet, 'Cetirizine 10mg', '1 tablet', 'Once daily (Night)', '5 days', 5, 'Take at bedtime for allergy relief', 5);

  -- 13. Hospital Billing Invoice for Consultation
  INSERT INTO invoices (organization_id, patient_id, appointment_id, invoice_type, subtotal, discount_amount, tax_amount, total_amount, notes)
  VALUES (v_org_id, v_pat_caren, v_apt_caren, 'hospital', 500.00, 0.00, 0.00, 500.00, 'Consultation with Dr. Petra Winsburry')
  RETURNING id INTO v_invoice_caren;

  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, discount_amount, tax_amount, total_amount, reference_type)
  VALUES (v_invoice_caren, 'General Outpatient Consultation', 1, 500.00, 0.00, 0.00, 500.00, 'service');

  INSERT INTO payments (organization_id, invoice_id, patient_id, amount, payment_method, payment_status, notes)
  VALUES (v_org_id, v_invoice_caren, v_pat_caren, 500.00, 'upi', 'paid', 'GPay Transaction Ref: GP-88231902')
  RETURNING id INTO v_payment_caren;

  INSERT INTO receipts (organization_id, invoice_id, payment_id, patient_id, receipt_type, total_amount, payment_method, amount_paid, change_amount, print_count, last_printed_at)
  VALUES (v_org_id, v_invoice_caren, v_payment_caren, v_pat_caren, 'hospital', 500.00, 'upi', 500.00, 0.00, 1, NOW())
  RETURNING id INTO v_receipt_caren;

  INSERT INTO receipt_print_logs (receipt_id, print_type, print_number, device_info, notes)
  VALUES (v_receipt_caren, 'original', 1, 'Front Reception Desk - Laser Printer HP-M404', 'Original receipt given to patient at counter');

  -- 14. Notifications for Alerts
  INSERT INTO notifications (organization_id, type, severity, title, message)
  VALUES
  (v_org_id, 'low_stock', 'warning', 'Low Stock Alert: Amoxicillin 500mg', 'Current inventory is 5 units, which is below the reorder threshold of 20 units.'),
  (v_org_id, 'expiring_soon', 'warning', 'Expiring Medicine: Amoxicillin 500mg (Batch AMX-2026-L1)', 'Batch AMX-2026-L1 expires on 2026-10-15 (within 40 days).'),
  (v_org_id, 'new_appointment', 'info', 'New Appointment Scheduled', 'Ocean Jane Lupre scheduled with Dr. Damian Sanchez today at 11:00 AM.');

  -- 15. Audit Logs
  INSERT INTO audit_logs (organization_id, action, entity_type, entity_id, metadata)
  VALUES
  (v_org_id, 'PATIENT_REGISTERED', 'patient', v_pat_caren, jsonb_build_object('name', 'Caren Simpson', 'patient_number', 'PT-000001')),
  (v_org_id, 'APPOINTMENT_CREATED', 'appointment', v_apt_caren, jsonb_build_object('doctor', 'Dr. Petra Winsburry', 'time', '09:00 AM')),
  (v_org_id, 'PRESCRIPTION_CREATED', 'prescription', v_presc_caren, jsonb_build_object('medicines_count', 2)),
  (v_org_id, 'RECEIPT_PRINTED', 'receipt', v_receipt_caren, jsonb_build_object('receipt_number', 'RCT-000001', 'print_type', 'ORIGINAL'));

END $$;
