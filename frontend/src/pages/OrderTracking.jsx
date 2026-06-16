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
      const { data } = await axios.get(`/orders/${orderId}`)
      if (data?.error) throw new Error(data.error)
      setOrder(data)
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load order')
    }
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 10000)
    return () => clearInterval(interval)
  }, [orderId])

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
  const isReady      = order.orderStatus === 'ready for pickup' || order.orderStatus === 'ready'
  const isCollected  = order.orderStatus === 'collected' || order.orderStatus === 'completed'

  const formattedTime = new Date(order.createdAt).toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-background text-on-background font-body-lg antialiased pb-24">

      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-12 h-16 bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Back button — mobile only */}
          <button
            aria-label="Go back"
            onClick={() => navigate('/student')}
            className="md:hidden p-2 -ml-2 text-primary hover:bg-surface-container-low rounded-full transition-colors bg-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
          </button>

          <div className="flex items-center gap-2">
            <img src={SU_LOGO} alt="Strathmore University Logo" className="h-10 w-auto object-contain" />
            <span className="hidden md:inline font-bold text-primary text-base">Strathmore Dining</span>
          </div>

          {/* Desktop nav — Orders active */}
          <nav className="hidden md:flex items-center h-full">
            <button onClick={() => navigate('/student')} className="text-on-surface-variant h-full flex items-center px-4 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer text-sm">Menu</button>
            <button className="text-primary border-b-2 border-primary h-full flex items-center px-4 font-semibold bg-transparent cursor-pointer text-sm">Orders</button>
            <button onClick={() => navigate('/wallet')} className="text-on-surface-variant h-full flex items-center px-4 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer text-sm">Wallet</button>
            <button className="text-on-surface-variant h-full flex items-center px-4 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer text-sm">Profile</button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors bg-transparent cursor-pointer">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors bg-transparent cursor-pointer">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>account_circle</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 flex flex-col gap-8 max-w-lg mx-auto">

        {/* Order Title Row */}
        <section className="flex justify-between items-end">
          <h1 className="text-2xl font-bold text-on-surface">
            Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}
          </h1>
          <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
            Today, {formattedTime}
          </span>
        </section>

        {/* Status Card */}
        <section className="bg-surface-card border border-border-subtle rounded-xl p-4 flex flex-col gap-4 relative">
          <span className="absolute top-4 right-4 text-xs font-semibold tracking-widest uppercase text-on-surface-variant bg-surface-container py-1 px-2 rounded-full">
            {order.pickupCounter || 'Counter 1'}
          </span>

          <div className="flex items-center gap-2 pr-24">
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

          {/* Progress bar */}
          <div className="relative w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#28A745] rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
            {STATUS_STEPS.map((step, i) => (
              <span key={step} className={i <= currentStep ? 'text-[#28A745]' : ''}>
                {STATUS_LABELS[step]}
              </span>
            ))}
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
