import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import AddMenuItemModal from '../components/AddMenuItemModal'

import axios from "axios"

function formatPrice(item) {
  if (item.halfPrice != null && item.fullPrice != null) {
    return `Half: KES ${item.halfPrice} | Full: KES ${item.fullPrice}`
  }
  if (item.halfPrice != null) return `Half: KES ${item.halfPrice}`
  if (item.fullPrice != null) return `Full: KES ${item.fullPrice}`
  if (item.price != null) return `KES ${item.price}`
  return 'N/A'
}

function toPascalCase(str) {
  return str
    ?.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function MenuManagementPage() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // Fetch all menu items
  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter)

      const { data } = await axios.get(`/menuitems?${params}`)

      setItems(data)
    } catch (err) {
      setError(err.message || 'Network error while loading menu items')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [debouncedSearch, categoryFilter])


  // Fetch all categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/categories')

        setCategories([
          {
            _id: "all",
            name: "All Categories"
          },
          ...data.categories
        ])
      } catch (error) {
        setError(error.message)
        console.error(error)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])


  const handleToggle = async (item) => {
    const nextAvailability = !item.isAvailable

    try {
      const { data } = await axios.patch(`/menuitems/toggle/${item._id}`, {
        isAvailable: nextAvailability
      })
  
      setItems((prev) => prev.map((row) => (row._id === item._id ? data : row)))

    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    
    try {
      await axios.delete(`/menuitems/delete/${item._id}`)

      fetchItems()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (formData, editItemData) => {
    const url = editItemData
      ? `/menuitems/update/${editItemData._id}`
      : `/menuitems/create`
    
    const { data } = editItemData 
      ? await axios.put(url, formData)
      : await axios.post(url, formData)

    if (editItemData) {
      setItems((prev) => prev.map((item) => (item._id === data._id ? data : item)))
    } else {
      setItems((prev) => [data, ...prev])
    }

    setModalOpen(false)
    setEditItem(null)
    
    await fetchItems()
  }

  const handleAdd = () => {
    setEditItem(null)
    setModalOpen(true)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditItem(null)
  }

  return (
    <div className="bg-background text-on-background min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="md:ml-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-surface border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-headline-sm font-bold text-primary">Strathmore Dining</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">

            {/* <button className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button> */}
            
            {/* <button className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors cursor-pointer">
              <span className="material-symbols-outlined">account_circle</span>
            </button> */}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-headline-lg text-primary font-bold">Menu Inventory</h2>
                <p className="text-body-lg text-on-surface-variant mt-1">Manage cafeteria offerings and availability.</p>
              </div>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-bold shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span className="material-symbols-outlined">add</span>
                Add New Item
              </button>
            </div>

            <div className="md:hidden flex flex-col gap-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md transition-all"
                  placeholder="Search menu items..."
                />
              </div>
              <div className="overflow-x-auto no-scrollbar pb-1">
                <div className="flex gap-2 min-w-max">
                  {categories?.map((cat) => (
                    <button
                      key={cat._id}
                      onClick={() => setCategoryFilter(cat._id)}
                      className={`px-5 py-2 rounded-full text-label-md uppercase font-bold tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                        categoryFilter === cat.name
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {cat.name === 'All Categories' ? 'All Items' : toPascalCase(cat.name)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className='flex gap-4 mt-2'>
              <div className="hidden md:block relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-4/10 -translate-y-1/2 text-outline text-[20px]">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md transition-all"
                  placeholder="Search menu items..."
                />
              </div>

              <div className="hidden md:flex gap-4 mb-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 rounded-lg border border-outline-variant bg-surface text-body-md focus:border-primary outline-none min-w-[180px]"
                >
                  {categories?.map((cat) => (
                    <option key={cat._id} value={cat._id}>{toPascalCase(cat.name)}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-4xl mb-3">refresh</span>
                <p className="text-body-md">Loading menu items...</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 text-error">
                <span className="material-symbols-outlined text-4xl mb-3">error</span>
                <p className="text-body-md font-semibold">Failed to load items</p>
                <p className="text-sm text-on-surface-variant mt-1">{error}</p>
                <button
                  onClick={fetchItems}
                  className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-lg font-semibold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && items?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
                <p className="text-body-lg font-semibold">No items found</p>
                <p className="text-body-md mt-1">
                  {debouncedSearch || categoryFilter !== 'All Categories'
                    ? 'Try adjusting your search or filter.'
                    : 'Add your first menu item to get started.'}
                </p>
              </div>
            )}

            {!loading && !error && items.length > 0 && (
              <>
                <div className="hidden md:block bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant">
                          <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider font-semibold w-24">Image</th>
                          <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Item Name</th>
                          <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Category</th>
                          <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Price (KES)</th>
                          <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider font-semibold text-center w-32">Status</th>
                          <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider font-semibold text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {items?.map((item) => (
                          <tr key={item?._id} className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="p-4">
                              <div className="w-16 h-16 rounded-md overflow-hidden bg-surface-variant">
                                {item?.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                    <span className="material-symbols-outlined">image</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-body-lg font-semibold text-on-surface">{item?.name}</p>
                              {item.description && (
                                <p className="text-label-md text-outline mt-1 line-clamp-1">{item?.description}</p>
                              )}
                            </td>
                            <td className="p-4 text-body-md text-on-surface-variant">{toPascalCase(item?.category?.name)}</td>
                            <td className="p-4 text-body-md font-semibold text-primary">{formatPrice(item)}</td>
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.isAvailable}
                                    onChange={() => handleToggle(item)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                                {!item.isAvailable && (
                                  <span className="text-[10px] text-error font-bold mt-1 tracking-wider">SOLD OUT</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="p-2 text-outline hover:text-primary transition-colors rounded hover:bg-surface-container cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-2 text-outline hover:text-error transition-colors rounded hover:bg-error-container cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:hidden flex flex-col gap-3">
                  {items?.map((item) => (
                    <div
                      key={item._id}
                      className={`bg-surface-container-lowest border border-surface-variant rounded-xl p-3 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow ${
                        !item.isAvailable ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden flex-shrink-0 relative">
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-surface-variant/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-on-surface bg-surface/80 px-1 py-0.5 rounded uppercase">Out</span>
                          </div>
                        )}
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className={`w-full h-full object-cover ${!item.isAvailable ? 'grayscale-[50%]' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-[24px]">lunch_dining</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body-lg font-bold text-on-surface truncate">{item.name}</h3>
                        <p className="text-[11px] uppercase tracking-wider text-on-surface-variant mt-0.5">{item?.category?.name}</p>
                        <p className="text-body-md font-semibold text-primary mt-1">{formatPrice(item)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isAvailable}
                              onChange={() => handleToggle(item)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                          <span className={`text-[10px] uppercase font-bold tracking-wider w-16 text-right ml-2 ${
                            item.isAvailable ? 'text-primary' : 'text-on-surface-variant'
                          }`}>
                            {item.isAvailable ? 'Available' : 'Sold Out'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="w-8 h-8 rounded bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="w-8 h-8 rounded bg-surface-container-low text-on-surface-variant hover:text-secondary hover:bg-error-container flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 md:hidden bg-surface-container-lowest shadow-[0_-4px_12px_rgba(0,0,0,0.05)] rounded-t-xl">
        <a className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1" href="#">
          <span className="material-symbols-outlined">restaurant</span>
          <span className="text-label-md mt-1">Menu</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1" href="#">
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="text-label-md mt-1">Orders</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1" href="#">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span className="text-label-md mt-1">Wallet</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1" href="#">
          <span className="material-symbols-outlined">person</span>
          <span className="text-label-md mt-1">Profile</span>
        </a>
      </nav>

      <AddMenuItemModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editItem={editItem}
        categories={categories}
      />
    </div>
  )
}
