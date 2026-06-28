import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { submitRating, getOrderRatings } from '../controllers/ratingController.js'

const router = express.Router()

router.post('/',               authenticate, submitRating)
router.get('/order/:orderId',  authenticate, getOrderRatings)

export default router
