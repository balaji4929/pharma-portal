/**
 * API service — wraps fetch with JWT auth headers.
 * Base URL comes from VITE_API_URL (set to /api in production,
 * or http://localhost:3002 in dev).
 */

const BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  try {
    const u = localStorage.getItem('pharma_user')
    return u ? JSON.parse(u).token : null
  } catch { return null }
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Token expired — clear session and reload to login
    localStorage.removeItem('pharma_user')
    window.location.reload()
    throw new Error('Session expired')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`)
  }

  return data
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  // ── Manufacturers ─────────────────────────────────────────
  getManufacturers: ()           => request('/manufacturers'),
  addManufacturer: (data)        => request('/manufacturers', { method: 'POST', body: JSON.stringify(data) }),
  updateManufacturer: (id, data) => request(`/manufacturers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteManufacturer: (id)       => request(`/manufacturers/${id}`, { method: 'DELETE' }),

  // ── Purchase ──────────────────────────────────────────────
  getQuoteRequests:    ()         => request('/purchase/quote-requests'),
  addQuoteRequest:     (data)     => request('/purchase/quote-requests', { method: 'POST', body: JSON.stringify(data) }),
  updateQuoteRequest:  (id, data) => request(`/purchase/quote-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getQuotes:    ()         => request('/purchase/quotes'),
  addQuote:     (data)     => request('/purchase/quotes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuote:  (id, data) => request(`/purchase/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getPOs:    ()         => request('/purchase/orders'),
  addPO:     (data)     => request('/purchase/orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePO:  (id, data) => request(`/purchase/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getBatchReceipts:   ()         => request('/purchase/receipts'),
  addBatchReceipt:    (data)     => request('/purchase/receipts', { method: 'POST', body: JSON.stringify(data) }),

  getPayments:  ()     => request('/purchase/payments'),
  addPayment:   (data) => request('/purchase/payments', { method: 'POST', body: JSON.stringify(data) }),

  // ── Gift ──────────────────────────────────────────────────
  getChemists:      ()         => request('/gift/chemists'),
  addChemist:       (data)     => request('/gift/chemists', { method: 'POST', body: JSON.stringify(data) }),

  getSchemes:       ()         => request('/gift/schemes'),
  addScheme:        (data)     => request('/gift/schemes', { method: 'POST', body: JSON.stringify(data) }),
  enrollScheme:     (id, ids)  => request(`/gift/schemes/${id}/enroll`, { method: 'POST', body: JSON.stringify({ chemistIds: ids }) }),

  getInvoices:      ()         => request('/gift/invoices'),
  addInvoice:       (data)     => request('/gift/invoices', { method: 'POST', body: JSON.stringify(data) }),

  getArticles:      ()         => request('/gift/articles'),
  addArticle:       (data)     => request('/gift/articles', { method: 'POST', body: JSON.stringify(data) }),

  getFulfillments:  ()         => request('/gift/fulfillments'),
  addFulfillment:   (data)     => request('/gift/fulfillments', { method: 'POST', body: JSON.stringify(data) }),
  updateFulfillment:(id, data) => request(`/gift/fulfillments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Logistics ─────────────────────────────────────────────
  getDispatches:    ()         => request('/logistics/dispatches'),
  addDispatch:      (data)     => request('/logistics/dispatches', { method: 'POST', body: JSON.stringify(data) }),
  updateDispatch:   (id, data) => request(`/logistics/dispatches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getTransporters:  ()         => request('/logistics/transporters'),
  addTransporter:   (data)     => request('/logistics/transporters', { method: 'POST', body: JSON.stringify(data) }),

  getWarehouses:    ()         => request('/logistics/warehouses'),
  addWarehouse:     (data)     => request('/logistics/warehouses', { method: 'POST', body: JSON.stringify(data) }),

  // ── Sales ─────────────────────────────────────────────────
  getSales: () => request('/sales'),
  saveSales: (fileName, columns, records) =>
    request('/sales', { method: 'POST', body: JSON.stringify({ fileName, columns, records }) }),
  clearSales: () => request('/sales', { method: 'DELETE' }),

  // ── Distributors ──────────────────────────────────────────
  getDistributors: ()       => request('/distributors'),
  getDistributorLedger: (id) => request(`/distributors/${id}/ledger`),
  saveDistributors: (parties) =>
    request('/distributors/bulk', { method: 'POST', body: JSON.stringify({ parties }) }),
  deleteDistributor: (id)   => request(`/distributors/${id}`, { method: 'DELETE' }),
  clearDistributors: ()     => request('/distributors', { method: 'DELETE' }),

  // ── Expenses ──────────────────────────────────────────────
  getExpenses:    (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/expenses${q ? '?' + q : ''}`)
  },
  getExpenseSummary: () => request('/expenses/summary'),
  addExpense:     (data)    => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  bulkExpenses:   (rows)    => request('/expenses/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
  updateExpense:  (id, data)=> request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense:  (id)      => request(`/expenses/${id}`, { method: 'DELETE' }),

  // ── Product Costs ─────────────────────────────────────────
  getProductCosts:  ()        => request('/product-costs'),
  saveProductCost:  (data)    => request('/product-costs', { method: 'POST', body: JSON.stringify(data) }),
  bulkProductCosts: (rows)    => request('/product-costs/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
  deleteProductCost:(id)      => request(`/product-costs/${id}`, { method: 'DELETE' }),

  // ── Health ────────────────────────────────────────────────
  health: () => request('/health'),
}

export default api
