import { Worker } from 'bullmq'
import Redis from 'ioredis'
import axios from 'axios'

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

const resendApiKey = process.env.RESEND_API_KEY

console.log('Notification worker listening for events on Redis email-queue...')

const worker = new Worker(
  'email-queue',
  async (job) => {
    console.log(`Processing notification job ${job.id} for Order: ${job.data.order.orderId}`)

    const { order, user } = job.data

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is not configured on the notification container. Skipping email.')
      return
    }

    const getFormattedDate = (dateStr) => {
      if (!dateStr) return ''
      try {
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
      } catch {
        return dateStr
      }
    }

    const getDeliveryDate = (pickupDateStr) => {
      if (!pickupDateStr) return ''
      try {
        const d = new Date(pickupDateStr)
        d.setDate(d.getDate() + 1)
        return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
      } catch {
        return 'Next Day'
      }
    }

    const userName = user?.name || 'Guest User'
    const emailTo = user?.email || 'delivered@resend.dev'

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #F4F3ED; padding: 30px; border-radius: 20px; max-width: 500px; margin: auto; border: 1px solid #E2E8F0;">
        <div style="text-align: center; border-bottom: 2px solid #F5D170; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0; font-weight: 900;">URBAN PRESS</h2>
          <p style="color: #6B7280; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0 0;">Laundry & Dry Cleaning</p>
        </div>
        <p style="font-size: 14px; color: #374151;">Hello <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.5;">Your payment has been successfully verified! Your order <strong>${order.orderId}</strong> has been scheduled for pick up. Details below:</p>
        
        <div style="background-color: #FFFFFF; padding: 20px; border-radius: 15px; border: 1px solid #E2E8F0; margin-top: 20px;">
          <p style="font-size: 11px; font-weight: 800; color: #6B7280; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px;">Receipt Summary</p>
          <table style="width: 100%; font-size: 13px; color: #4B5563; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Order ID</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #111827;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Pickup Date</td>
              <td style="padding: 6px 0; text-align: right; color: #111827;">${getFormattedDate(order.pickupDate)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Pickup Slot</td>
              <td style="padding: 6px 0; text-align: right; color: #111827;">${order.pickupSlot}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Delivery Date</td>
              <td style="padding: 6px 0; text-align: right; color: #111827;">${getDeliveryDate(order.pickupDate)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Delivery Slot</td>
              <td style="padding: 6px 0; text-align: right; color: #111827;">05:00 PM – 07:00 PM</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Address</td>
              <td style="padding: 6px 0; text-align: right; color: #111827; max-width: 200px; word-wrap: break-word;">${order.address || 'Address on profile'}</td>
            </tr>
            <tr style="border-top: 1px solid #E5E7EB;">
              <td style="padding: 10px 0 0 0; font-weight: 800; color: #111827; font-size: 14px;">Amount Paid</td>
              <td style="padding: 10px 0 0 0; text-align: right; font-weight: 900; color: #111827; font-size: 16px;">₹${order.amount?.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin-top: 25px; font-size: 11px; color: #9CA3AF;">
          <p style="margin: 0;">This is a system generated notification receipt. Thank you for choosing Urban Press.</p>
        </div>
      </div>
    `

    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: 'Urban Press <onboarding@resend.dev>',
          to: [emailTo],
          subject: `Payment Receipt - ${order.orderId}`,
          html: htmlContent,
        },
        {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
      console.log(`Successfully sent email receipt to ${emailTo} via Resend.`)
    } catch (err) {
      console.error(`Resend API dispatch failed for job ${job.id}:`, err.response?.data || err.message)
      throw new Error('Resend dispatch failed') // Let BullMQ retry the job
    }
  },
  {
    connection: redisConnection
  }
)

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed after attempts:`, err.message)
})
