import { useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { id: 'menu',    label: 'Menu',    icon: 'restaurant',             path: '/student' },
  { id: 'orders',  label: 'Orders',  icon: 'receipt_long',           path: null },
  { id: 'wallet',  label: 'Wallet',  icon: 'account_balance_wallet', path: null },
  { id: 'profile', label: 'Profile', icon: 'person',                 path: null },
]

export default function StudentBottomNav({ active }) {
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-surface-container-lowest rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex justify-around items-end px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      {NAV_ITEMS.map(({ id, label, icon, path }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => path && navigate(path)}
            className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer min-w-[56px]"
          >
            {/* Icon pill — only the icon lives inside the indicator */}
            <span
              className={`flex items-center justify-center px-5 py-1.5 rounded-full transition-all duration-150 ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px] leading-none"
                style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
              >
                {icon}
              </span>
            </span>

            {/* Label below the pill */}
            <span
              className={`text-[11px] font-semibold leading-none mt-0.5 ${
                isActive ? 'text-secondary-container' : 'text-on-surface-variant'
              }`}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
