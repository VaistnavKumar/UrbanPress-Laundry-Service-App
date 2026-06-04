// src/pages/OrderConfirm.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Calendar, CreditCard, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'
import Modal from '../components/Modal'
import StarRating from '../components/StarRating'
import { useOrderStore } from '../context/OrderContext'
import { useNotificationStore, useAuthStore } from '../context/AuthContext'

export default function OrderConfirm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lastOrder } = useOrderStore()
  const { addNotification } = useNotificationStore()
  const { user } = useAuthStore()

  const orderData = location.state || lastOrder || {}
  const {
    orderId, address, pickupDate, pickupSlot, serviceType, grandTotal, items = [],
    wasRescheduled = false, originalDate = null, originalSlot = null
  } = orderData

  const [showRating, setShowRating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [notificationSent, setNotificationSent] = useState(false)

  useEffect(() => {
    // Show rating modal first (for returning users), then confirmation
    // For first order just go straight to confirm
    setTimeout(() => setShowConfirm(true), 300)
  }, [])

  useEffect(() => {
    if (wasRescheduled && !notificationSent) {
      // 1. Add notification to the notification store (Push Notification simulation)
      addNotification({
        id: 'reschedule-' + Date.now(),
        title: 'Order Rescheduled 📅',
        body: `Your Urban Press booking has been rescheduled to ${pickupDate} at ${pickupSlot} due to high demand.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        type: 'alert',
      })

      // Show toast push notification banner
      toast(`Urban Press booking rescheduled to ${pickupDate} due to high demand!`, {
        icon: '🔔',
        duration: 6000,
      })

      // 2. Open the simulated Email modal
      const timer = setTimeout(() => {
        setShowEmailModal(true)
      }, 1500)

      setNotificationSent(true)
      return () => clearTimeout(timer)
    }
  }, [wasRescheduled, notificationSent])

  const serviceLabels = {
    wash_fold: '🫧 Wash & Fold',
    wash_iron: '👕 Wash & Iron',
    dry_clean: '✨ Dry Clean',
    steam_iron: '♨️ Steam Iron',
  }

  const submitRating = async () => {
    if (rating === 0) return toast.error('Please select a rating')
    setRatingLoading(true)
    try {
      await axiosInstance.post('/api/reviews', {
        orderId,
        rating,
        comment,
      })
      toast.success('Thank you for your review! ⭐')
      setShowRating(false)
      setShowConfirm(true)
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setRatingLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center text-slate-900 p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          🧺
        </motion.div>
        <p className="text-slate-650 font-bold">Processing your order...</p>
      </div>

      {/* Rating Modal */}
      <Modal
        isOpen={showRating}
        onClose={() => { setShowRating(false); setShowConfirm(true) }}
        title="Rate Your Last Order"
      >
        <div className="text-center mb-4">
          <p className="text-muted text-sm">How was your experience?</p>
          <div className="flex justify-center mt-4 mb-3">
            <StarRating value={rating} onChange={setRating} size={36} />
          </div>
        </div>
        <textarea
          placeholder="Tell us more (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setShowRating(false); setShowConfirm(true) }}
            className="flex-1 border-2 border-slate-200 text-muted font-semibold py-3 rounded-xl text-sm"
          >
            Skip
          </button>
          <button
            id="submit-rating-btn"
            onClick={submitRating}
            disabled={ratingLoading}
            className="flex-1 bg-brand-gold text-slate-900 font-extrabold py-3 rounded-xl text-sm disabled:opacity-60 shadow-sm"
          >
            {ratingLoading ? '...' : 'Submit ⭐'}
          </button>
        </div>
      </Modal>

      {/* Order Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => navigate('/home')}
        size="lg"
      >
        <div className="text-center mb-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl mb-3"
          >
            ✅
          </motion.div>
          <h2 className="font-black text-2xl text-brand-navy">Order Confirmed!</h2>
          <p className="text-muted text-sm mt-1">
            Order ID: <strong className="text-brand-navy font-mono">#{orderId}</strong>
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 mb-4 border border-slate-200/60">
          <div className="flex gap-3 items-start text-sm">
            <Package size={15} className="text-brand-gold mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-brand-navy">{serviceLabels[serviceType] || '🧺 Laundry Service'}</p>
              {items.length > 0 && (
                <p className="text-muted text-xs">{items.reduce((s, i) => s + i.qty, 0)} items</p>
              )}
            </div>
          </div>
          {address && (
            <div className="flex gap-3 items-start text-sm">
              <MapPin size={15} className="text-brand-gold mt-0.5 shrink-0" />
              <p className="text-slate-700 font-medium">{address}</p>
            </div>
          )}
          {pickupDate && (
            <div className="flex gap-3 items-center text-sm">
              <Calendar size={15} className="text-brand-gold shrink-0" />
              <p className="text-slate-700 font-medium">{pickupDate} · {pickupSlot}</p>
            </div>
          )}
          {grandTotal && (
            <div className="flex gap-3 items-center text-sm">
              <CreditCard size={15} className="text-brand-gold shrink-0" />
              <p className="font-bold text-brand-navy">Paid: ₹{grandTotal}</p>
            </div>
          )}
        </div>

        <div className="bg-brand-light border border-brand-gold/40 rounded-xl p-3 mb-5 flex items-start gap-2">
          <span className="text-lg">🔔</span>
          <p className="text-brand-navy text-xs font-semibold">
            You'll get a push notification when your driver is on the way!
          </p>
        </div>

        <div className="flex gap-3">
          <button
            id="track-order-btn"
            onClick={() => navigate('/orders')}
            className="flex-1 bg-brand-navy text-white font-extrabold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all shadow-sm"
          >
            Track Order
          </button>
          <button
            id="back-home-btn"
            onClick={() => navigate('/home')}
            className="flex-1 border-2 border-slate-200 text-brand-navy font-extrabold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all"
          >
            Back to Home
          </button>
        </div>
      </Modal>

      {/* Simulated Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="📧 Simulated Email Notification"
        size="lg"
      >
        <div className="bg-slate-50 border border-slate-200/85 rounded-2xl overflow-hidden shadow-inner font-sans text-left">
          {/* Email Header */}
          <div className="bg-slate-100 p-4 border-b border-slate-200 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="font-bold text-slate-800">From:</span>
              <span>UrbanPress Support &lt;support@urbanpress.com&gt;</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-800">To:</span>
              <span>{user?.email || 'customer@example.com'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-800">Subject:</span>
              <span className="font-bold text-slate-900">Urban Press Booking Schedule Update</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-800">Date:</span>
              <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Email Body */}
          <div className="p-6 bg-white text-sm text-slate-850 leading-relaxed space-y-4 min-h-[220px]">
            <p className="font-semibold text-slate-900">Dear Customer,</p>
            <p>
              Due to exceptionally high booking volume on your requested date, your order has been successfully scheduled for our next available slot to prevent duplicate allocation and maintain our quality of service.
            </p>
            <div className="p-4 bg-brand-light border-2 border-brand-gold rounded-xl space-y-1.5 shadow-sm max-w-sm mx-auto my-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted font-semibold">New Date:</span>
                <span className="font-extrabold text-slate-950">{pickupDate}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted font-semibold">Time Slot:</span>
                <span className="font-extrabold text-slate-950">{pickupSlot}</span>
              </div>
            </div>
            <p>
              We appreciate your understanding and cooperation.
            </p>
            <div className="border-t pt-4 mt-4 text-xs text-muted">
              <p className="font-bold text-slate-900">UrbanPress Laundry Team</p>
              <p>Tirupati · Hyderabad</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowEmailModal(false)}
          className="w-full bg-brand-navy text-white font-extrabold py-3.5 rounded-xl mt-4 shadow-sm active:scale-[0.98] transition-all"
        >
          Close Email Preview
        </button>
      </Modal>
    </div>
  )
}
