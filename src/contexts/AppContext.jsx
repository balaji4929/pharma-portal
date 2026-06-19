import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AppContext = createContext(null)

// Fallback mock data (shown while API loads, or if API is unreachable)
const EMPTY = {
  manufacturers: [],
  quotationRequests: [],
  quotes: [],
  purchaseOrders: [],
  batchReceipts: [],
  payments: [],
  chemists: [],
  schemes: [],
  giftArticles: [],
  giftFulfillments: [],
  distributorInvoices: [],
  dispatches: [],
  transporters: [],
  warehouses: [],
}

function norm(rows) { return Array.isArray(rows) ? rows : [] }

// Normalise API snake_case rows to camelCase shape used in UI
function normaliseManufacturer(r) {
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, gst: r.gst_number, address: r.address, contact: r.contact_person, category: r.product_category, status: r.status }
}
function normaliseChemist(r) {
  return { id: r.id, name: r.name, shop: r.shop_name, dlNo: r.drug_license_no, phone: r.phone, territory: r.territory, zone: r.zone, rep: r.assigned_rep, totalPurchase: parseFloat(r.total_purchase) || 0, status: r.status }
}
function normaliseScheme(r) {
  return { id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date, status: r.status, description: r.description, targetType: r.target_type, slabs: r.slabs || [] }
}
function normaliseArticle(r) {
  return { id: r.id, name: r.name, brand: r.brand, model: r.model, totalStock: r.total_stock, allocated: r.allocated, toBeOrdered: r.to_be_ordered, damaged: r.damaged, returned: r.returned, available: r.available, unitCost: parseFloat(r.unit_cost) || 0, status: r.status }
}
function normaliseFulfillment(r) {
  return { id: r.id, chemistId: r.chemist_id, chemist: r.chemist_name, schemeId: r.scheme_id, scheme: r.scheme_name, giftId: r.gift_article_id, gift: r.gift_name, qualifiedDate: r.qualified_date, status: r.status, courier: r.courier, trackingId: r.tracking_id, dispatchDate: r.dispatch_date, deliveredDate: r.delivered_date, address: r.delivery_address }
}
function normaliseDispatch(r) {
  return { id: r.id, dispatchNo: r.dispatch_no, from: r.from_warehouse, toType: r.to_type, toName: r.to_name, toAddress: r.to_address, qty: r.qty, units: r.units, transporter: r.transporter_name || '', trackingNo: r.tracking_no, status: r.status, dispatchDate: r.dispatch_date, deliveryDate: r.delivery_date, driverName: r.driver_name, driverPhone: r.driver_phone, vehicleNo: r.vehicle_no }
}
function normaliseTransporter(r) {
  return { id: r.id, name: r.name, contact: r.contact, email: r.email, type: r.type, coverage: r.coverage, rating: parseFloat(r.rating) || 4.0, status: r.status }
}
function normaliseWarehouse(r) {
  return { id: r.id, code: r.code, name: r.name, address: r.address, capacity: r.capacity, used: r.used, type: r.type }
}
function normalisePO(r) {
  return { id: r.id, poNo: r.po_number, manufacturerId: r.manufacturer_id, manufacturer: r.manufacturer_name || '', product: r.product_description, qty: r.quantity, unitPrice: parseFloat(r.unit_price) || 0, totalAmount: parseFloat(r.total_amount) || 0, advancePaid: parseFloat(r.advance_paid) || 0, status: r.status, poDate: r.po_date, expectedDelivery: r.expected_delivery_date, batchNo: r.batch_no, paymentTerms: r.payment_terms }
}
function normaliseQR(r) {
  return { id: r.id, reqNo: r.req_no, manufacturerId: r.manufacturer_id, manufacturer: r.manufacturer_name || '', product: r.product_name, quantity: r.quantity, status: r.status, date: r.created_at, dueDate: r.due_date, sentVia: 'email', notes: r.notes }
}
function normaliseBatch(r) {
  return { id: r.id, poId: r.po_id, batchNo: r.batch_no, qtyOrdered: r.qty_ordered, qtyReceived: r.qty_received, qtyRejected: r.qty_rejected, mfgDate: r.mfg_date, expDate: r.exp_date, receivedDate: r.received_date, qcStatus: r.qc_status, warehouse: r.warehouse }
}

export function AppProvider({ children }) {
  const [data, setData] = useState(EMPTY)
  const [apiReady, setApiReady] = useState(false)
  const [notifications, setNotifications] = useState([])

  // Load all data from API on mount
  const loadAll = useCallback(async () => {
    try {
      // Quick health check first
      await api.health()
      setApiReady(true)

      const [
        manufacturers,
        qrs, pos, batches,
        chemists, schemes, articles, fulfillments, invoices,
        dispatches, transporters, warehouses,
      ] = await Promise.allSettled([
        api.getManufacturers(),
        api.getQuoteRequests(), api.getPOs(), api.getBatchReceipts(),
        api.getChemists(), api.getSchemes(), api.getArticles(), api.getFulfillments(), api.getInvoices(),
        api.getDispatches(), api.getTransporters(), api.getWarehouses(),
      ])

      const v = (r) => r.status === 'fulfilled' ? norm(r.value) : []

      setData({
        manufacturers:      v(manufacturers).map(normaliseManufacturer),
        quotationRequests:  v(qrs).map(normaliseQR),
        quotes:             [],
        purchaseOrders:     v(pos).map(normalisePO),
        batchReceipts:      v(batches).map(normaliseBatch),
        payments:           [],
        chemists:           v(chemists).map(normaliseChemist),
        schemes:            v(schemes).map(normaliseScheme),
        giftArticles:       v(articles).map(normaliseArticle),
        giftFulfillments:   v(fulfillments).map(normaliseFulfillment),
        distributorInvoices:v(invoices),
        dispatches:         v(dispatches).map(normaliseDispatch),
        transporters:       v(transporters).map(normaliseTransporter),
        warehouses:         v(warehouses).map(normaliseWarehouse),
      })

      // Low stock notifications
      const lowStock = v(articles).filter(a => (a.available || 0) <= 5 && (a.available || 0) > 0)
      const outOfStock = v(articles).filter(a => (a.available || 0) === 0)
      const notifs = [
        ...outOfStock.map((a, i) => ({ id: i + 100, type: 'warning', msg: `${a.name} is out of stock`, time: 'now', read: false })),
        ...lowStock.map((a, i) => ({ id: i + 200, type: 'info', msg: `${a.name} is running low (${a.available} units)`, time: 'now', read: false })),
      ]
      if (notifs.length > 0) setNotifications(notifs)

    } catch (err) {
      // API unreachable — stay with empty state; modules will show empty gracefully
      console.warn('API not reachable, running in offline mode:', err.message)
      setApiReady(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Local in-memory update helpers (optimistic UI)
  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }))

  const addItem = (key, item) => setData(prev => ({
    ...prev,
    [key]: [...prev[key], { ...item, id: Math.max(0, ...prev[key].map(i => i.id), 0) + 1 }]
  }))

  const updateItem = (key, id, updates) => setData(prev => ({
    ...prev,
    [key]: prev[key].map(item => item.id === id ? { ...item, ...updates } : item)
  }))

  const deleteItem = (key, id) => setData(prev => ({
    ...prev,
    [key]: prev[key].filter(item => item.id !== id)
  }))

  const unreadCount = notifications.filter(n => !n.read).length
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  return (
    <AppContext.Provider value={{ data, update, addItem, updateItem, deleteItem, notifications, unreadCount, markAllRead, apiReady, reloadAll: loadAll }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
