import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import KitchenBottomNav from '../components/KitchenBottomNav'
import { useAuth } from '../context/AuthContext'

const STATUS_META = {
  pending:          { label: 'Pending',          color: 'bg-yellow-100 text-yellow-800' },
  received:         { label: 'Received',          color: 'bg-blue-100 text-blue-800' },
  preparing:        { label: 'Preparing',         color: 'bg-orange-100 text-orange-800' },
  'ready for pickup': { label: 'Ready',           color: 'bg-green-100 text-green-700' },
  ready:            { label: 'Ready',             color: 'bg-green-100 text-green-700' },
  collected:        { label: 'Collected',         color: 'bg-surface-container text-on-surface-variant' },
  completed:        { label: 'Completed',         color: 'bg-surface-container text-on-surface-variant' },
  cancelled:        { label: 'Cancelled',         color: 'bg-red-100 text-red-700' },
}

const ACTIVE_STATUSES = new Set(['pending', 'received', 'preparing', 'ready for pickup', 'ready'])

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: 'bg-surface-container text-on-surface-variant' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function KpiCard({ icon, label, value, sub, iconBg }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-colors cursor-default">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className="material-symbols-outlined text-primary">{icon}</span>
        </div>
        {sub && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-surface-container text-on-surface-variant">
            {sub}
          </span>
        )}
      </div>
      <p className="text-on-surface-variant text-xs uppercase font-bold tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-primary mt-1">{value}</p>
    </div>
  )
}

function HorizontalBar({ label, value, max, color = 'bg-primary' }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-on-surface-variant mb-1">
        <span className="truncate max-w-[60%] font-medium">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [ordersRes, statsRes] = await Promise.all([
        axios.get('/orders'),
        axios.get('/stats'),
      ])
      setOrders(ordersRes.data)
      setStats(statsRes.data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Derived metrics ────────────────────────────────────────────────────────
  const today = startOfToday()
  const todayOrders = orders.filter(o => new Date(o.createdAt) >= today)
  const paidOrders  = orders.filter(o => o.paymentStatus === 'paid')

  const totalRevenue  = paidOrders.reduce((s, o) => s + o.totalAmt, 0)
  const todayRevenue  = todayOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmt, 0)
  const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0

  const activeOrders  = orders.filter(o => ACTIVE_STATUSES.has(o.orderStatus))
  const todayActive   = todayOrders.filter(o => ACTIVE_STATUSES.has(o.orderStatus))
  const pendingCount  = orders.filter(o => o.orderStatus === 'pending').length
  const preparingCount= orders.filter(o => o.orderStatus === 'preparing').length
  const readyCount    = orders.filter(o => ['ready', 'ready for pickup'].includes(o.orderStatus)).length

  // Status distribution
  const statusCounts = {}
  orders.forEach(o => { statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1 })

  // Popular items (by qty ordered, all time)
  const itemFreq = {}
  orders.forEach(o => o.items?.forEach(i => {
    const name = i.item?.name || 'Unknown'
    itemFreq[name] = (itemFreq[name] || 0) + (i.qty || 1)
  }))
  const popularItems = Object.entries(itemFreq).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxItemQty   = popularItems[0]?.[1] || 1

  // Peak hours (orders per hour 0–23)
  const hourCounts = Array(24).fill(0)
  orders.forEach(o => { hourCounts[new Date(o.createdAt).getHours()]++ })
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.hour >= 6 && h.hour <= 21)
  const maxHourCount = Math.max(...peakHours.map(h => h.count), 1)

  // Today's demand forecast (items ordered today)
  const todayItemFreq = {}
  todayOrders.forEach(o => o.items?.forEach(i => {
    const name = i.item?.name || 'Unknown'
    todayItemFreq[name] = (todayItemFreq[name] || 0) + (i.qty || 1)
  }))
  const todayTopItems = Object.entries(todayItemFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxTodayQty   = todayTopItems[0]?.[1] || 1

  // Payment method split
  const mpesaCount  = orders.filter(o => o.paymentMethod === 'mpesa').length
  const walletCount = orders.filter(o => o.paymentMethod === 'wallet').length

  // Recent orders for table
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)

  // Kitchen staff: today's active queue sorted by time
  const activeQueue = [...todayActive]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  // ── Greeting ───────────────────────────────────────────────────────────────
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || (isAdmin ? 'Admin' : 'Staff')

  return (
    <div className="bg-background text-on-background min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="md:ml-64 min-h-screen flex flex-col">
        {/* ── Header ── */}
        <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-surface border-b border-outline-variant shrink-0">
          <h2 className="text-headline-sm font-bold text-primary">Strathmore Dining</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-on-surface-variant hidden md:block">
              Last updated: {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-sm text-primary hover:bg-primary-fixed px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-5xl mb-4 text-primary">refresh</span>
              <p className="text-body-md">Loading dashboard...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-32 text-error">
              <span className="material-symbols-outlined text-5xl mb-4">error</span>
              <p className="text-body-lg font-semibold">Failed to load data</p>
              <p className="text-sm text-on-surface-variant mt-1">{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-lg font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="max-w-7xl mx-auto flex flex-col gap-8">

              {/* ── Greeting ── */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-primary">
                    {greeting}, {firstName}
                  </h1>
                  <p className="text-on-surface-variant text-sm mt-0.5">
                    {isAdmin ? 'Admin Dashboard — Demand Analytics & Reporting' : 'Kitchen Operations Dashboard'}
                    {' · '}
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* ── KPI Cards ── */}
              {isAdmin ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard icon="payments" label="Total Revenue" value={formatKES(totalRevenue)} sub="All Time" iconBg="bg-primary-fixed" />
                  <KpiCard icon="receipt_long" label="Total Orders" value={orders.length} sub={`${todayOrders.length} today`} iconBg="bg-secondary-fixed" />
                  <KpiCard icon="today" label="Today's Revenue" value={formatKES(todayRevenue)} sub="Paid orders" iconBg="bg-tertiary-fixed" />
                  <KpiCard icon="analytics" label="Avg Order Value" value={formatKES(avgOrderValue)} sub="Paid orders" iconBg="bg-primary-fixed" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard icon="today" label="Orders Today" value={todayOrders.length} sub="All statuses" iconBg="bg-primary-fixed" />
                  <KpiCard icon="pending" label="Pending" value={pendingCount} sub="Awaiting prep" iconBg="bg-tertiary-fixed" />
                  <KpiCard icon="soup_kitchen" label="Preparing" value={preparingCount} sub="In kitchen" iconBg="bg-secondary-fixed" />
                  <KpiCard icon="check_circle" label="Ready" value={readyCount} sub="For pickup" iconBg="bg-primary-fixed" />
                </div>
              )}

              {/* ── Admin: Charts Row ── */}
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Popular Items */}
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-bold text-primary">Most Popular Items</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">By total quantity ordered</p>
                      </div>
                      <span className="material-symbols-outlined text-primary opacity-40 text-3xl">bar_chart</span>
                    </div>
                    {popularItems.length === 0 ? (
                      <p className="text-sm text-on-surface-variant text-center py-8">No order data yet</p>
                    ) : (
                      <div className="space-y-3">
                        {popularItems.map(([name, qty], i) => {
                          const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary-fixed-dim', 'bg-primary-container', 'bg-secondary-container', 'bg-outline']
                          return (
                            <HorizontalBar key={name} label={name} value={qty} max={maxItemQty} color={colors[i % colors.length]} />
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Peak Hours */}
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-bold text-primary">Peak Order Hours</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">Orders placed per hour</p>
                      </div>
                      <span className="material-symbols-outlined text-primary opacity-40 text-3xl">schedule</span>
                    </div>
                    {orders.length === 0 ? (
                      <p className="text-sm text-on-surface-variant text-center py-8">No order data yet</p>
                    ) : (
                      <div className="flex items-end gap-1 h-28">
                        {peakHours.map(({ hour, count }) => {
                          const heightPct = maxHourCount > 0 ? (count / maxHourCount) * 100 : 0
                          const isLunch = hour >= 11 && hour <= 14
                          return (
                            <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                              <div className="w-full flex flex-col justify-end" style={{ height: '88px' }}>
                                <div
                                  className={`w-full rounded-t transition-all ${isLunch ? 'bg-secondary' : 'bg-primary'} opacity-80 hover:opacity-100`}
                                  style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%` }}
                                />
                              </div>
                              {count > 0 && (
                                <span className="absolute -top-5 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {count}
                                </span>
                              )}
                              <span className="text-[9px] text-on-surface-variant">
                                {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Orders by Status */}
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-bold text-primary">Orders by Status</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">All-time breakdown</p>
                      </div>
                      <span className="material-symbols-outlined text-primary opacity-40 text-3xl">donut_large</span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                        const meta = STATUS_META[status] || { label: status }
                        const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <StatusBadge status={status} />
                            <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-on-surface-variant w-8 text-right">{count}</span>
                          </div>
                        )
                      })}
                      {Object.keys(statusCounts).length === 0 && (
                        <p className="text-sm text-on-surface-variant text-center py-4">No orders yet</p>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Split */}
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-bold text-primary">Payment Methods</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">M-Pesa vs Wallet split</p>
                      </div>
                      <span className="material-symbols-outlined text-primary opacity-40 text-3xl">account_balance_wallet</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                            M-Pesa
                          </span>
                          <span className="font-bold text-primary">{mpesaCount} orders</span>
                        </div>
                        <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: orders.length > 0 ? `${(mpesaCount / orders.length) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-secondary inline-block" />
                            Wallet
                          </span>
                          <span className="font-bold text-secondary">{walletCount} orders</span>
                        </div>
                        <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary rounded-full"
                            style={{ width: orders.length > 0 ? `${(walletCount / orders.length) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-outline-variant text-sm text-on-surface-variant flex justify-between">
                        <span>Total orders</span>
                        <span className="font-bold text-on-surface">{orders.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Admin: Today's Demand Forecast ── */}
              {isAdmin && (
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-bold text-primary">Today's Demand Forecast</h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Items ordered today — use this to guide kitchen prep quantities
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-xs text-on-surface-variant bg-tertiary-fixed px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                      Forecast
                    </div>
                  </div>
                  {todayTopItems.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl mb-2">restaurant</span>
                      <p className="text-sm">No orders placed today yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {todayTopItems.map(([name, qty], i) => {
                        const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary-fixed-dim', 'bg-outline', 'bg-primary-container']
                        return (
                          <div key={name} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${colors[i % colors.length]}`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-on-surface truncate">{name}</p>
                              <div className="mt-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${colors[i % colors.length]}`}
                                  style={{ width: `${(qty / maxTodayQty) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-bold text-primary">{qty}</p>
                              <p className="text-xs text-on-surface-variant">portions</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Kitchen Staff: Active Queue ── */}
              {!isAdmin && (
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-primary">Today's Active Queue</h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">{activeQueue.length} order{activeQueue.length !== 1 ? 's' : ''} to fulfill</p>
                    </div>
                    {activeQueue.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-secondary bg-secondary-fixed px-3 py-1.5 rounded-full uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  {activeQueue.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl mb-3">check_circle</span>
                      <p className="font-semibold">All caught up!</p>
                      <p className="text-sm mt-1">No active orders in the queue</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant">
                      {activeQueue.map(order => (
                        <div key={order._id} className="p-4 flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                          <div className="shrink-0">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider">{order.orderNumber}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{relativeTime(order.createdAt)}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-on-surface text-sm truncate">
                              {order.user?.name || order.user?.email || 'Customer'}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                              {order.items?.map(i => `${i.qty}× ${i.item?.name || 'Item'}`).join(', ')}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <StatusBadge status={order.orderStatus} />
                            <p className="text-xs text-on-surface-variant mt-1">{formatKES(order.totalAmt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Menu Stats (stats endpoint) — both roles ── */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-colors cursor-default">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-primary-fixed rounded-lg">
                        <span className="material-symbols-outlined text-primary">category</span>
                      </div>
                      <span className="text-green-700 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
                        +{stats.thisMonthCategories} This Month
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-xs uppercase font-bold tracking-wider">Categories</p>
                    <p className="text-3xl font-bold text-primary mt-1">{stats.totalCategories}</p>
                  </div>

                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-colors cursor-default">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-secondary-fixed rounded-lg">
                        <span className="material-symbols-outlined text-secondary">fastfood</span>
                      </div>
                      <span className="text-on-surface-variant text-xs font-bold bg-surface-container px-2 py-1 rounded-full">Across Menus</span>
                    </div>
                    <p className="text-on-surface-variant text-xs uppercase font-bold tracking-wider">Menu Items</p>
                    <p className="text-3xl font-bold text-primary mt-1">{stats.totalItems}</p>
                  </div>

                  <div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm overflow-hidden relative">
                    <h3 className="text-on-surface-variant text-xs uppercase font-bold tracking-wider mb-3">Category Health</h3>
                    {stats.categoryHealth?.length > 0 ? (
                      <div className="space-y-3">
                        {stats.categoryHealth.slice(0, 3).map((entry, i) => {
                          const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary-fixed-dim']
                          const name = entry.name?.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
                          return (
                            <HorizontalBar
                              key={entry.name}
                              label={name}
                              value={`${entry.count} items`}
                              max={100}
                              color={colors[i]}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">Add menu items to see category distribution.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Recent Orders Table ── */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-primary">Recent Orders</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">Latest {recentOrders.length} orders across all statuses</p>
                  </div>
                  <a
                    href="/admin/orders"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View all
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </a>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant">
                        <th className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">Order #</th>
                        <th className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">Customer</th>
                        <th className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">Items</th>
                        <th className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">Amount</th>
                        <th className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">Payment</th>
                        <th className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">Status</th>
                        <th className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-on-surface-variant text-sm">No orders yet</td>
                        </tr>
                      ) : (
                        recentOrders.map(order => (
                          <tr key={order._id} className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="p-4 font-bold text-primary text-sm">{order.orderNumber}</td>
                            <td className="p-4">
                              <p className="text-sm font-medium text-on-surface">{order.user?.name || '—'}</p>
                              <p className="text-xs text-on-surface-variant">{order.user?.email || '—'}</p>
                            </td>
                            <td className="p-4 text-sm text-on-surface-variant max-w-[200px]">
                              <span className="truncate block">
                                {order.items?.map(i => `${i.qty}× ${i.item?.name || 'Item'}`).join(', ') || '—'}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-primary text-sm">{formatKES(order.totalAmt)}</td>
                            <td className="p-4">
                              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                {order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Wallet'}
                              </span>
                            </td>
                            <td className="p-4"><StatusBadge status={order.orderStatus} /></td>
                            <td className="p-4 text-right text-xs text-on-surface-variant">{relativeTime(order.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-outline-variant">
                  {recentOrders.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant text-sm">No orders yet</div>
                  ) : (
                    recentOrders.map(order => (
                      <div key={order._id} className="p-4 flex items-center gap-3">
                        <div className="shrink-0">
                          <p className="text-xs font-bold text-primary">{order.orderNumber}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{relativeTime(order.createdAt)}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{order.user?.name || order.user?.email || 'Customer'}</p>
                          <p className="text-xs text-on-surface-variant truncate mt-0.5">
                            {order.items?.map(i => `${i.qty}× ${i.item?.name || 'Item'}`).join(', ')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <StatusBadge status={order.orderStatus} />
                          <p className="text-xs font-bold text-primary mt-1">{formatKES(order.totalAmt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
        <KitchenBottomNav />
      </div>
    </div>
  )
}
