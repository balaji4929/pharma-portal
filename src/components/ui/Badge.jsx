import React from 'react'

const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  purple: 'badge-purple',
  gray: 'badge-gray',
}

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={`${variants[variant] || 'badge-gray'} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    // Purchase statuses
    draft: { label: 'Draft', v: 'gray' },
    sent: { label: 'Sent', v: 'info' },
    quote_received: { label: 'Quote Received', v: 'purple' },
    approved: { label: 'Approved', v: 'success' },
    rejected: { label: 'Rejected', v: 'danger' },
    po_raised: { label: 'PO Raised', v: 'info' },
    advance_paid: { label: 'Advance Paid', v: 'warning' },
    in_production: { label: 'In Production', v: 'warning' },
    dispatched: { label: 'Dispatched', v: 'info' },
    received: { label: 'Received', v: 'success' },
    // Gift statuses
    qualified: { label: 'Qualified', v: 'success' },
    procurement_ordered: { label: 'Procurement Ordered', v: 'info' },
    delivered: { label: 'Delivered', v: 'success' },
    returned: { label: 'Returned', v: 'danger' },
    // Logistics
    pending: { label: 'Pending', v: 'gray' },
    in_transit: { label: 'In Transit', v: 'info' },
    // Inventory
    adequate: { label: 'Adequate', v: 'success' },
    low: { label: 'Low Stock', v: 'warning' },
    out_of_stock: { label: 'Out of Stock', v: 'danger' },
    // General
    active: { label: 'Active', v: 'success' },
    inactive: { label: 'Inactive', v: 'gray' },
    expired: { label: 'Expired', v: 'danger' },
    passed: { label: 'QC Passed', v: 'success' },
    failed: { label: 'QC Failed', v: 'danger' },
  }
  const config = map[status] || { label: status, v: 'gray' }
  return <Badge variant={config.v}>{config.label}</Badge>
}
