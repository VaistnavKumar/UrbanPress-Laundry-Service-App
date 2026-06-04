// src/pages/OrderDetails.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, MapPin, Calendar, Clock, Package, Check, HelpCircle, Phone, Weight, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'
import { useOrderStore } from '../context/OrderContext'
import { useAuthStore } from '../context/AuthContext'

const STAGES = [
  { id: 'order_placed', label: 'Order Placed', emoji: '📝', desc: 'Your laundry request has been registered.' },
  { id: 'pickup_scheduled', label: 'Pickup Scheduled', emoji: '📅', desc: 'Driver is assigned to collect your bucket.' },
  { id: 'picked_up', label: 'Picked Up', emoji: '🧺', desc: 'Garments collected and logged at processing hub.' },
  { id: 'washing', label: 'Washing', emoji: '🫧', desc: 'Clothes are undergoing premium wash cycles.' },
  { id: 'ironing', label: 'Ironing', emoji: '♨️', desc: 'Crisp steam press and folding in progress.' },
  { id: 'quality_check', label: 'Quality Check', emoji: '✨', desc: 'Garments inspected for spot cleanliness.' },
  { id: 'out_for_delivery', label: 'Out For Delivery', emoji: '🚚', desc: 'Delivery partner is on the way to your door.' },
  { id: 'delivered', label: 'Delivered', emoji: '✅', desc: 'Order completed and delivered successfully.' },
]

export default function OrderDetails() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { orders, updateOrder } = useOrderStore()
  const { user } = useAuthStore()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchOrderDetails = async () => {
    try {
      const res = await axiosInstance.get(`/api/orders/${orderId}`)
      setOrder(res.data)
      // Update local store with the newest status
      updateOrder(res.data._id, { status: res.data.status, weight: res.data.weight, trackingHistory: res.data.trackingHistory })
    } catch (err) {
      toast.error('Failed to load latest order details. Please check your network connection.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetails()
    const interval = setInterval(fetchOrderDetails, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="w-9 h-9 border-3 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-brand-cream p-5 text-center flex flex-col justify-center items-center">
        <span className="text-5xl block mb-3">🔍</span>
        <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
        <button onClick={() => navigate('/home')} className="mt-4 bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl text-xs active:scale-95 transition-all">
          Back to Home
        </button>
      </div>
    )
  }

  // Find index of current stage
  const currentIdx = STAGES.findIndex(s => s.id === order.status)
  const isCancelled = order.status === 'cancelled'

  // Dynamic ETA message based on status
  const getEtaMessage = () => {
    if (isCancelled) return 'Order Cancelled'
    if (order.status === 'delivered') return 'Delivered successfully'
    if (order.status === 'out_for_delivery') return 'Arriving in 15–30 mins'
    if (['washing', 'ironing', 'quality_check'].includes(order.status)) return 'Delivery expected in 3–6 hours'
    if (order.status === 'picked_up') return 'Delivery expected in 12 hours'
    return 'Delivery scheduled tomorrow at 05:00 PM'
  }

  // Get timestamp for a stage if logged in trackingHistory
  const getStageTime = (stageId) => {
    const entry = order.trackingHistory?.find(h => h.status === stageId)
    if (!entry) return null
    try {
      const d = new Date(entry.timestamp)
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ', ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    } catch {
      return null
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 px-5 pt-12 pb-4 bg-brand-cream/95 backdrop-blur border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <ChevronLeft size={18} className="text-slate-800" />
          </button>
          <div>
            <h1 className="text-slate-900 font-black text-lg leading-none mb-1">Order Details</h1>
            <p className="text-[10px] font-bold text-slate-500 font-mono tracking-tight">#{order.orderId}</p>
          </div>
          {isCancelled && (
            <span className="ml-auto bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-red-200">
              Cancelled
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Dynamic Status/ETA card */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-200/80">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Estimated Delivery</p>
              <h2 className="text-[19px] font-black text-brand-navy mt-0.5 leading-tight">{getEtaMessage()}</h2>
            </div>
            <div className="bg-[#4E9A9D]/15 text-[#4E9A9D] w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-[#4E9A9D]/30">
              <Clock size={18} />
            </div>
          </div>

          <div className="h-px bg-slate-100 my-4" />

          {/* Weight Badge */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Weight size={15} className="text-slate-500" />
              <span className="text-slate-600 font-semibold">Laundry Weight</span>
            </div>
            <span className={`font-extrabold text-xs px-3 py-1 rounded-full border ${
              order.weight > 0
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-brand-light text-brand-navy border-brand-primary/30'
            }`}>
              {order.weight > 0 ? `${order.weight} kg` : 'Pending Weight'}
            </span>
          </div>
        </div>

        {/* 8-Stage Interactive Timeline */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-200/80">
          <h3 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider mb-5 pb-2 border-b">Live Order Progress</h3>
          
          <div className="relative pl-7 space-y-7">
            {/* Horizontal progress center connector line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 z-0">
              <div 
                className="w-full bg-[#4E9A9D] transition-all duration-700" 
                style={{ 
                  height: isCancelled ? '0%' : `${Math.max(0, currentIdx) / (STAGES.length - 1) * 100}%` 
                }} 
              />
            </div>

            {STAGES.map((stage, idx) => {
              const isCompleted = idx < currentIdx || (idx === currentIdx && order.status === 'delivered')
              const isActive = idx === currentIdx && order.status !== 'delivered'
              const isUpcoming = idx > currentIdx
              const stageTime = getStageTime(stage.id)

              return (
                <div key={stage.id} className="relative flex gap-4 items-start">
                  {/* Progress Node Point */}
                  <div className="absolute -left-[23px] top-1 z-10">
                    {isCompleted ? (
                      <div className="w-6 h-6 bg-[#4E9A9D] text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm transition-all duration-300">
                        <Check size={11} className="stroke-[3]" />
                      </div>
                    ) : isActive ? (
                      <div className="w-6 h-6 bg-[#4E9A9D] rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-4 ring-[#4E9A9D]/20 animate-pulse transition-all duration-300">
                        <span className="w-2.5 h-2.5 bg-white rounded-full" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200 transition-all duration-300">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                      </div>
                    )}
                  </div>

                  {/* Stage description & content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className={`font-extrabold text-sm leading-none ${
                        isCompleted ? 'text-slate-800' : isActive ? 'text-[#4E9A9D]' : 'text-slate-400'
                      }`}>
                        {stage.emoji} {stage.label}
                      </p>
                      {stageTime && (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {stageTime}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-1 font-medium leading-relaxed ${
                      isCompleted ? 'text-slate-500' : isActive ? 'text-slate-600 font-semibold' : 'text-slate-400/80'
                    }`}>
                      {stage.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Delivery Location card */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-200/80 space-y-3">
          <h3 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider pb-2 border-b">Pickup & Delivery Address</h3>
          <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed font-semibold pl-1">
            <MapPin size={14} className="text-[#4E9A9D] mt-0.5 shrink-0" />
            <span>{order.address}</span>
          </div>
        </div>

        {/* Ordered garments invoice card */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-200/80">
          <h3 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider pb-2 border-b mb-3">Garments Details</h3>
          
          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
                <span className="font-bold text-slate-700">{item.icon || '👕'} {item.name}</span>
                <span className="text-slate-500 font-semibold">Qty: {item.qty} · ₹{(item.price || 20).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 font-black text-brand-navy text-sm">
            <span>Total Paid</span>
            <span>₹{order.amount?.toFixed(2)}</span>
          </div>
        </div>

        {/* Support actions card */}
        <div className="bg-white rounded-3xl p-4 shadow-card border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0 border border-slate-200/50">
              <HelpCircle size={16} className="text-slate-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs">Need help with this order?</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">24/7 Customer Care Desk</p>
            </div>
          </div>
          <button 
            onClick={() => window.open('tel:+919999999999')}
            className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1 active:scale-95 transition-all"
          >
            <Phone size={11} /> Call support
          </button>
        </div>
      </div>
    </div>
  )
}
