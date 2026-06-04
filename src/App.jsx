// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './context/AuthContext'
import { useFCM } from './hooks/useFCM.jsx'
import BottomNav from './components/BottomNav'

// Pages
import SplashScreen   from './pages/SplashScreen'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Home           from './pages/Home'
import Services       from './pages/Services'
import Booking        from './pages/Booking'
import Payment        from './pages/Payment'
import OrderConfirm   from './pages/OrderConfirm'
import Orders         from './pages/Orders'
import Profile        from './pages/Profile'

import OrderDetails   from './pages/OrderDetails'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, token } = useAuthStore()
  if (!user && !token && !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Inner app — initializes FCM after auth
function AppInner() {
  const { user } = useAuthStore()
  useFCM(user)

  return (
    <div className="app-container min-h-screen relative">
      <Routes>
        {/* Public */}
        <Route path="/"         element={<SplashScreen />} />
        <Route path="/splash"   element={<SplashScreen />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}
        <Route path="/home"          element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/services"      element={<ProtectedRoute><Services /></ProtectedRoute>} />
        <Route path="/booking"       element={<ProtectedRoute><Booking /></ProtectedRoute>} />
        <Route path="/payment"       element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/order-confirm" element={<ProtectedRoute><OrderConfirm /></ProtectedRoute>} />
        <Route path="/orders"        element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="/order-details/:orderId" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <AppInner />
        <Toaster
          position="top-center"
          gutter={8}
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '14px',
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(10, 22, 40, 0.15)',
            },
            success: {
              iconTheme: { primary: '#0D9488', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' },
            },
          }}
        />
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
