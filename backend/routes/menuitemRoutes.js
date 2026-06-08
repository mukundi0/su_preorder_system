import express from "express"
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from "../controllers/menuitemController.js"

const router = express.Router()

router.get('/', getMenuItems)
router.post('/create', createMenuItem)
router.put('/update/:id', updateMenuItem)
router.delete('/delete/:id', deleteMenuItem)

export default router