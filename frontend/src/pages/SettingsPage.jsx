import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

// ─── helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role) {
  return { admin: 'Admin', kitchen_staff: 'Kitchen Staff', student: 'Student' }[role] || role
}

function roleBadgeColor(role) {
  return {
    admin:         'bg-primary text-on-primary',
    kitchen_staff: 'bg-secondary text-on-secondary',
    student:       'bg-surface-container-high text-on-surface-variant',
  }[role] || 'bg-surface-container text-on-surface-variant'
}

function issueCategoryLabel(cat) {
  return {
    wrong_order:  'Wrong Order',
    missing_item: 'Missing Item',
    food_quality: 'Food Quality',
    payment:      'Payment',
    other:        'Other',
  }[cat] || cat
}

function issueStatusMeta(status) {
  return {
    open:      { label: 'Open',      color: 'bg-yellow-100 text-yellow-800' },
    in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-800' },
    resolved:  { label: 'Resolved',  color: 'bg-green-100 text-green-700' },
  }[status] || { label: status, color: 'bg-surface-container text-on-surface-variant' }
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

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

// ─── Alert banner ──────────────────────────────────────────────────────────────

function Alert({ msg, onDismiss }) {
  if (!msg) return null
  const isError = msg.type === 'error'
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium
      ${isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
        {isError ? 'error' : 'check_circle'}
      </span>
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="ml-auto opacity-60 hover:opacity-100">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  )
}

// ─── Add / Edit User Modal ─────────────────────────────────────────────────────

function UserModal({ open, onClose, onSave, editUser }) {
  const isEdit = !!editUser
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'kitchen_staff', studentId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      if (isEdit) {
        setForm({ name: editUser.name || '', email: editUser.email || '', password: '', confirmPassword: '', role: editUser.role || 'student', studentId: editUser.studentId || '' })
      } else {
        setForm({ name: '', email: '', password: '', confirmPassword: '', role: 'kitchen_staff', studentId: '' })
      }
    }
  }, [open, editUser, isEdit])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isEdit && form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (isEdit) {
        const { data } = await axios.put(`/users/${editUser._id}`, { name: form.name, role: form.role })
        onSave(data, 'edit')
      } else {
        const payload = { name: form.name, email: form.email, password: form.password, role: form.role }
        if (form.studentId.trim()) payload.studentId = form.studentId.trim()
        const { data } = await axios.post('/users', payload)
        if (data.error) { setError(data.error); return }
        onSave(data, 'add')
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md border border-outline-variant">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h3 className="text-lg font-bold text-primary">{isEdit ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="John Doe"
              className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="john@example.com"
                className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary outline-none text-sm"
            >
              <option value="student">Student</option>
              <option value="kitchen_staff">Kitchen Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Student/Staff ID <span className="text-outline font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.studentId}
                  onChange={e => set('studentId', e.target.value)}
                  placeholder="e.g. 190004"
                  className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="Repeat password"
                  className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-lg bg-primary text-on-primary font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ user, setUser }) {
  const [name, setName] = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState(null)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })

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
      setNameMsg({ type: 'success', text: 'Name updated successfully' })
    } catch (err) {
      setNameMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update name' })
    } finally {
      setNameLoading(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    setPwLoading(true)
    try {
      const { data } = await axios.put('/users/profile', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      if (data.error) { setPwMsg({ type: 'error', text: data.error }); return }
      setPwMsg({ type: 'success', text: 'Password changed successfully' })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' })
    } finally {
      setPwLoading(false)
    }
  }

  const setPw = (k, v) => setPwForm(prev => ({ ...prev, [k]: v }))
  const toggleShow = (k) => setShowPw(prev => ({ ...prev, [k]: !prev[k] }))

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile card */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 flex items-center gap-5">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor(user?.name)}`}>
          {initials(user?.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-on-surface">{user?.name || '—'}</h3>
          <p className="text-sm text-on-surface-variant">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${roleBadgeColor(user?.role)}`}>
              {roleLabel(user?.role)}
            </span>
            {user?.isVerified && (
              <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Verified
              </span>
            )}
          </div>
        </div>
        {user?.studentId && (
          <div className="text-right shrink-0">
            <p className="text-xs text-on-surface-variant">ID</p>
            <p className="text-sm font-bold text-primary">{user.studentId}</p>
          </div>
        )}
      </div>

      {/* Edit name */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
        <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">person</span>
          Profile Information
        </h4>
        <Alert msg={nameMsg} onDismiss={() => setNameMsg(null)} />
        <form onSubmit={handleNameSave} className="mt-4 space-y-4">
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
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={nameLoading || !name.trim() || name.trim() === user?.name}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
            >
              {nameLoading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
        <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">lock</span>
          Change Password
        </h4>
        <Alert msg={pwMsg} onDismiss={() => setPwMsg(null)} />
        <form onSubmit={handlePasswordSave} className="mt-4 space-y-4">
          {[
            { key: 'current', label: 'Current Password', field: 'currentPassword', placeholder: 'Enter current password' },
            { key: 'new',     label: 'New Password',     field: 'newPassword',     placeholder: 'Min. 6 characters' },
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
                  onClick={() => toggleShow(key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPw[key] ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
            >
              {pwLoading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Users Tab (admin only) ────────────────────────────────────────────────────

function UsersTab({ currentUserId }) {
  const [users, setUsers]       = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [toast, setToast]       = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [roleUpdating, setRoleUpdating] = useState({})

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      const { data } = await axios.get(`/users?${params}`)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, roleFilter])

  useEffect(() => {
    fetchUsers(1)
  }, [fetchUsers])

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRoleChange = async (userId, newRole) => {
    setRoleUpdating(prev => ({ ...prev, [userId]: true }))
    try {
      const { data } = await axios.put(`/users/${userId}`, { role: newRole })
      if (data.error) { showToast(data.error, 'error'); return }
      setUsers(prev => prev.map(u => u._id === userId ? data : u))
      showToast(`Role updated to ${roleLabel(newRole)}`)
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update role', 'error')
    } finally {
      setRoleUpdating(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name || user.email}"? This cannot be undone.`)) return
    try {
      await axios.delete(`/users/${user._id}`)
      setUsers(prev => prev.filter(u => u._id !== user._id))
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))
      showToast('User deleted')
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error')
    }
  }

  const handleModalSave = (saved, mode) => {
    if (mode === 'add') {
      setUsers(prev => [saved, ...prev])
      setPagination(prev => ({ ...prev, total: prev.total + 1 }))
      showToast('User created successfully')
    } else {
      setUsers(prev => prev.map(u => u._id === saved._id ? saved : u))
      showToast('User updated successfully')
    }
  }

  // Role counts
  const roleCounts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg font-medium text-sm
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: pagination.total, icon: 'group', bg: 'bg-primary-fixed' },
          { label: 'Admins',        value: roleCounts.admin || 0,         icon: 'admin_panel_settings', bg: 'bg-primary-fixed' },
          { label: 'Kitchen Staff', value: roleCounts.kitchen_staff || 0, icon: 'soup_kitchen',          bg: 'bg-secondary-fixed' },
          { label: 'Students',      value: roleCounts.student || 0,       icon: 'school',                bg: 'bg-tertiary-fixed' },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
            </div>
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">{label}</p>
            <p className="text-2xl font-bold text-primary mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or ID..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="h-10 px-4 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary outline-none min-w-[160px]"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admins</option>
          <option value="kitchen_staff">Kitchen Staff</option>
          <option value="student">Students</option>
        </select>
        <button
          onClick={() => { setEditUser(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-5 h-10 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-3xl mr-3">refresh</span>
            Loading users...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center py-12 text-error">
            <span className="material-symbols-outlined text-4xl mb-3">error</span>
            <p className="font-semibold">{error}</p>
            <button onClick={() => fetchUsers(pagination.page)} className="mt-3 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold cursor-pointer">Retry</button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="flex flex-col items-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-3">group_off</span>
            <p className="font-semibold">No users found</p>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    {['User', 'Email', 'ID', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(u.name)}`}>
                            {initials(u.name)}
                          </div>
                          <p className="font-semibold text-sm text-on-surface">{u.name || '—'}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">{u.email}</td>
                      <td className="p-4 text-sm text-on-surface-variant">{u.studentId || '—'}</td>
                      <td className="p-4">
                        {u._id === currentUserId ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${roleBadgeColor(u.role)}`}>
                            {roleLabel(u.role)} (you)
                          </span>
                        ) : (
                          <div className="relative">
                            {roleUpdating[u._id] ? (
                              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined animate-spin text-[14px]">refresh</span>
                                Saving...
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={e => handleRoleChange(u._id, e.target.value)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border-0 cursor-pointer outline-none ${roleBadgeColor(u.role)}`}
                              >
                                <option value="student">Student</option>
                                <option value="kitchen_staff">Kitchen Staff</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {u.isVerified ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                            <span className="material-symbols-outlined text-[14px]">verified</span>
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs text-yellow-700 font-semibold">Unverified</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-on-surface-variant">{relativeTime(u.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditUser(u); setModalOpen(true) }}
                            className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-primary transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {u._id !== currentUserId && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="p-1.5 rounded hover:bg-error-container text-outline hover:text-error transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-outline-variant">
              {users.map(u => (
                <div key={u._id} className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${avatarColor(u.name)}`}>
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-on-surface truncate">{u.name || '—'}</p>
                    <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${roleBadgeColor(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditUser(u); setModalOpen(true) }} className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-primary cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {u._id !== currentUserId && (
                      <button onClick={() => handleDelete(u)} className="p-1.5 rounded hover:bg-error-container text-outline hover:text-error cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
                <span className="text-xs text-on-surface-variant">
                  {pagination.total} users · Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 rounded border border-outline-variant text-sm font-medium hover:bg-surface-container disabled:opacity-40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => fetchUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 rounded border border-outline-variant text-sm font-medium hover:bg-surface-container disabled:opacity-40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <UserModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditUser(null) }}
        onSave={handleModalSave}
        editUser={editUser}
      />
    </div>
  )
}

// ─── Issues Tab ────────────────────────────────────────────────────────────────

function IssuesTab() {
  const [issues, setIssues]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState({})
  const [toast, setToast]       = useState(null)

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get('/issues')
      setIssues(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  const handleStatusChange = async (issueId, newStatus) => {
    setUpdating(prev => ({ ...prev, [issueId]: true }))
    try {
      const { data } = await axios.patch(`/issues/${issueId}/status`, { status: newStatus })
      setIssues(prev => prev.map(i => i._id === issueId ? data : i))
      showToast('Issue status updated')
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error')
    } finally {
      setUpdating(prev => ({ ...prev, [issueId]: false }))
    }
  }

  const filtered = statusFilter === 'all' ? issues : issues.filter(i => i.status === statusFilter)

  const counts = issues.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg font-medium text-sm
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.text}
        </div>
      )}

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',       label: `All (${issues.length})`,                color: 'bg-surface-container text-on-surface-variant' },
          { key: 'open',      label: `Open (${counts.open || 0})`,           color: 'bg-yellow-100 text-yellow-800' },
          { key: 'in_review', label: `In Review (${counts.in_review || 0})`, color: 'bg-blue-100 text-blue-800' },
          { key: 'resolved',  label: `Resolved (${counts.resolved || 0})`,   color: 'bg-green-100 text-green-700' },
        ].map(pill => (
          <button
            key={pill.key}
            onClick={() => setStatusFilter(pill.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer
              ${statusFilter === pill.key ? `${pill.color} ring-2 ring-offset-1 ring-primary` : `${pill.color} opacity-70 hover:opacity-100`}`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-3xl mr-3">refresh</span>
            Loading issues...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center py-12 text-error">
            <span className="material-symbols-outlined text-4xl mb-3">error</span>
            <p className="font-semibold">{error}</p>
            <button onClick={fetchIssues} className="mt-3 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold cursor-pointer">Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-3">sentiment_satisfied</span>
            <p className="font-semibold">No {statusFilter !== 'all' ? statusFilter.replace('_', ' ') : ''} issues</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    {['Category', 'Description', 'Order', 'Reported By', 'Status', 'Time'].map(h => (
                      <th key={h} className="p-4 text-xs text-on-surface-variant uppercase tracking-wider font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filtered.map(issue => {
                    const meta = issueStatusMeta(issue.status)
                    return (
                      <tr key={issue._id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="p-4">
                          <span className="text-xs font-bold uppercase tracking-wide bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full whitespace-nowrap">
                            {issueCategoryLabel(issue.category)}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="text-sm text-on-surface line-clamp-2">{issue.description}</p>
                        </td>
                        <td className="p-4 text-sm font-bold text-primary whitespace-nowrap">
                          {issue.order?.orderNumber || '—'}
                          {issue.order?.totalAmt != null && (
                            <p className="text-xs text-on-surface-variant font-normal">KES {issue.order.totalAmt}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium text-on-surface">{issue.user?.name || '—'}</p>
                          <p className="text-xs text-on-surface-variant">{issue.user?.email}</p>
                        </td>
                        <td className="p-4">
                          {updating[issue._id] ? (
                            <span className="text-xs text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined animate-spin text-[14px]">refresh</span>
                            </span>
                          ) : (
                            <select
                              value={issue.status}
                              onChange={e => handleStatusChange(issue._id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border-0 cursor-pointer outline-none uppercase tracking-wide ${meta.color}`}
                            >
                              <option value="open">Open</option>
                              <option value="in_review">In Review</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          )}
                        </td>
                        <td className="p-4 text-xs text-on-surface-variant whitespace-nowrap">{relativeTime(issue.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-outline-variant">
              {filtered.map(issue => {
                const meta = issueStatusMeta(issue.status)
                return (
                  <div key={issue._id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">
                            {issueCategoryLabel(issue.category)}
                          </span>
                          <span className="text-xs text-on-surface-variant">{relativeTime(issue.createdAt)}</span>
                        </div>
                        <p className="text-sm text-on-surface mt-1 line-clamp-2">{issue.description}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{issue.user?.name} · Order {issue.order?.orderNumber}</p>
                      </div>
                      <select
                        value={issue.status}
                        onChange={e => handleStatusChange(issue._id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-bold border-0 cursor-pointer outline-none uppercase tracking-wide shrink-0 ${meta.color}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main SettingsPage ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const isAdmin = user?.role === 'admin'

  const tabs = [
    { key: 'profile', label: 'My Profile',        icon: 'manage_accounts' },
    ...(isAdmin ? [{ key: 'users', label: 'User Management', icon: 'group' }] : []),
    { key: 'issues',  label: 'Reported Issues',   icon: 'report_problem' },
  ]

  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="bg-background text-on-background min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="md:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-surface border-b border-outline-variant shrink-0">
          <h2 className="text-headline-sm font-bold text-primary">Strathmore Dining</h2>
          <div className="flex items-center gap-2">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${roleBadgeColor(user?.role)}`}>
              <span className="material-symbols-outlined text-[14px]">badge</span>
              {roleLabel(user?.role)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Page title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary">Settings</h1>
              <p className="text-sm text-on-surface-variant mt-1">Manage your account, users, and system configuration</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-surface-container p-1 rounded-xl w-fit">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap
                    ${activeTab === tab.key
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'profile' && <ProfileTab user={user} setUser={setUser} />}
            {activeTab === 'users'   && isAdmin && <UsersTab currentUserId={user?._id} />}
            {activeTab === 'issues'  && <IssuesTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
