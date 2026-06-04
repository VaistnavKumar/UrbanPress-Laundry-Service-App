// src/pages/Register.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.email || !form.password) {
      return toast.error('Please fill all fields')
    }
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }
    const phoneRegex = /^[6-9]\d{9}$/
    if (!phoneRegex.test(form.phone)) {
      return toast.error('Enter a valid 10-digit Indian mobile number')
    }
    setLoading(true)
    try {
      await axiosInstance.post('/api/auth/register', {
        name: form.name,
        phone: `+91${form.phone}`,
        email: form.email,
        password: form.password,
      })
      toast.success('Account created! Please login 🎉')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'name',            icon: User,  type: 'text',     placeholder: 'Full Name',             label: 'Full Name' },
    { key: 'email',           icon: Mail,  type: 'email',    placeholder: 'your@email.com',         label: 'Email' },
    { key: 'password',        icon: Lock,  type: 'password', placeholder: 'Create password',        label: 'Password' },
    { key: 'confirmPassword', icon: Lock,  type: 'password', placeholder: 'Confirm password',       label: 'Confirm Password' },
  ]

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col pb-8">
      {/* Top header */}
      <div className="relative flex-none h-44 overflow-hidden bg-brand-cream">
        <motion.div
          className="absolute -top-8 -right-8 w-40 h-40 bg-brand-gold/15 rounded-full"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="relative z-10 flex flex-col h-full px-6 justify-end pb-6 pt-6">
          <button onClick={() => navigate('/login')} className="flex items-center gap-1.5 text-slate-500 text-sm mb-3 w-fit hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </button>
          <h1 className="text-slate-900 font-black text-2xl">Create Account</h1>
          <p className="text-slate-500 text-sm">Join UrbanPress today</p>
        </div>
      </div>

      {/* Form */}
      <motion.div
        className="flex-1 bg-white rounded-3xl mx-4 mb-4 px-6 py-8 border border-slate-200 shadow-card relative z-10"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Phone field */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Mobile Number</label>
            <div className="flex">
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 border-r-0 rounded-l-xl px-3 py-3.5">
                <span className="text-sm">🇮🇳</span>
                <span className="text-sm text-gray-600 font-medium">+91</span>
              </div>
              <div className="relative flex-1">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="register-phone"
                  type="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  maxLength={10}
                  placeholder="10-digit number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-r-xl pl-9 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
                />
              </div>
            </div>
          </div>

          {fields.map(({ key, icon: Icon, type, placeholder, label }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">{label}</label>
              <div className="relative">
                <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id={`register-${key}`}
                  type={type === 'password' ? (showPass ? 'text' : 'password') : type}
                  value={form[key]}
                  onChange={update(key)}
                  placeholder={placeholder}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
                />
                {type === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <motion.button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gold hover:opacity-95 text-slate-900 font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 mt-2 transition-all"
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>Create Account <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>

        <p className="text-center text-sm text-muted mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-slate-900 font-extrabold hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  )
}
