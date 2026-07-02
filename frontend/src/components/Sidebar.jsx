import { NavLink, useNavigate } from 'react-router-dom'
import axios from "axios"
import SU_LOGO from '../assets/sulogo.png'
import { useAuth } from '../context/AuthContext'

function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function roleLabel(role) {
  return { admin: 'Admin', kitchen_staff: 'Kitchen Staff', student: 'Student' }[role] || role
}

const ADMIN_NAV = [
  { name: 'Dashboard',       icon: 'dashboard',        path: '/admin/dashboard' },
  { name: 'Orders',          icon: 'receipt_long',     path: '/admin/orders' },
  { name: 'Menu Management', icon: 'restaurant_menu',  path: '/admin/menu-management' },
  { name: 'Categories',      icon: 'category',         path: '/admin/categories' },
  { name: 'Issues',          icon: 'report',           path: '/admin/issues' },
  { name: 'Settings',        icon: 'settings',         path: '/admin/settings' },
]

const KITCHEN_NAV = [
  { name: 'Dashboard',   icon: 'dashboard',  path: '/admin/dashboard' },
  { name: 'Live Orders', icon: 'skillet',    path: '/admin/orders' },
  { name: 'Menu Editor', icon: 'menu_book',  path: '/admin/menu-management' },
  { name: 'Settings',    icon: 'settings',   path: '/admin/settings' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isKitchen = user?.role === 'kitchen_staff'
  const navItems = isKitchen ? KITCHEN_NAV : ADMIN_NAV

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')
      navigate('/login')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest flex flex-col py-6 z-50 border-r border-outline-variant">
      <div className="px-6 mb-6">
        <div className="mb-3">
          <img alt="Strathmore University Logo" className="h-20 w-auto object-contain" src={SU_LOGO} />
        </div>
        <h1 className="font-headline text-xl font-bold text-primary">{isKitchen ? 'Kitchen Command' : 'Admin Panel'}</h1>
        <p className="text-[11px] uppercase tracking-widest text-primary opacity-80 mt-1">Strathmore Cafeteria</p>
      </div>

      {isKitchen && (
        <div className="px-4 mb-4">
          <button
            onClick={() => navigate('/admin/orders?scan=1')}
            className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary rounded-lg py-3 px-4 font-bold text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              qr_code_scanner
            </span>
            QR Scanner
          </button>
        </div>
      )}

      <nav className="flex-grow space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/admin/dashboard'}
            className={({ isActive }) =>
              isActive
                ? 'bg-secondary-container text-on-secondary-container rounded-lg my-1 px-4 py-3 flex items-center gap-3 transition-all shadow-sm'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg my-1 px-4 py-3 flex items-center gap-3 transition-colors duration-200'
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body text-sm font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2 space-y-1 border-t border-outline-variant pt-4">
        <button
          onClick={handleLogout}
          className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg px-4 py-3 flex items-center gap-3 transition-colors duration-200 w-full cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body text-sm font-medium">Logout</span>
        </button>

        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-200 cursor-pointer
            ${isActive ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-container-high'}`
          }
        >
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0 select-none">
            {initials(user?.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-on-surface truncate">{user?.name || 'User'}</span>
            <span className="text-[11px] text-on-surface-variant truncate">{roleLabel(user?.role)}</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] ml-auto shrink-0">chevron_right</span>
        </NavLink>
      </div>
    </aside>
  )
}
