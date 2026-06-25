import axios from 'axios'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import StudentBottomNav from '../components/StudentBottomNav'


function formatCurrency(value) {
  return `KES ${(Number(value) || 0).toLocaleString()}`
}

function toPayloadItems(cartItems) {
  return cartItems.map((entry) => ({
    item: entry.item._id,
    qty: entry.qty,
    servingSize: entry.servingSize,
  }))
}

export default function Checkout() {
  const navigate = useNavigate()

  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [awaitingMpesa, setAwaitingMpesa] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [paymentResult, setPaymentResult] = useState(null) // 'success' | 'failed' | null
  const [resultOrderId, setResultOrderId] = useState(null)
  const [showTopUpLink, setShowTopUpLink] = useState(false)

  useEffect(() => {
    axios.get('/wallet').then(({ data }) => setWalletBalance(data.balance)).catch(() => {})
  }, [])

  const { user, loading } = useAuth()

  const {
    cart,
    cartTotals,
    updateCartItemQty,
    clearCart,
    getCartItemUnitPrice
  } = useCart()

  const total = cartTotals.total
  const isCheckoutEmpty = cart.length === 0
  const canConfirm = !isCheckoutEmpty && !isProcessing && !awaitingMpesa && !!user?._id

  const statusMessage = successMessage || requestError || (!loading && !user?._id
    ? 'Sign in is required to place an order.'
    : '')

  const statusClass = successMessage
    ? 'text-green-600'
    : requestError
      ? 'text-error'
      : 'text-on-surface-variant'

  function showSuccess(orderId) {
    clearCart()
    setResultOrderId(orderId)
    setPaymentResult('success')
    setTimeout(() => navigate(`/orders/${orderId}/track`), 3000)
  }

  function showFailed() {
    setPaymentResult('failed')
    setAwaitingMpesa(false)
  }

  // Poll the order every 3 seconds until M-Pesa callback has updated its status
  function pollOrderUntilPaid(orderId) {
    setAwaitingMpesa(true)
    setSuccessMessage('Check your phone — enter your M-Pesa PIN to complete payment.')

    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`/orders/${orderId}`)

        if (data.paymentStatus === 'paid') {
          clearInterval(interval)
          showSuccess(orderId)
        } else if (data.paymentStatus === 'failed' || data.orderStatus === 'cancelled') {
          clearInterval(interval)
          setSuccessMessage('')
          showFailed()
        }
      } catch {
        // network blip — keep polling
      }
    }, 3000)

    // Give up after 2 minutes (Safaricom STK push times out at 60 s)
    setTimeout(() => {
      clearInterval(interval)
      setSuccessMessage('')
      showFailed()
    }, 120_000)
  }

  const handleConfirmPay = async () => {
    if (!user?._id) {
      setRequestError('Sign in is required to place an order.')
      return
    }
    if (isCheckoutEmpty) {
      setRequestError('Your cart is empty.')
      return
    }
    if (paymentMethod === 'mpesa' && !mpesaPhone.trim()) {
      setRequestError('Enter your M-Pesa phone number.')
      return
    }
    if (paymentMethod === 'wallet') {
      if (walletBalance <= 0) {
        setRequestError('Your wallet balance is empty. Top up before paying.')
        setShowTopUpLink(true)
        return
      }
      if (walletBalance < total) {
        const shortfall = total - walletBalance
        setRequestError(
          `Insufficient wallet balance. You need ${formatCurrency(shortfall)} more to complete this order.`
        )
        setShowTopUpLink(true)
        return
      }
    }

    setRequestError('')
    setSuccessMessage('')
    setShowTopUpLink(false)
    setIsProcessing(true)

    try {
      // Step 1: Create the order (pending for M-Pesa, received for wallet)
      const { data: order } = await axios.post('/orders/create', {
        userId: user._id,
        items:  toPayloadItems(cart),
        paymentMethod,
      })
      if (order?.error) throw new Error(order.error)

      if (paymentMethod === 'wallet') {
        setIsProcessing(false)
        showSuccess(order._id)
        return
      }

      // Step 2 (M-Pesa only): trigger the STK push to the customer's phone
      const { data: mpesa } = await axios.post('/mpesa/pay-order', {
        orderId: order._id,
        phone:   mpesaPhone.trim(),
      })
      if (mpesa?.error) throw new Error(mpesa.error)

      // Step 3: poll until Safaricom's callback updates the order
      setIsProcessing(false)
      pollOrderUntilPaid(order._id)

    } catch (error) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to place order. Please try again.'
      setRequestError(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-lg antialiased pb-24 md:pb-0 flex flex-col">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-12 h-16 bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <button
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-primary hover:bg-surface-container-low rounded-full transition-colors bg-transparent cursor-pointer"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              arrow_back
            </span>
          </button>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2aevf5wWlfiirx24PRQ7bs5VGXrJRa27oBtx2rbJ0gubmAmeSGRuVWsmjC6XO5SoshDww0uJ5bOhkvjisTwqfPtYsz0fzRId2SW6BwaUJT_imfvHlxokH7_GY6DnQXzmkW0ISPPAvg9lVzUfXyWL-nRB63v4V2lrpkyePqjh2Q7dLjhv0wfhmy_jF_PDB_meE6StPZCfJve4bIrEJZxOnNrv-n6GrfZ2KWBXlt77PemkbbJ4ODTxDvayVwfrUOgcgRrRTcXaAw-jQ"
            alt="Strathmore University Logo"
            className="h-8 w-auto object-contain mr-2"
          />
          <h1 className="text-headline-sm font-headline-sm font-bold text-primary">Checkout</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-8 px-4 py-6 md:max-w-2xl md:mx-auto w-full">
        <section className="flex flex-col gap-4">
          <h2 className="text-headline-sm font-headline-sm text-on-background">Order Summary</h2>
          <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
            {isCheckoutEmpty ? (
              <div className="p-6 text-center text-on-surface-variant">Your cart is empty.</div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.item._id}
                  className="p-4 flex items-start gap-4 border-b border-border-subtle last:border-b-0"
                >
                  <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden shrink-0">
                    {item.item.imageUrl ? (
                      <img
                        src={item.item.imageUrl}
                        alt={item.item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined">restaurant</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-body-md font-body-md font-bold">{item.item.name}</h3>
                        {(item.item.description || item.servingSize) && (
                          <p className="text-label-md font-label-md text-on-surface-variant mt-1">
                            {item.item.description || `${item.servingSize} serving`}
                          </p>
                        )}
                      </div>
                      <span className="text-price-display font-price-display">
                        {formatCurrency(getCartItemUnitPrice(item) * item.qty)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => updateCartItemQty(item.item._id, -1, item.servingSize)}
                        className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors bg-transparent cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="text-body-md font-body-md font-bold">{item.qty}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() => updateCartItemQty(item.item._id, 1, item.servingSize)}
                        className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors bg-transparent cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-primary font-body-md text-body-md hover:opacity-80 self-start transition-opacity bg-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add more items
          </button>
        </section>

        <section>
          <div className="bg-primary text-on-primary rounded-xl p-4 flex justify-between items-center relative overflow-hidden shadow-sm">
            <div className="absolute right-0 top-0 w-32 h-32 bg-on-primary opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none" />
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-on-primary opacity-5 rounded-full mr-4 -mb-10 pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
              </div>
              <div>
                <p className="text-label-md font-label-md opacity-80 uppercase tracking-wider">
                  Wallet Balance
                </p>
                <p className="text-headline-sm font-headline-sm font-bold mt-1">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/wallet')} className="relative z-10 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full text-label-md font-label-md font-bold hover:bg-secondary-fixed transition-colors shadow-sm bg-transparent cursor-pointer">
              Top Up
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-headline-sm font-headline-sm text-on-background">Payment Method</h2>
          <div className="flex flex-col gap-3">
            <label
              className={`relative flex items-center p-4 rounded-xl cursor-pointer bg-white transition-all hover:bg-surface-container-low ${
                paymentMethod === 'mpesa'
                  ? 'border-2 border-primary'
                  : 'border border-border-subtle'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="mpesa"
                checked={paymentMethod === 'mpesa'}
                onChange={() => { setPaymentMethod('mpesa'); setRequestError(''); setShowTopUpLink(false) }}
                className="peer sr-only"
              />
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                  paymentMethod === 'mpesa'
                    ? 'border-primary bg-primary'
                    : 'border-border-subtle'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full bg-white ${
                    paymentMethod === 'mpesa' ? 'block' : 'hidden'
                  }`}
                />
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#49B249] rounded flex items-center justify-center text-white font-bold text-xs">
                    M
                  </div>
                  <div>
                    <span className="block text-body-md font-body-md font-bold">M-Pesa</span>
                    <span className="block text-label-md font-label-md text-on-surface-variant mt-0.5">
                      Pay via STK Push
                    </span>
                  </div>
                </div>
                {paymentMethod === 'mpesa' && (
                  <input
                    type="tel"
                    placeholder="Phone number e.g. 0712345678"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    onClick={(e) => e.stopPropagation()} // prevent radio toggle
                    className="w-full border border-border-subtle rounded-lg px-3 py-2 text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
                  />
                )}
              </div>
            </label>

            <label
              className={`relative flex items-center p-4 rounded-xl cursor-pointer bg-white transition-all hover:bg-surface-container-low ${
                paymentMethod === 'wallet'
                  ? 'border-2 border-primary'
                  : 'border border-border-subtle'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={() => { setPaymentMethod('wallet'); setRequestError(''); setShowTopUpLink(false) }}
                className="peer sr-only"
              />
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                  paymentMethod === 'wallet'
                    ? 'border-primary bg-primary'
                    : 'border-border-subtle'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full bg-white ${
                    paymentMethod === 'wallet' ? 'block' : 'hidden'
                  }`}
                />
              </div>
              <div className="flex-1 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                  <div>
                    <span className="block text-body-md font-body-md font-bold">Digital Wallet</span>
                    <span className={`block text-label-md font-label-md mt-0.5 ${
                      paymentMethod === 'wallet' && walletBalance < total
                        ? 'text-error font-semibold'
                        : 'text-on-surface-variant'
                    }`}>
                      Balance: {formatCurrency(walletBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </section>

        <div className="mt-8 mb-4 hidden md:block">
          <div className="flex justify-between items-center mb-6">
            <span className="text-headline-sm font-headline-sm text-on-background">
              Total to Pay
            </span>
            <span className="text-display-lg font-display-lg text-primary">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            onClick={handleConfirmPay}
            disabled={!canConfirm}
            className="w-full bg-primary text-on-primary py-4 rounded-xl text-headline-sm font-headline-sm font-bold hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {awaitingMpesa ? 'Waiting for M-Pesa...' : isProcessing ? 'Processing...' : 'Confirm & Pay'}
          </button>
          {statusMessage && (
            <div className={`text-sm mt-3 ${statusClass}`}>
              {statusMessage}
              {showTopUpLink && (
                <button
                  onClick={() => navigate('/wallet')}
                  className="ml-2 underline font-semibold text-primary bg-transparent border-none cursor-pointer p-0"
                >
                  Top Up Now
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-border-subtle p-4 pb-[calc(1rem+env(safe-area-inset-bottom,1rem))] z-40 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-body-lg font-body-lg font-bold text-on-background">Total</span>
          <span className="text-headline-sm font-headline-sm font-bold text-primary">
            {formatCurrency(total)}
          </span>
        </div>
        <button
          onClick={handleConfirmPay}
          disabled={!canConfirm}
          className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-body-lg font-body-lg font-bold hover:opacity-90 transition-opacity active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {awaitingMpesa ? 'Waiting for M-Pesa...' : isProcessing ? 'Processing...' : 'Confirm & Pay'}
          {!isProcessing && !awaitingMpesa && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
        </button>
        {statusMessage && (
          <div className={`text-xs mt-2 text-center ${statusClass}`}>
            {statusMessage}
            {showTopUpLink && (
              <button
                onClick={() => navigate('/wallet')}
                className="ml-1 underline font-semibold text-primary bg-transparent border-none cursor-pointer p-0"
              >
                Top Up Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* Payment Result Overlay */}
      {paymentResult && (
        <>
          <style>{`
            @keyframes drawCircle {
              to { stroke-dashoffset: 0; }
            }
            @keyframes drawCheck {
              to { stroke-dashoffset: 0; }
            }
            @keyframes drawX {
              to { stroke-dashoffset: 0; }
            }
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes shrinkBar {
              from { width: 100%; }
              to   { width: 0%; }
            }
            @keyframes popIn {
              0%   { transform: scale(0.5); opacity: 0; }
              70%  { transform: scale(1.1); }
              100% { transform: scale(1);   opacity: 1; }
            }
          `}</style>

          <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6"
            style={{ background: paymentResult === 'success' ? '#f0fdf4' : '#fff1f2' }}
          >
            {paymentResult === 'success' ? (
              <>
                {/* Animated checkmark */}
                <div style={{ animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="#dcfce7" />
                    <circle
                      cx="60" cy="60" r="54"
                      fill="none" stroke="#16a34a" strokeWidth="6"
                      strokeDasharray="339" strokeDashoffset="339"
                      style={{ animation: 'drawCircle 0.6s ease forwards 0.3s' }}
                    />
                    <polyline
                      points="36,62 52,78 84,42"
                      fill="none" stroke="#16a34a" strokeWidth="7"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="90" strokeDashoffset="90"
                      style={{ animation: 'drawCheck 0.4s ease forwards 0.9s' }}
                    />
                  </svg>
                </div>

                <div style={{ animation: 'fadeSlideUp 0.5s ease forwards 1s', opacity: 0 }}
                  className="text-center mt-6"
                >
                  <h2 className="text-2xl font-bold text-green-700">Payment Successful!</h2>
                  <p className="text-green-600 mt-2 text-sm">Your order has been received by the kitchen.</p>
                  <p className="text-green-500 text-xs mt-4">Redirecting to your order…</p>
                </div>

                {/* Countdown bar */}
                <div className="mt-6 w-48 h-1 bg-green-100 rounded-full overflow-hidden"
                  style={{ animation: 'fadeSlideUp 0.5s ease forwards 1s', opacity: 0 }}
                >
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ animation: 'shrinkBar 3s linear forwards 1.2s' }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Animated X */}
                <div style={{ animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="#fee2e2" />
                    <circle
                      cx="60" cy="60" r="54"
                      fill="none" stroke="#dc2626" strokeWidth="6"
                      strokeDasharray="339" strokeDashoffset="339"
                      style={{ animation: 'drawCircle 0.6s ease forwards 0.3s' }}
                    />
                    <line
                      x1="40" y1="40" x2="80" y2="80"
                      stroke="#dc2626" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray="57" strokeDashoffset="57"
                      style={{ animation: 'drawX 0.3s ease forwards 0.9s' }}
                    />
                    <line
                      x1="80" y1="40" x2="40" y2="80"
                      stroke="#dc2626" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray="57" strokeDashoffset="57"
                      style={{ animation: 'drawX 0.3s ease forwards 1.1s' }}
                    />
                  </svg>
                </div>

                <div style={{ animation: 'fadeSlideUp 0.5s ease forwards 0.8s', opacity: 0 }}
                  className="text-center mt-6"
                >
                  <h2 className="text-2xl font-bold text-red-700">Payment Failed</h2>
                  <p className="text-red-500 mt-2 text-sm">The payment was cancelled or did not go through.</p>
                </div>

                <button
                  onClick={() => setPaymentResult(null)}
                  style={{ animation: 'fadeSlideUp 0.5s ease forwards 1.2s', opacity: 0 }}
                  className="mt-8 px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors cursor-pointer border-none"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </>
      )}
      <StudentBottomNav active="orders" />
    </div>
  )
}