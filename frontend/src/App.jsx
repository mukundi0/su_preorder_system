import { Navigate, Route, Routes } from 'react-router-dom'
import CategoryManagement from './pages/CategoryManagement'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import MenuManagementPage from './pages/MenuManagementPage'
import SettingsPage from './pages/SettingsPage'
import StudentOrderPage from './pages/StudentOrderPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentOrderPage />} />
      <Route path="/order" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/menu-management" element={<MenuManagementPage />} />
      <Route path="/categories" element={<CategoryManagement />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
