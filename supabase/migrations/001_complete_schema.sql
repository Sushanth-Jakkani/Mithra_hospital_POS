-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS patient_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS appointment_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS prescription_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS medicine_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS doctor_code_seq START 1;

-- UTILITY FUNCTIONS FOR TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_number(prefix TEXT, seq_name TEXT) 
RETURNS TEXT AS $$
DECLARE
    next_val INT;
BEGIN
    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
    RETURN prefix || '-' || lpad(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TABLES

-- organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- branches
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    address TEXT,
    is_main BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- References auth.users(id)
    organization_id UUID REFERENCES organizations(id),
    branch_id UUID REFERENCES branches(id),
    role TEXT NOT NULL DEFAULT 'RECEPTIONIST',
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- doctors
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    profile_id UUID REFERENCES profiles(id),
    department_id UUID REFERENCES departments(id),
    doctor_code TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT,
    specialization TEXT,
    qualification TEXT,
    registration_number TEXT,
    phone TEXT,
    email TEXT,
    consultation_fee NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    patient_number TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT,
    date_of_birth DATE,
    age INT,
    gender TEXT,
    mobile TEXT,
    email TEXT,
    blood_group TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    doctor_id UUID REFERENCES doctors(id) NOT NULL,
    department_id UUID REFERENCES departments(id),
    appointment_number TEXT UNIQUE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- appointment_status_history
CREATE TABLE IF NOT EXISTS appointment_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- consultations
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    doctor_id UUID REFERENCES doctors(id) NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    vitals JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    doctor_id UUID REFERENCES doctors(id) NOT NULL,
    consultation_id UUID REFERENCES consultations(id),
    appointment_id UUID REFERENCES appointments(id),
    prescription_number TEXT UNIQUE,
    diagnosis TEXT,
    notes TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- medicine_categories
CREATE TABLE IF NOT EXISTS medicine_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- medicines
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES medicine_categories(id),
    medicine_code TEXT UNIQUE,
    barcode TEXT,
    name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    dosage_form TEXT,
    strength TEXT,
    unit TEXT,
    manufacturer TEXT,
    reorder_level INT DEFAULT 10,
    minimum_stock INT DEFAULT 5,
    maximum_stock INT DEFAULT 1000,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    selling_price NUMERIC(12,2),
    purchase_price NUMERIC(12,2),
    prescription_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- prescription_items
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) NOT NULL,
    medicine_id UUID REFERENCES medicines(id),
    medicine_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    quantity INT,
    instructions TEXT,
    dispensed_quantity INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    contact_person TEXT,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    po_number TEXT UNIQUE,
    order_date DATE NOT NULL,
    expected_date DATE,
    status TEXT DEFAULT 'draft',
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- medicine_batches
CREATE TABLE IF NOT EXISTS medicine_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID REFERENCES medicines(id) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    purchase_price NUMERIC(12,2),
    selling_price NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) NOT NULL,
    medicine_id UUID REFERENCES medicines(id) NOT NULL,
    batch_number TEXT,
    expiry_date DATE,
    quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    purchase_price NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- hospital_services
CREATE TABLE IF NOT EXISTS hospital_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    prescription_id UUID REFERENCES prescriptions(id),
    sale_number TEXT UNIQUE,
    subtotal NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    amount_paid NUMERIC(12,2) DEFAULT 0.00,
    change_amount NUMERIC(12,2) DEFAULT 0.00,
    notes TEXT,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sale_items
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) NOT NULL,
    medicine_id UUID REFERENCES medicines(id) NOT NULL,
    batch_id UUID REFERENCES medicine_batches(id) NOT NULL,
    medicine_name TEXT,
    batch_number TEXT,
    expiry_date DATE,
    quantity INT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    sale_id UUID REFERENCES sales(id),
    appointment_id UUID REFERENCES appointments(id),
    invoice_number TEXT UNIQUE,
    invoice_type TEXT NOT NULL, -- 'hospital' or 'pharmacy'
    subtotal NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) NOT NULL,
    description TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id),
    patient_id UUID REFERENCES patients(id),
    payment_number TEXT UNIQUE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    transaction_reference TEXT,
    received_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- receipts
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id),
    payment_id UUID REFERENCES payments(id),
    patient_id UUID REFERENCES patients(id),
    receipt_number TEXT UNIQUE,
    receipt_type TEXT,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT,
    amount_paid NUMERIC(12,2) DEFAULT 0.00,
    change_amount NUMERIC(12,2) DEFAULT 0.00,
    print_count INT DEFAULT 0,
    last_printed_at TIMESTAMPTZ,
    last_printed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- receipt_print_logs
CREATE TABLE IF NOT EXISTS receipt_print_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES receipts(id) NOT NULL,
    printed_by UUID REFERENCES profiles(id),
    printed_at TIMESTAMPTZ DEFAULT NOW(),
    print_type TEXT NOT NULL, -- 'original', 'reprint', 'pdf_export'
    print_number INT,
    device_info TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- inventory_transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID REFERENCES medicines(id) NOT NULL,
    batch_id UUID REFERENCES medicine_batches(id) NOT NULL,
    transaction_type TEXT NOT NULL,
    quantity INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    performed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- stock_adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID REFERENCES medicines(id) NOT NULL,
    batch_id UUID REFERENCES medicine_batches(id) NOT NULL,
    adjustment_type TEXT NOT NULL,
    quantity INT NOT NULL,
    reason TEXT,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- settings
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENABLE RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_print_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 5. INDEXES
CREATE INDEX idx_patients_patient_number ON patients(patient_number);
CREATE INDEX idx_patients_mobile ON patients(mobile);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_full_name ON patients(full_name);
CREATE INDEX idx_medicines_medicine_code ON medicines(medicine_code);
CREATE INDEX idx_medicines_barcode ON medicines(barcode);
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_medicines_generic_name ON medicines(generic_name);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_medicine_batches_medicine_id ON medicine_batches(medicine_id);
CREATE INDEX idx_medicine_batches_expiry_date ON medicine_batches(expiry_date);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 6. TRIGGERS

-- Updated At Triggers
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_appointment_status_history_updated_at BEFORE UPDATE ON appointment_status_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_consultations_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_medicine_categories_updated_at BEFORE UPDATE ON medicine_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_medicines_updated_at BEFORE UPDATE ON medicines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_prescription_items_updated_at BEFORE UPDATE ON prescription_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_medicine_batches_updated_at BEFORE UPDATE ON medicine_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_hospital_services_updated_at BEFORE UPDATE ON hospital_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sale_items_updated_at BEFORE UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_receipt_print_logs_updated_at BEFORE UPDATE ON receipt_print_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_inventory_transactions_updated_at BEFORE UPDATE ON inventory_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_stock_adjustments_updated_at BEFORE UPDATE ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_audit_logs_updated_at BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate number triggers
CREATE OR REPLACE FUNCTION set_patient_number() RETURNS TRIGGER AS $$ BEGIN NEW.patient_number := generate_number('PT', 'patient_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_patient_number BEFORE INSERT ON patients FOR EACH ROW WHEN (NEW.patient_number IS NULL) EXECUTE FUNCTION set_patient_number();

CREATE OR REPLACE FUNCTION set_appointment_number() RETURNS TRIGGER AS $$ BEGIN NEW.appointment_number := generate_number('APT', 'appointment_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_appointment_number BEFORE INSERT ON appointments FOR EACH ROW WHEN (NEW.appointment_number IS NULL) EXECUTE FUNCTION set_appointment_number();

CREATE OR REPLACE FUNCTION set_prescription_number() RETURNS TRIGGER AS $$ BEGIN NEW.prescription_number := generate_number('RXN', 'prescription_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_prescription_number BEFORE INSERT ON prescriptions FOR EACH ROW WHEN (NEW.prescription_number IS NULL) EXECUTE FUNCTION set_prescription_number();

CREATE OR REPLACE FUNCTION set_invoice_number() RETURNS TRIGGER AS $$ BEGIN NEW.invoice_number := generate_number('INV', 'invoice_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_invoice_number BEFORE INSERT ON invoices FOR EACH ROW WHEN (NEW.invoice_number IS NULL) EXECUTE FUNCTION set_invoice_number();

CREATE OR REPLACE FUNCTION set_receipt_number() RETURNS TRIGGER AS $$ BEGIN NEW.receipt_number := generate_number('RCT', 'receipt_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_receipt_number BEFORE INSERT ON receipts FOR EACH ROW WHEN (NEW.receipt_number IS NULL) EXECUTE FUNCTION set_receipt_number();

CREATE OR REPLACE FUNCTION set_sale_number() RETURNS TRIGGER AS $$ BEGIN NEW.sale_number := generate_number('SL', 'sale_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_sale_number BEFORE INSERT ON sales FOR EACH ROW WHEN (NEW.sale_number IS NULL) EXECUTE FUNCTION set_sale_number();

CREATE OR REPLACE FUNCTION set_po_number() RETURNS TRIGGER AS $$ BEGIN NEW.po_number := generate_number('PO', 'po_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_po_number BEFORE INSERT ON purchase_orders FOR EACH ROW WHEN (NEW.po_number IS NULL) EXECUTE FUNCTION set_po_number();

CREATE OR REPLACE FUNCTION set_payment_number() RETURNS TRIGGER AS $$ BEGIN NEW.payment_number := generate_number('PAY', 'payment_number_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_payment_number BEFORE INSERT ON payments FOR EACH ROW WHEN (NEW.payment_number IS NULL) EXECUTE FUNCTION set_payment_number();

CREATE OR REPLACE FUNCTION set_medicine_code() RETURNS TRIGGER AS $$ BEGIN NEW.medicine_code := generate_number('MED', 'medicine_code_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_medicine_code BEFORE INSERT ON medicines FOR EACH ROW WHEN (NEW.medicine_code IS NULL) EXECUTE FUNCTION set_medicine_code();

CREATE OR REPLACE FUNCTION set_doctor_code() RETURNS TRIGGER AS $$ BEGIN NEW.doctor_code := generate_number('DR', 'doctor_code_seq'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_doctor_code BEFORE INSERT ON doctors FOR EACH ROW WHEN (NEW.doctor_code IS NULL) EXECUTE FUNCTION set_doctor_code();

-- Full name compute triggers
CREATE OR REPLACE FUNCTION compute_patient_full_name() RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name := trim(NEW.first_name || ' ' || NEW.last_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_compute_patient_full_name BEFORE INSERT OR UPDATE OF first_name, last_name ON patients FOR EACH ROW EXECUTE FUNCTION compute_patient_full_name();

CREATE OR REPLACE FUNCTION compute_doctor_full_name() RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name := trim(NEW.first_name || ' ' || NEW.last_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_compute_doctor_full_name BEFORE INSERT OR UPDATE OF first_name, last_name ON doctors FOR EACH ROW EXECUTE FUNCTION compute_doctor_full_name();


-- 7. COMPLEX FUNCTIONS

-- get_fefo_batches
CREATE OR REPLACE FUNCTION get_fefo_batches(p_medicine_id UUID, p_quantity INT)
RETURNS TABLE (batch_id UUID, batch_number TEXT, expiry_date DATE, available_qty INT, allocate_qty INT) AS $$
DECLARE
    v_remaining_qty INT := p_quantity;
    v_batch RECORD;
BEGIN
    FOR v_batch IN 
        SELECT id, mb.batch_number, mb.expiry_date, mb.quantity
        FROM medicine_batches mb
        WHERE mb.medicine_id = p_medicine_id 
          AND mb.quantity > 0 
          AND mb.expiry_date >= CURRENT_DATE
          AND mb.is_active = true
        ORDER BY mb.expiry_date ASC
    LOOP
        IF v_remaining_qty <= 0 THEN
            EXIT;
        END IF;

        batch_id := v_batch.id;
        batch_number := v_batch.batch_number;
        expiry_date := v_batch.expiry_date;
        available_qty := v_batch.quantity;
        
        IF v_batch.quantity >= v_remaining_qty THEN
            allocate_qty := v_remaining_qty;
            v_remaining_qty := 0;
        ELSE
            allocate_qty := v_batch.quantity;
            v_remaining_qty := v_remaining_qty - v_batch.quantity;
        END IF;

        RETURN NEXT;
    END LOOP;

    IF v_remaining_qty > 0 THEN
        RAISE EXCEPTION 'Insufficient stock for medicine ID %', p_medicine_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- create_inventory_transaction
CREATE OR REPLACE FUNCTION create_inventory_transaction(
    p_medicine_id UUID,
    p_batch_id UUID,
    p_type TEXT,
    p_qty INT,
    p_ref_type TEXT,
    p_ref_id UUID,
    p_performed_by UUID,
    p_notes TEXT
) RETURNS VOID AS $$
DECLARE
    v_prev_qty INT;
    v_new_qty INT;
BEGIN
    SELECT quantity INTO v_prev_qty FROM medicine_batches WHERE id = p_batch_id;
    
    IF p_type IN ('SALE', 'DISCARD', 'ADJUSTMENT_OUT') THEN
        v_new_qty := v_prev_qty - p_qty;
    ELSIF p_type IN ('PURCHASE', 'RETURN', 'ADJUSTMENT_IN') THEN
        v_new_qty := v_prev_qty + p_qty;
    ELSE
        v_new_qty := v_prev_qty;
    END IF;

    INSERT INTO inventory_transactions (
        medicine_id, batch_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, performed_by, notes
    ) VALUES (
        p_medicine_id, p_batch_id, p_type, p_qty, v_prev_qty, v_new_qty, p_ref_type, p_ref_id, p_performed_by, p_notes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- create_audit_log
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_user_name TEXT,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_metadata JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, metadata)
    VALUES (p_user_id, p_user_name, p_action, p_entity_type, p_entity_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- check_and_create_inventory_alerts
CREATE OR REPLACE FUNCTION check_and_create_inventory_alerts() RETURNS VOID AS $$
DECLARE
    v_med RECORD;
    v_total_stock INT;
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM profiles WHERE role = 'ADMIN' LIMIT 1;
    
    FOR v_med IN SELECT id, name, minimum_stock FROM medicines WHERE is_active = true LOOP
        SELECT COALESCE(SUM(quantity), 0) INTO v_total_stock FROM medicine_batches WHERE medicine_id = v_med.id AND is_active = true AND expiry_date >= CURRENT_DATE;
        
        IF v_total_stock <= 0 THEN
            INSERT INTO notifications (user_id, type, title, message, severity)
            VALUES (v_admin_id, 'INVENTORY', 'Out of Stock', v_med.name || ' is completely out of stock.', 'error');
        ELSIF v_total_stock <= v_med.minimum_stock THEN
            INSERT INTO notifications (user_id, type, title, message, severity)
            VALUES (v_admin_id, 'INVENTORY', 'Low Stock', v_med.name || ' is below minimum stock level (' || v_total_stock || ' remaining).', 'warning');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- perform_pharmacy_sale
CREATE OR REPLACE FUNCTION perform_pharmacy_sale(
    p_patient_id UUID,
    p_prescription_id UUID,
    p_items JSONB,
    p_payment_method TEXT,
    p_amount_paid NUMERIC,
    p_performed_by UUID,
    p_notes TEXT
) RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_invoice_id UUID;
    v_payment_id UUID;
    v_receipt_id UUID;
    v_item JSONB;
    v_med_name TEXT;
    v_batch_num TEXT;
    v_expiry DATE;
    v_qty INT;
    v_unit_price NUMERIC;
    v_discount NUMERIC;
    v_tax_rate NUMERIC;
    v_item_total NUMERIC;
    v_item_tax NUMERIC;
    v_subtotal NUMERIC := 0;
    v_total_discount NUMERIC := 0;
    v_total_tax NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_batch RECORD;
BEGIN
    -- 1. Create initial Sale record
    INSERT INTO sales (patient_id, prescription_id, payment_method, performed_by, notes)
    VALUES (p_patient_id, p_prescription_id, p_payment_method, p_performed_by, p_notes)
    RETURNING id INTO v_sale_id;

    -- 2. Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item->>'quantity')::INT;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_discount := COALESCE((v_item->>'discount')::NUMERIC, 0);
        v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 0);
        
        -- Validate and reduce stock
        SELECT id, batch_number, expiry_date, quantity INTO v_batch
        FROM medicine_batches
        WHERE id = (v_item->>'batch_id')::UUID AND is_active = true
        FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch not found %', (v_item->>'batch_id');
        END IF;
        
        IF v_batch.expiry_date < CURRENT_DATE THEN
            RAISE EXCEPTION 'Batch % is expired', v_batch.batch_number;
        END IF;
        
        IF v_batch.quantity < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for batch %', v_batch.batch_number;
        END IF;
        
        UPDATE medicine_batches SET quantity = quantity - v_qty WHERE id = v_batch.id;
        
        SELECT name INTO v_med_name FROM medicines WHERE id = (v_item->>'medicine_id')::UUID;
        
        -- Calculate item totals
        v_item_tax := ((v_unit_price * v_qty) - v_discount) * (v_tax_rate / 100);
        v_item_total := ((v_unit_price * v_qty) - v_discount) + v_item_tax;
        
        v_subtotal := v_subtotal + (v_unit_price * v_qty);
        v_total_discount := v_total_discount + v_discount;
        v_total_tax := v_total_tax + v_item_tax;
        v_total_amount := v_total_amount + v_item_total;
        
        -- Insert sale item
        INSERT INTO sale_items (sale_id, medicine_id, batch_id, medicine_name, batch_number, expiry_date, quantity, unit_price, discount_amount, tax_amount, total_amount)
        VALUES (v_sale_id, (v_item->>'medicine_id')::UUID, v_batch.id, v_med_name, v_batch.batch_number, v_batch.expiry_date, v_qty, v_unit_price, v_discount, v_item_tax, v_item_total);
        
        -- Create inventory transaction
        PERFORM create_inventory_transaction((v_item->>'medicine_id')::UUID, v_batch.id, 'SALE', v_qty, 'SALE', v_sale_id, p_performed_by, 'Pharmacy Sale');
    END LOOP;

    -- Update Sale totals
    UPDATE sales SET 
        subtotal = v_subtotal, 
        discount_amount = v_total_discount, 
        tax_amount = v_total_tax, 
        total_amount = v_total_amount,
        amount_paid = p_amount_paid,
        change_amount = p_amount_paid - v_total_amount,
        payment_status = CASE WHEN p_amount_paid >= v_total_amount THEN 'paid' ELSE 'pending' END
    WHERE id = v_sale_id;

    -- 3. Create Invoice
    INSERT INTO invoices (patient_id, sale_id, invoice_type, subtotal, discount_amount, tax_amount, total_amount, notes)
    VALUES (p_patient_id, v_sale_id, 'pharmacy', v_subtotal, v_total_discount, v_total_tax, v_total_amount, 'Pharmacy Sale Invoice')
    RETURNING id INTO v_invoice_id;
    
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, discount_amount, tax_amount, total_amount, reference_type, reference_id)
    VALUES (v_invoice_id, 'Pharmacy Sale', 1, v_subtotal, v_total_discount, v_total_tax, v_total_amount, 'sale', v_sale_id);

    -- 4. Create Payment
    INSERT INTO payments (invoice_id, patient_id, amount, payment_method, payment_status, received_by)
    VALUES (v_invoice_id, p_patient_id, p_amount_paid, p_payment_method, 'completed', p_performed_by)
    RETURNING id INTO v_payment_id;

    -- 5. Create Receipt
    INSERT INTO receipts (invoice_id, payment_id, patient_id, receipt_type, total_amount, payment_method, amount_paid, change_amount)
    VALUES (v_invoice_id, v_payment_id, p_patient_id, 'pharmacy', v_total_amount, p_payment_method, p_amount_paid, p_amount_paid - v_total_amount)
    RETURNING id INTO v_receipt_id;

    -- 6. Update Prescription if applicable
    IF p_prescription_id IS NOT NULL THEN
        UPDATE prescriptions SET status = 'dispensed' WHERE id = p_prescription_id;
    END IF;

    RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. AUTO-CREATE PROFILE TRIGGER FOR AUTH USERS
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, is_active)
  VALUES (NEW.id, 'RECEPTIONIST', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In Supabase, the auth schema is separate. We attach the trigger there.
-- Ensure we only create it if we have permissions, or drop it first cleanly.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

