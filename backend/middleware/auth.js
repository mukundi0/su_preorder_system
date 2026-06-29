import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export function authenticate(req, res, next) {
    const { token } = req.cookies

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        req.user = decoded
        next()
    } catch {
        return res.status(401).json({ error: 'Token invalid or expired' })
    }
}

// Re-fetches the user's current role from the DB so role changes take effect
// without requiring the user to log out and back in.
export function authorise(...roles) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' })
        }
        try {
            const user = await User.findById(req.user.id).select('role')
            if (!user) return res.status(401).json({ error: 'User not found' })
            if (!roles.includes(user.role)) {
                return res.status(403).json({ error: 'Forbidden' })
            }
            req.user.role = user.role
            next()
        } catch {
            return res.status(500).json({ error: 'Server error' })
        }
    }
}
