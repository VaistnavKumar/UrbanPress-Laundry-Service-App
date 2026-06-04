// src/pages/Payment.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, CreditCard, Lock, ChevronLeft, Calendar, Clock, Truck, MapPin, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'
import { useOrderStore } from '../context/OrderContext'
import { useAuthStore } from '../context/AuthContext'
import { initiatePayment } from '../utils/razorpay'
import { sendOrderConfirmationEmail } from '../utils/resend'

const SERVICE_LABELS = {
  wash_fold: 'Wash & Fold',
  wash_iron: 'Wash & Iron',
  dry_clean: 'Dry Clean',
  steam_iron: 'Steam Iron',
}

export default function Payment() {
  const navigate = useNavigate()
  const { bookingDraft, setLastOrder, addOrder } = useOrderStore()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const {
    items = [], address, pickupDate, pickupSlot, deliveryType, serviceType,
    steamIronItems = [], dryCleanItems = [],
    steamIronTotal = 0, dryCleanTotal = 0,
    steamIronDeliveryFee = 0, dryCleanDeliveryFee = 0
  } = bookingDraft

  const isDryCleanOnly = serviceType === 'dry_clean'
  const computedSteamIronItems = isDryCleanOnly ? [] : items
  const computedDryCleanItems = isDryCleanOnly ? items : []

  const finalSteamIronItems = steamIronItems.length > 0 ? steamIronItems : computedSteamIronItems
  const finalDryCleanItems = dryCleanItems.length > 0 ? dryCleanItems : computedDryCleanItems

  const finalSteamIronTotal = steamIronTotal || finalSteamIronItems.reduce((sum, i) => sum + i.qty * i.price, 0)
  const finalSteamIronCount = finalSteamIronItems.reduce((sum, i) => sum + i.qty, 0)
  const finalSteamIronDeliveryFee = steamIronDeliveryFee || (finalSteamIronCount > 0 && finalSteamIronCount < 15 ? 30 : 0)

  const finalDryCleanTotal = dryCleanTotal || finalDryCleanItems.reduce((sum, i) => sum + i.qty * i.price, 0)
  const finalDryCleanCount = finalDryCleanItems.reduce((sum, i) => sum + i.qty, 0)
  const finalDryCleanDeliveryFee = dryCleanDeliveryFee || (finalDryCleanCount > 0 ? 30 : 0)

  const itemCount = finalSteamIronCount + finalDryCleanCount
  const itemTotal = finalSteamIronTotal + finalDryCleanTotal
  const deliveryFee = finalSteamIronDeliveryFee + finalDryCleanDeliveryFee
  const grandTotal = itemTotal + deliveryFee

  const handlePayNow = async () => {
    setLoading(true)
    try {
      // Create order on backend
      const orderPayload = {
        items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        address,
        pickupDate,
        pickupSlot,
        deliveryType,
        serviceType,
        amount: grandTotal,
        deliveryFee,
      }

      const { data } = await axiosInstance.post('/api/orders/create', orderPayload)

      // Open Razorpay
      await initiatePayment({
        amount: data.amount || grandTotal,
        orderId: data.razorpayOrderId,
        user: {
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
        },
         onSuccess: async (rzpRes) => {
          try {
            await axiosInstance.post('/api/payments/verify', {
              razorpay_payment_id: rzpRes.razorpay_payment_id,
              razorpay_order_id:   rzpRes.razorpay_order_id,
              razorpay_signature:  rzpRes.razorpay_signature,
              orderId: data.orderId || data._id,
            })
            const orderIdFromApi = data.orderId || data._id
            const formattedId = orderIdFromApi.toString().startsWith('UP-') ? orderIdFromApi : 'UP-' + orderIdFromApi.toString().slice(-6).toUpperCase()

            const confirmedOrder = {
              _id: data._id || 'order-' + Date.now(),
              orderId: formattedId,
              items,
              address,
              pickupDate,
              pickupSlot,
              deliveryType,
              serviceType,
              amount: grandTotal,
              deliveryFee,
              status: 'scheduled',
              createdAt: new Date().toISOString(),
              wasRescheduled: bookingDraft.wasRescheduled || false,
              originalDate: bookingDraft.originalDate || null,
              originalSlot: bookingDraft.originalSlot || null,
            }

            addOrder(confirmedOrder)
            setLastOrder(confirmedOrder)
            toast.success('Payment successful! 🎉')
            sendOrderConfirmationEmail(confirmedOrder, user)
            navigate('/home', { state: { showOrderSuccess: true, order: confirmedOrder } })
          } catch {
            toast.error('Payment verification failed')
          } finally {
            setLoading(false)
          }
        },
        onFailure: (msg) => {
          toast.error(msg || 'Payment failed')
          setLoading(false)
        },
      })
    } catch (err) {
      if (!err.response) {
        toast.error('Server is currently unreachable. Please check your network connection.')
      } else {
        toast.error(err.response?.data?.message || 'Failed to create order')
      }
      setLoading(false)
    }
  }



  // Format date helper
  const getFormattedDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 px-5 pt-12 pb-4 bg-brand-cream/95 backdrop-blur border-b border-slate-200/50">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <ChevronLeft size={18} className="text-slate-800" />
          </button>
          <h1 className="text-slate-900 font-black text-xl">Payment</h1>
          <div className="ml-auto flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <Lock size={11} className="text-slate-600" />
            <span className="text-slate-700 text-xs font-bold">Secure</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Customer Information card */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-200">
          <h3 className="font-bold text-brand-navy mb-3 flex items-center gap-2">
            <UserIcon size={16} className="text-slate-700" /> Customer Information
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span className="font-bold text-slate-800">{user?.name || 'Guest User'}</span>
            </div>
            {user?.email && (
              <div className="flex justify-between">
                <span className="text-muted">Email</span>
                <span className="font-semibold text-slate-800">{user.email}</span>
              </div>
            )}
            {user?.phone && (
              <div className="flex justify-between">
                <span className="text-muted">Phone</span>
                <span className="font-semibold text-slate-800">{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Items / Order summary card */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-200">
          <h3 className="font-bold text-brand-navy mb-3">Order Summary</h3>
          <div className="space-y-4">
            
            {/* 1. Steam Iron & Laundry Items */}
            {finalSteamIronItems.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-black text-brand-navy bg-brand-light px-2 py-1 rounded inline-block">
                  STEAM IRON & LAUNDRY
                </p>
                {finalSteamIronItems.map((item) => (
                  <div key={`si-${item.id}`} className="flex justify-between items-start text-sm pl-1">
                    <div>
                      <span className="text-slate-800 font-bold">{item.icon} {item.name}</span>
                      <div className="flex gap-1.5 items-center mt-0.5">
                        <span className="text-[10px] font-bold text-slate-900 bg-brand-gold/25 px-1.5 py-0.5 rounded">
                          {SERVICE_LABELS[item.serviceType] || 'Wash & Fold'}
                        </span>
                        <span className="text-xs text-muted">₹{item.price.toFixed(2)} / item</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-muted block text-xs">Qty: {item.qty}</span>
                      <span className="font-bold text-slate-800">₹{(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Dry Clean Items */}
            {finalDryCleanItems.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100/50">
                <p className="text-[10px] font-black text-white bg-slate-900 px-2 py-1 rounded inline-block">
                  DRY CLEANING
                </p>
                {finalDryCleanItems.map((item) => (
                  <div key={`dc-${item.id}`} className="flex justify-between items-start text-sm pl-1">
                    <div>
                      <span className="text-slate-800 font-bold">{item.icon} {item.name}</span>
                      <div className="flex gap-1.5 items-center mt-0.5">
                        <span className="text-[10px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">
                          Dry Clean
                        </span>
                        <span className="text-xs text-muted">₹{item.price.toFixed(2)} / item</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-muted block text-xs">Qty: {item.qty}</span>
                      <span className="font-bold text-slate-800">₹{(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Billing breakdowns */}
            <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Total Items</span>
                <span>{itemCount} items</span>
              </div>

              {finalSteamIronCount > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 mt-1 text-[11px]">
                  <p className="font-extrabold text-slate-550 uppercase tracking-wider text-[9px]">Laundry Subtotal</p>
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal</span>
                    <span>₹{finalSteamIronTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge</span>
                    <span className={finalSteamIronDeliveryFee === 0 ? 'text-green-600 font-bold' : 'text-slate-800'}>
                      {finalSteamIronDeliveryFee === 0 ? 'FREE' : `₹${finalSteamIronDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}

              {finalDryCleanCount > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 mt-1 text-[11px]">
                  <p className="font-extrabold text-slate-550 uppercase tracking-wider text-[9px]">Dry Cleaning Subtotal</p>
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal</span>
                    <span>₹{finalDryCleanTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge</span>
                    <span>₹{finalDryCleanDeliveryFee.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-xs font-semibold text-slate-600 pt-1">
                <span>Discounts (if any)</span>
                <span className="text-green-600 font-bold">₹0.00</span>
              </div>
            </div>

            <div className="flex justify-between font-black text-brand-navy text-base pt-2.5 border-t border-slate-100">
              <span>Grand Total</span>
              <span className="text-slate-900 font-black">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Pickup & Delivery Details card */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-200 space-y-3.5">
          <h3 className="font-bold text-brand-navy flex items-center gap-2 border-b pb-2">
            <Truck size={16} className="text-slate-700" /> Pickup & Delivery Details
          </h3>
          
          <div className="flex items-start gap-2.5 text-sm">
            <Calendar size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-800 font-bold text-xs">Pickup Date</p>
              <p className="text-slate-550 text-xs mt-0.5">{getFormattedDate(pickupDate)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-sm">
            <Clock size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-800 font-bold text-xs">Pickup Time Slot</p>
              <p className="text-slate-550 text-xs mt-0.5">{pickupSlot}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-sm">
            <Truck size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-800 font-bold text-xs">Delivery Option</p>
              <p className="text-slate-550 text-xs mt-0.5 capitalize">{deliveryType} Delivery</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-sm">
            <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-800 font-bold text-xs">Pickup & Delivery Address</p>
              <p className="text-slate-550 text-xs mt-0.5 leading-relaxed">{address}</p>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-200">
          <h3 className="font-bold text-brand-navy mb-3 flex items-center gap-2">
            <CreditCard size={16} className="text-slate-700" /> Payment Information
          </h3>

          <div className="p-3 bg-brand-light border-2 border-brand-gold rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center shrink-0">
              <CreditCard size={18} className="text-slate-900" />
            </div>
            <div>
              <p className="font-bold text-brand-navy text-sm">Razorpay Secure</p>
              <p className="text-xs text-muted">Cards, UPI, NetBanking, Wallets</p>
            </div>
            <div className="ml-auto w-5 h-5 bg-brand-gold rounded-full flex items-center justify-center border border-brand-gold/30 shadow-sm">
              <div className="w-2 h-2 bg-slate-900 rounded-full" />
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted font-bold">
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-slate-500" />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-slate-500" />
            <span>PCI DSS</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-slate-500" />
            <span>RBI Compliant</span>
          </div>
        </div>

        {/* Place Order / Pay button */}
        <motion.button
          id="pay-now-btn"
          whileTap={{ scale: 0.97 }}
          onClick={handlePayNow}
          disabled={loading}
          className="w-full bg-brand-gold hover:opacity-95 text-slate-900 font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm text-base disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <><Lock size={16} /> Place Order & Pay ₹{grandTotal.toFixed(2)}</>
          )}
        </motion.button>


      </div>
    </div>
  )
}
