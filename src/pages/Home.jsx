// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, MapPin, ChevronDown, Star, ChevronRight, Search, CheckCircle, Clock, Truck, ShieldCheck, Mail, X } from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'
import { useAuthStore, useNotificationStore } from '../context/AuthContext'
import { useOrderStore } from '../context/OrderContext'
import Modal from '../components/Modal'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { useGeoapify } from '../hooks/useGeoapify'
import { staticMapUrl, reverseGeocode } from '../utils/geoapify'

/* ── Data ──────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'dry_clean',  icon: '🧥', label: 'Dry Clean' },
  { id: 'laundry',   icon: '🫧', label: 'Laundry'   },
  { id: 'iron',      icon: '♨️', label: 'Iron'      },
  { id: 'fold',      icon: '👕', label: 'Fold'       },
]

const NEARBY = [
  { id: 1, emoji: '🧺', name: 'QuickWash Express',  rating: 4.5, distance: '0.8 km', tag: 'Express', color: 'from-amber-100 to-amber-50' },
  { id: 2, emoji: '✨', name: 'FreshPress Studio',   rating: 4.8, distance: '1.2 km', tag: 'Premium', color: 'from-brand-light to-brand-gold/10' },
  { id: 3, emoji: '🛁', name: 'CleanKing Tirupati', rating: 4.3, distance: '1.8 km', tag: 'Budget',  color: 'from-orange-100 to-orange-55'  },
]

const BANNER_CONTENT = {
  'wash_&_iron': {
    title: 'Professional Wash & Iron Service',
    points: [
      'Fresh Cleaning',
      'Neatly Ironed Clothes',
      'Fast Pickup & Delivery'
    ]
  },
  'ironing': {
    title: 'Professional Ironing Service',
    points: [
      'Crisp Finish',
      'Wrinkle-Free Clothes',
      'Same Day Processing'
    ]
  },
  'steam_iron': {
    title: 'Premium Steam Iron Service',
    points: [
      'Deep Wrinkle Removal',
      'Gentle Fabric Care',
      'Premium Finish'
    ]
  },
  'saree_rolling': {
    title: 'Expert Saree Rolling Service',
    points: [
      'Traditional Saree Folding',
      'Fabric Protection',
      'Safe Packaging'
    ]
  },
  'dry_cleaning': {
    title: 'Professional Dry Cleaning Service',
    points: [
      'Premium Garment Care',
      'Stain Removal',
      'Fabric Safe Treatment'
    ]
  }
}

/* ── Interactive Map with dragging and zoom controls ──────────────────── */
function InteractiveMap({ lat, lon, onChange }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const onChangeRef = useRef(onChange)

  // Keep callback ref updated to avoid stale closures in Leaflet events
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!window.L || mapRef.current) return

    const initialLat = parseFloat(lat) || 13.6284
    const initialLon = parseFloat(lon) || 79.4192

    // Initialize Leaflet Map centered on initial coords
    const map = window.L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([initialLat, initialLon], 16)

    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map)

    mapRef.current = map

    let debounceTimer

    const handleMapMove = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        const center = map.getCenter()
        try {
          const address = await reverseGeocode(center.lat, center.lng)
          if (onChangeRef.current) {
            onChangeRef.current({
              latitude: center.lat,
              longitude: center.lng,
              address
            })
          }
        } catch (err) {
          console.error('Re-geocoding failed:', err)
        }
      }, 500) // 500ms debounce
    }

    map.on('moveend', handleMapMove)

    return () => {
      clearTimeout(debounceTimer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // empty dependency array so Leaflet only initializes once

  // React to external coordinate changes (e.g. user selects autocomplete or gets browser location)
  useEffect(() => {
    if (mapRef.current) {
      const currentCenter = mapRef.current.getCenter()
      const newLat = parseFloat(lat)
      const newLon = parseFloat(lon)
      
      // If position is significantly different, pan to it
      if (
        !isNaN(newLat) && 
        !isNaN(newLon) && 
        (Math.abs(currentCenter.lat - newLat) > 0.0001 || Math.abs(currentCenter.lng - newLon) > 0.0001)
      ) {
        mapRef.current.setView([newLat, newLon], 16)
      }
    }
  }, [lat, lon])

  return (
    <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Center Pin */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="flex flex-col items-center -translate-y-4">
          <div className="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            📍
          </div>
          <div className="w-2.5 h-1 bg-black/35 rounded-full blur-[1px] mt-0.5" />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-20">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-800 font-bold shadow active:bg-slate-50"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-800 font-bold shadow active:bg-slate-50"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function Home() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, setLocation } = useAuthStore()
  const { unreadCount, notifications, markAllRead, addNotification } = useNotificationStore()
  const { getLocationFromBrowser } = useGeoapify()

  const [activeCategory,    setActiveCategory]    = useState('wash_&_iron')
  const [recentOrders,      setRecentOrders]      = useState([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showNotifPanel,    setShowNotifPanel]    = useState(false)
  const [detectedAddress,   setDetectedAddress]   = useState(null)
  const [coords,            setCoords]            = useState(null)
  const [locationLoading,   setLocationLoading]   = useState(false)

  // Modals for Order Confirmation & Email Receipt
  const [successOrder, setSuccessOrder] = useState(null)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    if (!user?.location) setTimeout(() => setShowLocationModal(true), 800)
    return () => clearInterval(interval)
  }, [])

  const getProgressPercent = (status) => {
    if (status === 'order_placed' || status === 'scheduled') return 10
    if (status === 'pickup_scheduled') return 25
    if (status === 'picked_up') return 40
    if (status === 'washing' || status === 'in_laundry') return 55
    if (status === 'ironing') return 70
    if (status === 'quality_check') return 80
    if (status === 'out_for_delivery') return 90
    if (status === 'delivered') return 100
    return 0
  }

  const getCardEta = (orderObj) => {
    if (orderObj.status === 'out_for_delivery') return 'in 30 mins'
    if (['washing', 'ironing', 'quality_check'].includes(orderObj.status)) return 'in 3 hr'
    if (orderObj.status === 'picked_up') return 'in 12 hr'
    return 'tomorrow'
  }

  useEffect(() => {
    if (location.state?.showOrderSuccess && location.state?.order) {
      const order = location.state.order

      // Simulate push notification
      addNotification({
        title: '✅ Order Confirmed',
        body: 'Your Urban Press order has been successfully placed and scheduled.'
      })

      // Toast notification for normal / rescheduling flows
      if (order.wasRescheduled) {
        let displayDate = order.pickupDate
        try {
          const d = new Date(order.pickupDate)
          displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        } catch {}
        toast(`Urban Press booking rescheduled to ${displayDate} due to high demand! 📅`, {
          duration: 6000,
          icon: '📅'
        })
      } else {
        toast.success('Your order has been successfully placed and scheduled! 🔔', {
          duration: 5000
        })
      }

      // Clear the router state to avoid re-triggering on history navigation / refresh
      window.history.replaceState({}, document.title)

      setSuccessOrder(order)
      setShowSuccessPopup(true)
    }
  }, [location.state])

  // ── Mappers & Parsers for Success Popup ──
  const getSelectedServices = (order) => {
    if (!order) return []
    const services = new Set()
    const items = order.items || []
    
    // Fallback to order serviceType if no items are populated
    if (items.length === 0 && order.serviceType) {
      if (order.serviceType === 'wash_fold') {
        services.add('Laundry')
        services.add('Fold')
      } else if (order.serviceType === 'wash_iron') {
        services.add('Laundry')
      } else if (order.serviceType === 'dry_clean') {
        services.add('Dry Cleaning')
      } else if (order.serviceType === 'steam_iron') {
        services.add('Steam Iron')
      } else {
        services.add('Laundry')
      }
    }
    
    items.forEach(i => {
      if (i.serviceType === 'wash_fold') {
        services.add('Laundry')
        services.add('Fold')
      } else if (i.serviceType === 'wash_iron') {
        services.add('Laundry')
      } else if (i.serviceType === 'dry_clean') {
        services.add('Dry Cleaning')
      } else if (i.serviceType === 'steam_iron') {
        services.add('Steam Iron')
      }
    })
    
    return Array.from(services)
  }

  const getClothingBreakdown = (items = []) => {
    let shirts = 0, pants = 0, tshirts = 0, sarees = 0, kurtas = 0, others = 0
    items.forEach(i => {
      const name = i.name.toLowerCase()
      const qty = i.qty || 0
      if (name.includes('shirt') && !name.includes('t-shirt')) shirts += qty
      else if (name.includes('pant') || name.includes('jeans') || name.includes('trousers')) pants += qty
      else if (name.includes('t-shirt') || name.includes('tshirt')) tshirts += qty
      else if (name.includes('saree')) sarees += qty
      else if (name.includes('kurta')) kurtas += qty
      else others += qty
    })
    return { shirts, pants, tshirts, sarees, kurtas, others }
  }

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch {
      return dateStr
    }
  }

  const getDeliveryDate = (pickupDateStr) => {
    if (!pickupDateStr) return ''
    try {
      const d = new Date(pickupDateStr)
      d.setDate(d.getDate() + 1)
      return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch {
      return 'Next Day'
    }
  }

  const fetchOrders = async () => {
    try {
      const res = await axiosInstance.get('/api/orders?limit=3')
      setRecentOrders(res.data.orders || [])
    } catch { /* silent */ }
  }

  const handleDetectLocation = async () => {
    setLocationLoading(true)
    try {
      const { latitude, longitude, address } = await getLocationFromBrowser()
      setDetectedAddress(address)
      setCoords({ latitude, longitude })
    } catch (err) {
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        toast.error('Location blocked: Geolocation requires HTTPS (secure context) on remote mobile devices. Please search your address manually!')
      } else {
        toast.error('Location access denied. Search manually.')
      }
    } finally {
      setLocationLoading(false)
    }
  }

  const handleConfirmLocation = async () => {
    const locationData = { latitude: coords.latitude, longitude: coords.longitude, address: detectedAddress }
    setLocation(locationData)
    toast.success('📍 Location saved!')
    setShowLocationModal(false)
    try { await axiosInstance.put('/api/user/location', locationData) } catch { /* offline ok */ }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.name?.split(' ')[0] || 'Guest'
  const displayAddress = user?.location?.address || 'Tirupati, Andhra Pradesh'

  return (
    <div className="min-h-screen bg-brand-cream pb-28">
      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center font-bold text-slate-600 text-sm">
            {firstName[0]}
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-semibold leading-none mb-1">Hello 👋</p>
            <p className="text-slate-800 font-bold text-xs leading-none">{firstName}</p>
          </div>
        </div>
        {/* Menu button */}
        <button
          onClick={() => setShowNotifPanel(true)}
          className="relative w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm"
        >
          <div className="flex flex-col gap-1 w-4">
            <span className="h-0.5 w-full bg-slate-800 rounded" />
            <span className="h-0.5 w-2/3 bg-slate-800 rounded ml-auto" />
            <span className="h-0.5 w-full bg-slate-800 rounded" />
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm border border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Welcome Title ── */}
      <div className="px-5 mb-2">
        <h1 className="text-slate-900 font-black text-3xl tracking-tight">Welcome</h1>
      </div>

      {/* ── Delivering to Location selector ── */}
      <div className="px-5 mb-5">
        <button
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-855 transition-colors"
        >
          <MapPin size={11} className="text-orange-500 shrink-0" />
          Delivering to: <span className="text-slate-800 underline truncate max-w-[200px]">{displayAddress}</span>
          <ChevronDown size={11} className="text-slate-450 shrink-0" />
        </button>
      </div>

      {/* ── Delivery Charge Notice ── */}
      <div className="px-5 mb-6">
        <div className="bg-brand-light border border-brand-gold/45 rounded-[20px] p-3.5 flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 bg-brand-gold rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-brand-gold/30">
            <span className="text-lg">🚚</span>
          </div>
          <div>
            <p className="text-brand-navy font-black text-[11px] uppercase tracking-wide">Delivery Policy</p>
            <p className="text-slate-655 text-[10px] font-medium leading-normal mt-0.5">
              Get <span className="font-extrabold text-brand-navy bg-brand-gold/30 px-1.5 py-0.5 rounded">FREE Delivery</span> on 15+ clothes! Below 15 clothes, ₹30 charge applies.
            </p>
          </div>
        </div>
      </div>

      {/* ── Active Orders & Real-time Tracking Section ── */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider">Active Orders</h2>
          <button
            onClick={() => navigate('/orders')}
            className="text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
          >
            See All
          </button>
        </div>

        {(() => {
          const activeStatuses = ['order_placed', 'pickup_scheduled', 'picked_up', 'washing', 'ironing', 'quality_check', 'out_for_delivery', 'scheduled', 'in_laundry']
          const activeOrders = recentOrders.filter(o => activeStatuses.includes(o.status))
          const latestOrder = activeOrders[0]

          if (!latestOrder) {
            return (
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm text-center">
                <span className="text-2xl block mb-1">🧺</span>
                <p className="text-slate-700 font-bold text-xs">No Active Orders</p>
                <p className="text-slate-455 text-[10px] font-semibold mt-0.5">Your clothes are clean & tidy!</p>
              </div>
            )
          }

          const progress = getProgressPercent(latestOrder.status)
          const isPickedActive = ['picked_up', 'washing', 'in_laundry', 'ironing', 'quality_check', 'out_for_delivery', 'delivered'].includes(latestOrder.status)
          const isWashingActive = ['washing', 'in_laundry', 'ironing', 'quality_check', 'out_for_delivery', 'delivered'].includes(latestOrder.status)
          const isOutActive = ['out_for_delivery', 'delivered'].includes(latestOrder.status)
          const isDeliveredActive = latestOrder.status === 'delivered'

          return (
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/order-details/${latestOrder.orderId}`)}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card cursor-pointer hover:shadow-md transition-all space-y-4"
            >
              {/* Header Info */}
              <div className="text-[11px] font-bold text-slate-500 leading-none">
                Order #{latestOrder.orderId?.replace('UP-', '')} / {latestOrder.weight > 0 ? `${latestOrder.weight}kg` : 'Pending Weight'} / Delivery {getCardEta(latestOrder)}
              </div>

              {/* Progress Bar Container */}
              <div className="relative pt-1">
                {/* Gray Track */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-visible relative">
                  {/* Active Colored Track */}
                  <motion.div
                    className="absolute h-full bg-[#4E9A9D] rounded-full left-0 top-0"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                  {/* Thumb Indicator Pin */}
                  <motion.div
                    className="absolute w-5 h-5 bg-white border-4 border-[#4E9A9D] rounded-full -top-1.5 -ml-2.5 flex items-center justify-center shadow-sm"
                    initial={{ left: '0%' }}
                    animate={{ left: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Labels Grid */}
              <div className="flex justify-between text-[11px] font-bold tracking-tight select-none">
                <span className={isPickedActive ? 'text-slate-800' : 'text-slate-400'}>Picked</span>
                <span className={isWashingActive ? 'text-slate-800' : 'text-slate-400'}>Washing</span>
                <span className={isOutActive ? 'text-slate-800' : 'text-slate-400'}>Out for Delivery</span>
                <span className={isDeliveredActive ? 'text-slate-800' : 'text-slate-400'}>Delivered</span>
              </div>
            </motion.div>
          )
        })()}
      </div>

      <div className="px-5 mb-6 overflow-x-auto no-scrollbar flex items-center gap-2.5">
        {['Wash & Iron', 'Ironing', 'Steam Iron', 'Saree Rolling', 'Dry Cleaning'].map((label) => {
          const catId = label.toLowerCase().replace(/\s+/g, '_')
          const isActive = activeCategory === catId
          return (
            <button
              key={label}
              id={`cat-tab-${catId}`}
              onClick={() => setActiveCategory(catId)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-brand-gold text-slate-900 border-brand-gold shadow-sm'
                  : 'bg-white text-slate-550 border-slate-200 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Prepay Banner Card ── */}
      <div className="px-5 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-gold rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between h-72 shadow-xl shadow-yellow-500/10"
        >
          {/* Header text */}
          <div className="relative z-10 max-w-[62%]">
            <h3 className="text-slate-900 font-extrabold text-[19px] leading-tight mb-4">
              {BANNER_CONTENT[activeCategory]?.title || 'Professional Wash & Iron Service'}
            </h3>
            <div className="space-y-2">
              {(BANNER_CONTENT[activeCategory]?.points || []).map((feature) => (
                <div key={feature} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                  <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-[9px] text-white">✓</span>
                  </div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Character Illustration */}
          <div className="absolute right-0 bottom-0 h-full w-[45%] flex items-end justify-end pointer-events-none select-none z-10">
            <img
              src="/laundry_hero_girl.png"
              alt="hero character"
              className="h-[82%] w-auto object-contain object-bottom"
            />
          </div>

          {/* Slider-style Order CTA */}
          <div className="relative z-20 mt-4 max-w-[65%]">
            <button
              id="home-book-now"
              onClick={() => navigate('/booking')}
              className="w-full bg-white text-slate-900 font-bold py-2.5 px-3 rounded-full flex items-center justify-between gap-2 shadow-md hover:bg-slate-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs">
                ✓
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold flex-1 text-center pr-2">Order Now</span>
              <ChevronRight size={14} className="text-slate-500" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Getting Started Card ── */}
      <div className="px-5 mb-8">
        <button
          onClick={() => navigate('/services')}
          className="w-full bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow active:bg-slate-50 transition-all text-left"
        >
          <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shrink-0 text-white text-lg font-black">
            🌟
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 text-sm mb-0.5">Getting Started?</h4>
            <p className="text-slate-400 text-xs leading-normal">
              See how Laundry press works and learn more about our services.
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-400 shrink-0" />
        </button>
      </div>

      {/* ── Notifications panel ── */}
      <AnimatePresence>
        {showNotifPanel && (
          <Modal isOpen={showNotifPanel} onClose={() => setShowNotifPanel(false)} title="🔔 Notifications">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-4xl block mb-3">🔕</span>
                <p className="text-white/40 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 10).map((n, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-app-card rounded-xl">
                    <span className="text-xl">🧺</span>
                    <div>
                      <p className="font-semibold text-sm text-white">{n.title}</p>
                      <p className="text-xs text-white/40">{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Location Modal ── */}
      <Modal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} title="📍 Set Your Location">
        <p className="text-slate-500 text-sm mb-4">So we know where to pick up your clothes</p>

        <button
          id="detect-location-btn"
          onClick={handleDetectLocation}
          disabled={locationLoading}
          className="w-full bg-brand-primary text-slate-900 font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 mb-4 disabled:opacity-60 shadow-md shadow-brand-primary/20 hover:bg-brand-primary/95 transition-all"
        >
          {locationLoading ? (
            <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
          ) : <MapPin size={16} />}
          {locationLoading ? 'Detecting...' : 'Use Current Location'}
        </button>

        {detectedAddress && coords && (
          <div className="mb-4 space-y-3">
            <InteractiveMap
              lat={coords.latitude}
              lon={coords.longitude}
              onChange={({ latitude, longitude, address }) => {
                setCoords({ latitude, longitude })
                setDetectedAddress(address)
              }}
            />
            <div className="flex items-start gap-2 p-3 bg-brand-light border border-brand-primary/25 rounded-xl">
              <MapPin size={14} className="text-brand-primary mt-0.5 shrink-0" />
              <p className="text-sm text-slate-800 font-semibold">{detectedAddress}</p>
            </div>
            <button
              id="confirm-location-btn"
              onClick={handleConfirmLocation}
              className="w-full bg-brand-primary text-slate-900 font-extrabold py-3.5 rounded-xl shadow-md shadow-brand-primary/20 hover:bg-brand-primary/95 transition-all active:scale-[0.98]"
            >
              ✓ Confirm This Address
            </button>
          </div>
        )}

        <div className="mt-2">
          <p className="text-xs text-slate-500 mb-2 font-medium">Or search manually:</p>
          <AddressAutocomplete
            onSelect={(s) => {
              setDetectedAddress(s.label)
              setCoords({ latitude: s.lat, longitude: s.lon })
            }}
          />
        </div>
      </Modal>

      {/* ── Order Confirmed Successfully Modal ── */}
      <AnimatePresence>
        {showSuccessPopup && successOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSuccessPopup(false)
                setShowEmailModal(true)
              }}
            />

            {/* Modal Body */}
            <motion.div
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200/80 z-10 max-h-[90vh] flex flex-col"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              {/* Header section with green success check */}
              <div className="bg-brand-light p-6 text-center border-b border-brand-gold/20 relative">
                <button
                  id="close-success-popup"
                  onClick={() => {
                    setShowSuccessPopup(false)
                    setShowRatingPopup(true)
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-200/50 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="text-slate-505" />
                </button>
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-200">
                  <CheckCircle size={32} className="text-green-600 animate-pulse-slow" />
                </div>
                <h3 className="text-[19px] font-black text-brand-navy leading-tight">
                  ✅ Order Confirmed Successfully
                </h3>
                <p className="text-slate-550 text-xs mt-1.5 px-4 font-semibold leading-relaxed">
                  Thank you for choosing Urban Press.<br />Your order has been successfully scheduled.
                </p>
              </div>

              {/* Scrollable details container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[50vh] no-scrollbar">
                
                {/* ID & Clothes count */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-brand-cream/40 border border-slate-200/50 rounded-2xl p-3 text-center">
                    <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Order ID</p>
                    <p className="text-brand-navy font-black text-sm mt-0.5">{successOrder.orderId}</p>
                  </div>
                  <div className="bg-brand-cream/40 border border-slate-200/50 rounded-2xl p-3 text-center">
                    <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Total Clothes</p>
                    <p className="text-brand-navy font-black text-sm mt-0.5">
                      {successOrder.items?.reduce((sum, i) => sum + i.qty, 0) || 0} items
                    </p>
                  </div>
                </div>

                {/* Services Selected */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>🧺</span> Services Selected
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {getSelectedServices(successOrder).map(srv => (
                      <span key={srv} className="bg-brand-gold/15 text-slate-900 border border-brand-gold/30 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Clothing Details breakdown */}
                {(() => {
                  const laundryItems = (successOrder.items || []).filter(i => i.serviceType !== 'dry_clean')
                  const dryCleanItems = (successOrder.items || []).filter(i => i.serviceType === 'dry_clean')
                  
                  const laundryBreakdown = getClothingBreakdown(laundryItems)
                  const hasLaundry = Object.values(laundryBreakdown).some(qty => qty > 0)
                  
                  const dryCleanBreakdown = getClothingBreakdown(dryCleanItems)
                  const hasDryClean = Object.values(dryCleanBreakdown).some(qty => qty > 0)
                  
                  if (!hasLaundry && !hasDryClean) return null
                  
                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                      {hasLaundry && (
                        <div>
                          <p className="text-[10px] font-black text-brand-navy bg-brand-light px-2 py-0.5 rounded inline-block mb-2">
                            LAUNDRY & STEAM IRON
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {laundryBreakdown.shirts > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-650 font-bold">👔 Shirts</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{laundryBreakdown.shirts}</span>
                              </div>
                            )}
                            {laundryBreakdown.pants > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">👖 Pants</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{laundryBreakdown.pants}</span>
                              </div>
                            )}
                            {laundryBreakdown.tshirts > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">👕 T-Shirts</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{laundryBreakdown.tshirts}</span>
                              </div>
                            )}
                            {laundryBreakdown.sarees > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">🥻 Sarees</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{laundryBreakdown.sarees}</span>
                              </div>
                            )}
                            {laundryBreakdown.kurtas > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">🥻 Kurtas</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{laundryBreakdown.kurtas}</span>
                              </div>
                            )}
                            {laundryBreakdown.others > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">🧺 Others</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{laundryBreakdown.others}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {hasDryClean && (
                        <div>
                          <p className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded inline-block mb-2">
                            DRY CLEANING
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {dryCleanBreakdown.shirts > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-650 font-bold">👔 Shirts</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{dryCleanBreakdown.shirts}</span>
                              </div>
                            )}
                            {dryCleanBreakdown.pants > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">👖 Pants</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{dryCleanBreakdown.pants}</span>
                              </div>
                            )}
                            {dryCleanBreakdown.tshirts > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">👕 T-Shirts</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{dryCleanBreakdown.tshirts}</span>
                              </div>
                            )}
                            {dryCleanBreakdown.sarees > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">🥻 Sarees</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{dryCleanBreakdown.sarees}</span>
                              </div>
                            )}
                            {dryCleanBreakdown.kurtas > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">🥻 Kurtas</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{dryCleanBreakdown.kurtas}</span>
                              </div>
                            )}
                            {dryCleanBreakdown.others > 0 && (
                              <div className="flex justify-between items-center py-1 border-b border-slate-200/40">
                                <span className="text-slate-655 font-bold">🧺 Others</span>
                                <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-150">{dryCleanBreakdown.others}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Billing Separation breakdown */}
                {(() => {
                  const laundryItems = (successOrder.items || []).filter(i => i.serviceType !== 'dry_clean')
                  const dryCleanItems = (successOrder.items || []).filter(i => i.serviceType === 'dry_clean')
                  
                  const laundryCount = laundryItems.reduce((sum, i) => sum + i.qty, 0)
                  const laundrySubtotal = laundryItems.reduce((sum, i) => sum + i.qty * i.price, 0)
                  const laundryDelivery = laundryCount > 0 ? (laundryCount >= 15 ? 0 : 30) : 0
                  
                  const dryCleanCount = dryCleanItems.reduce((sum, i) => sum + i.qty, 0)
                  const dryCleanSubtotal = dryCleanItems.reduce((sum, i) => sum + i.qty * i.price, 0)
                  const dryCleanDelivery = dryCleanCount > 0 ? 30 : 0
                  
                  const hasMixed = laundryCount > 0 && dryCleanCount > 0
                  
                  if (!hasMixed) return null
                  
                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
                      <p className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5 font-black">
                        <span>💰</span> Billing Separation
                      </p>
                      
                      {laundryCount > 0 && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/40 space-y-1">
                          <p className="font-black text-[9px] text-brand-navy">LAUNDRY & STEAM IRON</p>
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal ({laundryCount} items)</span>
                            <span>₹{laundrySubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Delivery</span>
                            <span className={laundryDelivery === 0 ? 'text-green-600 font-bold' : 'text-slate-700'}>
                              {laundryDelivery === 0 ? 'FREE' : `₹${laundryDelivery.toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {dryCleanCount > 0 && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/40 space-y-1">
                          <p className="font-black text-[9px] text-slate-900">DRY CLEANING</p>
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal ({dryCleanCount} items)</span>
                            <span>₹{dryCleanSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Delivery</span>
                            <span>₹{dryCleanDelivery.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Pickup Details */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                  <p className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>📅</span> Pickup Details
                  </p>
                  <div className="flex items-start gap-2.5">
                    <Calendar size={14} className="text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-800 font-bold text-xs">Pickup Date</p>
                      <p className="text-slate-550 text-xs mt-0.5 font-medium">
                        {getFormattedDate(successOrder.pickupDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock size={14} className="text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-800 font-bold text-xs">Pickup Time Slot</p>
                      <p className="text-slate-550 text-xs mt-0.5 font-medium">{successOrder.pickupSlot}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Details */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                  <p className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>🚚</span> Delivery Details
                  </p>
                  <div className="flex items-start gap-2.5">
                    <Calendar size={14} className="text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-800 font-bold text-xs">Delivery Date</p>
                      <p className="text-slate-550 text-xs mt-0.5 font-medium">
                        {getDeliveryDate(successOrder.pickupDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock size={14} className="text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-800 font-bold text-xs">Delivery Time Slot</p>
                      <p className="text-slate-550 text-xs mt-0.5 font-medium">05:00 PM – 07:00 PM</p>
                    </div>
                  </div>
                </div>

                {/* Pickup & Delivery Address */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-800 font-bold text-xs">Pickup & Delivery Address</p>
                      <p className="text-slate-550 text-xs mt-0.5 leading-relaxed font-semibold">
                        {successOrder.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total amount and paid status */}
                <div className="bg-brand-light border-2 border-brand-gold rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Total Amount Paid</p>
                    <p className="text-brand-navy font-black text-lg mt-0.5">₹{successOrder.amount?.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-100 text-green-700 font-black text-xs px-3 py-1 rounded-full border border-green-200/50 flex items-center gap-1 shadow-sm">
                    <ShieldCheck size={12} />
                    <span>Paid</span>
                  </div>
                </div>

              </div>

              {/* Action buttons footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-150 space-y-2">
                <button
                  id="track-order-btn"
                  onClick={() => {
                    setShowSuccessPopup(false)
                    navigate('/orders')
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
                >
                  Track Order
                </button>
                <button
                  id="back-to-home-btn"
                  onClick={() => {
                    setShowSuccessPopup(false)
                    setShowRatingPopup(true)
                  }}
                  className="w-full border-2 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold py-3 rounded-xl active:scale-[0.98] transition-all text-xs"
                >
                  Back to Home
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Google Rating & Review Modal ── */}
      <AnimatePresence>
        {showRatingPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowRatingPopup(false)
                setShowEmailModal(true)
              }}
            />

            {/* Modal Body */}
            <motion.div
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 z-10 text-center"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              {/* Header Icon */}
              <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-gold/30">
                <span className="text-3xl animate-bounce">⭐</span>
              </div>

              <h3 className="text-lg font-black text-brand-navy leading-tight">
                Give us a Rating & Review!
              </h3>
              <p className="text-slate-550 text-xs mt-2 px-2 leading-relaxed">
                Loved our laundry service? Please take a moment to share your experience and rate us on Google. It helps us grow and serve you better!
              </p>

              {/* Star Rating Visualization */}
              <div className="flex justify-center gap-1.5 my-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      window.open('https://g.page/r/Cb7hIe0tdCSDEAI/review', '_blank')
                      setShowRatingPopup(false)
                      setShowEmailModal(true)
                    }}
                    className="p-1"
                  >
                    <Star size={28} className="fill-brand-gold text-brand-gold drop-shadow-sm" />
                  </motion.button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="space-y-2 mt-4">
                <button
                  id="submit-rating-btn"
                  onClick={() => {
                    window.open('https://g.page/r/Cb7hIe0tdCSDEAI/review', '_blank')
                    setShowRatingPopup(false)
                    setShowEmailModal(true)
                  }}
                  className="w-full bg-brand-gold text-slate-900 font-extrabold py-3 rounded-xl shadow-sm text-xs hover:opacity-95 active:scale-[0.98] transition-all"
                >
                  ⭐⭐⭐⭐⭐ Review on Google
                </button>
                <button
                  id="skip-rating-btn"
                  onClick={() => {
                    setShowRatingPopup(false)
                    setShowEmailModal(true)
                  }}
                  className="w-full text-slate-500 font-bold py-2 rounded-xl text-xs hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Simulated Email Confirmation Modal ── */}
      <AnimatePresence>
        {showEmailModal && successOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailModal(false)}
            />

            {/* Email Container */}
            <motion.div
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-205 z-10 max-h-[85vh] flex flex-col font-sans"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              {/* Header indicating it's a simulated email receipt */}
              <div className="bg-slate-905 bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-brand-gold animate-bounce" />
                  <span className="text-[10px] font-extrabold tracking-wider uppercase">Simulated Email Receipt</span>
                </div>
                <button
                  id="close-email-modal"
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 rounded-full hover:bg-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <X size={16} className="text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Email Client Info Bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-1.5">
                <div className="flex">
                  <span className="w-16 font-extrabold text-slate-400">From:</span>
                  <span className="text-slate-700 font-semibold">Urban Press &lt;<span className="underline">orders@urbanpress.com</span>&gt;</span>
                </div>
                <div className="flex">
                  <span className="w-16 font-extrabold text-slate-400">To:</span>
                  <span className="text-slate-700 font-semibold">{user?.email || 'customer@example.com'}</span>
                </div>
                <div className="flex">
                  <span className="w-16 font-extrabold text-slate-400">Subject:</span>
                  <span className="text-slate-900 font-bold">Order Receipt - {successOrder.orderId}</span>
                </div>
              </div>

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto p-6 max-h-[45vh] bg-[#F9FAFB] no-scrollbar text-slate-850 text-sm">
                <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                  {/* Brand Logo header */}
                  <div className="text-center pb-3 border-b border-slate-100">
                    <span className="text-xl font-black tracking-tight text-slate-900">URBAN<span className="text-brand-gold">PRESS</span></span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Laundry & Dry Cleaning</p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hello <strong className="text-slate-800">{user?.name || 'Guest User'}</strong>,
                  </p>
                  <p className="text-xs text-slate-655 leading-relaxed">
                    Your payment was successful and order <strong className="text-slate-900">{successOrder.orderId}</strong> has been successfully scheduled. We will collect your laundry at the scheduled slot.
                  </p>

                  {/* Summary of charges */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
                    <p className="font-extrabold text-slate-800 border-b border-slate-200/60 pb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Order Summary</p>
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Total Clothes</span>
                      <span>{successOrder.items?.reduce((sum, i) => sum + i.qty, 0) || 0} Items</span>
                    </div>

                    {/* Split laundry vs dry cleaning subtotals if they exist */}
                    {(() => {
                      const laundryItems = (successOrder.items || []).filter(i => i.serviceType !== 'dry_clean')
                      const dryCleanItems = (successOrder.items || []).filter(i => i.serviceType === 'dry_clean')
                      
                      const laundryCount = laundryItems.reduce((sum, i) => sum + i.qty, 0)
                      const laundrySubtotal = laundryItems.reduce((sum, i) => sum + i.qty * i.price, 0)
                      const laundryDelivery = laundryCount > 0 ? (laundryCount >= 15 ? 0 : 30) : 0
                      
                      const dryCleanCount = dryCleanItems.reduce((sum, i) => sum + i.qty, 0)
                      const dryCleanSubtotal = dryCleanItems.reduce((sum, i) => sum + i.qty * i.price, 0)
                      const dryCleanDelivery = dryCleanCount > 0 ? 30 : 0
                      
                      return (
                        <>
                          {laundryCount > 0 && (
                            <div className="bg-white/50 border border-slate-200/40 p-2 rounded-lg space-y-1">
                              <p className="font-extrabold text-[9px] text-brand-navy">Laundry & Steam Iron</p>
                              <div className="flex justify-between text-slate-600">
                                <span>Subtotal ({laundryCount} items)</span>
                                <span>₹{laundrySubtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Delivery Fee</span>
                                <span>{laundryDelivery === 0 ? 'FREE' : `₹${laundryDelivery.toFixed(2)}`}</span>
                              </div>
                            </div>
                          )}
                          {dryCleanCount > 0 && (
                            <div className="bg-white/50 border border-slate-200/40 p-2 rounded-lg space-y-1">
                              <p className="font-extrabold text-[9px] text-slate-900">Dry Cleaning</p>
                              <div className="flex justify-between text-slate-600">
                                <span>Subtotal ({dryCleanCount} items)</span>
                                <span>₹{dryCleanSubtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Delivery Fee</span>
                                <span>₹{dryCleanDelivery.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}

                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Pickup Date</span>
                      <span>{getFormattedDate(successOrder.pickupDate)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Pickup Slot</span>
                      <span>{successOrder.pickupSlot}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Delivery Date</span>
                      <span>{getDeliveryDate(successOrder.pickupDate)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Delivery Slot</span>
                      <span>05:00 PM – 07:00 PM</span>
                    </div>
                    <div className="border-t border-slate-200/60 pt-2 flex justify-between font-black text-brand-navy text-sm">
                      <span>Amount Paid</span>
                      <span>₹{successOrder.amount?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Simulated Email Clothing Breakdown */}
                  {(() => {
                    const laundryItems = (successOrder.items || []).filter(i => i.serviceType !== 'dry_clean')
                    const dryCleanItems = (successOrder.items || []).filter(i => i.serviceType === 'dry_clean')
                    
                    const laundryBreakdown = getClothingBreakdown(laundryItems)
                    const hasLaundry = Object.values(laundryBreakdown).some(qty => qty > 0)
                    
                    const dryCleanBreakdown = getClothingBreakdown(dryCleanItems)
                    const hasDryClean = Object.values(dryCleanBreakdown).some(qty => qty > 0)
                    
                    if (!hasLaundry && !hasDryClean) return null
                    
                    return (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs">
                        <p className="font-extrabold text-slate-800 border-b border-slate-200/60 pb-1.5 uppercase tracking-wider text-[9px] text-slate-400">Garment Breakdown</p>
                        
                        {hasLaundry && (
                          <div className="space-y-1">
                            <p className="font-extrabold text-[9px] text-brand-navy uppercase">Laundry & Steam Iron</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 pl-1">
                              {laundryBreakdown.shirts > 0 && <span>Shirts: {laundryBreakdown.shirts}</span>}
                              {laundryBreakdown.pants > 0 && <span>Pants: {laundryBreakdown.pants}</span>}
                              {laundryBreakdown.tshirts > 0 && <span>T-Shirts: {laundryBreakdown.tshirts}</span>}
                              {laundryBreakdown.sarees > 0 && <span>Sarees: {laundryBreakdown.sarees}</span>}
                              {laundryBreakdown.kurtas > 0 && <span>Kurtas: {laundryBreakdown.kurtas}</span>}
                              {laundryBreakdown.others > 0 && <span>Others: {laundryBreakdown.others}</span>}
                            </div>
                          </div>
                        )}
                        
                        {hasDryClean && (
                          <div className="space-y-1 pt-1.5 border-t border-slate-200/40">
                            <p className="font-extrabold text-[9px] text-slate-900 uppercase">Dry Cleaning</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 pl-1">
                              {dryCleanBreakdown.shirts > 0 && <span>Shirts: {dryCleanBreakdown.shirts}</span>}
                              {dryCleanBreakdown.pants > 0 && <span>Pants: {dryCleanBreakdown.pants}</span>}
                              {dryCleanBreakdown.tshirts > 0 && <span>T-Shirts: {dryCleanBreakdown.tshirts}</span>}
                              {dryCleanBreakdown.sarees > 0 && <span>Sarees: {dryCleanBreakdown.sarees}</span>}
                              {dryCleanBreakdown.kurtas > 0 && <span>Kurtas: {dryCleanBreakdown.kurtas}</span>}
                              {dryCleanBreakdown.others > 0 && <span>Others: {dryCleanBreakdown.others}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className="text-center pt-2">
                    <p className="text-[10px] text-slate-400 leading-normal">
                      If you have any questions, reply to this email or reach us on support@urbanpress.com
                    </p>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-3">
                      Thank you for choosing Urban Press!
                    </p>
                  </div>
                </div>
              </div>

              {/* Close footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
                <button
                  id="close-email-btn"
                  onClick={() => setShowEmailModal(false)}
                  className="bg-brand-gold hover:opacity-95 text-slate-900 font-extrabold py-2 px-6 rounded-xl text-xs shadow-sm active:scale-95 transition-all"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
