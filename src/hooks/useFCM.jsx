// src/hooks/useFCM.js
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { requestFCMToken, onForegroundMessage } from '../utils/fcm'
import axiosInstance from '../api/axios'
import { useNotificationStore } from '../context/AuthContext'

export const useFCM = (user) => {
  const navigate = useNavigate()
  const addNotification = useNotificationStore((s) => s.addNotification)

  useEffect(() => {
    if (!user) return

    const initFCM = async () => {
      try {
        const token = await requestFCMToken()
        if (token) {
          await axiosInstance.post('/api/user/fcm-token', { token })
        }
      } catch (err) {
        console.warn('FCM init error:', err)
      }
    }

    initFCM()

    // Foreground: show toast + optional navigation
    const unsubscribe = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {}
      const { orderId, type } = payload.data || {}

      // Store in notification history
      addNotification({ title, body, type, orderId, timestamp: Date.now() })

      toast.custom((t) => (
        <div
          className={`bg-white shadow-xl rounded-2xl px-4 py-3 flex items-start gap-3 cursor-pointer max-w-sm border border-slate-100 ${
            t.visible ? 'animate-enter' : 'animate-leave'
          }`}
          onClick={() => {
            if (orderId) navigate('/orders')
            toast.dismiss(t.id)
          }}
        >
          <span className="text-2xl">🧺</span>
          <div>
            <p className="font-semibold text-sm text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{body}</p>
          </div>
        </div>
      ), { duration: 5000 })
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [user])
}
