import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import Sidebar from '../components/Sidebar'
import KitchenBottomNav from '../components/KitchenBottomNav'
import { useAuth } from '../context/AuthContext'

// ─── Constants & helpers ───────────────────────────────────────────────────────

const ALL_STATUSES = ['pending', 'received', 'preparing', 'ready for pickup', 'ready', 'collected', 'completed', 'cancelled']

const STATUS_META = {
  pending:            { label: 'Pending',          color: 'bg-yellow-100 text-yellow-800',   dot: 'bg-yellow-400' },
  received:           { label: 'Received',          color: 'bg-blue-100 text-blue-800',       dot: 'bg-blue-400' },
  preparing:          { label: 'Preparing',         color: 'bg-orange-100 text-orange-800',   dot: 'bg-orange-400' },
  'ready for pickup': { label: 'Ready',             color: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  ready:              { label: 'Ready',             color: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  collected:          { label: 'Collected',         color: 'bg-surface-container text-on-surface-variant', dot: 'bg-outline' },
  completed:          { label: 'Completed',         color: 'bg-surface-container text-on-surface-variant', dot: 'bg-outline' },
  cancelled:          { label: 'Cancelled',         color: 'bg-red-100 text-red-700',         dot: 'bg-red-400' },
}

// Kitchen flow: pending → preparing → ready for pickup (simpler 3-step flow)
const NEXT_STATUS   = { pending: 'preparing', received: 'preparing', preparing: 'ready for pickup' }
const ADVANCE_LABEL = { pending: 'Start Preparing', received: 'Start Preparing', preparing: 'Mark as Ready' }
const ADVANCE_ICON  = { pending: 'skillet',          received: 'skillet',         preparing: 'check_circle' }

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'bg-surface-container text-on-surface-variant' }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${m.color}`}>{m.label}</span>
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatKES(n) { return `KES ${Number(n).toLocaleString('en-KE')}` }

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function startOfToday() { const d = new Date(); d.setHours(0,0,0,0); return d }

// ─── QR Scanner Modal ─────────────────────────────────────────────────────────

function QRScannerModal({ open, onClose, onCollected }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scanRef     = useRef(null)
  const detectorRef = useRef(null)

  const [phase, setPhase]         = useState('scanning')
  const [message, setMessage]     = useState('')
  const [manualInput, setManualInput] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [cameraError, setCameraError]     = useState('')
  const [collectedOrder, setCollectedOrder] = useState(null)

  const stopCamera = useCallback(() => {
    clearInterval(scanRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const handleQRData = useCallback(async (raw) => {
    stopCamera()
    try {
      const payload = JSON.parse(raw)
      const { data } = await axios.post('/orders/verify-qr', {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
      })
      if (data.success) {
        setCollectedOrder(data.order)
        setPhase('success')
        onCollected(data.order)
      } else {
        setMessage(data.message || 'Verification failed')
        setPhase('error')
      }
    } catch {
      setMessage('Invalid QR code or order not found')
      setPhase('error')
    }
  }, [stopCamera, onCollected])

  useEffect(() => {
    if (!open) return
    setPhase('scanning')
    setMessage('')
    setManualInput('')
    setCameraError('')
    setCollectedOrder(null)

    if (!('BarcodeDetector' in window)) {
      setCameraError('Camera scanning not supported in this browser. Use manual order number below.')
      return
    }

    detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        scanRef.current = setInterval(async () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || video.readyState < 2) return
          try {
            canvas.width  = video.videoWidth
            canvas.height = video.videoHeight
            canvas.getContext('2d').drawImage(video, 0, 0)
            const barcodes = await detectorRef.current.detect(canvas)
            if (barcodes.length > 0) handleQRData(barcodes[0].rawValue)
          } catch {}
        }, 500)
      })
      .catch(() => setCameraError('Camera access denied. Use the manual order number below.'))

    return stopCamera
  }, [open, handleQRData, stopCamera])

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    const input = manualInput.trim().toUpperCase()
    if (!input) return
    setManualLoading(true)
    setMessage('')
    try {
      const { data: orders } = await axios.get('/orders')
      const order = orders.find(o => o.orderNumber?.toUpperCase() === input)
      if (!order) { setMessage('Order not found'); setManualLoading(false); return }
      const { data } = await axios.post('/orders/verify-qr', {
        orderId: order._id,
        orderNumber: order.orderNumber,
      })
      if (data.success) {
        setCollectedOrder(data.order)
        setPhase('success')
        onCollected(data.order)
      } else {
        setMessage(data.message || 'Verification failed')
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong')
    } finally {
      setManualLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <h3 className="font-bold text-primary text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            Scan Collection Code
          </h3>
          <button onClick={() => { stopCamera(); onClose() }} className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {phase === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div>
                <p className="font-bold text-on-surface text-lg">Order Collected!</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Order <span className="font-bold text-primary">{collectedOrder?.orderNumber}</span> has been marked as collected.
                </p>
              </div>
              <button onClick={() => { stopCamera(); onClose() }} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold cursor-pointer hover:opacity-90">
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-on-surface-variant text-center">
                Position the student's digital receipt QR code within the frame below.
              </p>

              {!cameraError ? (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black border-2 border-dashed border-primary/30">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Corner marks */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  {/* Scanner beam */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 relative flex items-center justify-center">
                      <div className="w-full h-0.5 bg-primary/70 animate-pulse" />
                    </div>
                  </div>
                  <p className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-semibold tracking-wide">
                    Point camera at student's QR code
                  </p>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-xl bg-surface-container flex flex-col items-center justify-center gap-3 text-center px-4">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant">no_photography</span>
                  <p className="text-sm text-on-surface-variant">{cameraError}</p>
                </div>
              )}

              {/* Manual fallback */}
              <div>
                <div className="relative flex items-center mb-3">
                  <div className="flex-1 border-t border-outline-variant" />
                  <span className="mx-3 text-xs text-on-surface-variant font-bold uppercase tracking-wider bg-surface-container-lowest px-1">Or enter manually</span>
                  <div className="flex-1 border-t border-outline-variant" />
                </div>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder="Enter Order #"
                    className="flex-1 h-11 px-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm uppercase tracking-wide"
                  />
                  <button
                    type="submit"
                    disabled={manualLoading || !manualInput.trim()}
                    className="h-11 px-5 bg-surface-container-high text-primary rounded-lg font-bold text-sm hover:bg-surface-container-highest transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
                  >
                    {manualLoading
                      ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                      : 'Verify'}
                  </button>
                </form>
                {message && <p className="text-xs text-red-600 font-medium mt-2">{message}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Kitchen Order Card ───────────────────────────────────────────────────────

function KitchenOrderCard({ order, cardBorder, onAdvance, onOpenScanner, advancing }) {
  const isReady     = order.orderStatus === 'ready for pickup' || order.orderStatus === 'ready'
  const isCollected = order.orderStatus === 'collected' || order.orderStatus === 'completed'
  const waitMs   = Date.now() - new Date(order.createdAt).getTime()
  const waitMins = Math.floor(waitMs / 60000)
  const isOverdue = order.orderStatus === 'pending' && waitMins >= 10

  const nextStatus = NEXT_STATUS[order.orderStatus]

  return (
    <article className={`bg-surface-container-lowest rounded-lg p-4 border border-outline-variant shadow-sm flex flex-col gap-3 ${cardBorder}`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-on-surface-variant bg-surface-container-low px-2 py-1 rounded border border-outline-variant">
          #{order.orderNumber}
        </span>
        <span className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? 'text-error' : 'text-on-surface-variant'}`}>
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {relativeTime(order.createdAt)}
        </span>
      </div>

      {/* Customer name */}
      <h4 className="font-semibold text-primary text-base leading-tight">
        {order.user?.name || order.user?.email || 'Customer'}
      </h4>

      {/* Items */}
      <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant space-y-1.5">
        {order.items?.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="font-bold text-primary shrink-0">{entry.qty}x</span>
            <span className="text-on-surface truncate">{entry.item?.name || 'Item'}</span>
            {entry.servingSize && (
              <span className="text-on-surface-variant text-xs capitalize shrink-0">({entry.servingSize})</span>
            )}
          </div>
        ))}
      </div>

      {/* Amount + payment */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-primary text-sm">{formatKES(order.totalAmt)}</span>
        <span className="text-xs text-on-surface-variant uppercase tracking-wide font-medium">
          {order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Wallet'}
        </span>
      </div>

      {/* Action */}
      {!isCollected && (
        <div className="pt-1">
          {isReady ? (
            <button
              onClick={onOpenScanner}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-green-500 text-green-700 font-bold text-sm hover:bg-green-50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              Scan to Complete
            </button>
          ) : nextStatus ? (
            <button
              onClick={() => onAdvance(order._id, nextStatus)}
              disabled={advancing}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-colors cursor-pointer disabled:opacity-50
                ${order.orderStatus === 'pending'
                  ? 'bg-primary text-on-primary hover:opacity-90'
                  : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {advancing
                ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                : <span className="material-symbols-outlined text-[16px]">{ADVANCE_ICON[order.orderStatus] || 'check_circle'}</span>}
              {ADVANCE_LABEL[order.orderStatus] || 'Advance'}
            </button>
          ) : null}
        </div>
      )}

      {isCollected && (
        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Collected {order.collectedAt ? relativeTime(order.collectedAt) : ''}
        </div>
      )}
    </article>
  )
}

// ─── Kitchen Page (full-page layout for kitchen staff) ────────────────────────

function KitchenPage() {
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [advancing, setAdvancing]   = useState({})
  const [scannerOpen, setScannerOpen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [toast, setToast]           = useState(null)
  const [autoAccept, setAutoAccept] = useState(
    () => localStorage.getItem('kitchen_autoAccept') === 'true'
  )
  const intervalRef       = useRef(null)
  const autoAdvancingRef  = useRef(new Set())

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toggleAutoAccept = () => {
    setAutoAccept(prev => {
      const next = !prev
      localStorage.setItem('kitchen_autoAccept', String(next))
      return next
    })
  }

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get('/orders')
      setOrders([...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
      setLastRefresh(new Date())
    } catch {
      setError('Failed to load orders. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    intervalRef.current = setInterval(() => fetchOrders(true), 15000)
    return () => clearInterval(intervalRef.current)
  }, [fetchOrders])

  // Auto-accept: whenever orders list updates, advance any pending/received orders to preparing
  useEffect(() => {
    if (!autoAccept) return
    const today = startOfToday()
    const toAdvance = orders.filter(o =>
      ['pending', 'received'].includes(o.orderStatus) &&
      new Date(o.createdAt) >= today &&
      !autoAdvancingRef.current.has(o._id)
    )
    if (toAdvance.length === 0) return

    toAdvance.forEach(o => autoAdvancingRef.current.add(o._id))

    Promise.allSettled(
      toAdvance.map(o => axios.patch(`/orders/${o._id}/status`, { orderStatus: 'preparing' }))
    ).then(results => {
      const updated = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') updated[toAdvance[i]._id] = r.value.data
        else autoAdvancingRef.current.delete(toAdvance[i]._id)
      })
      if (Object.keys(updated).length > 0) {
        setOrders(prev => prev.map(o => updated[o._id] || o))
        showToast(`${Object.keys(updated).length} order(s) auto-accepted`)
      }
    })
  }, [orders, autoAccept])

  const handleAdvance = async (orderId, newStatus) => {
    setAdvancing(prev => ({ ...prev, [orderId]: true }))
    try {
      const { data } = await axios.patch(`/orders/${orderId}/status`, { orderStatus: newStatus })
      setOrders(prev => prev.map(o => o._id === orderId ? data : o))
      showToast(`Order marked as ${STATUS_META[newStatus]?.label || newStatus}`)
    } catch {
      showToast('Failed to update order status', 'error')
    } finally {
      setAdvancing(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleCollected = (collectedOrder) => {
    setOrders(prev => prev.map(o =>
      o._id === collectedOrder._id
        ? { ...o, orderStatus: 'collected', collectedAt: new Date().toISOString() }
        : o
    ))
    showToast('Order collected successfully!')
    setScannerOpen(false)
  }

  const today = startOfToday()
  const todayOrders      = orders.filter(o => new Date(o.createdAt) >= today)
  const pendingOrders    = todayOrders.filter(o => ['pending', 'received'].includes(o.orderStatus))
  const inProgressOrders = todayOrders.filter(o => o.orderStatus === 'preparing')
  const readyOrders      = todayOrders.filter(o => ['ready for pickup', 'ready'].includes(o.orderStatus))
  const collectedToday   = todayOrders.filter(o => ['collected', 'completed'].includes(o.orderStatus))

  const columns = [
    {
      key:        'pending',
      label:      'Pending',
      orders:     pendingOrders,
      dotColor:   'bg-on-surface-variant',
      badgeClass: 'bg-surface-container-high text-on-surface-variant',
      cardBorder: '',
    },
    {
      key:        'preparing',
      label:      'Preparing',
      orders:     inProgressOrders,
      dotColor:   'bg-blue-500',
      badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
      cardBorder: 'border-l-4 border-l-blue-500',
    },
    {
      key:        'ready',
      label:      'Ready for Collection',
      orders:     readyOrders,
      dotColor:   'bg-green-500',
      badgeClass: 'bg-green-100 text-green-700 border border-green-200',
      cardBorder: 'border-l-4 border-l-green-500',
    },
  ]

  return (
    <div className="bg-background text-on-background h-screen flex overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="shrink-0 flex justify-between items-center px-4 md:px-8 py-4 bg-surface border-b border-outline-variant">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-on-background">Live Operations Board</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">Real-time order tracking and fulfillment.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live · {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            {/* Auto-accept toggle */}
            <button
              onClick={toggleAutoAccept}
              title={autoAccept ? 'Auto-Accept ON — click to disable' : 'Auto-Accept OFF — click to enable'}
              className={`flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-lg border transition-colors cursor-pointer
                ${autoAccept
                  ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant hover:bg-surface-container-highest'}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {autoAccept ? 'toggle_on' : 'toggle_off'}
              </span>
              <span className="hidden sm:inline">Auto-Accept</span>
            </button>

            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold text-sm px-4 py-2 rounded-lg border border-outline-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              <span className="hidden sm:inline">Scan Collection QR</span>
            </button>
            <button
              onClick={() => fetchOrders()}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container cursor-pointer text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </header>

        {/* KPI stats bar */}
        <div className="shrink-0 px-4 md:px-8 py-3 border-b border-outline-variant bg-surface">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Today",      value: todayOrders.length,    icon: 'today',         bg: 'bg-primary-fixed' },
              { label: 'Pending',    value: pendingOrders.length,  icon: 'pending',       bg: 'bg-tertiary-fixed' },
              { label: 'Preparing',  value: inProgressOrders.length, icon: 'skillet',     bg: 'bg-secondary-fixed' },
              { label: 'Collected',  value: collectedToday.length, icon: 'check_circle',  bg: 'bg-primary-fixed' },
            ].map(k => (
              <div key={k.label} className="flex items-center gap-2 md:gap-3 bg-surface-container-lowest rounded-xl p-2 md:p-3 border border-outline-variant">
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-primary text-[16px] md:text-[18px]">{k.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs text-on-surface-variant font-bold uppercase tracking-wider leading-none truncate">{k.label}</p>
                  <p className="text-lg md:text-xl font-bold text-primary mt-0.5">{k.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban area */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined animate-spin text-5xl text-primary">refresh</span>
              <p className="text-sm">Loading order queue...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-error gap-3 px-4">
            <span className="material-symbols-outlined text-5xl">error</span>
            <p className="font-semibold text-center">{error}</p>
            <button onClick={() => fetchOrders()} className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold cursor-pointer">Retry</button>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-8 pb-20 md:pb-8 no-scrollbar">
            <div className="flex gap-5 h-full min-w-max">
              {columns.map(col => (
                <section
                  key={col.key}
                  className="flex flex-col w-[320px] md:w-[360px] bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden shrink-0 shadow-sm"
                >
                  {/* Column header */}
                  <div className="p-4 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <h3 className="font-semibold text-on-background text-sm">{col.label}</h3>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${col.badgeClass}`}>
                      {col.orders.length}
                    </span>
                  </div>

                  {/* Order cards */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
                    {col.orders.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-40">inbox</span>
                        <p className="text-sm">No orders here</p>
                      </div>
                    ) : (
                      col.orders.map(order => (
                        <KitchenOrderCard
                          key={order._id}
                          order={order}
                          cardBorder={col.cardBorder}
                          onAdvance={handleAdvance}
                          onOpenScanner={() => setScannerOpen(true)}
                          advancing={!!advancing[order._id]}
                        />
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        <KitchenBottomNav />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-medium text-sm
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.text}
        </div>
      )}

      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCollected={handleCollected}
      />
    </div>
  )
}

// ─── Admin: Order Detail Modal ────────────────────────────────────────────────

function OrderDetailModal({ order, onClose, onStatusChange, onCancel }) {
  const [status, setStatus]   = useState(order.orderStatus)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isDone = ['collected', 'completed', 'cancelled'].includes(order.orderStatus)

  const handleStatusSave = async () => {
    if (status === order.orderStatus) return
    setSaving(true)
    try {
      const { data } = await axios.patch(`/orders/${order._id}/status`, { orderStatus: status })
      onStatusChange(data)
      onClose()
    } catch {}
    finally { setSaving(false) }
  }

  const handleCancel = async () => {
    if (!window.confirm(`Cancel order ${order.orderNumber}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await axios.delete(`/orders/delete/${order._id}`)
      onCancel(order._id)
      onClose()
    } catch {}
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg border border-outline-variant max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="font-bold text-primary text-lg">{order.orderNumber}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{formatDateTime(order.createdAt)}</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shrink-0">
              {(order.user?.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-on-surface">{order.user?.name || '—'}</p>
              <p className="text-xs text-on-surface-variant">{order.user?.email || '—'}</p>
              {order.user?.studentId && <p className="text-xs text-primary font-medium">ID: {order.user.studentId}</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Items Ordered</p>
            <div className="space-y-2">
              {order.items?.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                  <span className="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">{entry.qty}×</span>
                  <span className="text-sm font-medium text-on-surface flex-1">{entry.item?.name || 'Item'}</span>
                  <span className="text-xs text-on-surface-variant capitalize">({entry.servingSize})</span>
                  <span className="text-sm font-bold text-primary">
                    {formatKES((entry.servingSize === 'half' ? entry.item?.halfPrice : entry.item?.fullPrice) * entry.qty || 0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-outline-variant">
              <span className="text-sm font-bold text-on-surface">Total</span>
              <span className="text-lg font-bold text-primary">{formatKES(order.totalAmt)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface-container-low rounded-xl">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-1">Payment Method</p>
              <p className="font-semibold text-on-surface">{order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Wallet'}</p>
            </div>
            <div className="p-3 bg-surface-container-low rounded-xl">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-1">Payment Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase
                ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}>
                {order.paymentStatus}
              </span>
            </div>
            {order.mpesaReceiptNumber && (
              <div className="p-3 bg-surface-container-low rounded-xl col-span-2">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-1">M-Pesa Receipt</p>
                <p className="font-mono text-sm text-primary">{order.mpesaReceiptNumber}</p>
              </div>
            )}
            <div className="p-3 bg-surface-container-low rounded-xl">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-1">Pickup Counter</p>
              <p className="font-semibold text-on-surface">{order.pickupCounter || 'Counter 1'}</p>
            </div>
            {order.qrPin && (
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-1">QR PIN</p>
                <p className="font-mono font-bold text-primary text-lg">{order.qrPin}</p>
              </div>
            )}
          </div>

          {order.qrCode && (
            <div className="flex flex-col items-center gap-2 p-4 bg-surface-container-low rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Order QR Code</p>
              <img src={order.qrCode} alt="QR" className="w-36 h-36 rounded-lg border-4 border-primary/20" />
            </div>
          )}

          {!isDone && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Update Status</p>
              <div className="flex gap-2">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary outline-none"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                  ))}
                </select>
                <button
                  onClick={handleStatusSave}
                  disabled={saving || status === order.orderStatus}
                  className="px-4 h-10 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 cursor-pointer disabled:opacity-40 flex items-center gap-1"
                >
                  {saving ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> : null}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {!isDone && (
          <div className="p-5 border-t border-outline-variant shrink-0">
            <button
              onClick={handleCancel}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-red-300 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
            >
              {deleting ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> : <span className="material-symbols-outlined text-[16px]">cancel</span>}
              Cancel Order
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Admin View ───────────────────────────────────────────────────────────────

function AdminView() {
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFilter, setDateFilter]       = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [page, setPage]             = useState(1)
  const [exporting, setExporting]   = useState(false)
  const PAGE_SIZE = 20

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get('/orders')
      setOrders([...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const today = startOfToday()
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)

  const filtered = orders.filter(o => {
    const createdAt = new Date(o.createdAt)
    if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false
    if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false
    if (dateFilter === 'today' && createdAt < today) return false
    if (dateFilter === 'week'  && createdAt < weekAgo) return false
    if (search) {
      const q = search.toLowerCase()
      if (!o.orderNumber?.toLowerCase().includes(q) && !o.user?.name?.toLowerCase().includes(q) && !o.user?.email?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, statusFilter, paymentFilter, dateFilter])

  const todayOrders  = orders.filter(o => new Date(o.createdAt) >= today)
  const paidOrders   = orders.filter(o => o.paymentStatus === 'paid')
  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmt, 0)
  const todayRevenue = todayOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmt, 0)
  const activeCount  = orders.filter(o => ['pending','received','preparing','ready for pickup','ready'].includes(o.orderStatus)).length

  const handleExport = async () => {
    setExporting(true)
    try {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14); doc.setTextColor(0, 25, 60)
      doc.text('Strathmore Cafeteria — Orders Report', 14, 15)
      doc.setFontSize(9); doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleString('en-GB')}  |  Filters: status=${statusFilter}, payment=${paymentFilter}, date=${dateFilter}`, 14, 22)
      autoTable(doc, {
        startY: 28,
        head: [['Order #', 'Customer', 'Email', 'Items', 'Amount (KES)', 'Payment', 'Pay Status', 'Order Status', 'Date']],
        body: filtered.map(o => [
          o.orderNumber || '—', o.user?.name || '—', o.user?.email || '—',
          o.items?.map(i => `${i.qty}× ${i.item?.name || 'Item'} (${i.servingSize})`).join(', ') || '—',
          (o.totalAmt || 0).toLocaleString(), o.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Wallet',
          o.paymentStatus || '—', STATUS_META[o.orderStatus]?.label || o.orderStatus,
          new Date(o.createdAt).toLocaleString('en-GB'),
        ]),
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [0, 25, 60], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
      })
      doc.save(`orders-report-${new Date().toISOString().slice(0,10)}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  const handleStatusChange = (updated) => {
    setOrders(prev => prev.map(o => o._id === updated._id ? updated : o))
    if (selectedOrder?._id === updated._id) setSelectedOrder(updated)
  }

  const handleCancel = (orderId) => {
    setOrders(prev => prev.filter(o => o._id !== orderId))
    setSelectedOrder(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue',   value: formatKES(totalRevenue), icon: 'payments',        bg: 'bg-primary-fixed' },
          { label: "Today's Revenue", value: formatKES(todayRevenue), icon: 'today',            bg: 'bg-tertiary-fixed' },
          { label: 'Total Orders',    value: orders.length,           icon: 'receipt_long',    bg: 'bg-secondary-fixed' },
          { label: 'Active Now',      value: activeCount,             icon: 'pending_actions', bg: 'bg-primary-fixed' },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-primary text-[20px]">{k.icon}</span>
            </div>
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">{k.label}</p>
            <p className="text-2xl font-bold text-primary mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, customer name or email..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
          />
        </div>
        <select value={statusFilter}  onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
        </select>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="all">All Payments</option>
          <option value="mpesa">M-Pesa</option>
          <option value="wallet">Wallet</option>
        </select>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
        </select>
        <button onClick={handleExport} disabled={exporting || filtered.length === 0}
          className="flex items-center gap-2 px-4 h-10 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 cursor-pointer disabled:opacity-40 shrink-0">
          {exporting ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> : <span className="material-symbols-outlined text-[16px]">download</span>}
          <span className="hidden md:inline">Export PDF</span>
        </button>
        <button onClick={fetchOrders}
          className="flex items-center gap-2 px-4 h-10 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container cursor-pointer shrink-0">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      <p className="text-sm text-on-surface-variant">
        Showing <span className="font-bold text-on-surface">{filtered.length}</span> order{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== orders.length && ` (filtered from ${orders.length} total)`}
      </p>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-3xl mr-3">refresh</span>
            Loading orders...
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center py-12 text-error gap-3">
            <span className="material-symbols-outlined text-4xl">error</span>
            <p className="font-semibold">{error}</p>
            <button onClick={fetchOrders} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold cursor-pointer">Retry</button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-on-surface-variant gap-3">
            <span className="material-symbols-outlined text-5xl">receipt_long</span>
            <p className="font-semibold">No orders match your filters</p>
          </div>
        )}
        {!loading && !error && paginated.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    {['Order #', 'Customer', 'Items', 'Amount', 'Payment', 'Status', 'Date', ''].map(h => (
                      <th key={h} className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginated.map(order => (
                    <tr key={order._id} className="hover:bg-surface-container-low/50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      <td className="p-4 font-bold text-primary text-sm whitespace-nowrap">{order.orderNumber}</td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-on-surface">{order.user?.name || '—'}</p>
                        <p className="text-xs text-on-surface-variant">{order.user?.email || '—'}</p>
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant max-w-[200px]">
                        <span className="block truncate">{order.items?.map(i => `${i.qty}× ${i.item?.name || 'Item'}`).join(', ') || '—'}</span>
                      </td>
                      <td className="p-4 font-bold text-primary text-sm whitespace-nowrap">{formatKES(order.totalAmt)}</td>
                      <td className="p-4">
                        <p className="text-xs font-bold uppercase text-on-surface-variant">{order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Wallet'}</p>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase
                          ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4"><StatusBadge status={order.orderStatus} /></td>
                      <td className="p-4 text-xs text-on-surface-variant whitespace-nowrap">{relativeTime(order.createdAt)}</td>
                      <td className="p-4">
                        <button className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-primary transition-colors cursor-pointer">
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-outline-variant">
              {paginated.map(order => (
                <div key={order._id} className="p-4 flex items-center gap-3 cursor-pointer active:bg-surface-container-low" onClick={() => setSelectedOrder(order)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-primary text-sm">{order.orderNumber}</span>
                      <StatusBadge status={order.orderStatus} />
                    </div>
                    <p className="text-sm text-on-surface mt-0.5 truncate">{order.user?.name || order.user?.email || '—'}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                      {order.items?.map(i => `${i.qty}× ${i.item?.name || 'Item'}`).join(', ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-primary">{formatKES(order.totalAmt)}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{relativeTime(order.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
                <span className="text-xs text-on-surface-variant">Page {page} of {totalPages} · {filtered.length} orders</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="p-1.5 rounded border border-outline-variant hover:bg-surface-container cursor-pointer disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = totalPages <= 5 ? i+1 : Math.max(1, Math.min(page-2+i, totalPages-4+i))
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded text-sm font-bold cursor-pointer
                          ${p === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                    className="p-1.5 rounded border border-outline-variant hover:bg-surface-container cursor-pointer disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return <KitchenPage />
  }

  return (
    <div className="bg-background text-on-background min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="md:ml-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-surface border-b border-outline-variant shrink-0">
          <h2 className="text-headline-sm font-bold text-primary">Strathmore Dining</h2>
          <span className="hidden md:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            Admin
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary">Order Management</h1>
              <p className="text-sm text-on-surface-variant mt-1">
                View, filter, and manage all customer orders. Click any row to see full details.
              </p>
            </div>
            <AdminView />
          </div>
        </div>

        <KitchenBottomNav />
      </div>
    </div>
  )
}
