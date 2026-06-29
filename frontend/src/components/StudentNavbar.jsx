import { useState } from 'react'
import axios from "axios"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

import SU_LOGO from '../assets/sulogo.png'

const AVATAR_COLORS = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-tertiary-fixed-dim text-on-tertiary',
  'bg-primary-container text-on-primary-container',
]

const CATEGORIES = [
  { value: 'wrong_order',  label: 'Wrong Order' },
  { value: 'missing_item', label: 'Missing Item' },
  { value: 'food_quality', label: 'Food Quality' },
  { value: 'payment',      label: 'Payment Problem' },
  { value: 'other',        label: 'Other' },
]

function avatarColor(name) {
  const code = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function ReportModal({ onClose }) {
  const [category, setCategory]     = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)

  const handleSubmit = async () => {
    if (!category || !description.trim()) return
    setSubmitting(true)
    try {
      await axios.post('/issues', { category, description })
      setDone(true)
      setTimeout(onClose, 1800)
    } catch {
      alert('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
            <h3 className="font-bold text-on-surface">Report an Issue</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant border-none bg-transparent cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="material-symbols-outlined text-green-500 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="font-bold text-on-surface">Report submitted</p>
            <p className="text-sm text-on-surface-variant">We'll look into it shortly.</p>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer
                      ${category === c.value ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the issue…"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant resize-none focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !category || !description.trim()}
              className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StudentNavbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showReport, setShowReport] = useState(false)

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')
      navigate('/login')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-12 h-16 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center text-primary font-bold cursor-pointer" onClick={() => navigate('/student')}>
            <img src={SU_LOGO} alt="Strathmore University Logo" className="h-10 w-auto object-contain md:hidden" />
            <div className="hidden md:flex items-center gap-2 text-lg">
              <img src={SU_LOGO} alt="Strathmore University Logo" className="h-8 w-auto object-contain" />
              <span>Strathmore Dining</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center h-full">
            <NavLink
              to="/student"
              className={({ isActive }) =>
                `h-full flex items-center px-4 font-semibold text-sm ${
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`
              }
            >
              Menu
            </NavLink>

            <NavLink
              to="/orders/history"
              className={({ isActive }) =>
                `h-full flex items-center px-4 font-semibold text-sm ${
                  isActive || location.pathname.startsWith('/orders')
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`
              }
            >
              Orders
            </NavLink>

            <NavLink
              to="/wallet"
              className={({ isActive }) =>
                `h-full flex items-center px-4 font-semibold text-sm ${
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`
              }
            >
              Wallet
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReport(true)}
            title="Report an issue"
            className="w-9 h-9 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 border-none bg-transparent cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
          </button>

          <NavLink to="/profile" title="My Profile">
            {({ isActive }) => (
              <div className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors cursor-pointer border ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-outline-variant hover:bg-surface-container-low'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(user?.name)}`}>
                  {initials(user?.name)}
                </div>
                <span className={`hidden md:block text-sm font-semibold truncate max-w-[120px] ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                  {user?.name?.split(' ')[0] || 'Profile'}
                </span>
              </div>
            )}
          </NavLink>

          <button
            onClick={handleLogout}
            className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-pointer"
            title="Logout"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
    </>
  )
}

export default StudentNavbar
