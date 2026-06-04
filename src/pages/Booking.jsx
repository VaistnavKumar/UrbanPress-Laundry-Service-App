// src/pages/Booking.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Minus, MapPin, Calendar, Clock, Truck, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import AddressAutocomplete from '../components/AddressAutocomplete'
import Modal from '../components/Modal'
import { useGeoapify } from '../hooks/useGeoapify'
import { staticMapUrl } from '../utils/geoapify'
import { useOrderStore } from '../context/OrderContext'
import { useAuthStore } from '../context/AuthContext'

/* ── Constants ──────────────────────────────────────────────────────────── */
const SERVICES = [
  { id: 'wash_fold',  label: 'Wash & Fold',  price: 20, icon: '🫧' },
  { id: 'wash_iron',  label: 'Wash & Iron',  price: 30, icon: '👔' },
  { id: 'dry_clean',  label: 'Dry Clean',    price: 80, icon: '🧥' },
  { id: 'steam_iron', label: 'Steam Iron',   price: 15, icon: '♨️' },
]

const CLOTHING = [
  { id: 1, name: 'Shirt',    icon: '👔', qty: 0 },
  { id: 2, name: 'Pant',     icon: '👖', qty: 0 },
  { id: 3, name: 'T-Shirt',  icon: '👕', qty: 0 },
  { id: 4, name: 'Jeans',    icon: '👖', qty: 0 },
  { id: 5, name: 'Saree',    icon: '🥻', qty: 0 },
  { id: 6, name: 'Bedsheet', icon: '🛏️', qty: 0 },
  { id: 7, name: 'Jacket',   icon: '🧥', qty: 0 },
  { id: 8, name: 'Kurta',    icon: '🥻', qty: 0 },
]

const TIME_SLOTS = [
  '08:00 am', '09:30 am', '11:00 am',
  '01:30 pm', '03:00 pm', '04:30 pm',
]

const getDateOptions = () => {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const opts = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    opts.push({
      value:   d.toISOString().split('T')[0],
      day:     days[d.getDay()],
      date:    d.getDate(),
      fullLabel: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    })
  }
  return opts
}

const STEPS = ['My Bucket', 'Schedule', 'Address', 'Summary']

/* ── Component ──────────────────────────────────────────────────────────── */
export default function Booking() {
  const navigate = useNavigate()
  const { setBookingDraft, orders = [], slotConfig } = useOrderStore()
  const { user } = useAuthStore()
  const { getLocationFromBrowser } = useGeoapify()

  const [step,         setStep]         = useState(0)
  const [serviceType,  setServiceType]  = useState('wash_fold')
  const [basket, setBasket] = useState({
    wash_fold: CLOTHING.map(c => ({ ...c, qty: 0 })),
    wash_iron: CLOTHING.map(c => ({ ...c, qty: 0 })),
    dry_clean: CLOTHING.map(c => ({ ...c, qty: 0 })),
    steam_iron: CLOTHING.map(c => ({ ...c, qty: 0 })),
  })
  const [address,      setAddress]      = useState(user?.location?.address || '')
  const [coords,       setCoords]       = useState(
    user?.location ? { lat: user.location.latitude, lon: user.location.longitude, latitude: user.location.latitude, longitude: user.location.longitude } : null
  )

  const activeSlots = slotConfig?.slots || [
    '9:00 AM – 9:30 AM',
    '9:50 AM – 10:30 AM',
    '10:50 AM – 11:30 PM'
  ]

  const [pickupDate,   setPickupDate]   = useState(getDateOptions()[0].value)
  const [pickupSlot,   setPickupSlot]   = useState(activeSlots[0])
  const [deliveryType, setDeliveryType] = useState('standard')
  const [locLoading,   setLocLoading]   = useState(false)

  // System auto-rescheduling flags
  const [wasRescheduled, setWasRescheduled] = useState(false)
  const [originalDate, setOriginalDate] = useState(null)
  const [originalSlot, setOriginalSlot] = useState(null)
  const [showFullSlotModal, setShowFullSlotModal] = useState(false)

  const dateOptions  = getDateOptions()
  const activeService = SERVICES.find(s => s.id === serviceType)
  const pricePerItem  = activeService?.price || 20

  const getPrice = (srvId) => SERVICES.find(s => s.id === srvId)?.price || 20

  // 1. Steam Iron & Laundry services (non-dry-clean)
  const steamIronItems = [
    ...basket.wash_fold.filter(i => i.qty > 0).map(i => ({ ...i, serviceType: 'wash_fold', price: getPrice('wash_fold') })),
    ...basket.wash_iron.filter(i => i.qty > 0).map(i => ({ ...i, serviceType: 'wash_iron', price: getPrice('wash_iron') })),
    ...basket.steam_iron.filter(i => i.qty > 0).map(i => ({ ...i, serviceType: 'steam_iron', price: getPrice('steam_iron') })),
  ]
  const steamIronTotal = steamIronItems.reduce((sum, i) => sum + i.qty * i.price, 0)
  const steamIronCount = steamIronItems.reduce((sum, i) => sum + i.qty, 0)
  const steamIronDeliveryFee = steamIronCount > 0 && steamIronCount < 15 ? 30 : 0

  // 2. Dry Cleaning service
  const dryCleanItems = basket.dry_clean.filter(i => i.qty > 0).map(i => ({ ...i, serviceType: 'dry_clean', price: getPrice('dry_clean') }))
  const dryCleanTotal = dryCleanItems.reduce((sum, i) => sum + i.qty * i.price, 0)
  const dryCleanCount = dryCleanItems.reduce((sum, i) => sum + i.qty, 0)
  const dryCleanDeliveryFee = dryCleanCount > 0 ? 30 : 0

  // Combined metrics
  const total = steamIronTotal + dryCleanTotal
  const itemCount = steamIronCount + dryCleanCount
  const deliveryFee = steamIronDeliveryFee + dryCleanDeliveryFee
  const grandTotal = total + deliveryFee

  // Active items array to map the list inside Step 0
  const items = basket[serviceType] || []

  const updateQty = (id, delta) => {
    setBasket(prev => {
      const updated = prev[serviceType].map(item =>
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      )
      return { ...prev, [serviceType]: updated }
    })
  }

  const handleDetectLocation = async () => {
    setLocLoading(true)
    try {
      const { latitude, longitude, address: addr } = await getLocationFromBrowser()
      setAddress(addr)
      setCoords({ lat: latitude, lon: longitude, latitude, longitude })
    } catch { toast.error('Location access denied') }
    finally { setLocLoading(false) }
  }

  // ── Occupancy helpers ──
  const getSlotOccupancy = (date, slot) => {
    return orders.filter(o => o.pickupDate === date && o.pickupSlot === slot && o.status !== 'cancelled').length
  }
  const getDailyOccupancy = (date) => {
    return orders.filter(o => o.pickupDate === date && o.status !== 'cancelled').length
  }

  const verifyAndAutoSchedule = (selectedDate, targetSlot = null) => {
    const maxDaily = slotConfig?.maxDailyBookings || 18
    const maxSlot = slotConfig?.maxSlotBookings || 6

    if (getDailyOccupancy(selectedDate) >= maxDaily) {
      let found = false
      let nextDateStr = ''
      let nextSlotStr = ''

      // Check next 30 days
      for (let i = 1; i <= 30; i++) {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() + i)
        const dStr = d.toISOString().split('T')[0]

        if (getDailyOccupancy(dStr) < maxDaily) {
          const availSlot = activeSlots.find(s => getSlotOccupancy(dStr, s) < maxSlot)
          if (availSlot) {
            nextDateStr = dStr
            nextSlotStr = availSlot
            found = true
            break
          }
        }
      }

      if (found) {
        setPickupDate(nextDateStr)
        setPickupSlot(nextSlotStr)
        setWasRescheduled(true)
        setOriginalDate(selectedDate)
        setOriginalSlot(targetSlot || pickupSlot)
        toast("Today’s booking capacity is full. Your order has been scheduled for the next available date.", {
          icon: '📅',
          duration: 6000
        })
        return true
      }
    }
    return false
  }

  // Verify dates when step changes to scheduling
  useEffect(() => {
    if (step === 1) {
      verifyAndAutoSchedule(pickupDate)
    }
  }, [step])

  const handleDateSelect = (dateVal) => {
    setPickupDate(dateVal)
    const isResch = verifyAndAutoSchedule(dateVal)
    if (!isResch) {
      // Check if current slot is full on new date
      const maxSlot = slotConfig?.maxSlotBookings || 6
      if (getSlotOccupancy(dateVal, pickupSlot) >= maxSlot) {
        const availSlot = activeSlots.find(s => getSlotOccupancy(dateVal, s) < maxSlot)
        if (availSlot) {
          setPickupSlot(availSlot)
        }
      }
    }
  }

  const handleSlotSelect = (slotVal) => {
    const maxSlot = slotConfig?.maxSlotBookings || 6
    if (getSlotOccupancy(pickupDate, slotVal) >= maxSlot) {
      setShowFullSlotModal(true)
    } else {
      setPickupSlot(slotVal)
    }
  }

  const canProceed = () => {
    if (step === 0) return itemCount > 0
    if (step === 1) return pickupDate && pickupSlot
    if (step === 2) return address.trim().length > 0
    return true
  }

  const handleNext = () => {
    if (!canProceed()) {
      const msgs = ['Please add at least one item', 'Please select date & time', 'Please select a pickup address', '']
      return toast.error(msgs[step])
    }
    if (step < 3) setStep(step + 1)
  }

  const handleProceedToPayment = () => {
    const flatItems = [
      ...steamIronItems.map(i => ({ ...i, serviceType: i.serviceType, price: i.price, label: SERVICES.find(s => s.id === i.serviceType)?.label })),
      ...dryCleanItems.map(i => ({ ...i, serviceType: 'dry_clean', price: 80, label: 'Dry Clean' }))
    ]

    setBookingDraft({
      items: flatItems,
      serviceType,
      address, coords, pickupDate, pickupSlot,
      deliveryType,
      steamIronItems,
      dryCleanItems,
      steamIronTotal,
      dryCleanTotal,
      steamIronDeliveryFee,
      dryCleanDeliveryFee,
      total,
      deliveryFee,
      grandTotal,
      wasRescheduled, originalDate, originalSlot
    })
    navigate('/payment')
  }

  return (
    <div className="min-h-screen bg-app-bg">
      {/* ── Fixed Header ── */}
      <div className="sticky top-0 z-20 px-4 pt-12 pb-4 bg-app-bg/95 backdrop-blur">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}
            className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ChevronLeft size={18} className="text-slate-800" />
          </button>
          <h1 className="text-slate-900 font-black text-xl">{STEPS[step]}</h1>
          {step === 0 && itemCount > 0 && (
            <span className="ml-auto bg-brand-primary text-slate-900 text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
              {itemCount} items
            </span>
          )}
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'bg-brand-primary flex-[2]' : i < step ? 'bg-brand-primary/40 flex-1' : 'bg-slate-300 flex-1'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="px-4 pb-48">
        <AnimatePresence mode="wait">

          {/* STEP 0 — My Bucket ── */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Service type selector */}
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Select Service</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {SERVICES.map(s => {
                  const countForService = (basket[s.id] || []).reduce((sum, item) => sum + item.qty, 0)
                  return (
                    <button
                      key={s.id}
                      id={`service-${s.id}`}
                      onClick={() => setServiceType(s.id)}
                      className={`relative py-3 px-3 rounded-2xl text-left transition-all border ${
                        serviceType === s.id
                          ? 'bg-brand-primary border-brand-primary shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      {countForService > 0 && (
                        <span className="absolute top-2.5 right-2.5 bg-slate-900 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow-sm">
                          {countForService}
                        </span>
                      )}
                      <span className="text-lg block mb-1">{s.icon}</span>
                      <p className={`font-bold text-xs ${serviceType === s.id ? 'text-white' : 'text-slate-800'}`}>{s.label}</p>
                      <p className={`text-[11px] ${serviceType === s.id ? 'text-white/80' : 'text-slate-500'}`}>₹{s.price}/item</p>
                    </button>
                  )
                })}
              </div>

              {/* Item list — My Bucket style */}
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Bucket</p>
              <div className="space-y-2">
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm"
                  >
                    {/* Icon box */}
                    <div className="w-11 h-11 bg-brand-light rounded-xl flex items-center justify-center text-xl shrink-0 border border-slate-100">
                      {item.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-extrabold text-sm">{item.name}</p>
                      <span className="text-[10px] font-bold text-brand-primary bg-brand-light px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {activeService?.label || 'Wash & Fold'}
                      </span>
                      <p className="text-slate-500 text-xs mt-1">₹{pricePerItem.toFixed(2)} / item</p>
                      <p className="text-brand-primary text-xs font-black mt-1">
                        Subtotal: ₹{(item.qty * pricePerItem).toFixed(2)}
                      </p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id={`item-minus-${item.id}`}
                        onClick={() => updateQty(item.id, -1)}
                        disabled={item.qty === 0}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40 transition-colors border border-slate-200 active:scale-95"
                      >
                        <Minus size={13} className="text-slate-700 font-black" />
                      </button>
                      <span className="w-6 text-center font-black text-sm text-slate-800">
                        {item.qty}
                      </span>
                      <button
                        id={`item-plus-${item.id}`}
                        onClick={() => updateQty(item.id, 1)}
                        className="w-8 h-8 rounded-full bg-brand-primary hover:bg-brand-primary/90 flex items-center justify-center shadow-md active:scale-95 transition-all"
                      >
                        <Plus size={13} className="text-slate-900 font-black" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 1 — Schedule ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Pickup Date */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-brand-primary" />
                  <p className="text-slate-800 font-bold text-sm">Pickup Date</p>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {dateOptions.map(d => {
                    const active = pickupDate === d.value
                    const dailyOccup = getDailyOccupancy(d.value)
                    const maxDaily = slotConfig?.maxDailyBookings || 18
                    const isDateFull = dailyOccup >= maxDaily

                    return (
                      <button
                        key={d.value}
                        id={`date-${d.value}`}
                        onClick={() => handleDateSelect(d.value)}
                        className={`shrink-0 w-14 py-3 rounded-2xl flex flex-col items-center gap-0.5 transition-all border ${
                          active
                            ? 'bg-brand-primary border-brand-primary text-slate-900 shadow-md font-black'
                            : isDateFull
                              ? 'bg-red-50 border-red-100 text-red-400 opacity-60'
                              : 'bg-white border-slate-200 hover:border-slate-350 text-slate-800'
                        }`}
                      >
                        <span className={`text-[11px] font-semibold ${active ? 'text-slate-900/80' : 'text-slate-500'}`}>{d.day}</span>
                        <span className={`font-black text-lg leading-none ${active ? 'text-slate-900' : 'text-slate-800'}`}>{d.date}</span>
                        {isDateFull && <span className="text-[8px] font-extrabold text-red-600 tracking-tighter scale-90 uppercase mt-0.5">FULL</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Pickup Time */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-brand-primary" />
                  <p className="text-slate-800 font-bold text-sm">Pickup Time</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {activeSlots.map(slot => {
                    const active = pickupSlot === slot
                    const spotsUsed = getSlotOccupancy(pickupDate, slot)
                    const maxSlot = slotConfig?.maxSlotBookings || 6
                    const spotsLeft = Math.max(0, maxSlot - spotsUsed)
                    const isFull = spotsLeft <= 0

                    return (
                      <button
                        key={slot}
                        id={`slot-${slot.replace(/\s/g, '-')}`}
                        onClick={() => handleSlotSelect(slot)}
                        className={`py-2 px-1 rounded-2xl text-center transition-all border flex flex-col justify-center items-center gap-0.5 ${
                          active
                            ? 'bg-brand-primary border-brand-primary text-slate-900 font-extrabold shadow-md'
                            : isFull
                              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-pointer'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 font-bold'
                        }`}
                      >
                        <span className="text-[10px] leading-tight block">{slot.split(' – ')[0]}</span>
                        <span className="text-[9px] font-normal leading-tight opacity-75">{slot.split(' – ')[1] || ''}</span>
                        <span className={`text-[8px] font-extrabold uppercase px-1 rounded mt-0.5 ${isFull ? 'bg-red-100 text-red-700' : 'bg-brand-light text-brand-navy'}`}>
                          {isFull ? 'FULL' : `${spotsLeft} left`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Delivery notice */}
              <div className="bg-brand-light border border-brand-gold/30 rounded-2xl p-4 mt-6">
                <p className="text-brand-navy font-bold text-sm flex items-center gap-2">
                  <Truck size={16} /> Delivery Information
                </p>
                <p className="text-slate-650 text-xs mt-1.5 leading-relaxed">
                  Get <span className="font-extrabold text-brand-navy bg-brand-gold/30 px-1 rounded">FREE Standard Delivery</span> when you order 15 or more clothes. For orders below 15 clothes, a delivery charge of ₹30 applies.
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Address ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <p className="text-slate-850 font-bold text-sm mb-4">Pickup Address</p>
              <button
                id="booking-detect-location"
                onClick={handleDetectLocation}
                disabled={locLoading}
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-slate-900 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 mb-4 disabled:opacity-60 transition-colors shadow-md"
              >
                {locLoading ? <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : <MapPin size={16} />}
                {locLoading ? 'Detecting...' : 'Use Current Location'}
              </button>

              {address && coords && (
                <div className="mb-4 space-y-3">
                  {coords.latitude && (
                    <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                      <img
                        src={staticMapUrl(coords.latitude, coords.longitude)}
                        alt="map"
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display='none' }}
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-2.5 p-4 bg-brand-light border border-brand-primary/20 rounded-xl">
                    <MapPin size={14} className="text-brand-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-800 font-semibold leading-relaxed">{address}</p>
                  </div>
                </div>
              )}

              <p className="text-slate-500 text-xs mb-2 font-medium">Search a different address:</p>
              <AddressAutocomplete
                onSelect={s => {
                  setAddress(s.label)
                  setCoords({ lat: s.lat, lon: s.lon, latitude: s.lat, longitude: s.lon })
                }}
                defaultValue={address}
              />
            </motion.div>
          )}

          {/* STEP 3 — Summary ── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Shop-name style header */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 mb-4 shadow-card">
                <h2 className="text-slate-900 font-black text-xl">UrbanPress</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-brand-primary" />
                  <p className="text-slate-500 text-xs">{address || 'Tirupati, Andhra Pradesh'}</p>
                </div>
              </div>

              {/* Items Summary card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 space-y-4 shadow-card">
                <p className="text-slate-800 font-bold text-xs uppercase tracking-wider border-b pb-2">Selected Items</p>
                
                {/* 1. Steam Iron & Laundry Items */}
                {steamIronItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-brand-navy bg-brand-light px-2 py-1 rounded inline-block">
                      STEAM IRON & LAUNDRY
                    </p>
                    {steamIronItems.map(item => (
                      <div key={`si-${item.id}`} className="flex items-center justify-between py-1 text-sm pl-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <p className="text-slate-800 font-extrabold">{item.name}</p>
                            <p className="text-slate-500 text-[10px]">
                              {SERVICES.find(s => s.id === item.serviceType)?.label || 'Laundry'} · ₹{item.price.toFixed(2)} / item
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-850 font-bold">Qty: {item.qty}</p>
                          <p className="text-brand-primary font-black">₹{(item.qty * item.price).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold text-slate-550 border-b pb-2 pl-2">
                      <span>Laundry Subtotal ({steamIronCount} items)</span>
                      <span>₹{steamIronTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* 2. Dry Cleaning Items */}
                {dryCleanItems.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-black text-white bg-slate-900 px-2 py-1 rounded inline-block">
                      DRY CLEANING SERVICE
                    </p>
                    {dryCleanItems.map(item => (
                      <div key={`dc-${item.id}`} className="flex items-center justify-between py-1 text-sm pl-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <p className="text-slate-800 font-extrabold">{item.name}</p>
                            <p className="text-slate-500 text-[10px]">
                              Dry Cleaning · ₹{item.price.toFixed(2)} / item
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-850 font-bold">Qty: {item.qty}</p>
                          <p className="text-brand-primary font-black">₹{(item.qty * item.price).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold text-slate-550 border-b pb-2 pl-2">
                      <span>Dry Cleaning Subtotal ({dryCleanCount} items)</span>
                      <span>₹{dryCleanTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-bold text-slate-600 pt-1">
                  <span>Total Items Count</span>
                  <span>{itemCount} items</span>
                </div>
              </div>

              {/* Schedule info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 space-y-3 shadow-card">
                <p className="text-slate-800 font-bold text-xs uppercase tracking-wider border-b pb-2">Pickup & Delivery Details</p>
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar size={14} className="text-brand-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-slate-800 font-bold text-xs">Pickup Date & Time</p>
                    <p className="text-slate-550 text-xs mt-0.5">
                      {dateOptions.find(d => d.value === pickupDate)?.fullLabel} @ {pickupSlot}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-sm mt-2">
                  <Truck size={14} className="text-brand-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-slate-800 font-bold text-xs">Delivery Details</p>
                    <p className="text-slate-550 text-xs mt-0.5">
                      Standard Delivery ({deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`})
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-sm mt-2">
                  <MapPin size={14} className="text-brand-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-slate-800 font-bold text-xs">Delivery Address</p>
                    <p className="text-slate-550 text-xs mt-0.5 leading-relaxed">{address}</p>
                  </div>
                </div>
              </div>

              {/* Customer & Payment Info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 space-y-3 shadow-card">
                <p className="text-slate-800 font-bold text-xs uppercase tracking-wider border-b pb-2">Customer & Payment Info</p>
                <div>
                  <p className="text-slate-800 font-bold text-xs">Customer Name</p>
                  <p className="text-slate-550 text-xs mt-0.5">{user?.name || 'Guest User'}</p>
                </div>
                {user?.phone && (
                  <div>
                    <p className="text-slate-800 font-bold text-xs">Phone Number</p>
                    <p className="text-slate-550 text-xs mt-0.5">{user.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-800 font-bold text-xs">Payment Information</p>
                  <p className="text-slate-550 text-xs mt-0.5">Pay online via Razorpay (Cards, UPI, NetBanking)</p>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-card">
                <p className="text-slate-800 font-bold text-xs uppercase tracking-wider border-b pb-2">Price Breakdown</p>
                
                {steamIronCount > 0 && (
                  <div className="space-y-1.5 text-xs text-slate-600 border-b pb-2">
                    <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Laundry Billing</p>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{steamIronTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Charge</span>
                      <span className={steamIronDeliveryFee === 0 ? 'text-green-600 font-bold' : 'text-slate-800 font-bold'}>
                        {steamIronDeliveryFee === 0 ? 'FREE' : `₹${steamIronDeliveryFee.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                )}

                {dryCleanCount > 0 && (
                  <div className="space-y-1.5 text-xs text-slate-600 border-b pb-2">
                    <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Dry Cleaning Billing</p>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{dryCleanTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Charge</span>
                      <span className="text-slate-800 font-bold">₹{dryCleanDeliveryFee.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-xs font-semibold text-slate-600 pt-1">
                  <span>Discounts</span>
                  <span className="text-green-600 font-bold">₹0.00</span>
                </div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-800 font-black text-sm">Grand Total</span>
                  <span className="text-brand-primary font-black text-lg">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <motion.button
                id="proceed-to-payment"
                whileTap={{ scale: 0.97 }}
                onClick={handleProceedToPayment}
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-slate-900 font-extrabold py-4 rounded-2xl mt-5 text-base shadow-md transition-colors"
              >
                Place Order — ₹{grandTotal.toFixed(2)}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Fixed Bottom Bar (steps 0–2) ── */}
      {step < 3 && (
        <div className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-0 right-0 max-w-lg mx-auto px-4 pb-4 pt-3 bg-brand-cream/90 backdrop-blur-md z-30 border-t border-slate-200/60 rounded-t-3xl">
          {/* Mini total for step 0 */}
          {step === 0 && itemCount > 0 && (
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-slate-500 text-sm font-bold">Total Price ({itemCount} items)</span>
              <span className="text-brand-primary font-black text-base">₹ {total.toFixed(2)}</span>
            </div>
          )}
          <motion.button
            id={`next-step-${step}`}
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            className="w-full bg-brand-primary hover:bg-brand-primary/95 text-slate-900 font-extrabold py-4 rounded-2xl text-base shadow-md transition-all"
          >
            {step === 0 ? 'Schedule Now' : step === 1 ? 'Set Pickup Address' : 'Review Order'}
          </motion.button>
        </div>
      )}

      {/* Full Slot Modal Warning */}
      <Modal
        isOpen={showFullSlotModal}
        onClose={() => setShowFullSlotModal(false)}
        title="Slot Full"
      >
        <div className="text-center py-4">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-slate-900 font-extrabold text-base px-2">
            This slot is fully booked. Please select another available time slot.
          </p>
        </div>
        <button
          onClick={() => setShowFullSlotModal(false)}
          className="w-full bg-brand-primary text-slate-900 font-extrabold py-3.5 rounded-xl shadow-md mt-4 transition-all"
        >
          Okay, Got it
        </button>
      </Modal>
    </div>
  )
}
