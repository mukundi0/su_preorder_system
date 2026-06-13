import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = '/api'
const PACKAGING_FEE = 20

const SCREEN = {
  menu: 'menu',
  cartSheet: 'cartSheet',
  checkout: 'checkout',
  payment: 'payment',
  confirmation: 'confirmation',
}

const SU_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA0IIuv_1BlpNJxib0dI0e2Tjkdo_fe57nW_5OQQxUh5venRecvcKSo6Rb4--DGc9-Hb6vmStHsCG4nJoAMPL-ypEQBtK2udXhpqzMMD0zIusMfQkiJ9HimsP87ce2ngwzq_JUd7tA3wRt4sRKtqhnkGfjLrie3Mu0SLHzfgvssmjTBYlXQCXR8PceZXUBsvjnikyo4oNqN2kS1wsh3zrcjUnxh_V6OKno485aiIH0Bek01MfIQ7Cr_-nnFTNZddzHrBmLFUj-WOfrZ'

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCtLJcYKDDwrCM7ulNFRhIi8OV5xtMJZs6jv9c8FrSH-rdxuZTSariMqFG9Hivb_TtjR52Dcod95C4Tu8SYsbM1A56oWnhGOdnwpgVxAXeRPYNGqnhLPm6PqV7lTGrNYLHF4yVXcqnYtfBTjAPJ8xfyM9uhvbg2wQcWy9Pl0x7N5978TFJ_w37fgidHUGDsIPM4nUdqYgUsNuudRg9jkfqi59jXNWOIHhmxhVlyP32cki6Sx36datL5piUsMnw-CLbSJOLoiM4ofSR1'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function formatCurrency(value) {
  return `KES ${(Number(value) || 0).toLocaleString()}`
}

function titleCase(value = '') {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function getOrderUserId(order) {
  if (!order?.user) return ''
  if (typeof order.user === 'string') return order.user
  return order.user._id ? String(order.user._id) : ''
}

function buildQrCodeUrl(orderId, userName, totalAmount) {
  const payload = {
    orderId,
    user: userName,
    total: totalAmount,
    type: 'pickup',
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(payload))}`
}

export default function StudentOrderPage() {
  const [loaded, setLoaded] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [user, setUser] = useState(null)

  const [menuItems, setMenuItems] = useState([])
  const [categoryCatalog, setCategoryCatalog] = useState([])
  const [orderHistory, setOrderHistory] = useState([])

  const [selectedCategory, setSelectedCategory] = useState('All Items')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [cart, setCart] = useState([])
  const [screen, setScreen] = useState(SCREEN.menu)

  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [confirmedOrder, setConfirmedOrder] = useState(null)
  const [submittedTotals, setSubmittedTotals] = useState(null)

  const searchTimeout = useRef(null)
  const mpesaPhoneRef = useRef(null)

  const apiFetch = useCallback(async (path, opts = {}) => {
    const headers = { ...opts.headers }

    if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(API_BASE + path, {
      credentials: 'include',
      ...opts,
      headers,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(err.error || err.message || `HTTP ${response.status}`)
    }

    return response.json()
  }, [])

  const requestUserData = useCallback(async () => {
    try {
      const payload = await apiFetch('/auth')
      if (payload?._id) {
        setUser(payload)
        return payload
      }
    } catch {
      setUser(null)
      return null
    }

    setUser(null)
    return null
  }, [apiFetch])

  const requestMenuData = useCallback(async () => {
    const payload = await apiFetch('/menuitems?available=true')
    const items = Array.isArray(payload) ? payload : []
    setMenuItems(items)
    return items
  }, [apiFetch])

  const requestCategoriesData = useCallback(async () => {
    try {
      const payload = await apiFetch('/categories?page=1&limit=100')
      const categories = Array.isArray(payload?.categories)
        ? payload.categories.map((entry) => titleCase(entry?.name || '')).filter(Boolean)
        : []

      setCategoryCatalog(categories)
      return categories
    } catch {
      setCategoryCatalog([])
      return []
    }
  }, [apiFetch])

  const requestOrderHistoryData = useCallback(
    async (userId) => {
      if (!userId) {
        setOrderHistory([])
        return []
      }

      const payload = await apiFetch('/orders')
      const orders = Array.isArray(payload) ? payload : []
      const normalizedUserId = String(userId)
      const filtered = orders.filter((order) => getOrderUserId(order) === normalizedUserId)

      setOrderHistory(filtered)
      return filtered
    },
    [apiFetch],
  )

  const requestMenuAndHistoryRefresh = useCallback(async () => {
    await requestMenuData()
    if (user?._id) {
      await requestOrderHistoryData(user._id)
    }
  }, [requestMenuData, requestOrderHistoryData, user])

  const logoutCurrentUser = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/'
    }
  }, [apiFetch])

  useEffect(() => {
    let cancelled = false

    const requestInitialData = async () => {
      setRequestError('')

      try {
        const currentUser = await requestUserData()
        if (cancelled) return

        const requests = [requestMenuData(), requestCategoriesData()]
        if (currentUser?._id) {
          requests.push(requestOrderHistoryData(currentUser._id))
        }

        await Promise.all(requests)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error.message || 'Failed to load cafeteria data')
        }
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    }

    requestInitialData()

    return () => {
      cancelled = true
      clearTimeout(searchTimeout.current)
    }
  }, [requestCategoriesData, requestMenuData, requestOrderHistoryData, requestUserData])

  const requestSearchQueryUpdate = useCallback((value) => {
    setSearchInput(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value.trim())
    }, 250)
  }, [])

  const requestCategorySelection = useCallback((category) => {
    setSelectedCategory(category)
  }, [])

  const requestScreenChange = useCallback((nextScreen) => {
    setScreen(nextScreen)
  }, [])

  const getCartItemUnitPrice = useCallback((cartItem) => {
    if (cartItem.servingSize === 'half' && cartItem.item.halfPrice) {
      return cartItem.item.halfPrice
    }
    return cartItem.item.fullPrice || 0
  }, [])

  const addItemToCart = useCallback(
    (itemId, servingSize = 'full') => {
      const normalizedId = String(itemId)

      let sourceItem = menuItems.find((item) => String(item._id) === normalizedId)

      if (!sourceItem) {
        for (const order of orderHistory) {
          if (!Array.isArray(order?.items)) continue

          for (const orderItem of order.items) {
            const candidate = orderItem?.item
            const candidateId = String(candidate?._id || candidate || '')

            if (candidateId === normalizedId && candidate && typeof candidate === 'object') {
              sourceItem = candidate
              break
            }
          }

          if (sourceItem) break
        }
      }

      if (!sourceItem) return

      setCart((previous) => {
        const existing = previous.find(
          (entry) => entry.item._id === normalizedId && entry.servingSize === servingSize,
        )

        if (existing) {
          return previous.map((entry) => (entry === existing ? { ...entry, qty: entry.qty + 1 } : entry))
        }

        return [
          ...previous,
          {
            item: {
              _id: normalizedId,
              name: sourceItem.name,
              fullPrice: sourceItem.fullPrice || sourceItem.price || 0,
              halfPrice: sourceItem.halfPrice,
              imageUrl: sourceItem.imageUrl || '',
            },
            servingSize,
            qty: 1,
          },
        ]
      })
    },
    [menuItems, orderHistory],
  )

  const removeItemFromCart = useCallback((itemId, servingSize = 'full') => {
    const normalizedId = String(itemId)

    setCart((previous) =>
      previous.filter(
        (entry) => !(entry.item._id === normalizedId && entry.servingSize === servingSize),
      ),
    )
  }, [])

  const updateCartItemQty = useCallback((itemId, delta, servingSize = 'full') => {
    const normalizedId = String(itemId)

    setCart((previous) => {
      const existing = previous.find(
        (entry) => entry.item._id === normalizedId && entry.servingSize === servingSize,
      )

      if (!existing) return previous

      const nextQty = existing.qty + delta
      if (nextQty <= 0) {
        return previous.filter((entry) => entry !== existing)
      }

      return previous.map((entry) => (entry === existing ? { ...entry, qty: nextQty } : entry))
    })
  }, [])

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, entry) => sum + getCartItemUnitPrice(entry) * entry.qty, 0)
    const packaging = cart.length > 0 ? PACKAGING_FEE : 0

    return {
      subtotal,
      packaging,
      total: subtotal + packaging,
    }
  }, [cart, getCartItemUnitPrice])

  const cartCount = useMemo(() => cart.reduce((sum, entry) => sum + entry.qty, 0), [cart])

  const categoryOptions = useMemo(() => {
    const options = []
    const seen = new Set()

    const addCategory = (name) => {
      const normalized = titleCase(name)
      if (!normalized) return

      const key = normalized.toLowerCase()
      if (seen.has(key)) return

      seen.add(key)
      options.push(normalized)
    }

    categoryCatalog.forEach(addCategory)
    menuItems.forEach((item) => addCategory(item.category))

    return ['All Items', ...options]
  }, [categoryCatalog, menuItems])

  useEffect(() => {
    if (selectedCategory === 'All Items') return

    const exists = categoryOptions.some((category) => category === selectedCategory)
    if (!exists) {
      setSelectedCategory('All Items')
    }
  }, [categoryOptions, selectedCategory])

  const filteredItems = useMemo(() => {
    let nextItems = menuItems

    if (selectedCategory !== 'All Items') {
      const categoryKey = selectedCategory.toLowerCase()
      nextItems = nextItems.filter((item) => String(item.category || '').toLowerCase() === categoryKey)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      nextItems = nextItems.filter(
        (item) =>
          String(item.name || '').toLowerCase().includes(query) ||
          String(item.description || '').toLowerCase().includes(query),
      )
    }

    return nextItems
  }, [menuItems, searchQuery, selectedCategory])

  const recentOrderItems = useMemo(() => {
    const seen = new Set()
    const result = []
    const menuById = new Map(menuItems.map((item) => [String(item._id), item]))

    for (let index = orderHistory.length - 1; index >= 0 && result.length < 8; index -= 1) {
      const order = orderHistory[index]
      if (!Array.isArray(order?.items)) continue

      for (const orderItem of order.items) {
        const id = String(orderItem?.item?._id || orderItem?.item || '')
        if (!id || seen.has(id)) continue

        const fromMenu = menuById.get(id)
        const fromOrder =
          orderItem?.item && typeof orderItem.item === 'object' ? orderItem.item : null
        const source = fromMenu || fromOrder
        if (!source) continue

        seen.add(id)
        result.push({
          _id: id,
          name: source.name || 'Menu Item',
          fullPrice: source.fullPrice || source.price || 0,
          halfPrice: source.halfPrice,
          imageUrl: source.imageUrl || '',
        })

        if (result.length >= 8) break
      }
    }

    return result
  }, [menuItems, orderHistory])

  const submitOrder = useCallback(async () => {
    const rawPhone = (mpesaPhoneRef.current?.value || '').replace(/\s+/g, '')

    if (!user?._id) {
      setPaymentError('Please sign in to place an order.')
      return
    }

    if (cart.length === 0) {
      setPaymentError('Your cart is empty.')
      return
    }

    if (!/^(\+?254|0)\d{9}$/.test(rawPhone)) {
      setPaymentError('Please enter a valid M-Pesa phone number.')
      return
    }

    setPaymentLoading(true)
    setPaymentError('')

    try {
      const checkoutSnapshot = { ...cartTotals }

      const itemsPayload = cart.map((entry) => ({
        item: entry.item._id,
        qty: entry.qty,
        servingSize: entry.servingSize,
      }))

      const createdOrder = await apiFetch('/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          userId: user._id,
          items: itemsPayload,
          paymentMethod: 'mpesa',
          mpesaPhone: rawPhone,
        }),
      })

      if (createdOrder?.error) {
        throw new Error(createdOrder.error)
      }

      setSubmittedTotals(checkoutSnapshot)
      setConfirmedOrder(createdOrder)
      setCart([])
      setScreen(SCREEN.confirmation)

      await requestOrderHistoryData(user._id)
    } catch (error) {
      setPaymentError(error.message || 'Payment request failed. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }, [apiFetch, cart, cartTotals, requestOrderHistoryData, user])

  const requestReturnToMenu = useCallback(() => {
    setScreen(SCREEN.menu)
    setConfirmedOrder(null)
    setSubmittedTotals(null)
    requestMenuAndHistoryRefresh()
  }, [requestMenuAndHistoryRefresh])

  const greeting = getGreeting()
  const userName = user?.name || 'Guest'
  const isGuestMode = !user?._id
  const checkoutDisabled = cart.length === 0 || isGuestMode

  const confirmationTotal = submittedTotals?.total ?? confirmedOrder?.totalAmt ?? 0
  const confirmationSubtotal = submittedTotals?.subtotal ?? confirmedOrder?.totalAmt ?? 0
  const confirmationPackaging = submittedTotals?.packaging ?? 0

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-4xl animate-spin">hourglass_top</span>
          <p className="text-sm text-on-surface-variant">Loading Strathmore Dining...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body pb-24 md:pb-0">
      {isGuestMode && (
        <div className="mx-4 mt-4 md:mx-12 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Guest mode enabled. You can browse menu items and manage your cart without auth. Sign in is required to checkout.
        </div>
      )}

      <>
          <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-12 h-16 bg-surface border-b border-outline-variant">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex items-center text-primary font-bold">
                <img src={SU_LOGO} alt="Strathmore University Logo" className="h-10 w-auto object-contain md:hidden" />
                <div className="hidden md:flex items-center gap-2 text-lg">
                  <img src={SU_LOGO} alt="Strathmore University Logo" className="h-8 w-auto object-contain" />
                  <span>Strathmore Dining</span>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-6 h-full">
                <button className="text-primary border-b-2 border-primary h-full flex items-center px-2 font-semibold bg-transparent cursor-pointer">
                  Menu
                </button>
                <button className="text-on-surface-variant h-full flex items-center px-2 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer rounded">
                  Orders
                </button>
                <button className="text-on-surface-variant h-full flex items-center px-2 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer rounded">
                  Wallet
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative hidden lg:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  value={searchInput}
                  onChange={(event) => requestSearchQueryUpdate(event.target.value)}
                  className="pl-10 pr-4 py-2 rounded-full border-none bg-surface-container text-sm w-64 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Search for food..."
                  type="text"
                />
              </div>

              <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-pointer relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full" />
              </button>

              {isGuestMode ? (
                <button
                  className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-default"
                  title="Guest"
                >
                  <span className="material-symbols-outlined">account_circle</span>
                </button>
              ) : (
                <button
                  onClick={logoutCurrentUser}
                  className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-pointer"
                  title="Logout"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
              )}
            </div>
          </header>

          <main className="max-w-[1600px] mx-auto px-4 md:px-12 pt-4 md:py-8 flex gap-8">
            <div className="flex-grow space-y-8 md:space-y-10 w-full md:max-w-[calc(100%-380px)] lg:max-w-[calc(100%-400px)]">
              {requestError && (
                <div className="rounded-lg border border-error/40 bg-error-container text-on-error-container px-4 py-3 text-sm">
                  {requestError}
                </div>
              )}

              <section className="relative rounded-xl overflow-hidden h-48 items-center px-10 hidden md:flex">
                <img className="absolute inset-0 w-full h-full object-cover" src={HERO_IMAGE} alt="Dining banner" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
                <div className="relative z-10 text-white">
                  <h1 className="text-3xl font-bold mb-2">{greeting}, {userName}</h1>
                  <p className="text-white/85 text-lg">Ready to refuel? The kitchen is open until 8:00 PM.</p>
                </div>
              </section>

              <section className="md:hidden">
                <h1 className="text-3xl font-bold text-primary">{greeting}, {userName}</h1>
                <p className="text-base text-on-surface-variant mt-1">What are you craving today?</p>
              </section>

              {recentOrderItems.length > 0 && (
                <section>
                  <div className="flex justify-between items-end mb-3 md:mb-4">
                    <h2 className="text-lg md:text-xl font-bold text-primary">Quick Re-order</h2>
                    <button
                      onClick={() => requestCategorySelection('All Items')}
                      className="text-primary text-xs md:text-sm font-semibold bg-transparent border-0 cursor-pointer hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="flex overflow-x-auto gap-3 md:gap-4 no-scrollbar pb-1">
                    {recentOrderItems.map((item) => (
                      <div
                        key={item._id}
                        className="flex-shrink-0 w-48 md:w-72 bg-surface-container-lowest rounded-xl border border-outline-variant p-2 md:p-4"
                      >
                        <div className="w-full h-24 rounded-lg bg-surface-container mb-2 md:mb-3 overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                              <span className="material-symbols-outlined">restaurant</span>
                            </div>
                          )}
                        </div>

                        <div className="font-semibold text-sm md:text-base truncate">{item.name}</div>
                        <div className="text-on-surface-variant text-sm">{formatCurrency(item.fullPrice)}</div>

                        <button
                          onClick={() => addItemToCart(item._id)}
                          className="mt-2 w-full py-2 border border-primary text-primary rounded-lg text-xs md:text-sm font-semibold hover:bg-primary-fixed transition-colors cursor-pointer bg-transparent"
                        >
                          Order Again
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-4 md:space-y-6">
                <div className="sticky top-16 z-40 bg-surface/95 backdrop-blur-md py-3 -mx-4 px-4 md:mx-0 md:px-0 flex gap-3 overflow-x-auto no-scrollbar">
                  {categoryOptions.map((category) => (
                    <button
                      key={category}
                      onClick={() => requestCategorySelection(category)}
                      className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        category === selectedCategory
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {filteredItems.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2">restaurant_menu</span>
                      {searchQuery
                        ? `No items match \"${searchQuery}\"`
                        : 'No available menu items for the selected category'}
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item._id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex h-32 md:h-auto md:flex-col shadow-[0_4px_12px_rgba(0,0,0,0.02)] md:shadow-none hover:shadow-lg transition-all group"
                      >
                        <div className="w-1/3 md:w-full h-full md:h-44 lg:h-48 bg-surface-container overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                              <span className="material-symbols-outlined text-4xl">image</span>
                            </div>
                          )}
                        </div>

                        <div className="w-2/3 md:w-full p-3 md:p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-semibold text-sm md:text-lg text-primary line-clamp-2">{item.name}</h3>
                            </div>
                            <p className="text-on-surface-variant text-xs md:text-sm line-clamp-2 mt-1">
                              {item.description || 'Freshly prepared by Strathmore Dining.'}
                            </p>
                          </div>

                          <div className="flex justify-between items-end mt-2 md:mt-4">
                            <span className="font-bold text-base md:text-lg text-primary">
                              {formatCurrency(item.fullPrice || 0)}
                            </span>
                            <button
                              onClick={() => addItemToCart(item._id)}
                              className="w-8 h-8 md:w-10 md:h-10 bg-primary text-on-primary rounded-full md:rounded-lg flex items-center justify-center hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
                            >
                              <span className="material-symbols-outlined">add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <aside className="hidden lg:block w-[360px] flex-shrink-0">
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col h-[calc(100vh-10rem)] sticky top-24 overflow-hidden">
                <div className="p-6 border-b border-outline-variant">
                  <h2 className="text-xl font-bold text-primary flex items-center justify-between">
                    Your Order
                    <span className="bg-secondary text-on-secondary text-xs px-2 py-0.5 rounded-full">
                      {cartCount} item{cartCount !== 1 && 's'}
                    </span>
                  </h2>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-5">
                  {cart.length === 0 ? (
                    <div className="text-center text-on-surface-variant py-8">
                      <span className="material-symbols-outlined text-3xl block mb-2">shopping_cart</span>
                      Your cart is empty
                    </div>
                  ) : (
                    cart.map((cartItem) => {
                      const unitPrice = getCartItemUnitPrice(cartItem)

                      return (
                        <div key={`${cartItem.item._id}-${cartItem.servingSize}`} className="flex gap-4">
                          <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                            {cartItem.item.imageUrl ? (
                              <img
                                src={cartItem.item.imageUrl}
                                alt={cartItem.item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                <span className="material-symbols-outlined">restaurant</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-sm text-primary truncate">{cartItem.item.name}</h4>
                              <span className="text-sm font-bold text-secondary flex-shrink-0 ml-2">
                                {formatCurrency(unitPrice)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              <button
                                onClick={() => updateCartItemQty(cartItem.item._id, -1, cartItem.servingSize)}
                                className="w-6 h-6 rounded border border-outline flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer bg-transparent"
                              >
                                <span className="material-symbols-outlined text-[16px]">remove</span>
                              </button>

                              <span className="text-sm font-bold">{cartItem.qty}</span>

                              <button
                                onClick={() => updateCartItemQty(cartItem.item._id, 1, cartItem.servingSize)}
                                className="w-6 h-6 rounded border border-outline flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer bg-transparent"
                              >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                              </button>

                              <button
                                onClick={() => removeItemFromCart(cartItem.item._id, cartItem.servingSize)}
                                className="ml-auto w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-error transition-colors cursor-pointer bg-transparent"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="p-6 bg-surface-container-low space-y-4 border-t border-outline-variant">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-on-surface-variant">
                      <span>Subtotal</span>
                      <span>{formatCurrency(cartTotals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-on-surface-variant">
                      <span>Packaging</span>
                      <span>{cart.length > 0 ? formatCurrency(cartTotals.packaging) : 'KES 0'}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-primary pt-2 border-t border-outline-variant">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotals.total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => requestScreenChange(SCREEN.checkout)}
                    disabled={checkoutDisabled}
                    className="w-full py-4 bg-primary text-on-primary rounded-lg font-bold text-base hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Proceed to Checkout
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            </aside>
          </main>

          {cartCount > 0 && screen === SCREEN.menu && (
            <button
              onClick={() => requestScreenChange(SCREEN.cartSheet)}
              className="fixed bottom-24 right-4 z-40 md:hidden bg-secondary-container text-on-secondary-container rounded-full px-6 py-4 flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-105 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className="text-xs font-bold">
                {cartCount} Item{cartCount !== 1 && 's'} • {formatCurrency(cartTotals.total)}
              </span>
            </button>
          )}

          {screen === SCREEN.menu && (
            <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 md:hidden bg-surface-container-lowest rounded-t-xl shadow-lg border-t border-outline-variant">
              <button className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 cursor-pointer">
                <span className="material-symbols-outlined fill mb-1">restaurant</span>
                <span className="text-xs font-semibold">Browse Menu</span>
              </button>

              <button
                onClick={() => requestScreenChange(SCREEN.cartSheet)}
                className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 cursor-pointer bg-transparent"
              >
                <span className="material-symbols-outlined mb-1">receipt_long</span>
                <span className="text-xs font-semibold">Orders</span>
              </button>

              <button className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 cursor-pointer bg-transparent">
                <span className="material-symbols-outlined mb-1">account_balance_wallet</span>
                <span className="text-xs font-semibold">Wallet</span>
              </button>

              {isGuestMode ? (
                <button className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 cursor-default bg-transparent">
                  <span className="material-symbols-outlined mb-1">person</span>
                  <span className="text-xs font-semibold">Guest</span>
                </button>
              ) : (
                <button
                  onClick={logoutCurrentUser}
                  className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 cursor-pointer bg-transparent"
                >
                  <span className="material-symbols-outlined mb-1">logout</span>
                  <span className="text-xs font-semibold">Logout</span>
                </button>
              )}
            </nav>
          )}

          {screen === SCREEN.cartSheet && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
              onClick={() => requestScreenChange(SCREEN.menu)}
            >
              <div
                className="bg-surface-container-lowest w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="p-4 border-b border-outline-variant flex justify-between items-center">
                  <h2 className="text-lg font-bold text-primary">Your Order</h2>
                  <button
                    onClick={() => requestScreenChange(SCREEN.menu)}
                    className="text-on-surface-variant bg-transparent border-0 cursor-pointer p-1"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center text-on-surface-variant py-8">Your cart is empty</div>
                  ) : (
                    cart.map((cartItem) => {
                      const unitPrice = getCartItemUnitPrice(cartItem)

                      return (
                        <div key={`${cartItem.item._id}-${cartItem.servingSize}`} className="flex gap-4">
                          <div className="w-14 h-14 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                            {cartItem.item.imageUrl ? (
                              <img
                                className="w-full h-full object-cover"
                                src={cartItem.item.imageUrl}
                                alt={cartItem.item.name}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                <span className="material-symbols-outlined">restaurant</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-sm text-primary truncate">{cartItem.item.name}</h4>
                              <span className="text-sm font-bold text-secondary flex-shrink-0 ml-2">
                                {formatCurrency(unitPrice)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              <button
                                onClick={() => updateCartItemQty(cartItem.item._id, -1, cartItem.servingSize)}
                                className="w-6 h-6 rounded border border-outline flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer bg-transparent"
                              >
                                <span className="material-symbols-outlined text-[16px]">remove</span>
                              </button>
                              <span className="text-sm font-bold">{cartItem.qty}</span>
                              <button
                                onClick={() => updateCartItemQty(cartItem.item._id, 1, cartItem.servingSize)}
                                className="w-6 h-6 rounded border border-outline flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer bg-transparent"
                              >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                              </button>
                              <button
                                onClick={() => removeItemFromCart(cartItem.item._id, cartItem.servingSize)}
                                className="ml-auto w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-error transition-colors cursor-pointer bg-transparent"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="p-4 bg-surface-container-low space-y-3 border-t border-outline-variant">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Packaging</span>
                    <span>{cart.length > 0 ? formatCurrency(cartTotals.packaging) : 'KES 0'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-primary pt-2 border-t border-outline-variant">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotals.total)}</span>
                  </div>

                  <button
                    onClick={() => requestScreenChange(SCREEN.checkout)}
                    disabled={checkoutDisabled}
                    className="w-full py-4 bg-primary text-on-primary rounded-lg font-bold text-base hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Proceed to Checkout
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {screen === SCREEN.checkout && (
            <div
              className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
              onClick={() => requestScreenChange(SCREEN.menu)}
            >
              <div
                className="bg-surface-container-lowest w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-primary">Order Summary</h2>
                  <button
                    onClick={() => requestScreenChange(SCREEN.menu)}
                    className="text-on-surface-variant bg-transparent border-0 cursor-pointer p-1"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {cart.map((cartItem) => {
                    const lineTotal = getCartItemUnitPrice(cartItem) * cartItem.qty
                    return (
                      <div key={`${cartItem.item._id}-${cartItem.servingSize}`} className="flex justify-between text-sm">
                        <span>
                          {cartItem.item.name} x{cartItem.qty}
                        </span>
                        <span>{formatCurrency(lineTotal)}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-outline-variant pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Packaging Fee</span>
                    <span>{formatCurrency(cartTotals.packaging)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-primary pt-2 border-t border-outline-variant">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotals.total)}</span>
                  </div>
                </div>

                <button
                  onClick={() => requestScreenChange(SCREEN.payment)}
                  className="w-full py-4 rounded-lg font-bold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  style={{ backgroundColor: '#49B249', color: 'white' }}
                >
                  <span className="material-symbols-outlined">phone_android</span>
                  Pay with M-Pesa
                </button>

                <p className="text-[10px] text-center text-on-surface-variant uppercase tracking-widest">
                  Secured via Safaricom M-Pesa
                </p>
              </div>
            </div>
          )}

          {screen === SCREEN.payment && (
            <div
              className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
              onClick={() => requestScreenChange(SCREEN.checkout)}
            >
              <div
                className="bg-surface-container-lowest w-full max-w-md rounded-2xl p-6 space-y-5"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: 'rgba(73, 178, 73, 0.1)' }}
                  >
                    <span className="material-symbols-outlined text-3xl" style={{ color: '#49B249' }}>
                      phone_android
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-primary">M-Pesa Payment</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Enter your M-Pesa registered phone number
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    ref={mpesaPhoneRef}
                    type="tel"
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': '#49B249' }}
                    placeholder="07XX XXX XXX"
                    defaultValue="254"
                  />
                </div>

                <div className="flex justify-between font-bold text-lg text-primary border-t border-outline-variant pt-3">
                  <span>Amount</span>
                  <span>{formatCurrency(cartTotals.total)}</span>
                </div>

                <button
                  onClick={submitOrder}
                  disabled={paymentLoading}
                  className="w-full py-4 rounded-lg font-bold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: '#49B249', color: 'white' }}
                >
                  {paymentLoading ? (
                    <span className="material-symbols-outlined animate-spin">hourglass_top</span>
                  ) : (
                    <span className="material-symbols-outlined">lock</span>
                  )}
                  {paymentLoading ? 'Processing...' : 'Pay Now'}
                </button>

                <button
                  onClick={() => requestScreenChange(SCREEN.checkout)}
                  className="w-full py-2 text-on-surface-variant text-sm bg-transparent border-0 cursor-pointer hover:text-primary transition-colors"
                >
                  Cancel
                </button>

                {paymentError && <p className="text-error text-sm text-center">{paymentError}</p>}
              </div>
            </div>
          )}

          {screen === SCREEN.confirmation && confirmedOrder && (
            <div className="fixed inset-0 z-[80] bg-surface flex items-center justify-center p-4">
              <div className="text-center max-w-md mx-auto space-y-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    backgroundColor: '#28A745',
                    boxShadow: '0 0 0 0 rgba(40,167,69,0.4)',
                    animation: 'pulse 2s infinite',
                  }}
                >
                  <span className="material-symbols-outlined text-white text-4xl">check</span>
                </div>

                <h2 className="text-3xl font-bold text-primary">Order Confirmed!</h2>
                <p className="text-base text-on-surface-variant">
                  Your meal is being prepared. Show this QR code at the pickup counter.
                </p>

                <div className="bg-white rounded-xl p-4 inline-block mx-auto shadow-md border border-outline-variant">
                  <img
                    src={buildQrCodeUrl(confirmedOrder._id, userName, confirmationTotal)}
                    alt="Pickup QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>

                <div className="bg-surface-container-low rounded-xl p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">Order #</span>
                    <span>{String(confirmedOrder._id || '').slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Status</span>
                    <span style={{ color: '#28A745' }}>Confirmed</span>
                  </div>

                  {confirmedOrder.items?.map((item, index) => {
                    const itemName = item?.item?.name || 'Item'
                    const itemPrice = item?.item?.fullPrice || 0

                    return (
                      <div key={index} className="flex justify-between">
                        <span>
                          {itemName} x{item.qty}
                        </span>
                        <span>{formatCurrency(itemPrice * item.qty)}</span>
                      </div>
                    )
                  })}

                  <div className="flex justify-between pt-2 border-t border-outline-variant">
                    <span className="font-semibold">Subtotal</span>
                    <span>{formatCurrency(confirmationSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Packaging</span>
                    <span>{formatCurrency(confirmationPackaging)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary pt-2 border-t border-outline-variant">
                    <span>Total Paid</span>
                    <span>{formatCurrency(confirmationTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={requestReturnToMenu}
                  className="w-full py-4 bg-primary text-on-primary rounded-lg font-bold text-base hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined">restaurant</span>
                  Back to Menu
                </button>
              </div>
            </div>
          )}
        </>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(40, 167, 69, 0); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fill { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>
    </div>
  )
}
