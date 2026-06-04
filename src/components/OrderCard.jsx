// src/components/OrderCard.jsx
import { motion } from 'framer-motion'
import { Package, MapPin, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_STYLES = {
  order_placed:    { bg: 'bg-amber-50 border border-amber-150',   text: 'text-amber-800',   dot: 'bg-brand-primary', label: 'Order Placed' },
  pickup_scheduled:{ bg: 'bg-amber-50 border border-amber-150',   text: 'text-amber-850',   dot: 'bg-brand-primary', label: 'Pickup Scheduled' },
  picked_up:       { bg: 'bg-orange-50 border border-orange-150', text: 'text-orange-850', dot: 'bg-orange-500',   label: 'Picked Up' },
  washing:         { bg: 'bg-purple-50 border border-purple-150', text: 'text-purple-800', dot: 'bg-purple-500',   label: 'Washing' },
  ironing:         { bg: 'bg-indigo-50 border border-indigo-150', text: 'text-indigo-800', dot: 'bg-indigo-500',   label: 'Ironing' },
  quality_check:   { bg: 'bg-pink-50 border border-pink-150',     text: 'text-pink-850',   dot: 'bg-pink-500',     label: 'Quality Check' },
  out_for_delivery:{ bg: 'bg-teal-50 border border-teal-150',     text: 'text-teal-800',   dot: 'bg-teal-500',     label: 'Out for Delivery' },
  delivered:       { bg: 'bg-green-50 border border-green-150',    text: 'text-green-800',  dot: 'bg-green-500',    label: 'Delivered' },
  cancelled:       { bg: 'bg-red-50 border border-red-150',        text: 'text-red-800',    dot: 'bg-red-500',      label: 'Cancelled' },
  scheduled:       { bg: 'bg-amber-50 border border-amber-150',   text: 'text-amber-800',   dot: 'bg-brand-primary', label: 'Scheduled' },
  in_laundry:      { bg: 'bg-purple-50 border border-purple-150', text: 'text-purple-800', dot: 'bg-purple-500',   label: 'In Laundry' },
}

export default function OrderCard({ order, delay = 0 }) {
  const navigate = useNavigate()
  const status = STATUS_STYLES[order.status] || STATUS_STYLES.order_placed

  const serviceLabels = {
    wash_fold: '🫧 Wash & Fold',
    wash_iron: '👕 Wash & Iron',
    dry_clean: '✨ Dry Clean',
    steam_iron: '♨️ Steam Iron',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/order-details/${order.orderId}`)}
      className="bg-white rounded-2xl p-4 shadow-card border border-slate-100 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted font-medium">#{order.orderId || order._id?.slice(-6)?.toUpperCase()}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
              {status.label}
            </span>
          </div>

          <p className="font-bold text-brand-navy text-sm">
            {serviceLabels[order.serviceType] || '🧺 Laundry Service'}
          </p>

          <div className="mt-2 space-y-1">
            {order.address && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <MapPin size={11} />
                <span className="truncate max-w-[200px]">{order.address}</span>
              </div>
            )}
            {order.pickupDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Clock size={11} />
                <span>{order.pickupDate} · {order.pickupSlot}</span>
              </div>
            )}
            {order.items?.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Package size={11} />
                <span>{order.items.reduce((s, i) => s + i.qty, 0)} items</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="font-black text-brand-navy text-lg">₹{order.amount || order.total}</p>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      </div>
    </motion.div>
  )
}
