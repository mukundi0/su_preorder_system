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

const navItems = [
  { name: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
  { name: 'Orders', icon: 'receipt_long', path: '/admin/orders' },
  { name: 'Menu Management', icon: 'restaurant_menu', path: '/admin/menu-management' },
  { name: 'Categories', icon: 'category', path: '/admin/categories' },
  { name: 'Settings', icon: 'settings', path: '/admin/settings' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
      <div className="px-6 mb-8">
        <div className="mb-4">
          <img
            alt="Strathmore University Logo"
            className="h-20 w-auto object-contain"
            src={SU_LOGO}
          />
        </div>
        <h1 className="font-headline text-xl font-bold text-primary">Kitchen Command</h1>
        <p className="text-[11px] uppercase tracking-widest text-primary opacity-80 mt-1">Strathmore Cafeteria</p>
      </div>

      <nav className="flex-grow space-y-1">
        {navItems.map((item) => {
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? 'bg-secondary-container text-on-secondary-container rounded-lg my-1 mx-2 px-4 py-3 flex items-center gap-3 transition-all shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg my-1 mx-2 px-4 py-3 flex items-center gap-3 transition-colors duration-200'
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body text-sm font-medium">{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto px-2 space-y-1 border-t border-outline-variant pt-4">

        <button onClick={handleLogout} className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg px-4 py-3 flex items-center gap-3 transition-colors duration-200 w-full">
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body text-sm font-medium">Logout</span>
        </button>

        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg mx-0 px-4 py-3 transition-colors duration-200 cursor-pointer
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
