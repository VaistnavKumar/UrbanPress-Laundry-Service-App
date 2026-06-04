// src/components/BottomNav.jsx
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Layers, ShoppingBag, User } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { icon: Home,        label: 'Home',     path: '/home' },
  { icon: Layers,      label: 'Services', path: '/services' },
  { icon: ShoppingBag, label: 'Orders',   path: '/orders' },
  { icon: User,        label: 'Profile',  path: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate  = useNavigate()

  const hiddenPaths = ['/', '/login', '/register', '/splash', '/order-confirm', '/payment']
  if (hiddenPaths.includes(location.pathname)) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-area-pb">
      <div className="max-w-lg mx-auto">
        <div
          className="mx-3 mb-3 rounded-3xl px-3 py-2 flex items-center justify-around"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
          }}
        >
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                id={`nav-${label.toLowerCase()}`}
                onClick={() => navigate(path)}
                aria-label={label}
                className="relative flex flex-col items-center justify-center gap-1 py-1.5 flex-1"
              >
                {/* Active bubble */}
                {active && (
                  <motion.div
                    layoutId="nav-bubble"
                    className="absolute inset-x-2 inset-y-1 bg-brand-gold rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <motion.div
                  animate={{ y: active ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative z-10"
                >
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={`transition-colors duration-200 ${
                      active ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  />
                </motion.div>

                <span className={`relative z-10 text-[10px] font-extrabold transition-colors duration-200 ${
                  active ? 'text-slate-900' : 'text-slate-400'
                }`}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
