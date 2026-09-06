-- ====================================================================
-- Script to create demo users directly in Supabase Auth & Profiles
-- Run this in Supabase SQL Editor:
-- Password for all demo accounts: Password@123
-- ====================================================================

-- 1. Function to safely create an auth user with encrypted password
CREATE OR REPLACE FUNCTION create_demo_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-00-00-00-00-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      v_encrypted_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      NOW(),
      NOW()
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  -- Ensure profile exists with the correct role and full name
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (v_user_id, p_full_name, p_role, true)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      is_active = true;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the standard demo accounts with password: Password@123
DO $$
BEGIN
  -- Admin
  PERFORM create_demo_auth_user('admin@mithra.hospital', 'Password@123', 'Dr. Rajesh Rao (Administrator)', 'ADMIN');
  
  -- Doctor
  PERFORM create_demo_auth_user('doctor@mithra.hospital', 'Password@123', 'Dr. Petra Winsburry', 'DOCTOR');
  
  -- Pharmacist
  PERFORM create_demo_auth_user('pharmacy@mithra.hospital', 'Password@123', 'Suresh Kumar (Chief Pharmacist)', 'PHARMACIST');
  
  -- Receptionist
  PERFORM create_demo_auth_user('reception@mithra.hospital', 'Password@123', 'Ananya Sharma (Front Desk)', 'RECEPTIONIST');
  
  -- Cashier
  PERFORM create_demo_auth_user('cashier@mithra.hospital', 'Password@123', 'Pooja Verma (Billing Cashier)', 'CASHIER');

  -- Inventory Manager
  PERFORM create_demo_auth_user('inventory@mithra.hospital', 'Password@123', 'Vikram Reddy (Inventory Lead)', 'INVENTORY_MANAGER');

  -- General Manager
  PERFORM create_demo_auth_user('manager@mithra.hospital', 'Password@123', 'Ramesh Gupta (Operations Manager)', 'MANAGER');
END $$;
