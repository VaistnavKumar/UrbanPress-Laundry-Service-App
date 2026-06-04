// IMPORTANT: This file must be at /public/firebase-messaging-sw.js
// It handles background push notifications when app is closed

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyCvYDzh2F5PQceS2E8sbOqCpqZ0C8wNU4A',
  authDomain:        'urbanpreaundryservices.firebaseapp.com',
  projectId:         'urbanpreaundryservices',
  storageBucket:     'urbanpreaundryservices.firebasestorage.app',
  messagingSenderId: '812314404309',
  appId:             '1:812314404309:web:847241ab3484b2e993495c',
})

const messaging = firebase.messaging()

// Background message handler — shows notification when app is closed/backgrounded
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Received background message:', payload)

  const { title, body, icon } = payload.notification || {}
  const notificationOptions = {
    body:  body  || 'You have a new update from UrbanPress',
    icon:  icon  || '/logo.png',
    badge: '/logo.png',
    data:  payload.data || {},
    vibrate: [100, 50, 100],
    actions: [
      { action: 'view',    title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  self.registration.showNotification(
    title || 'UrbanPress',
    notificationOptions
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/orders')
    )
  } else {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})
