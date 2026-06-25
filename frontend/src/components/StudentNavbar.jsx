import axios from "axios"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

import SU_LOGO from '../assets/sulogo.png'

const AVATAR_COLORS = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-tertiary-fixed-dim text-on-tertiary',
  'bg-primary-container text-on-primary-container',
]

function avatarColor(name) {
  const code = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function StudentNavbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const showOrders = location.pathname.startsWith("/orders")

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')
      navigate('/login')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-12 h-16 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex items-center text-primary font-bold cursor-pointer" onClick={() => navigate('/student')}>
          <img src={SU_LOGO} alt="Strathmore University Logo" className="h-10 w-auto object-contain md:hidden" />
          <div className="hidden md:flex items-center gap-2 text-lg">
            <img src={SU_LOGO} alt="Strathmore University Logo" className="h-8 w-auto object-contain" />
            <span>Strathmore Dining</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center h-full">
          <NavLink
            to="/student"
            className={({ isActive }) =>
              `h-full flex items-center px-4 font-semibold text-sm ${
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`
            }
          >
            Menu
          </NavLink>

          {showOrders && (
            <button className="h-full flex items-center px-4 font-semibold text-sm text-primary border-b-2 border-primary bg-transparent cursor-pointer">
              Orders
            </button>
          )}

          <NavLink
            to="/wallet"
            className={({ isActive }) =>
              `h-full flex items-center px-4 font-semibold text-sm ${
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`
            }
          >
            Wallet
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <NavLink to="/profile" title="My Profile">
          {({ isActive }) => (
            <div className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors cursor-pointer border ${
              isActive
                ? 'border-primary bg-primary/10'
                : 'border-outline-variant hover:bg-surface-container-low'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(user?.name)}`}>
                {initials(user?.name)}
              </div>
              <span className={`hidden md:block text-sm font-semibold truncate max-w-[120px] ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                {user?.name?.split(' ')[0] || 'Profile'}
              </span>
            </div>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-pointer"
          title="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  )
}

export default StudentNavbar
