import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from '../context/CartContext'
import StudentOrderPage from '../pages/StudentOrderPage'
import axios from 'axios'

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { _id: 'u1', name: 'Alice', role: 'student' } })),
  default: ({ children }) => children,
}))

vi.mock('../components/StudentBottomNav', () => ({ default: () => null }))

// ─── Test data ─────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES = {
  categories: [
    { _id: 'c1', name: 'Main Course' },
    { _id: 'c2', name: 'Drinks' },
  ],
}

const MOCK_MENU_ITEMS = [
  {
    _id: 'm1',
    name: 'Ugali',
    fullPrice: 100,
    halfPrice: 50,
    isAvailable: true,
    isFeatured: false,
    category: { name: 'Main Course' },
    tags: ['halal'],
    ratingCount: 0,
    description: 'Kenyan staple',
    prepTime: 0,
  },
  {
    _id: 'm2',
    name: 'Soda',
    fullPrice: 60,
    halfPrice: null,
    isAvailable: true,
    isFeatured: false,
    category: { name: 'Drinks' },
    tags: [],
    ratingCount: 0,
    description: 'Cold drink',
    prepTime: 0,
  },
  {
    _id: 'm3',
    name: 'Chapati',
    fullPrice: 40,
    halfPrice: null,
    isAvailable: false,
    isFeatured: false,
    category: { name: 'Main Course' },
    tags: [],
    ratingCount: 0,
    description: 'Flatbread',
    prepTime: 0,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderStudentOrderPage() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <StudentOrderPage />
      </CartProvider>
    </MemoryRouter>
  )
}

// ─── Cart Context ─────────────────────────────────────────────────────────────

describe('Student: Cart', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function renderCart() {
    return renderHook(() => useCart(), { wrapper: CartProvider })
  }

  it('starts empty with checkout disabled', () => {
    const { result } = renderCart()
    expect(result.current.cart).toHaveLength(0)
    expect(result.current.cartCount).toBe(0)
    expect(result.current.checkoutDisabled).toBe(true)
  })

  it('adds a new item to cart', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
    })
    expect(result.current.cart).toHaveLength(1)
    expect(result.current.cart[0].qty).toBe(1)
    expect(result.current.cart[0].item.name).toBe('Ugali')
    expect(result.current.checkoutDisabled).toBe(false)
  })

  it('increments qty when the same item is added twice', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
    })
    expect(result.current.cart).toHaveLength(1)
    expect(result.current.cart[0].qty).toBe(2)
    expect(result.current.cartCount).toBe(2)
  })

  it('creates separate entries for the same item in different serving sizes', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100, halfPrice: 50, servingSize: 'full' })
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100, halfPrice: 50, servingSize: 'half' })
    })
    expect(result.current.cart).toHaveLength(2)
    expect(result.current.cartCount).toBe(2)
  })

  it('removes an item from cart', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
    })
    act(() => {
      result.current.removeItemFromCart('m1', 'full')
    })
    expect(result.current.cart).toHaveLength(0)
    expect(result.current.checkoutDisabled).toBe(true)
  })

  it('increments quantity with updateCartItemQty', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
    })
    act(() => {
      result.current.updateCartItemQty('m1', 1, 'full')
    })
    expect(result.current.cart[0].qty).toBe(2)
  })

  it('removes item when qty reaches zero via updateCartItemQty', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
    })
    act(() => {
      result.current.updateCartItemQty('m1', -1, 'full')
    })
    expect(result.current.cart).toHaveLength(0)
  })

  it('calculates subtotal and total correctly for multiple items', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
      result.current.addItemToCart({ _id: 'm2', name: 'Soda', fullPrice: 60 })
    })
    expect(result.current.cartTotals.subtotal).toBe(160)
    expect(result.current.cartTotals.total).toBe(160)
  })

  it('uses halfPrice when serving size is half', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({
        _id: 'm1', name: 'Ugali', fullPrice: 100, halfPrice: 50, servingSize: 'half',
      })
    })
    expect(result.current.cartTotals.subtotal).toBe(50)
  })

  it('persists cart to localStorage on change', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
    })
    const stored = JSON.parse(localStorage.getItem('cart'))
    expect(stored).toHaveLength(1)
    expect(stored[0].item.name).toBe('Ugali')
  })

  it('clears the cart', () => {
    const { result } = renderCart()
    act(() => {
      result.current.addItemToCart({ _id: 'm1', name: 'Ugali', fullPrice: 100 })
      result.current.clearCart()
    })
    expect(result.current.cart).toHaveLength(0)
  })
})

// ─── Student Order Page ───────────────────────────────────────────────────────

describe('Student: Order Page', () => {
  beforeEach(() => {
    localStorage.clear()
    axios.get.mockImplementation((url) => {
      if (url === '/menuitems') return Promise.resolve({ data: MOCK_MENU_ITEMS })
      if (url === '/categories') return Promise.resolve({ data: MOCK_CATEGORIES })
      if (url === '/orders') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('renders menu items fetched from the API', async () => {
    renderStudentOrderPage()
    await waitFor(() => {
      expect(screen.getByText('Ugali')).toBeInTheDocument()
      expect(screen.getByText('Soda')).toBeInTheDocument()
      expect(screen.getByText('Chapati')).toBeInTheDocument()
    })
  })

  it('shows a Sold Out overlay for unavailable menu items', async () => {
    renderStudentOrderPage()
    await waitFor(() => screen.getByText('Chapati'))
    const soldOutBadges = screen.getAllByText('Sold Out')
    expect(soldOutBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders category filter buttons from the API', async () => {
    renderStudentOrderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all items/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /main course/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /drinks/i })).toBeInTheDocument()
    })
  })

  it('filters items when a category button is clicked', async () => {
    renderStudentOrderPage()
    await waitFor(() => screen.getByText('Ugali'))

    fireEvent.click(screen.getByRole('button', { name: /drinks/i }))

    await waitFor(() => {
      expect(screen.getByText('Soda')).toBeInTheDocument()
      expect(screen.queryByText('Ugali')).not.toBeInTheDocument()
      expect(screen.queryByText('Chapati')).not.toBeInTheDocument()
    })
  })

  it('filters items by search input', async () => {
    renderStudentOrderPage()
    await waitFor(() => screen.getByText('Ugali'))

    const searchInputs = screen.getAllByPlaceholderText(/search/i)
    fireEvent.change(searchInputs[0], { target: { value: 'Soda' } })

    await waitFor(() => {
      expect(screen.getByText('Soda')).toBeInTheDocument()
      expect(screen.queryByText('Ugali')).not.toBeInTheDocument()
    })
  })

  it('shows an empty state when search matches nothing', async () => {
    renderStudentOrderPage()
    await waitFor(() => screen.getByText('Ugali'))

    const searchInputs = screen.getAllByPlaceholderText(/search/i)
    fireEvent.change(searchInputs[0], { target: { value: 'xyz_nothing_here' } })

    await waitFor(() => {
      expect(screen.getByText(/no items match/i)).toBeInTheDocument()
    })
  })

  it('opens the serving size picker for items with a half price', async () => {
    renderStudentOrderPage()
    await waitFor(() => screen.getByText('Ugali'))

    // Ugali has halfPrice — clicking its add button should open the picker
    const ugaliCard = screen.getByText('Ugali').closest('.bg-surface-container-lowest')
    const addBtn = within(ugaliCard).getAllByRole('button').find(
      (btn) => btn.querySelector('.material-symbols-outlined')?.textContent === 'add'
    )
    fireEvent.click(addBtn)

    expect(screen.getByText('Choose your serving size')).toBeInTheDocument()
    expect(screen.getByText('Half Serving')).toBeInTheDocument()
    expect(screen.getByText('Full Serving')).toBeInTheDocument()
  })

  it('does not open the picker for items without a half price', async () => {
    renderStudentOrderPage()
    await waitFor(() => screen.getByText('Soda'))

    // Soda has no halfPrice — clicking add should add directly
    const sodaCard = screen.getByText('Soda').closest('.bg-surface-container-lowest')
    const addBtn = within(sodaCard).getAllByRole('button').find(
      (btn) => btn.querySelector('.material-symbols-outlined')?.textContent === 'add'
    )
    fireEvent.click(addBtn)

    expect(screen.queryByText('Choose your serving size')).not.toBeInTheDocument()
    // Cart counter should reflect the addition
    await waitFor(() => {
      expect(screen.getByText('1 item')).toBeInTheDocument()
    })
  })

  it('displays a greeting with the logged-in user name', async () => {
    renderStudentOrderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/Alice/i).length).toBeGreaterThanOrEqual(1)
    })
  })
})
