import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useHospitalLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('mithra_logo_url') || null
  })

  useEffect(() => {
    let isMounted = true

    const fetchLogo = async () => {
      // 1. Try organizations table
      try {
        const { data } = await supabase
          .from('organizations')
          .select('logo_url')
          .limit(1)
          .maybeSingle()

        if (data?.logo_url && isMounted) {
          setLogoUrl(data.logo_url)
          localStorage.setItem('mithra_logo_url', data.logo_url)
          return
        }
      } catch (err) {
        console.warn('Error fetching organization logo:', err)
      }

      // 2. Try settings table
      try {
        const { data: settingData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'hospital_logo')
          .maybeSingle()

        if (settingData?.value?.url && isMounted) {
          setLogoUrl(settingData.value.url)
          localStorage.setItem('mithra_logo_url', settingData.value.url)
          return
        }
      } catch (err) {
        console.warn('Error fetching settings logo:', err)
      }

      // 3. Try local storage fallback
      const cached = localStorage.getItem('mithra_logo_url')
      if (cached && isMounted) {
        setLogoUrl(cached)
      }
    }

    fetchLogo()

    const handleLogoUpdate = () => {
      const cached = localStorage.getItem('mithra_logo_url')
      if (cached) setLogoUrl(cached)
      fetchLogo()
    }

    window.addEventListener('logo_updated', handleLogoUpdate)
    window.addEventListener('storage', handleLogoUpdate)

    return () => {
      isMounted = false
      window.removeEventListener('logo_updated', handleLogoUpdate)
      window.removeEventListener('storage', handleLogoUpdate)
    }
  }, [])

  return logoUrl
}
