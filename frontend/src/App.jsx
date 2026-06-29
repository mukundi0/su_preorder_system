import axios from "axios"

import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import VerifyEmail from "./pages/VerifyEmail"

import AuthContextProvider from "./context/AuthContext"
import { CartProvider } from "./context/CartContext"

import { GoogleOAuthProvider } from "@react-oauth/google"

import CategoryManagement from './pages/CategoryManagement'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import MenuManagementPage from './pages/MenuManagementPage'
import SettingsPage from './pages/SettingsPage'
import StudentOrderPage from './pages/StudentOrderPage'
import Checkout from './pages/Checkout'
import OrderTracking from './pages/OrderTracking'
import WalletPage from './pages/WalletPage'
import ProtectedRoute from "./components/ProtectedRoute"
import RootRedirect from "./components/RootRedirect"
import StudentLayout from "./layouts/StudentLayout"
import StudentProfilePage from "./pages/StudentProfilePage"
import OrderHistoryPage from "./pages/OrderHistoryPage"
import IssuesPage from "./pages/IssuesPage"


// Set axios defaults
const BASE_URL = import.meta.env.MODE == "development" ? "http://localhost:8000/api/" : "/api"

axios.defaults.baseURL = BASE_URL
axios.defaults.withCredentials = true

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthContextProvider>
        <CartProvider>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/verify-email' element={<VerifyEmail />} />

            <Route path="/" element={<RootRedirect />} />

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["student", "student_staff"]}
                />
              }
            >
              <Route element={<StudentLayout />}>
                <Route path="/student" element={<StudentOrderPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders/:orderId/track" element={<OrderTracking />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/profile" element={<StudentProfilePage />} />
                <Route path="/orders/history" element={<OrderHistoryPage />} />
              </Route>
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  allowedRoles={["kitchen_staff", "admin"]}
                />
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="menu-management" element={<MenuManagementPage />} />
              <Route
                path="categories"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CategoryManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="issues" element={<IssuesPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthContextProvider>
    </GoogleOAuthProvider>
  )
}

export default App
