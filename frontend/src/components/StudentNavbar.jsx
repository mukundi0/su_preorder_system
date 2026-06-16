import  axios from "axios"
import { NavLink, useNavigate, useLocation } from "react-router-dom"

import SU_LOGO from '../assets/sulogo.png'

function StudentNavbar() {

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
            <div className="flex items-center text-primary font-bold">
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
                <button
                    className="h-full flex items-center px-4 font-semibold text-sm text-primary border-b-2 border-primarybg-transparent cursor-pointer"
                >
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

        <div className="flex items-center gap-2 md:gap-4">
            {/* <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors bg-transparent cursor-pointer">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>account_circle</span>
            </button> */}

            <button onClick={handleLogout} className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-pointer" title="Logout">
            <span className="material-symbols-outlined">logout</span>
            </button>
        </div>
    </header>
  )
}

export default StudentNavbar