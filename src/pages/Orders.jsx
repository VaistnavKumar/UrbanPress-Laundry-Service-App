// src/pages/Orders.jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import axiosInstance from '../api/axios'
import OrderCard from '../components/OrderCard'

import { useOrderStore } from '../context/OrderContext'

const TABS = ['Active', 'History']

const ACTIVE_STATUSES = ['scheduled', 'picked_up', 'in_laundry', 'out_for_delivery']

export default function Orders() {
  const [activeTab, setActiveTab] = useState('Active')
  const orders = useOrderStore((state) => state.orders)
  const setStoreOrders = useOrderStore((state) => state.setOrders)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/orders')
      if (res.data.orders?.length > 0) {
        setStoreOrders(res.data.orders)
      }
    } catch {
      // Fallback is naturally handled since orders is bound to useOrderStore
    } finally {
      setLoading(false)
    }
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
  const historyOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status))
  const displayedOrders = activeTab === 'Active' ? activeOrders : historyOrders

  return (
    <div className="min-h-screen bg-brand-cream pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900 font-black text-3xl tracking-tight">My Orders</h1>
            <p className="text-slate-500 text-sm mt-0.5">{orders.length} total orders</p>
          </div>
          <button
            id="refresh-orders"
            onClick={fetchOrders}
            disabled={loading}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm"
          >
            <RefreshCw size={16} className={`text-slate-800 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              id={`orders-tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-brand-gold text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
              {tab === 'Active' && activeOrders.length > 0 && (
                <span className="ml-1.5 bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {activeOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="px-4 pt-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && displayedOrders.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <span className="text-5xl mb-4 block">📦</span>
            <p className="font-bold text-brand-navy text-lg">No {activeTab.toLowerCase()} orders</p>
            <p className="text-muted text-sm mt-1">
              {activeTab === 'Active'
                ? 'Book a pickup to get started!'
                : 'Completed orders will appear here'}
            </p>
          </motion.div>
        )}

        {!loading && displayedOrders.map((order, i) => (
          <OrderCard key={order._id} order={order} delay={i * 0.07} />
        ))}

        {/* Status legend */}
        {displayedOrders.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100 mt-2">
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Order Status Guide</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { status: 'Scheduled',        dot: 'bg-brand-primary' },
                { status: 'Picked Up',        dot: 'bg-orange-500' },
                { status: 'In Laundry',       dot: 'bg-purple-500' },
                { status: 'Out for Delivery', dot: 'bg-teal-500' },
                { status: 'Delivered',        dot: 'bg-green-500' },
                { status: 'Cancelled',        dot: 'bg-red-500' },
              ].map(({ status, dot }) => (
                <div key={status} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  {status}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
