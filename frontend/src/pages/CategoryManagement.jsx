import suLogo from '../assets/sulogo.png';

export default function CategoryManagement() {
  const navItems = [
    { name: 'Dashboard', active: false },
    { name: 'Live Orders', active: false },
    { name: 'Menu Editor', active: true },
    { name: 'Analytics', active: false },
    { name: 'Categories', active: false },
    { name: 'Settings', active: false },
  ];

  const categories = [
    {
      name: 'Main Meals',
      desc: 'Primary lunch and dinner options including rice, stews, and grilled items.',
      items: 45,
      updated: 'Today, 09:41 AM',
      bg: 'bg-orange-100',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
    },
    {
      name: 'Snacks',
      desc: 'Quick bites, sandwiches, and pastries for between meals.',
      items: 32,
      updated: 'Yesterday, 14:20 PM',
      bg: 'bg-amber-100',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      name: 'Drinks',
      desc: 'Hot beverages, sodas, and fresh juices.',
      items: 28,
      updated: 'Oct 12, 08:00 AM',
      bg: 'bg-sky-100',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 10H7l-1 12h12L17 10z" /><path d="M15 5l-1-2H10L9 5" /><path d="M12 10V7" />
        </svg>
      ),
    },
    {
      name: 'Desserts',
      desc: 'Sweet treats, cakes, and ice cream options.',
      items: 15,
      updated: 'Oct 10, 16:45 PM',
      bg: 'bg-pink-100',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans antialiased text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4 border-b border-gray-100">
          <div className="w-14 h-14 bg-white rounded-xl border border-gray-200 flex items-center justify-center mb-3 overflow-hidden">
            <img src={suLogo} alt="SU logo" className="w-full h-full object-contain p-1" />
          </div>
          <p className="text-xs text-gray-400 font-medium tracking-wide">Main Campus Cafeteria</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = item.active;
            return (
              <a
                key={item.name}
                href="#"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="w-5 h-5 shrink-0">
                  {item.name === 'Dashboard' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
                    </svg>
                  )}
                  {item.name === 'Live Orders' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  )}
                  {item.name === 'Menu Editor' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  )}
                  {item.name === 'Analytics' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  )}
                  {item.name === 'Categories' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  )}
                  {item.name === 'Settings' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  )}
                </span>
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* QR Scanner */}
        <div className="px-3 pb-6 pt-2">
          <button className="w-full flex items-center justify-center gap-2.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg px-4 py-3 transition-colors cursor-pointer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" /><rect x="3" y="16" width="5" height="5" /><path d="M21 16h-5v5" /><path d="M16 21v-5h5" /><line x1="8" y1="8" x2="8" y2="16" /><line x1="16" y1="8" x2="16" y2="12" /><line x1="8" y1="12" x2="12" y2="12" /><line x1="12" y1="16" x2="12" y2="12" />
            </svg>
            QR Scanner
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Category Management</h1>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search categories..."
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 w-56"
              />
            </div>

            {/* Add New Category */}
            <button className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add New Category
            </button>

            {/* Bell */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Help */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              JD
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6">
            {/* Card 1: Total Categories */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Total Categories</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">8</p>
                  <div className="flex items-center gap-1 mt-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    <span className="text-xs font-medium text-green-600">+2 from last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5" className="w-7 h-7">
                    <rect x="2" y="2" width="8" height="8" rx="1.5" /><rect x="14" y="2" width="8" height="5" rx="1.5" /><rect x="14" y="11" width="8" height="11" rx="1.5" /><rect x="2" y="14" width="8" height="8" rx="1.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Total Menu Items */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Total Menu Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">142</p>
                  <div className="flex items-center gap-1 mt-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    <span className="text-xs font-medium text-green-600">+15 from last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Most Popular */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Most Popular</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">Main Meals</p>
                  <p className="text-xs text-gray-500 mt-2">Accounts for 45% of total orders</p>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="1" className="w-7 h-7">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Category List</h2>
              <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                Filter
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3.5">Category Name</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3.5">Description</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3.5">Total Items</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3.5">Last Updated</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, i) => (
                    <tr key={cat.name} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${i === categories.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 ${cat.bg} rounded-lg flex items-center justify-center shrink-0`}>
                            {cat.icon}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500 truncate max-w-[220px]">{cat.desc}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">{cat.items}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{cat.updated}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">Showing 1 to 4 of 8 categories</span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed">
                  Previous
                </button>
                <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
