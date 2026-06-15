import axios from "axios"
import { useState, useEffect } from "react"
import { useNavigate } from 'react-router-dom'

import SU_LOGO from '../assets/sulogo.png'
import HERO_IMAGE from '../assets/heroImage.png'
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import StudentBottomNav from "../components/StudentBottomNav"

export default function StudentOrderPage() {
  const { user } = useAuth()

  const navigate = useNavigate()
  const [menuItems, setMenuItems] = useState([])
  const [searchInput, setSearchInput] = useState('')

  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All items')

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
  const [pendingItem, setPendingItem] = useState(null)
  const [selectedSize, setSelectedSize] = useState('full')

  const {
    cart,
    addItemToCart,
    removeItemFromCart,
    updateCartItemQty,
    cartCount,
    cartTotals,
    getCartItemUnitPrice,
    checkoutDisabled
  } = useCart()


  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  function titleCase(value = '') {
    return String(value)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  function formatCurrency(value) {
    return `KES ${(Number(value) || 0).toLocaleString()}`
  }

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const { data } = await axios.get('/menuitems')
        if (!data.error) setMenuItems(data)
      } catch (error) {
        console.error('Failed to fetch menu items:', error)
      }
    }
    fetchMenuItems()
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/categories')
        if (!data.error) {
          setCategories([
            { _id: "all", name: "All items" },
            ...data.categories
          ])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const greeting = getGreeting()

  const requestCheckoutPage = () => {
    if (checkoutDisabled) return
    navigate('/checkout')
  }

  const handleAddClick = (item) => {
    if (item.halfPrice) {
      setPendingItem(item)
      setSelectedSize('full')
    } else {
      addItemToCart(item)
    }
  }

  const handleConfirmSize = () => {
    addItemToCart({ ...pendingItem, servingSize: selectedSize })
    setPendingItem(null)
  }


  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All items' || 
      (item.category && String(item.category.name).toLowerCase() === selectedCategory.toLowerCase())
    const matchesSearch = item.name.toLowerCase().includes(searchInput.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Extracted JSX chunk to reuse between mobile drawer and desktop sidebar
  const renderCartItems = () => (
    cart.length === 0 ? (
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
                <img src={cartItem.item.imageUrl} alt={cartItem.item.name} className="w-full h-full object-cover" />
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
                  {formatCurrency(unitPrice * cartItem.qty)}
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
    )
  )

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')

      navigate('/login')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body pb-24 lg:pb-0">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 md:px-12 h-16 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center text-primary font-bold">
            <img src={SU_LOGO} alt="Strathmore University Logo" className="h-10 w-auto object-contain md:hidden" />
            <div className="hidden md:flex items-center gap-2 text-lg">
              <img src={SU_LOGO} alt="Strathmore University Logo" className="h-8 w-auto object-contain" />
              <span>Strathmore Dining</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center h-full">
            <button className="text-primary border-b-2 border-primary h-full flex items-center px-4 font-semibold bg-transparent cursor-pointer text-sm">Menu</button>
            <button className="text-on-surface-variant h-full flex items-center px-4 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer text-sm">Orders</button>
            <button onClick={() => navigate('/wallet')} className="text-on-surface-variant h-full flex items-center px-4 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer text-sm">Wallet</button>
            <button className="text-on-surface-variant h-full flex items-center px-4 transition-colors hover:bg-surface-container-low bg-transparent cursor-pointer text-sm">Profile</button>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">

          {/* Mobile search bar visible on smaller screens */}
          <div className="relative block lg:hidden">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} 
              className="pl-8 pr-3 py-1.5 rounded-full border-none bg-surface-container text-xs w-40 focus:ring-2 focus:ring-primary outline-none"
              placeholder="Search..."
              type="text"
            />
          </div>

          <div className="relative hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} 
              className="pl-10 pr-4 py-2 rounded-full border-none bg-surface-container text-sm w-64 focus:ring-2 focus:ring-primary outline-none"
              placeholder="Search for food..."
              type="text"
            />
          </div>

          <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-pointer relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full" />
          </button>

          <button onClick={handleLogout} className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 bg-transparent cursor-pointer" title="Logout">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-12 pt-4 md:py-8 flex gap-8">
        <div className="flex-grow space-y-8 md:space-y-10 w-full lg:max-w-[calc(100%-380px)] xl:max-w-[calc(100%-400px)]">
          <section className="relative rounded-xl overflow-hidden h-48 items-center px-10 hidden md:flex">
            <img className="absolute inset-0 w-full h-full object-cover" src={HERO_IMAGE} alt="Dining banner" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
            <div className="relative z-10 text-white">
              <h1 className="text-3xl font-bold mb-2">{greeting}, { user ? user?.name : "Guest" }!</h1>
              <p className="text-white/85 text-lg">Ready to refuel? The kitchen is open until 8:00 PM.</p>
            </div>
          </section>

          <section className="md:hidden">
            <h1 className="text-3xl font-bold text-primary">{greeting}, Guest!</h1>
            <p className="text-base text-on-surface-variant mt-1">What are you craving today?</p>
          </section>

          <section className="space-y-4 md:space-y-6">
            <div className="sticky top-16 z-40 bg-surface/95 backdrop-blur-md py-3 -mx-4 px-4 md:mx-0 md:px-0 flex gap-3 overflow-x-auto no-scrollbar">
              {categories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    category.name.toLowerCase() === selectedCategory.toLowerCase()
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {titleCase(category.name)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {filteredMenuItems.length === 0 ? (
                <div className="col-span-full text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl block mb-2">restaurant_menu</span>
                  {searchInput ? `No items match "${searchInput}"` : 'No available menu items for the selected category'}
                </div>
              ) : (
                filteredMenuItems.map((item) => (
                  <div key={item._id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex h-32 md:h-auto md:flex-col shadow-[0_4px_12px_rgba(0,0,0,0.02)] md:shadow-none hover:shadow-lg transition-all group">
                    <div className="w-1/3 md:w-full h-full md:h-44 lg:h-48 bg-surface-container overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-4xl">image</span>
                        </div>
                      )}
                    </div>

                    <div className="w-2/3 md:w-full p-3 md:p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-sm md:text-lg text-primary line-clamp-2">{item.name}</h3>
                        <p className="text-on-surface-variant text-xs md:text-sm line-clamp-2 mt-1">
                          {item.description || 'Freshly prepared by Strathmore Dining.'}
                        </p>
                      </div>

                      <div className="flex justify-between items-end mt-2 md:mt-4">
                        <div>
                          <span className="font-bold text-base md:text-lg text-primary">{formatCurrency(item.fullPrice)}</span>
                          {item.halfPrice && (
                            <span className="block text-xs text-on-surface-variant mt-0.5">
                              Half: {formatCurrency(item.halfPrice)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddClick(item)}
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

        {/* Desktop Cart Sidebar (Hidden on mobile/tablet) */}
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
              {renderCartItems()}
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
                onClick={requestCheckoutPage}
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

      {/* Cart FAB — floats above the bottom nav when cart has items (mobile only) */}
      {cart.length > 0 && (
        <div className="fixed bottom-[72px] right-4 z-40 md:hidden">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="bg-secondary-container text-on-secondary-container rounded-full px-5 py-3.5 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
            <span className="font-bold text-sm">{cartCount} item{cartCount !== 1 && 's'} · {formatCurrency(cartTotals.total)}</span>
            <span className="material-symbols-outlined text-sm">expand_less</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden flex flex-col justify-end">
          <div className="flex-grow" onClick={() => setIsMobileCartOpen(false)} />
          
          <div className="bg-surface rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">

            <div className="w-12 h-1 bg-outline-variant rounded-full mx-auto my-3" onClick={() => setIsMobileCartOpen(false)}/>
            
            <div className="px-6 pb-4 border-b border-outline-variant flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                Your Order 
                <span className="bg-secondary text-on-secondary text-xs px-2 py-0.5 rounded-full">{cartCount}</span>
              </h2>
              <button 
                onClick={() => setIsMobileCartOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border-none cursor-pointer text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Scrollable container */}
            <div className="flex-grow overflow-y-auto p-6 space-y-5">
              {renderCartItems()}
            </div>

            {/* Price Calculations & Bottom Sticky Actions */}
            <div className="p-6 bg-surface-container-low space-y-4 border-t border-outline-variant pb-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <span>Packaging</span>
                  <span>{formatCurrency(cartTotals.packaging)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-primary pt-2 border-t border-outline-variant">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotals.total)}</span>
                </div>
              </div>

              <button
                onClick={requestCheckoutPage}
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

      {/* Serving Size Picker Sheet */}
      {pendingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex flex-col justify-end lg:justify-center lg:items-center">
          <div className="flex-grow lg:hidden" onClick={() => setPendingItem(null)} />

          <div className="bg-surface rounded-t-2xl lg:rounded-2xl w-full lg:max-w-sm flex flex-col">
            {/* drag handle */}
            <div
              className="w-12 h-1 bg-outline-variant rounded-full mx-auto mt-3 mb-1 lg:hidden cursor-pointer"
              onClick={() => setPendingItem(null)}
            />

            {/* Item header */}
            <div className="px-6 pt-4 pb-3 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-primary leading-tight">{pendingItem.name}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Choose your serving size</p>
              </div>
              <button
                onClick={() => setPendingItem(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer border-none"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Size options */}
            <div className="px-6 py-4 flex flex-col gap-3">
              {/* Half option — only shown if halfPrice exists */}
              <button
                onClick={() => setSelectedSize('half')}
                className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-colors cursor-pointer text-left ${
                  selectedSize === 'half'
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant bg-surface hover:bg-surface-container-low'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm text-on-surface">Half Serving</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">Smaller portion</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">{formatCurrency(pendingItem.halfPrice)}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedSize === 'half' ? 'border-primary' : 'border-outline'
                  }`}>
                    {selectedSize === 'half' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </div>
              </button>

              {/* Full option */}
              <button
                onClick={() => setSelectedSize('full')}
                className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-colors cursor-pointer text-left ${
                  selectedSize === 'full'
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant bg-surface hover:bg-surface-container-low'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm text-on-surface">Full Serving</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">Standard portion</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">{formatCurrency(pendingItem.fullPrice)}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedSize === 'full' ? 'border-primary' : 'border-outline'
                  }`}>
                    {selectedSize === 'full' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="px-6 pb-8 pt-2 flex flex-col gap-2">
              <button
                onClick={handleConfirmSize}
                className="w-full py-3.5 bg-primary text-on-primary rounded-lg font-bold text-base hover:bg-primary-container transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      <StudentBottomNav active="menu" />
    </div>
  )
}