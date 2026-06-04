// src/context/OrderContext.jsx
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useOrderStore = create(
  persist(
    (set, get) => ({
      // Current booking draft
      bookingDraft: {
        items: [],
        address: null,
        coords: null,
        pickupDate: null,
        pickupSlot: null,
        deliveryType: 'standard',
        serviceType: 'wash_fold',
        total: 0,
        deliveryFee: 0,
      },
      setBookingDraft: (data) =>
        set((state) => ({
          bookingDraft: { ...state.bookingDraft, ...data },
        })),
      resetBookingDraft: () =>
        set({
          bookingDraft: {
            items: [],
            address: null,
            coords: null,
            pickupDate: null,
            pickupSlot: null,
            deliveryType: 'standard',
            serviceType: 'wash_fold',
            total: 0,
            deliveryFee: 0,
          },
        }),

      // Orders list
      orders: [],
      setOrders: (orders) => set({ orders }),
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),
      updateOrder: (orderId, updates) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o._id === orderId ? { ...o, ...updates } : o
          ),
        })),

      // Slot Configuration (default 3 slots, max 6 per slot, max 18 daily)
      slotConfig: {
        maxSlotBookings: 6,
        maxDailyBookings: 18,
        slots: [
          '9:00 AM – 9:30 AM',
          '9:50 AM – 10:30 AM',
          '10:50 AM – 11:30 PM'
        ],
        deliveryTime: '05:00 PM - 07:00 PM',
      },
      updateSlotConfig: (updates) =>
        set((state) => ({
          slotConfig: { ...state.slotConfig, ...updates },
        })),

      // Last confirmed order
      lastOrder: null,
      setLastOrder: (order) => set({ lastOrder: order }),
    }),
    {
      name: 'urbanpress-orders',
      partialize: (state) => ({
        bookingDraft: state.bookingDraft,
        lastOrder: state.lastOrder,
        orders: state.orders,
        slotConfig: state.slotConfig,
      }),
    }
  )
)
