import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Gift, Truck, Settings,
  ChevronDown, ChevronRight, Pill, Building2, FileText,
  PackageCheck, CreditCard, Package, Users, Star,
  BarChart3, MapPin, ClipboardList, Send, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navConfig = [
  {
    label: 'Home',
    icon: LayoutDashboard,
    path: '/',
    exact: true,
    module: null,
  },
  {
    label: 'Purchase Dept.',
    icon: ShoppingCart,
    module: 'purchase',
    children: [
      { label: 'Dashboard', icon: BarChart3, path: '/purchase' },
      { label: 'Manufacturers', icon: Building2, path: '/purchase/manufacturers' },
      { label: 'Quote Requests', icon: Send, path: '/purchase/quote-requests' },
      { label: 'Quotes Received', icon: FileText, path: '/purchase/quotes' },
      { label: 'Purchase Orders', icon: ClipboardList, path: '/purchase/orders' },
      { label: 'Batch Receipts', icon: PackageCheck, path: '/purchase/receipts' },
      { label: 'Payments', icon: CreditCard, path: '/purchase/payments' },
    ]
  },
  {
    label: 'Gift Management',
    icon: Gift,
    module: 'gift',
    children: [
      { label: 'Dashboard', icon: BarChart3, path: '/gift' },
      { label: 'Chemists', icon: Users, path: '/gift/chemists' },
      { label: 'Schemes', icon: Star, path: '/gift/schemes' },
      { label: 'Data Entry', icon: FileText, path: '/gift/data-entry' },
      { label: 'Gift Inventory', icon: Package, path: '/gift/inventory' },
      { label: 'Fulfillment', icon: PackageCheck, path: '/gift/fulfillment' },
    ]
  },
  {
    label: 'Logistics',
    icon: Truck,
    module: 'logistics',
    children: [
      { label: 'Dashboard', icon: BarChart3, path: '/logistics' },
      { label: 'Dispatches', icon: Send, path: '/logistics/dispatches' },
      { label: 'Transporters', icon: Truck, path: '/logistics/transporters' },
      { label: 'Warehouses', icon: Building2, path: '/logistics/warehouses' },
      { label: 'Tracking', icon: MapPin, path: '/logistics/tracking' },
    ]
  },
  {
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    module: null,
  },
]

function NavItem({ item, canAccess, depth = 0 }) {
  const location = useLocation()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some(c => location.pathname.startsWith(c.path))
  })

  if (item.module && !canAccess(item.module)) return null

  if (item.children) {
    const isActive = item.children.some(c => location.pathname.startsWith(c.path))
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-full nav-item justify-between ${isActive ? 'text-white' : ''}`}
        >
          <div className="flex items-center gap-3">
            <item.icon size={16} className={isActive ? 'text-brand-primary' : ''} />
            <span>{item.label}</span>
          </div>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-3 mt-1 pl-3 border-l border-dark-border space-y-0.5 animate-fade-in">
            {item.children.map(child => (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.path === '/purchase' || child.path === '/gift' || child.path === '/logistics'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
                  ${isActive
                    ? 'text-brand-primary bg-brand-primary/10'
                    : 'text-slate-400 hover:text-white hover:bg-dark-hover'
                  }`
                }
              >
                <child.icon size={14} />
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.exact}
      className={({ isActive }) =>
        `nav-item ${isActive ? 'nav-item-active' : ''}`
      }
    >
      <item.icon size={16} />
      {item.label}
    </NavLink>
  )
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { canAccess } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-dark-card border-r border-dark-border z-50
        flex flex-col transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg">
              <Pill size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">PharmaOps</div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Portal</div>
            </div>
          </div>
          <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg hover:bg-dark-hover text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navConfig.map((item, idx) => (
            <NavItem key={idx} item={item} canAccess={canAccess} />
          ))}
        </nav>

        {/* Version */}
        <div className="px-5 py-3 border-t border-dark-border">
          <p className="text-[10px] text-slate-600 font-medium">PharmaOps Portal v1.0.0</p>
        </div>
      </aside>
    </>
  )
}
