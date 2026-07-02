import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OrdersPage from '../pages/OrdersPage'
import axios from 'axios'

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('jsqr', () => ({ default: vi.fn(() => null) }))

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  })),
}))

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { _id: 'k1', name: 'Chef Joe', role: 'kitchen' } })),
  default: ({ children }) => children,
}))

vi.mock('../components/Sidebar', () => ({ default: () => null }))
vi.mock('../components/KitchenBottomNav', () => ({ default: () => null }))

// ─── Test data ─────────────────────────────────────────────────────────────────

const MOCK_ORDERS = [
  {
    _id: 'o1',
    orderNumber: 'ORD001',
    orderStatus: 'ready for pickup',
    createdAt: new Date().toISOString(),
    totalAmt: 160,
    paymentMethod: 'wallet',
    user: { _id: 'u1', name: 'Alice', email: 'alice@strathmore.edu' },
    items: [
      { qty: 2, item: { _id: 'm1', name: 'Ugali', fullPrice: 100 }, servingSize: 'full' },
    ],
  },
  {
    _id: 'o2',
    orderNumber: 'ORD002',
    orderStatus: 'collected',
    createdAt: new Date().toISOString(),
    collectedAt: new Date().toISOString(),
    totalAmt: 100,
    paymentMethod: 'mpesa',
    user: { _id: 'u2', name: 'Bob', email: 'bob@strathmore.edu' },
    items: [{ qty: 1, item: { _id: 'm2', name: 'Chips', fullPrice: 100 }, servingSize: 'full' }],
  },
  {
    _id: 'o3',
    orderNumber: 'ORD003',
    orderStatus: 'preparing',
    createdAt: new Date().toISOString(),
    totalAmt: 80,
    paymentMethod: 'wallet',
    user: { _id: 'u3', name: 'Carol', email: 'carol@strathmore.edu' },
    items: [{ qty: 1, item: { _id: 'm3', name: 'Chapati', fullPrice: 80 }, servingSize: 'full' }],
  },
]

function renderKitchenPage() {
  return render(
    <MemoryRouter>
      <OrdersPage />
    </MemoryRouter>
  )
}

// ─── Kitchen Staff Tests ──────────────────────────────────────────────────────

describe('Kitchen Staff: Orders Board', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: MOCK_ORDERS })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('shows a loading spinner before orders are fetched', () => {
    // Make the fetch never resolve so we can inspect the loading state
    axios.get.mockReturnValue(new Promise(() => {}))
    renderKitchenPage()
    expect(screen.getByText(/loading order queue/i)).toBeInTheDocument()
  })

  it('renders the Live Operations Board header after loading', async () => {
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByText('Live Operations Board')).toBeInTheDocument()
    })
  })

  it('displays the KPI stat labels (Today, Ready, Collected)', async () => {
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('Ready')).toBeInTheDocument()
      expect(screen.getByText('Collected')).toBeInTheDocument()
    })
  })

  it('shows correct KPI counts based on order statuses', async () => {
    renderKitchenPage()
    // Today=3, Ready=1 (ORD001), Collected=1 (ORD002)
    await waitFor(() => {
      const todayLabel = screen.getByText('Today')
      const todayCount = todayLabel.closest('div').querySelector('p:last-child')
      expect(todayCount.textContent).toBe('3')

      const readyLabel = screen.getByText('Ready')
      const readyCount = readyLabel.closest('div').querySelector('p:last-child')
      expect(readyCount.textContent).toBe('1')

      const collectedLabel = screen.getByText('Collected')
      const collectedCount = collectedLabel.closest('div').querySelector('p:last-child')
      expect(collectedCount.textContent).toBe('1')
    })
  })

  it('renders an order card for orders that are ready for pickup', async () => {
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByText('#ORD001')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('shows the Scan to Complete button on ready orders', async () => {
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scan to complete/i })).toBeInTheDocument()
    })
  })

  it('does not show preparing or collected orders in the kanban column', async () => {
    renderKitchenPage()
    await waitFor(() => screen.getByText('#ORD001'))
    // ORD002 (collected) and ORD003 (preparing) should not appear as order cards
    expect(screen.queryByText('#ORD002')).not.toBeInTheDocument()
    expect(screen.queryByText('#ORD003')).not.toBeInTheDocument()
  })

  it('shows order items within the ready order card', async () => {
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByText('Ugali')).toBeInTheDocument()
    })
  })

  it('shows the Ready for Collection column heading', async () => {
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByText('Ready for Collection')).toBeInTheDocument()
    })
  })

  it('shows empty state in the column when no orders are ready', async () => {
    // Only preparing and collected orders — none are ready
    axios.get.mockResolvedValue({
      data: MOCK_ORDERS.filter((o) => o.orderStatus !== 'ready for pickup'),
    })
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByText('No orders here')).toBeInTheDocument()
    })
  })

  it('shows an error message when the orders fetch fails', async () => {
    axios.get.mockRejectedValue(new Error('Network error'))
    renderKitchenPage()
    await waitFor(() => {
      expect(screen.getByText(/failed to load orders/i)).toBeInTheDocument()
    })
  })

  it('opens the QR scanner modal when Scan to Complete is clicked', async () => {
    renderKitchenPage()
    await waitFor(() => screen.getByRole('button', { name: /scan to complete/i }))

    fireEvent.click(screen.getByRole('button', { name: /scan to complete/i }))

    expect(screen.getByText('Scan Collection Code')).toBeInTheDocument()
  })
})
