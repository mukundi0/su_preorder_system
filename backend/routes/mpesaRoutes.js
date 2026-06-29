import express from 'express'
import { orderSTKPush, topUpSTKPush, mpesaCallback } from '../controllers/mpesaController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Authenticated — only logged-in users can trigger payments
router.post('/pay-order', authenticate, orderSTKPush)
router.post('/topup',     authenticate, topUpSTKPush)

// No authentication — Safaricom calls this URL directly after payment
router.post('/callback', mpesaCallback)

export default router
