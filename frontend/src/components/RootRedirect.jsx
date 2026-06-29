import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (user.role === "student" || user.role === "student_staff") {
    return <Navigate to="/student" replace />
  }

  if (user.role === "admin" || user.role === "kitchen_staff") {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}