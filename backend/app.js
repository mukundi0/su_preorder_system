import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

import authRoutes from './routes/authRoutes.js'
import menuitemRoutes from './routes/menuitemRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import statsRoutes from './routes/statsRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import mpesaRoutes from './routes/mpesaRoutes.js'
import issueRoutes from './routes/issueRoutes.js'
import userRoutes from './routes/userRoutes.js'
import ratingRoutes from './routes/ratingRoutes.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => res.send("Welcome to the SU Preorder System"))

app.use('/api/auth', authRoutes)
app.use('/api/menuitems', menuitemRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/mpesa', mpesaRoutes)
app.use('/api/issues', issueRoutes)
app.use('/api/users', userRoutes)
app.use('/api/ratings', ratingRoutes)

export default app
