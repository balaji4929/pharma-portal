import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'

import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Settings from './pages/Settings'

// Purchase
import PurchaseDashboard from './pages/purchase/PurchaseDashboard'
import Manufacturers from './pages/purchase/Manufacturers'
import QuoteRequests from './pages/purchase/QuoteRequests'
import Quotes from './pages/purchase/Quotes'
import PurchaseOrders from './pages/purchase/PurchaseOrders'
import BatchReceipts from './pages/purchase/BatchReceipts'
import Payments from './pages/purchase/Payments'

// Gift
import GiftDashboard from './pages/gift/GiftDashboard'
import Chemists from './pages/gift/Chemists'
import Schemes from './pages/gift/Schemes'
import DataEntry from './pages/gift/DataEntry'
import GiftInventory from './pages/gift/GiftInventory'
import Fulfillment from './pages/gift/Fulfillment'

// Logistics
import LogisticsDashboard from './pages/logistics/LogisticsDashboard'
import Dispatches from './pages/logistics/Dispatches'
import Transporters from './pages/logistics/Transporters'
import Warehouses from './pages/logistics/Warehouses'
import Tracking from './pages/logistics/Tracking'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="settings" element={<Settings />} />

        {/* Purchase */}
        <Route path="purchase" element={<PurchaseDashboard />} />
        <Route path="purchase/manufacturers" element={<Manufacturers />} />
        <Route path="purchase/quote-requests" element={<QuoteRequests />} />
        <Route path="purchase/quotes" element={<Quotes />} />
        <Route path="purchase/orders" element={<PurchaseOrders />} />
        <Route path="purchase/receipts" element={<BatchReceipts />} />
        <Route path="purchase/payments" element={<Payments />} />

        {/* Gift */}
        <Route path="gift" element={<GiftDashboard />} />
        <Route path="gift/chemists" element={<Chemists />} />
        <Route path="gift/schemes" element={<Schemes />} />
        <Route path="gift/data-entry" element={<DataEntry />} />
        <Route path="gift/inventory" element={<GiftInventory />} />
        <Route path="gift/fulfillment" element={<Fulfillment />} />

        {/* Logistics */}
        <Route path="logistics" element={<LogisticsDashboard />} />
        <Route path="logistics/dispatches" element={<Dispatches />} />
        <Route path="logistics/transporters" element={<Transporters />} />
        <Route path="logistics/warehouses" element={<Warehouses />} />
        <Route path="logistics/tracking" element={<Tracking />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1d2e',
              color: '#f1f5f9',
              border: '1px solid #2a2d3e',
              fontSize: '13px',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
          }}
        />
      </AppProvider>
    </AuthProvider>
  )
}
