import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isRole: (role: UserRole | UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Role-based permissions map
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  RECEPTIONIST: [
    'patients.view', 'patients.create', 'patients.edit',
    'appointments.view', 'appointments.create', 'appointments.edit',
    'billing.view', 'billing.create',
    'receipts.view', 'receipts.print',
    'dashboard.view',
  ],
  DOCTOR: [
    'appointments.view',
    'patients.view',
    'consultations.view', 'consultations.create', 'consultations.edit',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.edit',
    'dashboard.view',
  ],
  PHARMACIST: [
    'pharmacy.view', 'pharmacy.create',
    'prescriptions.view', 'prescriptions.dispense',
    'inventory.view',
    'medicines.view',
    'batches.view',
    'dashboard.view',
  ],
  CASHIER: [
    'billing.view', 'billing.create',
    'payments.view', 'payments.create',
    'receipts.view', 'receipts.print', 'receipts.reprint',
    'dashboard.view',
  ],
  INVENTORY_MANAGER: [
    'inventory.view', 'inventory.create', 'inventory.edit',
    'medicines.view', 'medicines.create', 'medicines.edit',
    'batches.view', 'batches.create', 'batches.edit',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'purchases.view', 'purchases.create', 'purchases.edit',
    'dashboard.view',
  ],
  MANAGER: [
    'dashboard.view',
    'reports.view',
    'inventory.view',
    'billing.view',
    'patients.view',
    'appointments.view',
    'staff.view',
  ],
  LAB_TECH: [
    'lab.view', 'lab.create', 'lab.edit',
    'patients.view',
    'dashboard.view',
  ],
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session safely
    supabase.auth.getSession()
      .then(({ data }) => {
        const session = data?.session ?? null
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Error getting initial session:', err)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        // If profile doesn't exist yet (new user), create a basic one
        if (error.code === 'PGRST116') {
          setProfile(null)
        }
      } else {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: error as Error | null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
    setUser(null)
  }

  const isRole = (role: UserRole | UserRole[]) => {
    if (!profile) return false
    if (Array.isArray(role)) {
      return role.includes(profile.role)
    }
    return profile.role === role
  }

  const hasPermission = (permission: string) => {
    if (!profile) return false
    const perms = ROLE_PERMISSIONS[profile.role] || []
    if (perms.includes('*')) return true
    return perms.includes(permission)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signOut,
        isRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
