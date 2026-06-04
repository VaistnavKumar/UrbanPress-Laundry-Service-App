// src/pages/Profile.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, Mail, MapPin, Bell, BellOff, LogOut,
  ChevronRight, Plus, HelpCircle, Shield,
  Edit3, CheckCircle2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'
import { useAuthStore } from '../context/AuthContext'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { staticMapUrl } from '../utils/geoapify'
import Modal from '../components/Modal'

// ── Tiny map thumbnail with graceful error fallback ──────────────────────────
function MiniMap({ lat, lon }) {
  const [err, setErr] = useState(false)
  const src = staticMapUrl(lat, lon, 14)
  if (!src || err) {
    return (
      <div className="w-full h-20 bg-brand-light border border-brand-gold/30 rounded-xl flex items-center justify-center mb-2">
        <MapPin size={18} className="text-brand-primary" />
        <span className="text-brand-navy text-xs font-bold ml-1">Map preview</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt="Map"
      onError={() => setErr(true)}
      className="w-full h-20 object-cover rounded-xl mb-2"
    />
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, setUser, setLocation, logout } = useAuthStore()

  // ── Derive saved addresses from user object ─────────────────────────────
  const buildAddresses = (u) => {
    const list = []
    // Primary location saved from the location modal
    if (u?.location?.address) {
      list.push({
        label: u.location.address,
        lat:   u.location.latitude,
        lon:   u.location.longitude,
        primary: true,
      })
    }
    // Extra addresses
    if (Array.isArray(u?.addresses)) {
      u.addresses.forEach((a) => list.push(a))
    }
    return list
  }

  const [notifEnabled, setNotifEnabled]     = useState(user?.notificationsEnabled ?? true)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [addresses, setAddresses]           = useState(buildAddresses(user))

  // Re-sync addresses whenever user changes (e.g. after setting location)
  useEffect(() => {
    setAddresses(buildAddresses(user))
  }, [user?.location, user?.addresses])

  // ── Toggle push notifications (works offline) ───────────────────────────
  const toggleNotifications = async () => {
    const next = !notifEnabled
    setNotifEnabled(next)                         // optimistic UI update
    toast.success(`Notifications ${next ? 'enabled 🔔' : 'disabled 🔕'}`)
    try {
      await axiosInstance.put('/api/user/notifications-preference', { enabled: next })
    } catch {
      // Backend offline — preference is saved in local state, no revert needed
    }
  }

  // ── Add new address ─────────────────────────────────────────────────────
  const handleAddAddress = (s) => {
    const newAddr = { label: s.label, lat: s.lat, lon: s.lon }
    setAddresses((prev) => [...prev, newAddr])
    // Also update the user store so it persists
    setLocation({ latitude: s.lat, longitude: s.lon, address: s.label })
    setShowAddAddress(false)
    toast.success('Address added!')
    // Try backend in background
    axiosInstance.put('/api/user/location', {
      latitude:  s.lat,
      longitude: s.lon,
      address:   s.label,
    }).catch(() => {})
  }

  // ── Remove address ──────────────────────────────────────────────────────
  const removeAddress = (idx) => {
    setAddresses((prev) => prev.filter((_, i) => i !== idx))
    toast.success('Address removed')
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await axiosInstance.delete('/api/user/fcm-token') } catch { /* ignore */ }
    logout()
    toast.success('Logged out successfully')
    navigate('/login', { replace: true })
  }

  // ── Avatar initials ─────────────────────────────────────────────────────
  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="min-h-screen bg-brand-cream pb-24">
      {/* ── Title Header ── */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-slate-900 font-black text-3xl tracking-tight">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account</p>
      </div>

      <div className="px-4 space-y-4 relative z-10">

        {/* ── User card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 shadow-card border border-slate-200"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-brand-gold rounded-2xl flex items-center justify-center text-slate-900 font-black text-2xl shadow shrink-0 border border-brand-gold/20">
              {initials}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-brand-navy text-xl leading-tight truncate">
                {user?.name || 'Guest User'}
              </h2>

              {user?.email && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Mail size={12} className="text-slate-400 shrink-0" />
                  <p className="text-muted text-sm truncate">{user.email}</p>
                </div>
              )}

              {user?.phone && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  <p className="text-muted text-sm">{user.phone}</p>
                </div>
              )}

              {!user?.email && !user?.phone && (
                <p className="text-xs text-muted mt-1 italic">No contact info saved</p>
              )}
            </div>
          </div>

          {/* Membership badge */}
          <div className="mt-4 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
            <CheckCircle2 size={14} className="text-slate-800" />
            <span className="text-xs font-semibold text-brand-navy">Verified Member</span>
            <span className="ml-auto text-xs text-slate-550 font-medium">By google</span>
          </div>
        </motion.div>

        {/* ── Saved Addresses ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-brand-navy flex items-center gap-2">
              <MapPin size={15} className="text-slate-800" /> Saved Addresses
            </h3>
            <button
              id="add-address-btn"
              onClick={() => setShowAddAddress(true)}
              className="flex items-center gap-1 text-slate-900 bg-brand-gold hover:opacity-95 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
            >
              <Plus size={12} /> Add New
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200/50">
                <MapPin size={20} className="text-slate-400" />
              </div>
              <p className="font-semibold text-brand-navy text-sm">No addresses yet</p>
              <p className="text-muted text-xs mt-1">Tap "Add New" to add a pickup address</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {addresses.map((addr, i) => (
                <div key={i} className="p-4">
                  {addr.lat && addr.lon && (
                    <MiniMap lat={addr.lat} lon={addr.lon} />
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="text-slate-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700 flex-1 leading-snug">{addr.label}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {addr.primary && (
                        <span className="text-xs bg-brand-gold/20 text-slate-950 font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Primary
                        </span>
                      )}
                      {!addr.primary && (
                        <button
                          onClick={() => removeAddress(i)}
                          className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center"
                          aria-label="Remove address"
                        >
                          <X size={11} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Settings card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden"
        >
          {/* Notifications toggle */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${notifEnabled ? 'bg-brand-gold/15' : 'bg-gray-100'}`}>
                {notifEnabled
                  ? <Bell size={16} className="text-slate-800" />
                  : <BellOff size={16} className="text-gray-400" />}
              </div>
              <div>
                <p className="font-semibold text-brand-navy text-sm">Push Notifications</p>
                <p className="text-xs text-muted">
                  {notifEnabled ? 'Order updates enabled' : 'All notifications off'}
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              id="notif-toggle"
              onClick={toggleNotifications}
              aria-label="Toggle notifications"
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                notifEnabled ? 'bg-brand-gold' : 'bg-gray-200'
              }`}
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 bg-slate-900 rounded-full shadow-sm"
                animate={{ left: notifEnabled ? '26px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Help */}
          <button className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200/50">
                <HelpCircle size={16} className="text-slate-700" />
              </div>
              <p className="font-semibold text-brand-navy text-sm">Help & Support</p>
            </div>
            <ChevronRight size={15} className="text-gray-400" />
          </button>



          {/* Privacy */}
          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200/50">
                <Shield size={16} className="text-slate-700" />
              </div>
              <p className="font-semibold text-brand-navy text-sm">Privacy Policy</p>
            </div>
            <ChevronRight size={15} className="text-gray-400" />
          </button>

        </motion.div>


        {/* ── Logout ── */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          id="logout-btn"
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-red-50 border-2 border-red-100 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </motion.button>

        <p className="text-center text-xs text-gray-400 pb-4">UrbanPress v1.0 · Tirupati</p>
      </div>

      {/* ── Add Address Modal ── */}
      <Modal
        isOpen={showAddAddress}
        onClose={() => setShowAddAddress(false)}
        title="📍 Add New Address"
      >
        <p className="text-muted text-sm mb-4">Search for your pickup address</p>
        <AddressAutocomplete
          onSelect={handleAddAddress}
          placeholder="Search address in India..."
        />
        <p className="text-xs text-muted mt-4 text-center">
          Showing results filtered for India 🇮🇳
        </p>
      </Modal>
    </div>
  )
}
