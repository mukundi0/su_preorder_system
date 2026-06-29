import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import SU_LOGO from '../assets/sulogo.png'
import StudentBottomNav from '../components/StudentBottomNav'

const PRESET_AMOUNTS = [200, 500, 1000]

function formatCurrency(value) {
  return `KES ${(Number(value) || 0).toLocaleString()}`
}

function formatTxDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`
  return `${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}, ${time}`
}

export default function WalletPage() {
  const navigate = useNavigate()
  const [balance, setBalance]           = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [selectedPreset, setSelectedPreset] = useState(500)
  const [customAmount, setCustomAmount] = useState('')
  const [phone, setPhone]               = useState('')
  const [isTopping, setIsTopping]       = useState(false)
  const [awaitingMpesa, setAwaitingMpesa] = useState(false)
  const [topUpMsg, setTopUpMsg]         = useState({ type: '', text: '' })

  const pollingRef = useRef(null)

  const fetchWallet = useCallback(async () => {
    try {
      const { data } = await axios.get('/wallet')
      setBalance(data.balance)
      setTransactions(data.transactions)
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load wallet')
    } finally {
      setLoading(false)
    }
  }, [])

  const startBackgroundRefresh = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(fetchWallet, 15000)
  }, [fetchWallet])

  const stopBackgroundRefresh = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    fetchWallet()
    startBackgroundRefresh()
    return () => stopBackgroundRefresh()
  }, [fetchWallet, startBackgroundRefresh, stopBackgroundRefresh])

  const activeAmount = customAmount ? Number(customAmount) : selectedPreset

  // Poll the wallet balance every 3 s until M-Pesa callback has credited it
  function pollUntilCredited(expectedIncrease) {
    stopBackgroundRefresh()
    setAwaitingMpesa(true)
    setTopUpMsg({ type: 'info', text: 'Check your phone — enter your M-Pesa PIN to complete the top-up.' })

    const snapshotBalance = balance
    const mpesaInterval = setInterval(async () => {
      try {
        const { data } = await axios.get('/wallet')
        if (data.balance > snapshotBalance) {
          clearInterval(mpesaInterval)
          clearTimeout(timeoutId)
          setBalance(data.balance)
          setTransactions(data.transactions)
          setAwaitingMpesa(false)
          setTopUpMsg({ type: 'success', text: `${formatCurrency(expectedIncrease)} added to your wallet!` })
          setCustomAmount('')
          startBackgroundRefresh()
        }
      } catch {
        // network blip — keep polling
      }
    }, 3000)

    // Give up after 2 minutes
    const timeoutId = setTimeout(() => {
      clearInterval(mpesaInterval)
      setAwaitingMpesa(false)
      setTopUpMsg((prev) =>
        prev.type !== 'success'
          ? { type: 'error', text: 'Payment timed out. Check if the top-up went through before retrying.' }
          : prev
      )
      startBackgroundRefresh()
    }, 120_000)
  }

  const handleTopUp = async () => {
    if (!activeAmount || activeAmount <= 0) {
      setTopUpMsg({ type: 'error', text: 'Enter a valid amount' })
      return
    }
    if (!phone.trim()) {
      setTopUpMsg({ type: 'error', text: 'Enter your M-Pesa phone number' })
      return
    }
    setIsTopping(true)
    setTopUpMsg({ type: '', text: '' })
    try {
      await axios.post('/mpesa/topup', { amount: activeAmount, phone: phone.trim() })
      pollUntilCredited(activeAmount)
    } catch (e) {
      setTopUpMsg({ type: 'error', text: e?.response?.data?.error || 'Top up failed. Try again.' })
    } finally {
      setIsTopping(false)
    }
  }

  const [showStatement, setShowStatement] = useState(false)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthlyTopUp = transactions
    .filter(tx => tx.type === 'credit' && new Date(tx.createdAt) >= monthStart)
    .reduce((sum, tx) => sum + tx.amount, 0)
  const monthlySpend = transactions
    .filter(tx => tx.type === 'debit' && new Date(tx.createdAt) >= monthStart)
    .reduce((sum, tx) => sum + tx.amount, 0)

  const groupedTransactions = transactions.reduce((groups, tx) => {
    const d = new Date(tx.createdAt)
    const label = d.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(tx)
    return groups
  }, {})

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-error">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body pb-24 md:pb-0">

      <main className="max-w-7xl mx-auto px-4 md:px-12 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">

            {/* Balance Card */}
            <section
              className="rounded-xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl"
              style={{ background: 'linear-gradient(135deg, #00193c 0%, #002d62 100%)' }}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Available Balance</p>
                    {loading ? (
                      <div className="h-12 w-48 bg-white/10 rounded-lg animate-pulse mt-1" />
                    ) : (
                      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-1">
                        {formatCurrency(balance)}
                      </h1>
                    )}
                  </div>
                  <span
                    className="material-symbols-outlined text-4xl opacity-40"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    account_balance_wallet
                  </span>
                </div>
                <div className="mt-8 md:mt-12 flex gap-3 flex-wrap">
                  <button
                    onClick={() => document.getElementById('top-up-card')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-white text-primary px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all cursor-pointer border-none text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span> Top Up
                  </button>
                  <button onClick={() => setShowStatement(true)} className="bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 active:scale-95 transition-all cursor-pointer text-sm">
                    <span className="material-symbols-outlined text-[18px]">history</span> Statement
                  </button>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            </section>

            {/* Recent Activity */}
            <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-primary">Recent Activity</h2>
                <button onClick={() => setShowStatement(true)} className="text-primary font-semibold text-sm hover:underline bg-transparent border-none cursor-pointer">View All</button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <div className="w-12 h-12 rounded-full bg-surface-container animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface-container rounded w-1/2 animate-pulse" />
                        <div className="h-3 bg-surface-container rounded w-1/3 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl block mb-2">receipt_long</span>
                  No transactions yet. Top up to get started.
                </div>
              ) : (
                <div className="space-y-1">
                  {transactions.map(tx => (
                    <div key={tx._id} className="flex items-center justify-between p-4 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                          tx.type === 'credit'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary-container/10 text-secondary'
                        }`}>
                          <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 0" }}
                          >
                            {tx.type === 'credit' ? 'payments' : 'restaurant'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface group-hover:text-primary transition-colors text-sm truncate">
                            {tx.description}
                          </p>
                          <p className="text-on-surface-variant text-xs mt-0.5">{formatTxDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className={`font-bold text-sm ${tx.type === 'credit' ? 'text-primary' : 'text-secondary'}`}>
                          {tx.type === 'credit' ? '+' : '−'} {formatCurrency(tx.amount)}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside id="top-up-card" className="lg:col-span-4 space-y-6">

            {/* Quick Top Up */}
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant">
              <h3 className="text-lg font-bold text-primary mb-5">Quick Top Up</h3>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {PRESET_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setSelectedPreset(amt); setCustomAmount('') }}
                    className={`py-3 rounded-lg font-bold text-primary transition-all active:scale-95 cursor-pointer border-2 text-sm ${
                      selectedPreset === amt && !customAmount
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">KES</span>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={e => { setCustomAmount(e.target.value); setSelectedPreset(null) }}
                    placeholder="Custom Amount"
                    className="w-full pl-14 pr-4 py-3 rounded-lg border-2 border-outline-variant focus:border-primary outline-none transition-all font-bold text-primary bg-surface text-sm"
                  />
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="M-Pesa number e.g. 0712345678"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-outline-variant focus:border-primary outline-none transition-all text-primary bg-surface text-sm"
                  />
                </div>

                {topUpMsg.text && (
                  <p className={`text-xs font-medium ${
                    topUpMsg.type === 'success' ? 'text-[#28A745]'
                    : topUpMsg.type === 'info'  ? 'text-primary'
                    : 'text-error'
                  }`}>
                    {topUpMsg.text}
                  </p>
                )}

                <button
                  onClick={handleTopUp}
                  disabled={isTopping || awaitingMpesa || !activeAmount || activeAmount <= 0}
                  className="w-full py-3.5 bg-primary text-on-primary rounded-lg font-bold shadow-md hover:bg-primary-container transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {awaitingMpesa ? 'Waiting for M-Pesa…' : isTopping ? 'Processing…' : 'Proceed to Pay'}
                </button>
              </div>
            </div>

            {/* M-Pesa Express */}
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant border-l-4 border-l-[#49b249]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#49b249] rounded flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-xs">M</span>
                </div>
                <div>
                  <h3 className="font-bold text-primary text-sm">M-Pesa Express</h3>
                  <p className="text-xs text-on-surface-variant">Instant top up to wallet</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant mb-5">
                An STK push will be sent to your registered M-Pesa number.
              </p>
              <button
                onClick={handleTopUp}
                disabled={isTopping || awaitingMpesa || !activeAmount || activeAmount <= 0}
                className="w-full py-3 bg-[#49b249] text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                {awaitingMpesa ? 'Waiting for M-Pesa…' : `Top Up ${activeAmount > 0 ? formatCurrency(activeAmount) : ''} Now`}
              </button>
            </div>

            {/* Student Perk — only show once user has topped up this month */}
            {monthlyTopUp > 0 && (
              <div className="bg-tertiary-fixed rounded-xl p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-bold mb-2 text-on-tertiary-fixed">Student Perk!</h4>
                  <p className="text-sm text-on-tertiary-fixed-variant">
                    You've added <span className="font-bold">{formatCurrency(monthlyTopUp)}</span> to your wallet this month using Strathmore Dine.
                  </p>
                </div>
                <span
                  className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-black/5 rotate-12 pointer-events-none"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  redeem
                </span>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Statement Drawer */}
      {showStatement && (
        <div className="fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowStatement(false)} />

          {/* Panel — slides in from the right on md+, full screen on mobile */}
          <div className="w-full md:w-[480px] bg-surface flex flex-col h-full shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h2 className="text-lg font-bold text-primary">Account Statement</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">All wallet activity</p>
              </div>
              <button
                onClick={() => setShowStatement(false)}
                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-px bg-outline-variant shrink-0">
              <div className="bg-surface px-4 py-4 text-center">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Balance</p>
                <p className="font-bold text-primary text-sm">{formatCurrency(balance)}</p>
              </div>
              <div className="bg-surface px-4 py-4 text-center">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">In (this month)</p>
                <p className="font-bold text-[#28A745] text-sm">+{formatCurrency(monthlyTopUp)}</p>
              </div>
              <div className="bg-surface px-4 py-4 text-center">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Spent (this month)</p>
                <p className="font-bold text-secondary text-sm">−{formatCurrency(monthlySpend)}</p>
              </div>
            </div>

            {/* Transaction list */}
            <div className="flex-1 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-3">
                  <span className="material-symbols-outlined text-5xl">receipt_long</span>
                  <p className="text-sm">No transactions yet.</p>
                </div>
              ) : (
                Object.entries(groupedTransactions).map(([month, txs]) => (
                  <div key={month}>
                    <div className="px-6 py-2 bg-surface-container-low sticky top-0">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{month}</p>
                    </div>
                    <div className="divide-y divide-outline-variant">
                      {txs.map(tx => (
                        <div key={tx._id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low transition-colors">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === 'credit' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                          }`}>
                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                              {tx.type === 'credit' ? 'payments' : 'restaurant'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{tx.description}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{formatTxDate(tx.createdAt)}</p>
                            {tx.reference && (
                              <p className="text-[10px] text-on-surface-variant/60 mt-0.5 font-mono truncate">Ref: {tx.reference}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-bold text-sm ${tx.type === 'credit' ? 'text-[#28A745]' : 'text-secondary'}`}>
                              {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
                            </p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              tx.status === 'completed' ? 'bg-green-100 text-green-700'
                              : tx.status === 'pending'  ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <StudentBottomNav active="wallet" />
    </div>
  )
}
