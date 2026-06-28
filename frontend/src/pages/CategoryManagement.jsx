import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import KitchenBottomNav from '../components/KitchenBottomNav'
import TopNav from '../components/TopNav'
import StatsDashboard from '../components/StatsDashboard'
import CategoryTable from '../components/CategoryTable'
import Pagination from '../components/Pagination'
import CategoryModal from '../components/CategoryModal'

const API_BASE = '/api'

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (HTTP ${res.status})` }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 0 })
  const [stats, setStats] = useState({ totalCategories: 0, totalItems: 0, thisMonthCategories: 0, categoryHealth: [] })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCategory, setEditCategory] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchCategories = useCallback(async (page = 1, searchTerm = '') => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (searchTerm) params.append('search', searchTerm)
      const data = await fetchJSON(`${API_BASE}/categories?${params}`)
      setCategories(data.categories || [])
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0, limit: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/stats`)
      setStats(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchCategories(pagination.page, debouncedSearch)
  }, [pagination.page, debouncedSearch, fetchCategories])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleSearchChange = (value) => {
    setSearch(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleAdd = () => {
    setEditCategory(null)
    setModalOpen(true)
  }

  const handleEdit = (cat) => {
    setEditCategory(cat)
    setModalOpen(true)
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return
    try {
      await fetchJSON(`${API_BASE}/categories/${cat._id}`, { method: 'DELETE' })
      fetchCategories(pagination.page, debouncedSearch)
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSubmit = async (form) => {
    try {
      if (editCategory) {
        await fetchJSON(`${API_BASE}/categories/${editCategory._id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
      } else {
        await fetchJSON(`${API_BASE}/categories`, {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      setModalOpen(false)
      setEditCategory(null)
      fetchCategories(pagination.page, debouncedSearch)
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditCategory(null)
  }

  return (
    <div className="bg-background text-on-background overflow-x-hidden min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <TopNav
        search={search}
        onSearchChange={handleSearchChange}
        onAddClick={handleAdd}
      />
      <main className="md:ml-64 p-4 md:p-8 min-h-[calc(100vh-4rem)] pb-24 md:pb-8">
        <StatsDashboard
          totalCategories={stats.totalCategories}
          totalItems={stats.totalItems}
          thisMonthCategories={stats.thisMonthCategories}
          categoryHealth={stats.categoryHealth}
        />

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
            <h3 className="text-base font-semibold text-primary">Menu Hierarchy</h3>
            <div className="flex items-center gap-2">
              {/* <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors cursor-pointer">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors cursor-pointer">
                <span className="material-symbols-outlined">download</span>
              </button> */}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-4xl block mx-auto mb-2">refresh</span>
              Loading categories...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl block mx-auto mb-2">error</span>
              {error}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl block mx-auto mb-2">search_off</span>
              {debouncedSearch ? 'No categories match your search.' : 'No categories yet. Add one!'}
            </div>
          ) : (
            <CategoryTable
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {pagination.total > 0 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={handlePageChange}
              noun="categories"
            />
          )}
        </div>
      </main>

      <CategoryModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editCategory={editCategory}
      />
      <KitchenBottomNav />
    </div>
  )
}
