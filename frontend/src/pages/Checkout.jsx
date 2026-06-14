import axios from 'axios'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'


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
  const [isProcessing, setIsProcessing] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)

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

  // Keep frontend totals aligned with backend createOrder logic (sum of item prices).
  const total = cartTotals.total
  const isCheckoutEmpty = cart.length === 0
  const canConfirm = !isCheckoutEmpty && !isProcessing && !!user?._id

  const statusMessage = successMessage || requestError || (!loading && !user?._id
    ? 'Sign in is required to place an order.'
    : '')

  const statusClass = successMessage
    ? 'text-green-600'
    : requestError
      ? 'text-error'
      : 'text-on-surface-variant'

  const handleConfirmPay = async () => {
    if (!user?._id) {
      setRequestError('Sign in is required to place an order.')
      return
    }

    if (isCheckoutEmpty) {
      setRequestError('Your cart is empty.')
      return
    }

    setRequestError('')
    setSuccessMessage('')
    setIsProcessing(true)

    try {
      const payload = {
        userId: user._id,
        items: toPayloadItems(cart),
        paymentMethod,
      }

      const { data } = await axios.post('/orders/create', payload)
      if (data?.error) throw new Error(data.error)

      clearCart()
      navigate(`/orders/${data._id}/track`)
    } catch (error) {
      setRequestError(error?.message || 'Failed to place order. Please try again.')
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
            <button className="relative z-10 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full text-label-md font-label-md font-bold hover:bg-secondary-fixed transition-colors shadow-sm bg-transparent cursor-pointer">
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
                onChange={() => setPaymentMethod('mpesa')}
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
              <div className="flex-1 flex justify-between items-center">
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
                onChange={() => setPaymentMethod('wallet')}
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
                    <span className="block text-label-md font-label-md text-on-surface-variant mt-0.5">
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
            {isProcessing ? 'Processing...' : 'Confirm & Pay'}
          </button>
          {statusMessage && <p className={`text-sm mt-3 ${statusClass}`}>{statusMessage}</p>}
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
          {isProcessing ? 'Processing...' : 'Confirm & Pay'}
          {!isProcessing && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
        </button>
        {statusMessage && <p className={`text-xs mt-2 text-center ${statusClass}`}>{statusMessage}</p>}
      </div>
    </div>
  )
}