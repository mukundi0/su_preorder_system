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

export default function OrderTracking() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-on-surface-variant">Loading order…</p>
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
          <button className="w-full py-3 rounded-lg border-2 border-primary text-primary text-xs font-semibold tracking-widest uppercase flex justify-center items-center gap-2 active:bg-primary/10 transition-colors bg-transparent cursor-pointer">
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

    </div>
  )
}
