import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import KitchenBottomNav from '../components/KitchenBottomNav'
import AdminToast, { useAdminToast } from '../components/AdminToast'

const STATUS_META = {
  open:      { label: 'Open',      color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  in_review: { label: 'In Review', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  resolved:  { label: 'Resolved',  color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

const CATEGORY_LABELS = {
  wrong_order:  'Wrong Order',
  missing_item: 'Missing Item',
  food_quality: 'Food Quality',
  payment:      'Payment Problem',
  other:        'Other',
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function IssuesPage() {
  const [issues, setIssues]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [updating, setUpdating]   = useState(false)
  const [noteText, setNoteText]   = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const { toast, dismiss, success, error: showError } = useAdminToast()

  const fetchIssues = useCallback(async () => {
    try {
      const { data } = await axios.get('/issues')
      setIssues(data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  const handleStatusChange = async (issue, newStatus) => {
    setUpdating(true)
    try {
      const { data } = await axios.patch(`/issues/${issue._id}/status`, { status: newStatus })
      setIssues(prev => prev.map(i => i._id === data._id ? data : i))
      if (selected?._id === data._id) setSelected(data)
      const label = STATUS_META[newStatus]?.label || newStatus
      success(`Status updated to ${label}`)
    } catch (err) {
      showError(err?.response?.data?.error || 'Failed to update status')
    } finally { setUpdating(false) }
  }

  const handleSaveNote = async () => {
    if (!selected) return
    setSavingNote(true)
    try {
      const { data } = await axios.patch(`/issues/${selected._id}/note`, { adminNote: noteText })
      setIssues(prev => prev.map(i => i._id === data._id ? data : i))
      setSelected(data)
      success('Note saved')
    } catch (err) {
      showError(err?.response?.data?.error || 'Failed to save note')
    } finally { setSavingNote(false) }
  }

  function openDetail(issue) {
    setSelected(issue)
    setNoteText(issue.adminNote || '')
    setNoteSaved(false)
  }

  const filtered = statusFilter === 'all' ? issues : issues.filter(i => i.status === statusFilter)

  const openCount     = issues.filter(i => i.status === 'open').length
  const inReviewCount = issues.filter(i => i.status === 'in_review').length
  const resolvedCount = issues.filter(i => i.status === 'resolved').length

  return (
    <div className="bg-background text-on-background min-h-screen">
      <div className="hidden md:block"><Sidebar /></div>

      <div className="md:ml-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface border-b border-outline-variant shrink-0">
          <div>
            <h2 className="text-xl font-bold text-on-background">Issues Inbox</h2>
            <p className="text-sm text-on-surface-variant">Student-reported order problems</p>
          </div>
          <button onClick={fetchIssues} className="w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container cursor-pointer text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Open',      value: openCount,     color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200' },
                { label: 'In Review', value: inReviewCount, color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
                { label: 'Resolved',  value: resolvedCount, color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
              ].map(k => (
                <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
                  <p className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${k.color} opacity-80`}>{k.label}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {['all', 'open', 'in_review', 'resolved'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors cursor-pointer
                    ${statusFilter === s ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {s === 'all' ? 'All' : s === 'in_review' ? 'In Review' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center py-16 text-on-surface-variant gap-3">
                <span className="material-symbols-outlined text-5xl opacity-40">inbox</span>
                <p className="font-semibold">No issues here</p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
                {filtered.map((issue, idx) => {
                  const meta = STATUS_META[issue.status]
                  return (
                    <div
                      key={issue._id}
                      onClick={() => openDetail(issue)}
                      className={`p-4 flex flex-col gap-2 cursor-pointer hover:bg-surface-container-low transition-colors ${idx !== 0 ? 'border-t border-outline-variant' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                          <span className="font-bold text-sm text-primary">#{issue.order?.orderNumber || '—'}</span>
                          <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                            {CATEGORY_LABELS[issue.category] || issue.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs text-on-surface-variant">{relativeTime(issue.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-on-surface line-clamp-2">{issue.description}</p>
                      <p className="text-xs text-on-surface-variant">
                        {issue.user?.name || 'Unknown'} · {issue.user?.email || ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <KitchenBottomNav />

      <AdminToast toast={toast} onDismiss={dismiss} />

      {/* Issue detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h3 className="font-bold text-on-surface">Issue — #{selected.order?.orderNumber}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{relativeTime(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant border-none bg-transparent cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Reporter</p>
                  <p className="text-sm font-semibold text-on-surface">{selected.user?.name || '—'}</p>
                  <p className="text-xs text-on-surface-variant">{selected.user?.email || '—'}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Category</p>
                  <p className="text-sm font-semibold text-on-surface">{CATEGORY_LABELS[selected.category] || selected.category}</p>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Description</p>
                <p className="text-sm text-on-surface leading-relaxed">{selected.description}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Update Status</p>
                <div className="flex gap-2">
                  {['open', 'in_review', 'resolved'].map(s => {
                    const m = STATUS_META[s]
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(selected, s)}
                        disabled={updating || selected.status === s}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                          ${selected.status === s ? `${m.color} border-current` : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Admin Note</p>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Add an internal note or resolution details…"
                  className="w-full rounded-xl border-2 border-outline-variant focus:border-primary outline-none px-3 py-2.5 text-sm text-on-surface bg-surface resize-none transition-colors"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-on-surface-variant">{noteText.length}/2000</span>
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="px-4 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {savingNote && (
                      <span className="material-symbols-outlined animate-spin text-[14px]">refresh</span>
                    )}
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
