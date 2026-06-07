import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"

import {connectDB} from './config/db.js'
import authRoutes from './routes/authRoutes.js'

dotenv.config()

const app = express()

// Middleware
app.use(express.json()) // parse JSON bodies (req.body)
app.use(cookieParser()) // for cookies
app.use(express.urlencoded({ extended: false })) // Handing HTML forms

app.get('/', (req, res) => {
    res.send("Welcome to the SU preorder System")
})

app.use('/api/auth', authRoutes);


const PORT = process.env.PORT || 8000
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`)
    })
})