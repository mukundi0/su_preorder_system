import jwt from 'jsonwebtoken'

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

export function authorise(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' })
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' })
        }
        next()
    }
}
