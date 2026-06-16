import { setServers } from "node:dns/promises";

setServers(["1.1.1.1", "8.8.8.8"]);

import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"

import {connectDB} from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import menuitemRoutes from './routes/menuitemRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import statsRoutes from './routes/statsRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import mpesaRoutes from './routes/mpesaRoutes.js'
import issueRoutes from './routes/issueRoutes.js'


dotenv.config()

const app = express()

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

// Middleware
app.use(express.json()) // parse JSON bodies (req.body)
app.use(cookieParser()) // for cookies
app.use(express.urlencoded({ extended: true })) // Handing HTML forms

app.get('/', (req, res) => {
    res.send("Welcome to the SU preorder System")
})

// Auth
app.use('/api/auth', authRoutes);

// MenuItem
app.use('/api/menuitems', menuitemRoutes)

// Category
app.use('/api/categories', categoryRoutes)

// Stats
app.use('/api/stats', statsRoutes)

// Orders
app.use('/api/orders', orderRoutes)

// Wallet
app.use('/api/wallet', walletRoutes)

// M-Pesa
app.use('/api/mpesa', mpesaRoutes)

// Issues
app.use('/api/issues', issueRoutes)


const PORT = process.env.PORT || 8000
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`)
    })
})