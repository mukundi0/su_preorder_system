import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const KITCHEN_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard',    path: '/admin/dashboard' },
  { label: 'Orders',    icon: 'skillet',      path: '/admin/orders' },
  { label: 'Menu',      icon: 'menu_book',    path: '/admin/menu-management' },
  { label: 'Settings',  icon: 'settings',     path: '/admin/settings' },
]

const ADMIN_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard',       path: '/admin/dashboard' },
  { label: 'Orders',    icon: 'receipt_long',    path: '/admin/orders' },
  { label: 'Menu',      icon: 'restaurant_menu', path: '/admin/menu-management' },
  { label: 'Settings',  icon: 'settings',        path: '/admin/settings' },
]

function NavItem({ label, icon, path }) {
  return (
    <NavLink to={path} className="flex flex-col items-center gap-0.5 min-w-[56px]">
      {({ isActive }) => (
        <>
          <span
            className={`flex items-center justify-center px-5 py-1.5 rounded-full transition-all duration-150
              ${isActive ? 'bg-secondary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <span
              className="material-symbols-outlined text-[22px] leading-none"
              style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
            >
              {icon}
            </span>
          </span>
          <span className={`text-[11px] font-semibold leading-none mt-0.5 ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function KitchenBottomNav() {
  const { user } = useAuth()
  const items = user?.role === 'admin' ? ADMIN_ITEMS : KITCHEN_ITEMS

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-surface-container-lowest rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex justify-around items-end px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      {items.map(item => (
        <NavItem key={item.path} {...item} />
      ))}
    </nav>
  )
}
