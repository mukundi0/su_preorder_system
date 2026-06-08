import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"

import {connectDB} from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import menuitemRoutes from './routes/menuitemRoutes.js'

dotenv.config()

const app = express()

// Middleware
app.use(express.json()) // parse JSON bodies (req.body)
app.use(cookieParser()) // for cookies
app.use(express.urlencoded({ extended: false })) // Handing HTML forms

app.get('/', (req, res) => {
    res.send("Welcome to the SU preorder System")
})

// Auth
app.use('/api/auth', authRoutes);

// MenuItem
app.use('/api/menuitems', menuitemRoutes)


const PORT = process.env.PORT || 8000
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`)
    })
})