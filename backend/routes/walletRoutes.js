import express from 'express'
import { getWallet, topUp } from '../controllers/walletController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authenticate, getWallet)
router.post('/topup', authenticate, topUp)

export default router
