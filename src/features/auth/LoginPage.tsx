import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Activity, Eye, EyeOff, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Try signing in first
    const { error: signInErr } = await signIn(email, password)

    if (signInErr) {
      // If user doesn't exist yet, attempt auto-signup with Supabase Auth
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0].toUpperCase(),
              role: email.includes('admin') ? 'ADMIN' :
                    email.includes('doctor') ? 'DOCTOR' :
                    email.includes('pharm') ? 'PHARMACIST' :
                    email.includes('cash') ? 'CASHIER' : 'RECEPTIONIST'
            }
          }
        })

        if (signUpErr) {
          setError(signUpErr.message || 'Invalid email or password. Please check your credentials.')
          setLoading(false)
          return
        }

        if (signUpData?.user) {
          // Create or ensure profile exists
          const role = email.includes('admin') ? 'ADMIN' :
                       email.includes('doctor') ? 'DOCTOR' :
                       email.includes('pharm') ? 'PHARMACIST' :
                       email.includes('cash') ? 'CASHIER' : 'RECEPTIONIST'

          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            role,
            full_name: email.split('@')[0].toUpperCase(),
            is_active: true
          })

          navigate('/dashboard')
          return
        }
      } catch (err: any) {
        setError(err.message || 'Authentication error. Please try again.')
        setLoading(false)
        return
      }

      setError('Invalid email or password. Please try again or run migrations in Supabase.')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mithra Hospital</h1>
          <p className="text-sm text-gray-500 mt-1">POS & Patient Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                  placeholder="admin@mithra.hospital"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo Credentials & Quick Fill */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-gray-700">Demo Accounts:</p>
              <span className="text-[10px] font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-bold">
                Password: Password@123
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@mithra.hospital')
                  setPassword('Password@123')
                }}
                className="text-left bg-gray-50 hover:bg-teal-50 hover:border-teal-200 border border-transparent rounded-lg p-2 transition-all"
              >
                <span className="font-bold text-teal-700">Admin</span>
                <br />
                <span className="text-[11px] text-gray-500">admin@mithra.hospital</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('doctor@mithra.hospital')
                  setPassword('Password@123')
                }}
                className="text-left bg-gray-50 hover:bg-teal-50 hover:border-teal-200 border border-transparent rounded-lg p-2 transition-all"
              >
                <span className="font-bold text-teal-700">Doctor</span>
                <br />
                <span className="text-[11px] text-gray-500">doctor@mithra.hospital</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('pharmacy@mithra.hospital')
                  setPassword('Password@123')
                }}
                className="text-left bg-gray-50 hover:bg-teal-50 hover:border-teal-200 border border-transparent rounded-lg p-2 transition-all"
              >
                <span className="font-bold text-teal-700">Pharmacist</span>
                <br />
                <span className="text-[11px] text-gray-500">pharmacy@mithra.hospital</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('reception@mithra.hospital')
                  setPassword('Password@123')
                }}
                className="text-left bg-gray-50 hover:bg-teal-50 hover:border-teal-200 border border-transparent rounded-lg p-2 transition-all"
              >
                <span className="font-bold text-teal-700">Receptionist</span>
                <br />
                <span className="text-[11px] text-gray-500">reception@mithra.hospital</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Mithra Hospital. All rights reserved.
        </p>
      </div>
    </div>
  )
}
