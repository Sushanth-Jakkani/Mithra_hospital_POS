import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface HospitalProfile {
  name: string
  tagline: string
  address: string
  phone: string
  emergency_phone: string
  email: string
  website: string
  gstin: string
  registration_number: string
  currency: string
  currency_symbol: string
  receipt_footer: string
}

// Fallback values only used until the real record loads (or if it's missing).
// This mirrors the defaults in SettingsPage so first-load flicker shows the
// same text, but the moment settings.hospital_profile changes, every screen
// that uses this hook will reflect it.
const DEFAULT_PROFILE: HospitalProfile = {
  name: 'Mithra Superspeciality Hospital & Pharmacy',
  tagline: 'Excellence in Compassionate Healthcare',
  address: '124 Healthcare Boulevard, Jubilee Hills, Hyderabad - 500033',
  phone: '+91 40 2345 6789',
  emergency_phone: '+91 40 2345 9999',
  email: 'care@mithrahospital.in',
  website: 'https://mithrahospital.in',
  gstin: '36AABCM1234F1Z8',
  registration_number: 'TS-MED-REG-2024-8842',
  currency: 'INR',
  currency_symbol: '₹',
  receipt_footer: 'Thank you for choosing Mithra Hospital. Get well soon!',
}

/**
 * Loads the hospital profile (name/address/phone/GSTIN/etc.) from the
 * `settings` table (key = 'hospital_profile') — the same record SettingsPage
 * writes to. Use this anywhere a receipt/bill/prescription prints hospital
 * details instead of hardcoding the text, so edits in Settings show up
 * everywhere immediately.
 */
export function useHospitalProfile() {
  const [profile, setProfile] = useState<HospitalProfile>(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'hospital_profile')
          .maybeSingle()

        if (isMounted && data?.value) {
          setProfile({ ...DEFAULT_PROFILE, ...(data.value as Partial<HospitalProfile>) })
        }
      } catch (err) {
        console.error('Error loading hospital profile:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [])

  return { profile, loading }
}
