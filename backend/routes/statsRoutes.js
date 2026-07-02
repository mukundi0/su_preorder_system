import express from "express"
import { getStats, getDemandForecast } from "../controllers/categoryController.js"
import { authenticate, authorise } from "../middleware/auth.js"

const router = express.Router()

// Sales and forecast data are staff-only
const staffOnly = [authenticate, authorise('kitchen_staff', 'admin')]

router.get('/', staffOnly, getStats)
router.get('/forecast', staffOnly, getDemandForecast)

export default router
