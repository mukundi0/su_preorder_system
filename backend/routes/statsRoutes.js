import express from "express"
import { getStats } from "../controllers/categoryController.js"

const router = express.Router()

router.get('/', getStats)

export default router
