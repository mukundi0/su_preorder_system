import express from "express"
import { getStats, getDemandForecast } from "../controllers/categoryController.js"

const router = express.Router()

router.get('/', getStats)
router.get('/forecast', getDemandForecast)

export default router
