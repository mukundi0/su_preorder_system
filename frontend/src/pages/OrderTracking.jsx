import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SU_LOGO from '../assets/sulogo.png'
import StudentBottomNav from '../components/StudentBottomNav'
import { generateReceipt } from '../utils/generateReceipt'

const STATUS_STEPS = ['received', 'preparing', 'ready']
const STATUS_LABELS = { received: 'Received', preparing: 'Preparing', ready: 'Ready' }

function getStepIndex(orderStatus) {
  switch (orderStatus) {
    case 'preparing': return 1
    case 'ready for pickup':
    case 'ready':
    case 'collected':
    case 'completed': return 2
    default: return 0
  }
}

function getProgressPct(orderStatus) {
  switch (orderStatus) {
    case 'preparing': return 50
    case 'ready for pickup':
    case 'ready':
    case 'collected':
    case 'completed': return 100
    default: return 10
  }
}

function getStatusLabel(orderStatus) {
  switch (orderStatus) {
    case 'preparing': return 'Being Prepared'
    case 'ready for pickup':
    case 'ready': return 'Ready for Pickup'
    case 'collected':
    case 'completed': return 'Collected'
    default: return 'Order Received'
  }
}

function getStatusIcon(orderStatus) {
  switch (orderStatus) {
    case 'ready for pickup':
    case 'ready':
    case 'collected':
    case 'completed': return 'check_circle'
    default: return 'pending'
  }
}

const ISSUE_CATEGORIES = [
  { value: 'wrong_order',   label: 'Wrong Order',      icon: 'swap_horiz' },
  { value: 'missing_item',  label: 'Missing Item',     icon: 'remove_shopping_cart' },
  { value: 'food_quality',  label: 'Food Quality',     icon: 'sentiment_dissatisfied' },
  { value: 'payment',       label: 'Payment Problem',  icon: 'payment' },
  { value: 'other',         label: 'Other',            icon: 'help_outline' },
]

export default function OrderTracking() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const [showCollectedPopup, setShowCollectedPopup] = useState(false)

  const [isCancelling, setIsCancelling]         = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelResult, setCancelResult]         = useState(null)

  const [showReportModal, setShowReportModal]   = useState(false)
  const [issueCategory, setIssueCategory]       = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [isSubmitting, setIsSubmitting]         = useState(false)
  const [reportResult, setReportResult]         = useState(null) // 'success' | 'error' | null
  const [reportMsg, setReportMsg]               = useState('')

  const openReport = () => {
    setIssueCategory('')
    setIssueDescription('')
    setReportResult(null)
    setReportMsg('')
    setShowReportModal(true)
  }

  const submitReport = async () => {
    if (!issueCategory) { setReportMsg('Please select a category.'); return }
    if (!issueDescription.trim()) { setReportMsg('Please describe the issue.'); return }
    setIsSubmitting(true)
    setReportMsg('')
    try {
      await axios.post('/issues', {
        orderId,
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

  const handleViewReceipt = async () => {
    if (!order) return
    setIsGeneratingPdf(true)
    try {
      await generateReceipt(order, SU_LOGO)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`/orders/${orderId}`, { params: { _t: Date.now() } })
      if (data?.error) throw new Error(data.error)
      setOrder(data)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load order')
    }
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [orderId])

  useEffect(() => {
    if (order && ['collected', 'completed'].includes(order.orderStatus)) {
      setShowCollectedPopup(true)
    }
  }, [order?.orderStatus])

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-surface-container" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant text-sm">
          <span>Loading order</span>
          <span className="flex gap-0.5">
            <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </div>
      </div>
    )
  }

  const currentStep  = getStepIndex(order.orderStatus)
  const progressPct  = getProgressPct(order.orderStatus)
  const statusLabel  = getStatusLabel(order.orderStatus)
  const statusIcon   = getStatusIcon(order.orderStatus)
  const isReady        = order.orderStatus === 'ready for pickup' || order.orderStatus === 'ready'
  const isCollected    = order.orderStatus === 'collected' || order.orderStatus === 'completed'
  const isCancellable  = !['collected', 'completed', 'cancelled'].includes(order.orderStatus)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const { data } = await axios.post(`/orders/${orderId}/cancel`)
      setCancelResult({ refunded: data.paymentMethod === 'wallet' && data.paymentStatus === 'paid' })
      setShowCancelConfirm(false)
      setTimeout(() => navigate('/student'), 3000)
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to cancel order')
    } finally {
      setIsCancelling(false)
    }
  }

  function formatOrderDate(dateStr) {
    const d = new Date(dateStr)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    if (d >= today) return `Today, ${time}`
    if (d >= yesterday) return `Yesterday, ${time}`
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`
  }

  const formattedOrderDate = formatOrderDate(order.createdAt)

  return (
    <div className="min-h-screen bg-background text-on-background font-body-lg antialiased pb-24">
      <main className="px-4 pt-6 flex flex-col gap-8 max-w-lg mx-auto">

        {/* Order Title Row */}
        <section className="flex justify-between items-end">
          <h1 className="text-2xl font-bold text-on-surface">
            Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}
          </h1>
          <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
            {formattedOrderDate}
          </span>
        </section>

        {/* Status Card */}
        <section className="bg-surface-card border border-border-subtle rounded-xl p-4 flex flex-col gap-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined ${isReady || isCollected ? 'text-[#28A745]' : 'text-on-surface-variant'}`}
                style={{ fontVariationSettings: `'FILL' ${isReady || isCollected ? 1 : 0}` }}
              >
                {statusIcon}
              </span>
              <span className={`text-base font-bold ${isReady || isCollected ? 'text-[#28A745]' : 'text-on-surface'}`}>
                {statusLabel}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant bg-surface-container py-1 px-2 rounded-full">
                {order.pickupCounter || 'Counter 1'}
              </span>
              {lastUpdated && (
                <span className="text-[10px] text-on-surface-variant opacity-60">
                  Updated {lastUpdated.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#28A745] rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
            {/* shimmer overlay while waiting */}
            {!isReady && !isCollected && (
              <div className="absolute top-0 left-0 h-full w-full overflow-hidden rounded-full pointer-events-none">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              </div>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex justify-between items-start">
            {STATUS_STEPS.map((step, i) => {
              const done    = i < currentStep
              const current = i === currentStep && !isCollected
              const future  = i > currentStep
              return (
                <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-500
                    ${done    ? 'bg-[#28A745] border-[#28A745]' : ''}
                    ${current ? 'border-[#28A745] bg-white animate-pulse' : ''}
                    ${future  ? 'border-outline bg-surface-container' : ''}
                  `}>
                    {done && (
                      <span className="material-symbols-outlined text-white text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    )}
                    {current && <div className="w-1.5 h-1.5 rounded-full bg-[#28A745]" />}
                  </div>
                  <span className={`text-[10px] font-semibold tracking-widest uppercase text-center transition-colors duration-500
                    ${done || current ? 'text-[#28A745]' : 'text-on-surface-variant'}`}>
                    {STATUS_LABELS[step]}
                  </span>
                </div>
              )
            })}
          </div>

        </section>

        {/* QR Code Card */}
        <section className="bg-surface-card border border-border-subtle rounded-xl p-6 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-on-surface-variant">
            Scan this code at the pickup counter to collect your order.
          </p>

          <div
            className="w-48 h-48 bg-surface-container-highest rounded-lg p-2 flex items-center justify-center"
            style={{ border: '4px solid #00193c' }}
          >
            {order.qrCode ? (
              <img src={order.qrCode} alt="Order QR Code" className="w-full h-full object-contain" />
            ) : (
              <span className="text-on-surface-variant text-xs">Generating…</span>
            )}
          </div>

          <p className="text-xs font-semibold tracking-widest uppercase text-primary">
            PIN: {order.qrPin || '—'}
          </p>
        </section>

        {/* Order Details */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-on-surface border-b border-border-subtle pb-2">
            Order Details
          </h2>
          {order.items?.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-surface-container flex items-center justify-center rounded text-on-surface-variant text-xs font-semibold tracking-widest uppercase shrink-0">
                {entry.qty}x
              </div>
              <span className="text-sm text-on-surface">
                {entry.item?.name || 'Item'}
                {entry.servingSize && (
                  <span className="text-on-surface-variant ml-1">({entry.servingSize})</span>
                )}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-border-subtle mt-1">
            <span className="text-sm text-on-surface-variant font-semibold">Total</span>
            <span className="text-base font-bold text-primary">
              KES {(Number(order.totalAmt) || 0).toLocaleString()}
            </span>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="flex flex-col gap-2 pb-4">
          {isCancellable && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-3 rounded-lg border-2 border-red-400 text-red-500 text-xs font-semibold tracking-widest uppercase flex justify-center items-center gap-2 active:bg-red-50 transition-colors bg-transparent cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
              Cancel Order
            </button>
          )}
          <button onClick={openReport} className="w-full py-3 rounded-lg border-2 border-primary text-primary text-xs font-semibold tracking-widest uppercase flex justify-center items-center gap-2 active:bg-primary/10 transition-colors bg-transparent cursor-pointer">
            <span className="material-symbols-outlined text-lg">support_agent</span>
            Report an Issue
          </button>
          <button
            onClick={handleViewReceipt}
            disabled={isGeneratingPdf}
            className="w-full py-3 rounded-lg text-primary text-xs font-semibold tracking-widest uppercase flex justify-center items-center gap-2 active:bg-surface-container-low transition-colors bg-transparent cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            {isGeneratingPdf ? 'Generating…' : 'View Receipt'}
          </button>
        </section>

      </main>

      <StudentBottomNav active="orders" />

      {/* Order Collected Popup */}
      {showCollectedPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCollectedPopup(false)} />
          <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center text-center p-8 gap-5">

            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600" style={{ fontSize: 52, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-on-surface">Enjoy your meal!</h2>
              <p className="text-on-surface-variant text-sm">Order collected -   thanks for dining with us 🍽️</p>
            </div>

            <div className="bg-surface-container rounded-2xl px-6 py-4 w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Order</p>
              <p className="text-2xl font-extrabold text-primary">{order?.orderNumber}</p>
            </div>

            <button
              onClick={() => { setShowCollectedPopup(false); navigate('/student') }}
              className="w-full py-3.5 bg-primary text-on-primary rounded-2xl font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Order Cancelled Popup */}
      {cancelResult && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center text-center p-8 gap-5">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>cancel</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-on-surface">Order Cancelled</h2>
              {cancelResult.refunded
                ? <p className="text-sm text-on-surface-variant">KES {(Number(order.totalAmt) || 0).toLocaleString()} has been returned to your wallet.</p>
                : <p className="text-sm text-on-surface-variant">Your order has been cancelled.</p>
              }
              <p className="text-xs text-on-surface-variant opacity-60 pt-1">Redirecting to menu…</p>
            </div>
            <button onClick={() => navigate('/student')} className="w-full py-3.5 bg-primary text-on-primary rounded-2xl font-bold text-base cursor-pointer border-none hover:opacity-90 transition-opacity">
              Go to Menu
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isCancelling && setShowCancelConfirm(false)} />
          <div className="relative w-full md:max-w-sm bg-surface rounded-t-2xl md:rounded-2xl p-6 flex flex-col gap-4">
            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mb-1 md:hidden" />
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-2xl">cancel</span>
              </div>
              <h3 className="font-bold text-on-surface text-lg">Cancel this order?</h3>
              <p className="text-sm text-on-surface-variant">
                {order.paymentMethod === 'wallet'
                  ? 'Your payment will be refunded to your wallet immediately.'
                  : 'M-Pesa payments are not auto-refunded. Contact support if you need a refund.'}
              </p>
              <p className="text-xs text-on-surface-variant opacity-70">You can cancel any time before collecting your order.</p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-xl border-2 border-outline-variant text-on-surface font-bold text-sm cursor-pointer bg-transparent disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm cursor-pointer border-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling
                  ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                  : null}
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report an Issue Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end md:justify-center md:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSubmitting && setShowReportModal(false)}
          />

          {/* Sheet */}
          <div className="relative w-full md:max-w-lg bg-surface rounded-t-2xl md:rounded-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300 md:animate-in md:zoom-in-95">

            {/* Drag handle — mobile only */}
            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto mt-3 mb-1 md:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">support_agent</span>
                </div>
                <div>
                  <h2 className="font-bold text-on-surface text-base">Report an Issue</h2>
                  <p className="text-xs text-on-surface-variant">Order #{order.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => !isSubmitting && setShowReportModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {reportResult === 'success' ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center px-6 py-12 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h3 className="font-bold text-on-surface text-lg">Issue Reported</h3>
                <p className="text-sm text-on-surface-variant max-w-xs">
                  We've received your report and will look into it shortly. Thank you for letting us know.
                </p>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="mt-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer border-none"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form state */
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Category picker */}
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

                {/* Description */}
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
