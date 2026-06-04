// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'
import { useAuthStore } from '../context/AuthContext'



export default function Login() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  // ── Helper: save user & navigate ─────────────────────────────────────────
  const loginSuccess = (user, token) => {
    if (!token) return toast.error('Authentication token missing')
    setToken(token)
    setUser(user)
    toast.success(`Welcome, ${user.name}! 👋`)
    navigate('/home')
  }

  // ── Email / Password login ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill all fields')
    setLoading(true)
    try {
      const res = await axiosInstance.post('/api/auth/login', { email, password })
      loginSuccess(res.data.user, res.data.token)
    } catch (err) {
      if (!err.response) {
        toast.error('Server is currently unreachable. Please check your network connection.')
      } else {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    try {
      const res = await axiosInstance.post('/api/auth/google', {
        token: credentialResponse.credential,
      })
      loginSuccess(res.data.user, res.data.token)
    } catch (err) {
      if (!err.response) {
        toast.error('Server is currently unreachable. Please check your network connection.')
      } else {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Google sign-in failed. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-brand-cream flex flex-col pb-8">
      {/* Top decorative section */}
      <div className="relative flex-none h-52 overflow-hidden bg-brand-cream">
        <motion.div
          className="absolute -top-10 -left-10 w-48 h-48 bg-brand-gold/15 rounded-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-6 -right-6 w-36 h-36 bg-brand-gold/20 rounded-full"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center h-full pt-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3 border border-slate-200 shadow-sm overflow-hidden p-2">
            <img src="/logo.png" alt="UrbanPress Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-slate-900 font-black text-2xl">UrbanPress</h1>
          <p className="text-slate-500 text-sm mt-1">Fresh clothes. Delivered.</p>
        </div>
      </div>

      {/* Form card */}
      <motion.div
        className="flex-1 bg-white rounded-3xl mx-4 mb-4 px-6 py-8 border border-slate-200 shadow-card relative z-10"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h2 className="text-2xl font-black text-brand-navy mb-1">Welcome back</h2>
        <p className="text-muted text-sm mb-6">Sign in to your account</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Sign In button */}
          <motion.button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gold hover:opacity-95 text-slate-900 font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 mt-2 transition-all"
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-gray-400 font-medium">or continue with</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Google Login */}
        <div className="flex justify-center mb-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google sign-in failed. Check your Client ID.')}
            theme="outline"
            shape="pill"
            size="large"
            text="signin_with"
          />
        </div>

        <p className="text-center text-sm text-muted mt-5">
          Don't have an account?{' '}
          <Link to="/register" className="text-slate-900 font-extrabold hover:underline">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
