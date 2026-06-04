// src/utils/razorpay.js
import toast from 'react-hot-toast'

export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

export const initiatePayment = async ({ amount, orderId, user, onSuccess, onFailure }) => {
  const loaded = await loadRazorpay()
  if (!loaded) {
    toast.error('Payment gateway failed to load')
    return
  }

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: amount * 100, // in paise
    currency: 'INR',
    name: 'UrbanPress',
    description: 'Laundry & Dry Cleaning Service',
    image: '/logo.png',
    order_id: orderId,
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.phone || '',
    },
    notes: {
      address: 'UrbanPress Tirupati/Hyderabad',
    },
    theme: {
      color: '#0A1628',
    },
    handler: (response) => {
      onSuccess(response)
    },
    modal: {
      ondismiss: () => {
        if (onFailure) onFailure('Payment cancelled by user')
      },
    },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', (response) => {
    if (onFailure) onFailure(response.error.description)
  })
  rzp.open()
}
