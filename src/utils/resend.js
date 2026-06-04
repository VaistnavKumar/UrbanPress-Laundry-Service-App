import axios from 'axios'

export const sendOrderConfirmationEmail = async (order, user) => {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY
  if (!apiKey) {
    console.warn('Resend API key missing from env. Skipping email dispatch.')
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
  
  // Resend free tier sandbox keys are restricted to sending to onboarding@resend.dev 
  // or verified domain addresses. We will prioritize the user email, but fall back to the test mailer.
  const emailTo = user?.email || 'delivered@resend.dev'

  const laundryItems = (order.items || []).filter(i => i.serviceType !== 'dry_clean')
  const dryCleanItems = (order.items || []).filter(i => i.serviceType === 'dry_clean')

  const laundryCount = laundryItems.reduce((sum, i) => sum + i.qty, 0)
  const laundrySubtotal = laundryItems.reduce((sum, i) => sum + i.qty * i.price, 0)
  const laundryDelivery = laundryCount > 0 ? (laundryCount >= 15 ? 0 : 30) : 0

  const dryCleanCount = dryCleanItems.reduce((sum, i) => sum + i.qty, 0)
  const dryCleanSubtotal = dryCleanItems.reduce((sum, i) => sum + i.qty * i.price, 0)
  const dryCleanDelivery = dryCleanCount > 0 ? 30 : 0

  // Build clothing breakdown
  const getClothingBreakdown = (itemsList) => {
    let shirts = 0, pants = 0, tshirts = 0, sarees = 0, kurtas = 0, others = 0
    itemsList.forEach(i => {
      const name = i.name.toLowerCase()
      const qty = i.qty || 0
      if (name.includes('shirt') && !name.includes('t-shirt')) shirts += qty
      else if (name.includes('pant') || name.includes('jeans') || name.includes('trousers')) pants += qty
      else if (name.includes('t-shirt') || name.includes('tshirt')) tshirts += qty
      else if (name.includes('saree')) sarees += qty
      else if (name.includes('kurta')) kurtas += qty
      else others += qty
    })
    return { shirts, pants, tshirts, sarees, kurtas, others }
  }

  const laundryBreakdown = getClothingBreakdown(laundryItems)
  const dryCleanBreakdown = getClothingBreakdown(dryCleanItems)

  const hasLaundryBreakdown = Object.values(laundryBreakdown).some(q => q > 0)
  const hasDryCleanBreakdown = Object.values(dryCleanBreakdown).some(q => q > 0)

  // Construct table rows for billing
  let billingRows = ''
  if (laundryCount > 0) {
    billingRows += `
      <tr style="border-top: 1px dashed #E2E8F0;">
        <td style="padding: 6px 0; font-size: 11px; font-weight: 800; color: #1e3a8a;">LAUNDRY & STEAM IRON</td>
        <td></td>
      </tr>
      <tr>
        <td style="padding: 4px 0 4px 10px; color: #6B7280; font-size: 12px;">Subtotal (${laundryCount} items)</td>
        <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 12px;">₹${laundrySubtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0 4px 10px; color: #6B7280; font-size: 12px;">Delivery Fee</td>
        <td style="padding: 4px 0; text-align: right; color: #16a34a; font-weight: 700; font-size: 12px;">${laundryDelivery === 0 ? 'FREE' : `₹${laundryDelivery.toFixed(2)}`}</td>
      </tr>
    `
  }
  if (dryCleanCount > 0) {
    billingRows += `
      <tr style="border-top: 1px dashed #E2E8F0;">
        <td style="padding: 6px 0; font-size: 11px; font-weight: 800; color: #0f172a;">DRY CLEANING</td>
        <td></td>
      </tr>
      <tr>
        <td style="padding: 4px 0 4px 10px; color: #6B7280; font-size: 12px;">Subtotal (${dryCleanCount} items)</td>
        <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 12px;">₹${dryCleanSubtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0 4px 10px; color: #6B7280; font-size: 12px;">Delivery Fee</td>
        <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 12px;">₹${dryCleanDelivery.toFixed(2)}</td>
      </tr>
    `
  }

  // Construct table rows for clothing breakdown
  let clothingRows = ''
  const renderBreakdownTable = (title, breakdown) => {
    let html = `
      <tr style="border-top: 1px dashed #E2E8F0;">
        <td style="padding: 8px 0 4px 0; font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;">${title} Details</td>
        <td></td>
      </tr>
    `
    const keys = { shirts: 'Shirts', pants: 'Pants', tshirts: 'T-Shirts', sarees: 'Sarees', kurtas: 'Kurtas', others: 'Others' }
    Object.keys(keys).forEach(k => {
      const q = breakdown[k]
      if (q > 0) {
        html += `
          <tr>
            <td style="padding: 3px 0 3px 10px; color: #4B5563; font-size: 12px;">${keys[k]}</td>
            <td style="padding: 3px 0; text-align: right; font-weight: 700; color: #111827; font-size: 12px;">${q}</td>
          </tr>
        `
      }
    })
    return html
  }

  if (hasLaundryBreakdown) {
    clothingRows += renderBreakdownTable('Laundry & Steam Iron', laundryBreakdown)
  }
  if (hasDryCleanBreakdown) {
    clothingRows += renderBreakdownTable('Dry Cleaning', dryCleanBreakdown)
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #F4F3ED; padding: 30px; border-radius: 20px; max-width: 500px; margin: auto; border: 1px solid #E2E8F0;">
      <div style="text-align: center; border-bottom: 2px solid #F5D170; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="color: #111827; margin: 0; font-weight: 900; font-family: sans-serif;">URBAN PRESS</h2>
        <p style="color: #6B7280; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0 0;">Laundry & Dry Cleaning</p>
      </div>
      <p style="font-size: 14px; color: #374151;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.5;">Thank you for choosing Urban Press! Your order has been successfully scheduled. Here are your booking details:</p>
      
      <div style="background-color: #FFFFFF; padding: 20px; border-radius: 15px; border: 1px solid #E2E8F0; margin-top: 20px;">
        <p style="font-size: 11px; font-weight: 800; color: #6B7280; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px;">Order Details</p>
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
            <td style="padding: 6px 0; text-align: right; color: #111827; max-width: 200px; word-wrap: break-word;">${order.address}</td>
          </tr>
          
          <!-- Billing Breakdown by Service Type -->
          ${billingRows}

          <!-- Garment Breakdown Section -->
          ${clothingRows}

          <tr style="border-top: 1.5px solid #111827;">
            <td style="padding: 10px 0 0 0; font-weight: 800; color: #111827; font-size: 14px;">Amount Paid</td>
            <td style="padding: 10px 0 0 0; text-align: right; font-weight: 900; color: #111827; font-size: 16px;">₹${order.amount?.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin-top: 25px; font-size: 11px; color: #9CA3AF;">
        <p style="margin: 0;">If you have any questions, reply to this email or contact support@urbanpress.com</p>
        <p style="font-weight: 700; color: #111827; text-transform: uppercase; margin-top: 15px;">Thank you for choosing Urban Press!</p>
      </div>
    </div>
  `

  try {
    await axios.post(
      '/api/resend-email',
      {
        from: 'Urban Press <onboarding@resend.dev>',
        to: [emailTo],
        subject: `Order Confirmation - ${order.orderId}`,
        html: htmlContent,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    console.log('Order confirmation email dispatched successfully via Resend API.')
  } catch (error) {
    console.error('Failed to send order confirmation email via Resend API:', error.response?.data || error.message)
  }
}
