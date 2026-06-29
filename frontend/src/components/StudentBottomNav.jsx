import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const NAV_ITEMS = [
  { id: 'menu',    icon: 'restaurant',             path: '/student' },
  { id: 'orders',  icon: 'receipt_long',           path: '/orders/history' },
  { id: 'wallet',  icon: 'account_balance_wallet', path: '/wallet' },
  { id: 'profile', icon: 'person',                 path: '/profile' },
]

export default function StudentBottomNav({ active }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  function isActive(item) {
    if (active) return active === item.id
    if (!item.path) return false
    return location.pathname === item.path
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-surface-container-lowest rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex justify-around items-end px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      {NAV_ITEMS.map((item) => {
        const active_ = isActive(item)
        return (
          <button
            key={item.id}
            onClick={() => item.path && navigate(item.path)}
            aria-label={t(`nav.${item.id}`)}
            className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer min-w-[56px]"
          >
            <span
              className={`flex items-center justify-center px-5 py-1.5 rounded-full transition-all duration-150 ${
                active_
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px] leading-none"
                style={{ fontVariationSettings: `'FILL' ${active_ ? 1 : 0}` }}
              >
                {item.icon}
              </span>
            </span>
            <span
              className={`text-[11px] font-semibold leading-none mt-0.5 ${
                active_ ? 'text-secondary-container' : 'text-on-surface-variant'
              }`}
            >
              {t(`nav.${item.id}`)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
