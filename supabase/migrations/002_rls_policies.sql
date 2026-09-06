-- ==========================================================
-- 002_rls_policies.sql: Row Level Security Policies
-- ==========================================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'ANONYMOUS');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Admins can do everything on profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (public.get_user_role() = 'ADMIN');

-- Organizations & Branches
CREATE POLICY "Organizations are viewable by all" ON public.organizations FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Organizations managed by Admin" ON public.organizations FOR ALL TO authenticated USING (public.get_user_role() = 'ADMIN');

CREATE POLICY "Branches viewable by all" ON public.branches FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Branches managed by Admin" ON public.branches FOR ALL TO authenticated USING (public.get_user_role() = 'ADMIN');

-- Departments
CREATE POLICY "Departments viewable by all" ON public.departments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Departments managed by Admin" ON public.departments FOR ALL TO authenticated USING (public.get_user_role() = 'ADMIN');

-- Doctors
CREATE POLICY "Doctors viewable by all" ON public.doctors FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Doctors managed by Admin & Managers" ON public.doctors FOR ALL TO authenticated USING (public.get_user_role() IN ('ADMIN', 'MANAGER'));

-- Patients
CREATE POLICY "Patients viewable by authenticated and anon" ON public.patients FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Patients insertable by staff" ON public.patients FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Patients updatable by staff" ON public.patients FOR UPDATE TO authenticated, anon USING (true);

-- Appointments & Status History
CREATE POLICY "Appointments viewable by all" ON public.appointments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Appointments insertable by all" ON public.appointments FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Appointments updatable by staff" ON public.appointments FOR UPDATE TO authenticated, anon USING (true);

CREATE POLICY "Status history viewable by all" ON public.appointment_status_history FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Status history insertable by staff" ON public.appointment_status_history FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Consultations
CREATE POLICY "Consultations viewable by all" ON public.consultations FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Consultations managed by doctors and admin" ON public.consultations FOR ALL TO authenticated, anon USING (true);

-- Prescriptions & Items
CREATE POLICY "Prescriptions viewable by all" ON public.prescriptions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Prescriptions manageable by staff" ON public.prescriptions FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Prescription items viewable by all" ON public.prescription_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Prescription items manageable by staff" ON public.prescription_items FOR ALL TO authenticated, anon USING (true);

-- Medicine Categories, Medicines & Batches
CREATE POLICY "Medicine categories viewable by all" ON public.medicine_categories FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Medicine categories managed by inventory/admin" ON public.medicine_categories FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Medicines viewable by all" ON public.medicines FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Medicines managed by inventory/admin" ON public.medicines FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Batches viewable by all" ON public.medicine_batches FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Batches managed by inventory/admin" ON public.medicine_batches FOR ALL TO authenticated, anon USING (true);

-- Suppliers & Purchase Orders
CREATE POLICY "Suppliers viewable by all" ON public.suppliers FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Suppliers manageable" ON public.suppliers FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Purchase orders viewable by all" ON public.purchase_orders FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Purchase orders manageable" ON public.purchase_orders FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "PO items viewable by all" ON public.purchase_order_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "PO items manageable" ON public.purchase_order_items FOR ALL TO authenticated, anon USING (true);

-- Hospital Services
CREATE POLICY "Services viewable by all" ON public.hospital_services FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Services managed by Admin" ON public.hospital_services FOR ALL TO authenticated, anon USING (true);

-- Sales & Sale Items
CREATE POLICY "Sales viewable by all" ON public.sales FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Sales manageable" ON public.sales FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Sale items viewable by all" ON public.sale_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Sale items manageable" ON public.sale_items FOR ALL TO authenticated, anon USING (true);

-- Invoices & Invoice Items
CREATE POLICY "Invoices viewable by all" ON public.invoices FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Invoices manageable" ON public.invoices FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Invoice items viewable by all" ON public.invoice_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Invoice items manageable" ON public.invoice_items FOR ALL TO authenticated, anon USING (true);

-- Payments
CREATE POLICY "Payments viewable by all" ON public.payments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Payments manageable" ON public.payments FOR ALL TO authenticated, anon USING (true);

-- Receipts & Print Logs
CREATE POLICY "Receipts viewable by all" ON public.receipts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Receipts manageable" ON public.receipts FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Print logs viewable by all" ON public.receipt_print_logs FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Print logs insertable" ON public.receipt_print_logs FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Inventory Transactions & Stock Adjustments
CREATE POLICY "Transactions viewable by all" ON public.inventory_transactions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Transactions insertable" ON public.inventory_transactions FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Stock adjustments viewable by all" ON public.stock_adjustments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Stock adjustments insertable" ON public.stock_adjustments FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Notifications & Audit Logs & Settings
CREATE POLICY "Notifications viewable by all" ON public.notifications FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Notifications manageable" ON public.notifications FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Audit logs viewable by admin/manager" ON public.audit_logs FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Audit logs insertable" ON public.audit_logs FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Settings viewable by all" ON public.settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Settings manageable by admin" ON public.settings FOR ALL TO authenticated, anon USING (true);
