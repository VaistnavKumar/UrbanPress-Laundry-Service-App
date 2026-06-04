// src/pages/SplashScreen.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/login', { replace: true }), 2800)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated wave background */}
      <div className="absolute inset-0 overflow-hidden bg-brand-cream">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 w-[200%] h-64 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(ellipse at center, #F5D170 0%, transparent 70%)',
              left: '-50%',
              bottom: `${i * 60 - 80}px`,
            }}
            animate={{
              x: [0, 40, 0, -40, 0],
              y: [0, -10, 0, 10, 0],
            }}
            transition={{
              duration: 6 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.8,
            }}
          />
        ))}
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`p-${i}`}
            className="absolute w-2 h-2 bg-brand-gold/25 rounded-full"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Logo + content */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Logo mark */}
        <motion.div
          className="w-24 h-24 bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-lg mb-6 overflow-hidden p-3"
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <img src="/logo.png" alt="UrbanPress Logo" className="w-full h-full object-contain" />
        </motion.div>

        <motion.h1
          className="text-4xl font-black text-slate-900 tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Urban<span className="text-brand-primary">Press</span>
        </motion.h1>

        <motion.p
          className="text-slate-600 text-base mt-2 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Fresh clothes. Delivered.
        </motion.p>

        {/* Location badges */}
        <motion.div
          className="flex items-center gap-2 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <span className="px-4 py-1.5 bg-brand-gold text-slate-900 border border-brand-gold/30 rounded-full text-xs font-bold shadow-sm">📍 Tirupati</span>
        </motion.div>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-200 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <motion.div
          className="h-full bg-brand-gold rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.2, delay: 0.6, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  )
}
