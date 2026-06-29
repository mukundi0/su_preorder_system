import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StudentBottomNav from '../components/StudentBottomNav'

function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-tertiary-fixed-dim text-on-tertiary',
  'bg-primary-container text-on-primary-container',
]

function avatarColor(name) {
  const code = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function roleLabel(role) {
  return { admin: 'Admin', kitchen_staff: 'Kitchen Staff', student: 'Student', student_staff: 'Student Staff' }[role] || role
}

function roleBadgeColor(role) {
  return {
    admin:         'bg-primary text-on-primary',
    kitchen_staff: 'bg-secondary text-on-secondary',
    student:       'bg-surface-container-high text-on-surface-variant',
    student_staff: 'bg-surface-container-high text-on-surface-variant',
  }[role] || 'bg-surface-container text-on-surface-variant'
}

function Alert({ msg, onDismiss }) {
  if (!msg) return null
  const isError = msg.type === 'error'
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm font-medium
      ${isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
        {isError ? 'error' : 'check_circle'}
      </span>
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="ml-auto opacity-60 hover:opacity-100 bg-transparent border-none cursor-pointer">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  )
}

const STATUS_META = {
  pending:          { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-400',  icon: 'schedule' },
  received:         { label: 'Received',         color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400',    icon: 'check_circle' },
  preparing:        { label: 'Preparing',        color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400',  icon: 'skillet' },
  'ready for pickup': { label: 'Ready for Pickup', color: 'bg-green-100 text-green-700',   dot: 'bg-green-400',   icon: 'notifications_active' },
  ready:            { label: 'Ready',            color: 'bg-green-100 text-green-700',     dot: 'bg-green-400',   icon: 'notifications_active' },
  collected:        { label: 'Collected',        color: 'bg-surface-container text-on-surface-variant', dot: 'bg-gray-400', icon: 'done_all' },
  completed:        { label: 'Completed',        color: 'bg-surface-container text-on-surface-variant', dot: 'bg-gray-400', icon: 'done_all' },
  cancelled:        { label: 'Cancelled',        color: 'bg-red-100 text-red-700',         dot: 'bg-red-400',     icon: 'cancel' },
}

const ACTIVE_STATUSES = new Set(['pending', 'received', 'preparing', 'ready for pickup', 'ready'])


export default function StudentProfilePage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  // ── Active order only ──────────────────────────────────────────────────────
  const [activeOrder, setActiveOrder] = useState(null)

  useEffect(() => {
    if (!user?._id) return
    axios.get('/orders')
      .then(({ data }) => {
        const mine = data.filter(o => o.user?._id === user._id || o.user === user._id)
        setActiveOrder(mine.find(o => ACTIVE_STATUSES.has(o.orderStatus)) || null)
      })
      .catch(() => {})
  }, [user?._id])

  // ── Name form ──────────────────────────────────────────────────────────────
  const [name, setName]             = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg]       = useState(null)

  useEffect(() => { setName(user?.name || '') }, [user])

  const handleNameSave = async (e) => {
    e.preventDefault()
    if (!name.trim() || name.trim() === user?.name) return
    setNameLoading(true)
    setNameMsg(null)
    try {
      const { data } = await axios.put('/users/profile', { name: name.trim() })
      if (data.error) { setNameMsg({ type: 'error', text: data.error }); return }
      setUser(data)
      setNameMsg({ type: 'success', text: 'Name updated.' })
    } catch (err) {
      setNameMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update name' })
    } finally {
      setNameLoading(false)
    }
  }

  // ── Password form ──────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg]     = useState(null)
  const [showPw, setShowPw]   = useState({ current: false, new: false, confirm: false })

  const setPw    = (k, v) => setPwForm(prev => ({ ...prev, [k]: v }))
  const togglePw = (k)    => setShowPw(prev => ({ ...prev, [k]: !prev[k] }))

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' }); return
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return
    }
    setPwLoading(true)
    try {
      const { data } = await axios.put('/users/profile', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      })
      if (data.error) { setPwMsg({ type: 'error', text: data.error }); return }
      setPwMsg({ type: 'success', text: 'Password changed successfully.' })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' })
    } finally {
      setPwLoading(false)
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')
      navigate('/login')
    } catch {
      navigate('/login')
    }
  }

  const isGoogleUser = !!user?.googleId
  const memberSince  = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="min-h-screen bg-background text-on-background pb-28 md:pb-8">

      {/* Mobile-only header */}
      <header className="md:hidden sticky top-16 z-40 flex items-center justify-between px-4 h-16 bg-surface border-b border-outline-variant">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors bg-transparent cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-base font-bold text-on-surface">Profile</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-error transition-colors bg-transparent border-none cursor-pointer px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Logout
        </button>
      </header>

      {/* Desktop page title */}
      <div className="hidden md:block max-w-5xl mx-auto px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-on-surface">My Profile</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your account information and security settings.</p>
      </div>

      {/* ── Mobile layout (single column) ── */}
      <main className="md:hidden max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Avatar card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6 flex items-center gap-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor(user?.name)}`}>
            {initials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-on-surface truncate">{user?.name || '—'}</h2>
            <p className="text-sm text-on-surface-variant truncate">{user?.email}</p>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${roleBadgeColor(user?.role)}`}>
                {roleLabel(user?.role)}
              </span>
              {user?.isVerified && (
                <span className="flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  Verified
                </span>
              )}
            </div>
          </div>
          {user?.studentId && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">ID</p>
              <p className="text-sm font-bold text-primary">{user.studentId}</p>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/wallet')}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 flex items-center gap-3 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Wallet</p>
              <p className="text-sm font-bold text-primary truncate">
                KES {(Number(user?.walletBalance) || 0).toLocaleString()}
              </p>
            </div>
          </button>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Member since</p>
              <p className="text-sm font-bold text-on-surface truncate">{memberSince}</p>
            </div>
          </div>
        </div>

        {/* Active order */}
        {activeOrder && (
          <div className="bg-primary/5 border border-primary/30 rounded-2xl p-4 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-primary text-[22px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {STATUS_META[activeOrder.orderStatus]?.icon || 'receipt_long'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Active Order</p>
              <p className="text-sm font-bold text-on-surface truncate">{activeOrder.orderNumber}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {STATUS_META[activeOrder.orderStatus]?.label || activeOrder.orderStatus}
              </p>
            </div>
            <button
              onClick={() => navigate(`/orders/${activeOrder._id}/track`)}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-2 rounded-lg cursor-pointer border-none"
            >
              Track
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        )}

        {/* Order history shortcut */}
        <button
          onClick={() => navigate('/orders/history')}
          className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-4 flex items-center gap-3 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-tertiary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Orders</p>
            <p className="text-sm font-bold text-on-surface">View Order History</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
        </button>

        {/* Edit name */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-5">
          <h3 className="font-bold text-primary mb-4 flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-[18px]">person</span>
            Profile Information
          </h3>
          <Alert msg={nameMsg} onDismiss={() => setNameMsg(null)} />
          <form onSubmit={handleNameSave} className="mt-3 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant outline-none text-sm cursor-not-allowed"
              />
              <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed.</p>
            </div>
            <button
              type="submit"
              disabled={nameLoading || !name.trim() || name.trim() === user?.name}
              className="w-full h-11 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 border-none"
            >
              {nameLoading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
              Save Changes
            </button>
          </form>
        </div>

        {/* Change password */}
        {!isGoogleUser && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-5">
            <h3 className="font-bold text-primary mb-4 flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              Change Password
            </h3>
            <Alert msg={pwMsg} onDismiss={() => setPwMsg(null)} />
            <form onSubmit={handlePasswordSave} className="mt-3 space-y-4">
              {[
                { key: 'current', label: 'Current Password',    field: 'currentPassword', placeholder: 'Enter current password' },
                { key: 'new',     label: 'New Password',         field: 'newPassword',     placeholder: 'Min. 6 characters' },
                { key: 'confirm', label: 'Confirm New Password', field: 'confirmPassword', placeholder: 'Repeat new password' },
              ].map(({ key, label, field, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{label}</label>
                  <div className="relative">
                    <input
                      type={showPw[key] ? 'text' : 'password'}
                      required
                      value={pwForm[field]}
                      onChange={e => setPw(field, e.target.value)}
                      placeholder={placeholder}
                      className="w-full h-11 px-3 pr-10 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => togglePw(key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer bg-transparent border-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">{showPw[key] ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full h-11 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 border-none"
              >
                {pwLoading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
                Update Password
              </button>
            </form>
          </div>
        )}

        {isGoogleUser && (
          <div className="flex items-center gap-3 p-4 bg-surface-container rounded-xl border border-outline-variant text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] shrink-0">info</span>
            Signed in with Google. Password changes are managed through your Google account.
          </div>
        )}

      </main>

      {/* ── Desktop layout (2 columns) ── */}
      <div className="hidden md:grid md:grid-cols-[320px_1fr] md:gap-6 max-w-5xl mx-auto px-8 pt-4">

        {/* Left column — identity + stats */}
        <div className="space-y-4">

          {/* Avatar card */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${avatarColor(user?.name)}`}>
                {initials(user?.name)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">{user?.name || '—'}</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">{user?.email}</p>
              </div>
              <div className="flex items-center flex-wrap justify-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${roleBadgeColor(user?.role)}`}>
                  {roleLabel(user?.role)}
                </span>
                {user?.isVerified && (
                  <span className="flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    Verified
                  </span>
                )}
              </div>
              {user?.studentId && (
                <div className="w-full pt-3 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Student ID</span>
                  <span className="text-sm font-bold text-primary">{user.studentId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Wallet */}
          <button
            onClick={() => navigate('/wallet')}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 flex items-center gap-3 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Wallet Balance</p>
              <p className="text-base font-bold text-primary">
                KES {(Number(user?.walletBalance) || 0).toLocaleString()}
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[18px]">chevron_right</span>
          </button>

          {/* Member since */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Member Since</p>
              <p className="text-sm font-bold text-on-surface">{memberSince}</p>
            </div>
          </div>

        </div>

        {/* Right column — forms */}
        <div className="space-y-5">

          {/* Active order */}
          {activeOrder && (
            <div className="bg-primary/5 border border-primary/30 rounded-2xl p-4 flex items-center gap-4">
              <span
                className="material-symbols-outlined text-primary text-[28px] shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {STATUS_META[activeOrder.orderStatus]?.icon || 'receipt_long'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Active Order</p>
                <p className="text-base font-bold text-on-surface">{activeOrder.orderNumber}</p>
                <p className="text-sm text-on-surface-variant">
                  {STATUS_META[activeOrder.orderStatus]?.label} &mdash; KES {(activeOrder.totalAmt || 0).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => navigate(`/orders/${activeOrder._id}/track`)}
                className="shrink-0 flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-4 py-2 rounded-lg cursor-pointer border-none"
              >
                Track Order
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}

          {/* Order history shortcut */}
          <button
            onClick={() => navigate('/orders/history')}
            className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Orders</p>
              <p className="text-base font-bold text-on-surface">View Order History</p>
              <p className="text-xs text-on-surface-variant mt-0.5">See all past orders, reorder, and report issues</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
          </button>

          {/* Edit name */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6">
            <h3 className="font-bold text-primary mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">person</span>
              Profile Information
            </h3>
            <Alert msg={nameMsg} onDismiss={() => setNameMsg(null)} />
            <form onSubmit={handleNameSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant outline-none text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={nameLoading || !name.trim() || name.trim() === user?.name}
                  className="h-11 px-8 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-2 border-none"
                >
                  {nameLoading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change password */}
          {!isGoogleUser && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6">
              <h3 className="font-bold text-primary mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">lock</span>
                Change Password
              </h3>
              <Alert msg={pwMsg} onDismiss={() => setPwMsg(null)} />
              <form onSubmit={handlePasswordSave} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPw.current ? 'text' : 'password'}
                      required
                      value={pwForm.currentPassword}
                      onChange={e => setPw('currentPassword', e.target.value)}
                      placeholder="Enter current password"
                      className="w-full h-11 px-3 pr-10 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                    />
                    <button type="button" onClick={() => togglePw('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer bg-transparent border-none">
                      <span className="material-symbols-outlined text-[18px]">{showPw.current ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'new',     label: 'New Password',          field: 'newPassword',     placeholder: 'Min. 6 characters' },
                    { key: 'confirm', label: 'Confirm New Password',  field: 'confirmPassword', placeholder: 'Repeat new password' },
                  ].map(({ key, label, field, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{label}</label>
                      <div className="relative">
                        <input
                          type={showPw[key] ? 'text' : 'password'}
                          required
                          value={pwForm[field]}
                          onChange={e => setPw(field, e.target.value)}
                          placeholder={placeholder}
                          className="w-full h-11 px-3 pr-10 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                        />
                        <button type="button" onClick={() => togglePw(key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer bg-transparent border-none">
                          <span className="material-symbols-outlined text-[18px]">{showPw[key] ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="h-11 px-8 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-2 border-none"
                  >
                    {pwLoading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {isGoogleUser && (
            <div className="flex items-center gap-3 p-4 bg-surface-container rounded-xl border border-outline-variant text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px] shrink-0">info</span>
              Signed in with Google. Password changes are managed through your Google account.
            </div>
          )}

        </div>
      </div>

      <StudentBottomNav active="profile" />
    </div>
  )
}
