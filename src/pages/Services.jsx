// src/pages/Services.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const PROMOTIONS = [
  {
    id: 'ironing',
    title: 'IRONING',
    subtitle: 'Enjoy 10% off ironing service!',
    tag: 'ironing',
    tagColor: 'bg-brand-primary text-slate-900 font-extrabold',
    color: 'bg-brand-promo-pink',
    emoji: '👔',
  },
  {
    id: 'wash',
    title: 'WASH',
    subtitle: 'Limited Time: 10% off wash service!',
    tag: '10% off',
    tagColor: 'bg-orange-500 text-white font-extrabold',
    color: 'bg-brand-promo-yellow',
    emoji: '🫧',
  },
  {
    id: 'wash_iron',
    title: 'WASH & IRON',
    subtitle: 'Save 10% wash & iron service!',
    tag: 'wash & iron',
    tagColor: 'bg-brand-primary text-slate-900 font-extrabold',
    color: 'bg-brand-promo-orange',
    emoji: '👕',
  },
  {
    id: 'welcome_offer',
    title: 'WELCOME OFFER',
    subtitle: 'Get 15% off next order',
    tag: 'next order',
    tagColor: 'bg-orange-500 text-white font-extrabold',
    color: 'bg-brand-light border border-brand-gold/30',
    emoji: '🌟',
  },
]

const PRICES = [
  {
    id: 'wash',
    name: 'Wash',
    description: 'For everyday bedsheets laundry, and towels.',
    pills: ['WASH', 'TUMBLE-DRY', 'IN A BAG'],
    priceText: 'Price per item from ₹150',
    color: 'bg-brand-gold',
    emoji: '🧺',
  },
  {
    id: 'ironing',
    name: 'Ironing',
    description: 'For items that are already clean.',
    pills: ['IRONING', 'ON HANGERS', 'IN A BAG'],
    priceText: 'Price per item from ₹80',
    color: 'bg-white',
    emoji: '👔',
  },
  {
    id: 'wash_iron',
    name: 'Wash & Iron',
    description: 'For everyday bedsheets laundry, and towels.',
    pills: ['WASH & IRON', 'ON HANGERS', 'IN A BAG'],
    priceText: 'Price per item from ₹220',
    color: 'bg-white',
    emoji: '👕',
  },
]

export default function Services() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Promotions')

  const handleClaim = (title) => {
    toast.success(`Coupon claimed! Applied to your booking. 🎉`)
    navigate('/booking')
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-28">
      {/* Header bar */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={18} className="text-slate-800" />
        </button>
        <h2 className="text-slate-900 font-extrabold text-base tracking-wide">
          {activeTab}
        </h2>
        <button
          onClick={() => navigate('/home')}
          className="w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm"
        >
          <div className="flex flex-col gap-1 w-4">
            <span className="h-0.5 w-full bg-slate-800 rounded" />
            <span className="h-0.5 w-2/3 bg-slate-800 rounded ml-auto" />
            <span className="h-0.5 w-full bg-slate-800 rounded" />
          </div>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="px-5 mb-6">
        <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200/40">
          {['Promotions', 'Prices'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Render Promotions (Screen 2) */}
      {activeTab === 'Promotions' && (
        <div className="px-5 space-y-4">
          {PROMOTIONS.map((promo, idx) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`${promo.color} rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between h-52 shadow-sm border border-slate-150/10`}
            >
              <div className="relative z-10 max-w-[65%]">
                {/* Title */}
                <h3 className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-80 mb-2">
                  {promo.title}
                </h3>
                {/* Description */}
                <h4 className="text-slate-900 font-extrabold text-base leading-tight mb-3">
                  {promo.subtitle}
                </h4>
                {/* Promo Badge */}
                <span className={`inline-block px-3 py-1 ${promo.tagColor} text-[10px] rounded-full mb-3 shadow-sm`}>
                  {promo.tag}
                </span>
              </div>

              {/* Character/Emoji Graphic */}
              <div className="absolute right-4 bottom-4 w-[28%] h-[60%] bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-white/10">
                {promo.emoji}
              </div>

              {/* Claim button */}
              <div className="relative z-10 max-w-[55%]">
                <button
                  onClick={() => handleClaim(promo.title)}
                  className="w-full bg-white text-slate-900 font-black py-2.5 px-4 rounded-full text-[11px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Claim the offer
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Render Prices (Screen 3) */}
      {activeTab === 'Prices' && (
        <div className="px-5 space-y-4">
          {PRICES.map((price, idx) => (
            <motion.div
              key={price.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`${price.color} rounded-[32px] p-6 relative overflow-hidden shadow-md ${
                price.color === 'bg-white' ? 'border border-slate-100 shadow-slate-200/40' : 'shadow-yellow-500/10'
              }`}
            >
              <div className="flex gap-4 items-start mb-4">
                {/* Card thumbnail image */}
                <div className={`w-14 h-14 rounded-2xl ${price.color === 'bg-white' ? 'bg-slate-100' : 'bg-white/30'} flex items-center justify-center text-3xl shrink-0`}>
                  {price.emoji}
                </div>
                {/* Description info */}
                <div>
                  <h3 className="text-slate-900 font-extrabold text-lg leading-tight mb-1">{price.name}</h3>
                  <p className="text-slate-500 text-xs leading-snug">{price.description}</p>
                </div>
              </div>

              {/* Capsule badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {price.pills.map((pill) => (
                  <span
                    key={pill}
                    className={`text-[9px] font-extrabold tracking-wider px-3 py-1 rounded-full ${
                      price.color === 'bg-white'
                        ? 'bg-slate-100 text-slate-500 border border-slate-200'
                        : 'bg-white/35 text-slate-800'
                    }`}
                  >
                    {pill}
                  </span>
                ))}
              </div>

              {/* Price button */}
              <button
                onClick={() => navigate('/booking')}
                className={`w-full py-3.5 px-5 rounded-full flex items-center justify-between font-bold text-xs ${
                  price.color === 'bg-white'
                    ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200/50'
                    : 'bg-white/40 text-slate-900 hover:bg-white/50'
                } transition-colors`}
              >
                <span>{price.priceText}</span>
                <ArrowRight size={14} className="text-slate-800 shrink-0" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
