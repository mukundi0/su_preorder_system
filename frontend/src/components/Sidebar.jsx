import { NavLink } from 'react-router-dom'

const navItems = [
  { name: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
  { name: 'Orders', icon: 'receipt_long', path: '/admin/orders' },
  { name: 'Menu Management', icon: 'restaurant_menu', path: '/admin/menu-management' },
  { name: 'Categories', icon: 'category', path: '/admin/categories' },
  { name: 'Settings', icon: 'settings', path: '/admin/settings' },
]

const bottomItems = [
  { name: 'Support', icon: 'help' },
  { name: 'Logout', icon: 'logout' },
]

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest flex flex-col py-6 z-50 border-r border-outline-variant">
      <div className="px-6 mb-8">
        <div className="mb-4">
          <img
            alt="Strathmore University Logo"
            className="h-10 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFBTsNnBdmAFd7BaHKPJ3PS04n1fWyCYnlOQD-OEhjUyBhLNKLecAi0QT0sLK9WOncab3bW19MFvIVjY_OhhkpD2s5kerOj7-nMDwi15KeQW7Bnxt0UY4XB7XCuGcvfg3t9jR59suFZBYD3R9MoILZ-eVp-QHvh8FknIfYgral-CyHLmP9-aKAtmAUEXbUpmR0sxqGVJQY8iZ0ezcNH1ohxL2eNKxqoWfBfHfKr5j4wNtZoWwqFUQAwX-zH-XqG9S55plxb91KZeM5"
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
        {bottomItems.map((item) => (
          <a
            key={item.name}
            href="#"
            className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg px-4 py-3 flex items-center gap-3 transition-colors duration-200"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body text-sm font-medium">{item.name}</span>
          </a>
        ))}
        <div className="px-4 py-3 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-on-primary-container/30">
              <img
                alt="Admin User Avatar"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMpXQLt1HyrF5ueqMmRjUTzXMOHsxbFhC1d35rH7txEO1INLKPA1G0W_zo3ifIH0ozGXc6gV0XyALxl8Lo3B2ekaHj0-s0TAaQ1c4NEFjxo3DSWp9sMV7pe7QI8lA4sSSsipndk0AMG39wFCsCtnidsl8tRmB6Vhn9onUXkEgANDf5bHlWRkQnDsrEQS-1L2r_myqcm00aduBNi93iKQ4GI908FDYmz2NndFsdrcrGG-uj3iUVEfiOsclSeba9i7njJx3WOMxaac-0"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">System Status: Online</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
