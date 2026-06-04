// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Zustand store for auth ──────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) localStorage.setItem('token', token)
        else localStorage.removeItem('token')
        set({ token })
      },
      // Save location into user object locally (used when backend is offline)
      setLocation: (locationData) =>
        set((state) => ({
          user: state.user ? { ...state.user, location: locationData } : state.user,
        })),
      logout: () => {
        localStorage.clear()
        set({ user: null, token: null })
      },
    }),
    {
      name: 'urbanpress-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

// ── Zustand store for FCM notifications ────────────────────────────────────
export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (notif) => {
        const notifications = [notif, ...get().notifications].slice(0, 20) // keep last 20
        set({ notifications, unreadCount: get().unreadCount + 1 })
      },
      markAllRead: () => set({ unreadCount: 0 }),
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'urbanpress-notifications',
    }
  )
)

// ── React Context (optional convenience wrapper) ───────────────────────────
const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const { user, token, setUser, setToken, logout } = useAuthStore()

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
