import { setServers } from "node:dns/promises";

setServers(["1.1.1.1", "8.8.8.8"]);

import dotenv from "dotenv"
dotenv.config()

import app from './app.js'
import { connectDB } from './config/db.js'
import { autoAdvanceOrders } from './controllers/orderController.js'

const PORT = process.env.PORT || 8000
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`)
        setInterval(autoAdvanceOrders, 30000)
    })
})