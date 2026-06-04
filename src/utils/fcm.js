// src/utils/fcm.js
import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Lazily initialise Firebase app — only once
const getApp = () => {
  try {
    return getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  } catch (err) {
    console.warn('Firebase app init failed:', err.message)
    return null
  }
}

// Lazily get messaging instance — requires browser + service worker
const getMessagingInstance = async () => {
  try {
    const app = getApp()
    if (!app) return null
    // Only import messaging in supported environments
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return null
    const { getMessaging } = await import('firebase/messaging')
    return getMessaging(app)
  } catch (err) {
    console.warn('Firebase messaging unavailable:', err.message)
    return null
  }
}

/**
 * Request permission + get FCM token
 * Call this after login — send token to backend
 */
export const requestFCMToken = async () => {
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const { getToken } = await import('firebase/messaging')
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    })
    return token
  } catch (err) {
    console.warn('FCM token error (non-fatal):', err.message)
    return null
  }
}

/**
 * Listen for foreground messages — safe no-op if unsupported
 */
export const onForegroundMessage = (callback) => {
  let unsubscribe = null
  getMessagingInstance().then(messaging => {
    if (!messaging) return
    import('firebase/messaging').then(({ onMessage }) => {
      unsubscribe = onMessage(messaging, payload => callback(payload))
    }).catch(() => {})
  }).catch(() => {})
  // Return cleanup function
  return () => { if (typeof unsubscribe === 'function') unsubscribe() }
}
