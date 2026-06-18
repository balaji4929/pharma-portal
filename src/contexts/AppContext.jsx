import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

// Shared mock data store for the entire application
export const initialData = {
  // Purchase
  manufacturers: [
    { id: 1, name: 'Sunrise Pharma Pvt Ltd', email: 'orders@sunrisepharma.com', phone: '9876543210', gst: '27AABCS1234F1Z5', address: 'Ankleshwar, Gujarat', contact: 'Mr. Patel', category: 'Tablets/Capsules', status: 'active' },
    { id: 2, name: 'BioSynth Labs', email: 'purchase@biosynth.in', phone: '9988776655', gst: '29AAACB1234C1Z3', address: 'Peenya, Bangalore', contact: 'Ms. Rao', category: 'Syrups/Liquids', status: 'active' },
    { id: 3, name: 'Medicraft Industries', email: 'info@medicraft.co.in', phone: '9123456789', gst: '06AABCM5678G1Z1', address: 'IMT Manesar, Haryana', contact: 'Mr. Sharma', category: 'Powder/Granules', status: 'active' },
  ],
  quotationRequests: [
    { id: 1, reqNo: 'QR-2024-001', manufacturerId: 1, manufacturer: 'Sunrise Pharma Pvt Ltd', product: 'Paracetamol 500mg Tablet', quantity: '10,000 strips', status: 'quote_received', date: '2024-01-15', dueDate: '2024-01-20', sentVia: 'email', notes: 'Urgent requirement for Q1' },
    { id: 2, reqNo: 'QR-2024-002', manufacturerId: 2, manufacturer: 'BioSynth Labs', product: 'Amoxicillin 250mg Syrup', quantity: '500 bottles', status: 'sent', date: '2024-01-18', dueDate: '2024-01-25', sentVia: 'email', notes: '' },
    { id: 3, reqNo: 'QR-2024-003', manufacturerId: 3, manufacturer: 'Medicraft Industries', product: 'Vitamin C Powder Sachet', quantity: '5,000 boxes', status: 'draft', date: '2024-01-20', dueDate: '2024-01-28', sentVia: 'email', notes: 'Festival season stock' },
  ],
  quotes: [
    { id: 1, reqId: 1, reqNo: 'QR-2024-001', manufacturer: 'Sunrise Pharma Pvt Ltd', product: 'Paracetamol 500mg Tablet', qty: '10,000 strips', unitPrice: 12.50, totalPrice: 125000, validUntil: '2024-02-15', leadTime: '15 days', status: 'approved', receivedDate: '2024-01-19', terms: 'Net 30' },
  ],
  purchaseOrders: [
    { id: 1, poNo: 'PO-2024-001', quoteId: 1, manufacturer: 'Sunrise Pharma Pvt Ltd', product: 'Paracetamol 500mg Tablet', qty: '10,000 strips', unitPrice: 12.50, totalAmount: 125000, advancePaid: 62500, status: 'in_production', poDate: '2024-01-22', expectedDelivery: '2024-02-10', batchNo: 'BATCH-24-001', paymentTerms: 'Net 30' },
  ],
  batchReceipts: [
    { id: 1, poId: 1, poNo: 'PO-2024-001', product: 'Paracetamol 500mg Tablet', batchNo: 'BATCH-24-001', qtyOrdered: 10000, qtyReceived: 9800, qtyRejected: 200, mfgDate: '2024-02-05', expDate: '2026-02-05', receivedDate: '2024-02-12', status: 'received', qcStatus: 'passed', warehouse: 'WH-1 Mumbai' },
  ],

  // Gift Management
  chemists: [
    { id: 1, name: 'Dr. Anil Verma', shop: 'Verma Medical Store', dlNo: 'MH-BOM-DL-12345', phone: '9876543001', territory: 'Andheri West', zone: 'Mumbai North', rep: 'Rajesh Kumar', totalPurchase: 285000, activeSchemes: 2, status: 'active' },
    { id: 2, name: 'Suresh Gupta', shop: 'Gupta Pharmacy', dlNo: 'MH-BOM-DL-67890', phone: '9876543002', territory: 'Borivali', zone: 'Mumbai North', rep: 'Rajesh Kumar', totalPurchase: 180000, activeSchemes: 1, status: 'active' },
    { id: 3, name: 'Ravi Patel', shop: 'Patel Drug House', dlNo: 'GJ-AHM-DL-11111', phone: '9876543003', territory: 'Navrangpura', zone: 'Ahmedabad', rep: 'Priya Sharma', totalPurchase: 320000, activeSchemes: 2, status: 'active' },
    { id: 4, name: 'Meena Shah', shop: 'Shah Medicos', dlNo: 'GJ-AHM-DL-22222', phone: '9876543004', territory: 'Satellite', zone: 'Ahmedabad', rep: 'Priya Sharma', totalPurchase: 95000, activeSchemes: 0, status: 'active' },
  ],
  schemes: [
    { id: 1, name: 'Q1 Mega Scheme 2024', startDate: '2024-01-01', endDate: '2024-03-31', status: 'active', description: 'Quarterly incentive scheme for top performers', targetType: 'value', slabs: [{ min: 10000, max: 24999, gift: '1x Smartwatch', giftId: 1 }, { min: 25000, max: 99999, gift: '1x LED TV 32"', giftId: 2 }], enrolled: [1, 2, 3], totalEnrolled: 3 },
    { id: 2, name: 'Summer Bonanza 2024', startDate: '2024-04-01', endDate: '2024-06-30', status: 'draft', description: 'Summer season loyalty program', targetType: 'volume', slabs: [{ min: 50, max: 99, gift: '1x Water Purifier', giftId: 3 }, { min: 100, max: 999, gift: '1x Air Cooler', giftId: 4 }], enrolled: [1, 3, 4], totalEnrolled: 3 },
  ],
  giftArticles: [
    { id: 1, name: 'Smartwatch', brand: 'Noise', model: 'ColorFit Pro 4', totalStock: 50, allocated: 15, toBeOrdered: 10, damaged: 2, returned: 3, available: 20, unitCost: 3500, status: 'adequate' },
    { id: 2, name: 'LED TV 32"', brand: 'VU', model: '32GA', totalStock: 20, allocated: 8, toBeOrdered: 5, damaged: 0, returned: 1, available: 6, unitCost: 12000, status: 'low' },
    { id: 3, name: 'Water Purifier', brand: 'Kent', model: 'Grand Plus', totalStock: 30, allocated: 5, toBeOrdered: 15, damaged: 1, returned: 0, available: 9, unitCost: 8500, status: 'adequate' },
    { id: 4, name: 'Air Cooler', brand: 'Symphony', model: 'Diet 22i', totalStock: 0, allocated: 0, toBeOrdered: 25, damaged: 0, returned: 0, available: 0, unitCost: 5500, status: 'out_of_stock' },
  ],
  giftFulfillments: [
    { id: 1, chemistId: 1, chemist: 'Dr. Anil Verma', schemeId: 1, scheme: 'Q1 Mega Scheme 2024', giftId: 2, gift: 'LED TV 32"', qualifiedDate: '2024-02-01', status: 'dispatched', courier: 'DTDC', trackingId: 'DTDC123456789', dispatchDate: '2024-02-05', address: 'Verma Medical Store, Andheri West, Mumbai' },
    { id: 2, chemistId: 3, chemist: 'Ravi Patel', schemeId: 1, scheme: 'Q1 Mega Scheme 2024', giftId: 1, gift: 'Smartwatch', qualifiedDate: '2024-01-28', status: 'delivered', courier: 'BlueDart', trackingId: 'BD987654321', dispatchDate: '2024-02-01', deliveredDate: '2024-02-03', address: 'Patel Drug House, Navrangpura, Ahmedabad' },
  ],
  distributorInvoices: [
    { id: 1, chemistId: 1, chemist: 'Dr. Anil Verma', invoiceNo: 'INV-2024-001', distributor: 'National Distributors', date: '2024-01-10', amount: 15000, qty: 120, schemeId: 1, enteredBy: 'Priya Sharma' },
    { id: 2, chemistId: 3, chemist: 'Ravi Patel', invoiceNo: 'INV-2024-002', distributor: 'Gujarat Pharma Dist.', date: '2024-01-15', amount: 28000, qty: 220, schemeId: 1, enteredBy: 'Priya Sharma' },
  ],

  // Logistics
  dispatches: [
    { id: 1, dispatchNo: 'DSP-2024-001', poId: 1, product: 'Paracetamol 500mg Tablet', batchNo: 'BATCH-24-001', from: 'WH-1 Mumbai', toType: 'distributor', toName: 'National Distributors', toAddress: 'Dadar, Mumbai', qty: 5000, units: 'strips', transporter: 'VRL Logistics', trackingNo: 'VRL9876543', status: 'delivered', dispatchDate: '2024-02-14', deliveryDate: '2024-02-16', driverName: 'Ramu Prasad', driverPhone: '9988001122', vehicleNo: 'MH04AB1234' },
    { id: 2, dispatchNo: 'DSP-2024-002', poId: 1, product: 'Paracetamol 500mg Tablet', batchNo: 'BATCH-24-001', from: 'WH-1 Mumbai', toType: 'distributor', toName: 'Gujarat Pharma Dist.', toAddress: 'Navrangpura, Ahmedabad', qty: 3000, units: 'strips', transporter: 'DTDC Cargo', trackingNo: 'DTDC8765432', status: 'in_transit', dispatchDate: '2024-02-15', deliveryDate: null, driverName: 'Suresh Kumar', driverPhone: '9900112233', vehicleNo: 'GJ01CD5678' },
    { id: 3, dispatchNo: 'DSP-2024-003', poId: 1, product: 'Paracetamol 500mg Tablet', batchNo: 'BATCH-24-001', from: 'National Distributors', toType: 'chemist', toName: 'Dr. Anil Verma - Verma Medical Store', toAddress: 'Andheri West, Mumbai', qty: 200, units: 'strips', transporter: 'Local Delivery', trackingNo: '', status: 'pending', dispatchDate: null, deliveryDate: null, driverName: '', driverPhone: '', vehicleNo: '' },
  ],
  transporters: [
    { id: 1, name: 'VRL Logistics', contact: '9011223344', email: 'ops@vrl.co.in', type: 'road', coverage: 'Pan India', rating: 4.5, status: 'active' },
    { id: 2, name: 'DTDC Cargo', contact: '9022334455', email: 'cargo@dtdc.com', type: 'courier', coverage: 'Pan India', rating: 4.2, status: 'active' },
    { id: 3, name: 'BlueDart Express', contact: '9033445566', email: 'enterprise@bluedart.com', type: 'courier', coverage: 'Pan India', rating: 4.7, status: 'active' },
  ],
  warehouses: [
    { id: 1, code: 'WH-1', name: 'Mumbai Central Warehouse', address: 'MIDC Andheri, Mumbai', capacity: 10000, used: 4200, type: 'primary' },
    { id: 2, code: 'WH-2', name: 'Ahmedabad Storage', address: 'Naroda, Ahmedabad', capacity: 5000, used: 1800, type: 'secondary' },
  ],
}

export function AppProvider({ children }) {
  const [data, setData] = useState(initialData)
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'warning', msg: 'LED TV 32" stock is running low (6 units)', time: '2 hrs ago', read: false },
    { id: 2, type: 'info', msg: 'Quote received from Sunrise Pharma for QR-2024-001', time: '4 hrs ago', read: false },
    { id: 3, type: 'success', msg: 'Dispatch DSP-2024-001 delivered successfully', time: '1 day ago', read: true },
  ])

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }))

  const addItem = (key, item) => setData(prev => ({
    ...prev,
    [key]: [...prev[key], { ...item, id: Math.max(0, ...prev[key].map(i => i.id)) + 1 }]
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
    <AppContext.Provider value={{ data, update, addItem, updateItem, deleteItem, notifications, unreadCount, markAllRead }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
