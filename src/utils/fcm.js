// src/utils/fcm.js
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

let app
let messaging

try {
  app = initializeApp(firebaseConfig)
  messaging = getMessaging(app)
} catch (err) {
  console.warn('Firebase initialization skipped (config not set):', err.message)
}

/**
 * Request permission + get FCM token
 * Call this after login — send token to backend
 */
export const requestFCMToken = async () => {
  if (!messaging) return null
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return null
    }
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    })
    return token
  } catch (err) {
    console.error('FCM token error:', err)
    return null
  }
}

/**
 * Listen for foreground messages (app is open)
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}
