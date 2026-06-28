import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import StudentBottomNav from '../components/StudentBottomNav'

const STATUS_META = {
  pending:            { label: 'Pending',      color: 'bg-yellow-100 text-yellow-800' },
  received:           { label: 'Received',     color: 'bg-blue-100 text-blue-800' },
  preparing:          { label: 'Preparing',    color: 'bg-orange-100 text-orange-800' },
  'ready for pickup': { label: 'Ready',        color: 'bg-green-100 text-green-700' },
  ready:              { label: 'Ready',        color: 'bg-green-100 text-green-700' },
  collected:          { label: 'Collected',    color: 'bg-surface-container text-on-surface-variant' },
  completed:          { label: 'Collected',    color: 'bg-surface-container text-on-surface-variant' },
  cancelled:          { label: 'Cancelled',    color: 'bg-red-100 text-red-700' },
}

const ISSUE_CATEGORIES = [
  { value: 'wrong_order',   label: 'Wrong Order',     icon: 'swap_horiz' },
  { value: 'missing_item',  label: 'Missing Item',    icon: 'remove_shopping_cart' },
  { value: 'food_quality',  label: 'Food Quality',    icon: 'sentiment_dissatisfied' },
  { value: 'payment',       label: 'Payment Problem', icon: 'payment' },
  { value: 'other',         label: 'Other',           icon: 'help_outline' },
]

function formatKES(n) { return `KES ${Number(n).toLocaleString('en-KE')}` }

function relativeDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (d >= today) return 'Today'
  if (d >= yesterday) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

export default function OrderHistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { addItemToCart } = useCart()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [reorderToast, setReorderToast] = useState('')

  const [reportOrder, setReportOrder] = useState(null)
  const [issueCategory, setIssueCategory] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportResult, setReportResult] = useState(null)
  const [reportMsg, setReportMsg] = useState('')

  useEffect(() => {
    axios.get('/orders')
      .then(({ data }) => {
        const mine = data
          .filter(o => o.user?._id === user?._id || o.user === user?._id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setOrders(mine)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?._id])

  const grouped = orders.reduce((acc, o) => {
    const label = relativeDate(o.createdAt)
    if (!acc[label]) acc[label] = []
    acc[label].push(o)
    return acc
  }, {})

  function handleReorder(order) {
    order.items?.forEach(entry => {
      if (!entry.item?._id) return
      addItemToCart({
        _id: entry.item._id,
        name: entry.item.name,
        fullPrice: entry.item.fullPrice || entry.unitPrice || 0,
        halfPrice: entry.item.halfPrice,
        imageUrl: entry.item.imageUrl || '',
        servingSize: entry.servingSize || 'full',
      })
    })
    setReorderToast(`Added ${order.items?.length ?? 0} item(s) to your order`)
    setTimeout(() => setReorderToast(''), 3000)
    navigate('/student')
  }

  function openReport(order) {
    setReportOrder(order)
    setIssueCategory('')
    setIssueDescription('')
    setReportResult(null)
    setReportMsg('')
  }

  async function submitReport() {
    if (!issueCategory) { setReportMsg('Please select a category.'); return }
    if (!issueDescription.trim()) { setReportMsg('Please describe the issue.'); return }
    setIsSubmitting(true)
    setReportMsg('')
    try {
      await axios.post('/issues', {
        orderId: reportOrder._id,
        category: issueCategory,
        description: issueDescription.trim(),
      })
      setReportResult('success')
    } catch (e) {
      setReportResult('error')
      setReportMsg(e?.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background pb-24">
      <main className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-on-surface">Order History</h1>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-3 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl opacity-40">receipt_long</span>
            <p className="font-semibold">No orders yet</p>
            <p className="text-sm">Your order history will appear here.</p>
            <button onClick={() => navigate('/student')} className="mt-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer border-none">
              Browse Menu
            </button>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([label, dayOrders]) => (
          <section key={label} className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
            {dayOrders.map(order => {
              const meta = STATUS_META[order.orderStatus] || { label: order.orderStatus, color: 'bg-surface-container text-on-surface-variant' }
              const isActive = !['collected', 'completed', 'cancelled'].includes(order.orderStatus)
              const isDone = ['collected', 'completed'].includes(order.orderStatus)
              return (
                <div
                  key={order._id}
                  className="w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2"
                >
                  <button
                    onClick={() => isActive && navigate(`/orders/${order._id}/track`)}
                    className={`w-full text-left flex flex-col gap-2 bg-transparent border-none p-0 ${isActive ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-sm">#{order.orderNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-on-surface-variant">{formatTime(order.createdAt)}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      </div>
                    </div>
                    <p className="text-sm text-on-surface line-clamp-1">
                      {order.items?.map(i => `${i.qty}× ${i.item?.name || 'Item'}`).join(', ') || '—'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant capitalize">{order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Wallet'}</span>
                      <span className="font-bold text-primary text-sm">{formatKES(order.totalAmt)}</span>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-1 text-xs text-primary font-semibold mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        Track order
                      </div>
                    )}
                  </button>

                  {isDone && (
                    <div className="flex gap-2 pt-1 border-t border-outline-variant mt-1">
                      <button
                        onClick={() => handleReorder(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer border-none hover:opacity-90 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[14px]">replay</span>
                        Re-order
                      </button>
                      <button
                        onClick={() => openReport(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-xs font-bold cursor-pointer bg-transparent hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">flag</span>
                        Report Issue
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        ))}
      </main>

      {reorderToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-on-surface text-surface text-sm font-semibold px-5 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 whitespace-nowrap">
          <span className="material-symbols-outlined text-[18px]" style={{ color: '#4ade80' }}>check_circle</span>
          {reorderToast}
        </div>
      )}

      <StudentBottomNav active="orders" />

      {/* Report Issue Modal */}
      {reportOrder && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end md:justify-center md:items-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSubmitting && setReportOrder(null)}
          />
          <div className="relative w-full md:max-w-lg bg-surface rounded-t-2xl md:rounded-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mt-3 mb-1 md:hidden" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">support_agent</span>
                </div>
                <div>
                  <h2 className="font-bold text-on-surface text-base">Report an Issue</h2>
                  <p className="text-xs text-on-surface-variant">Order #{reportOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => !isSubmitting && setReportOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {reportResult === 'success' ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h3 className="font-bold text-on-surface text-lg">Issue Reported</h3>
                <p className="text-sm text-on-surface-variant max-w-xs">
                  We've received your report and will look into it shortly. Thank you for letting us know.
                </p>
                <button
                  onClick={() => setReportOrder(null)}
                  className="mt-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer border-none"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">What's the issue?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ISSUE_CATEGORIES.map(({ value, label, icon }) => (
                      <button
                        key={value}
                        onClick={() => setIssueCategory(value)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                          issueCategory === value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-outline-variant text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-low'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: `'FILL' ${issueCategory === value ? 1 : 0}` }}>
                          {icon}
                        </span>
                        <span className="text-xs font-semibold leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Description</p>
                  <textarea
                    value={issueDescription}
                    onChange={e => setIssueDescription(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Describe the issue in detail so we can resolve it quickly…"
                    className="w-full rounded-xl border-2 border-outline-variant focus:border-primary outline-none px-4 py-3 text-sm text-on-surface bg-surface resize-none transition-colors"
                  />
                  <p className="text-right text-[10px] text-on-surface-variant mt-1">{issueDescription.length}/1000</p>
                </div>

                {reportMsg && (
                  <p className={`text-xs font-medium ${reportResult === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
                    {reportMsg}
                  </p>
                )}

                <button
                  onClick={submitReport}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed mb-2"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
