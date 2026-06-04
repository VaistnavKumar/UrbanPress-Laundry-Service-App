// src/components/ServiceCard.jsx
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ServiceCard({
  id,
  icon,
  name,
  price,
  unit = '/item',
  description,
  color = 'from-brand-blue to-brand-navy',
  delay = 0,
  onClick,
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) onClick()
    else navigate('/booking')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="service-card cursor-pointer"
    >
      <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white relative overflow-hidden`}>
        {/* Decorative circle */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />

        <span className="text-3xl mb-3 block relative z-10">{icon}</span>
        <h3 className="font-bold text-base leading-tight relative z-10">{name}</h3>
        <p className="text-xs text-white/80 mt-1 relative z-10">{description}</p>

        <div className="flex items-center justify-between mt-3 relative z-10">
          <span className="font-black text-lg">
            ₹{price}
            <span className="text-xs font-normal text-white/80">{unit}</span>
          </span>
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
