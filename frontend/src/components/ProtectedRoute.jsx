import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function ProtectedRoute({ allowedRoles, children }) {

    const { user, loading } = useAuth()

    if (loading) return (
        <div>Loading...</div>
    )

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Role not allowed
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === "student" || user.role === "student_staff") {
            return <Navigate to="/student" replace />
        }

        if (user.role === "admin" || user.role === "kitchen_staff") {
            return <Navigate to="/admin/dashboard" replace />
        }
    }

    return children ?? <Outlet />
}

export default ProtectedRoute