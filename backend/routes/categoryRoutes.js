import express from "express"
import { createCategory, deleteCategory, getAllCategories, updateCategory } from "../controllers/categoryController.js"
import { authenticate, authorise } from "../middleware/auth.js"

const router = express.Router()

const staffOnly = [authenticate, authorise('kitchen_staff', 'admin')]

// Browsing categories is public; all writes are staff-only
router.get('/', getAllCategories)
router.post('/', staffOnly, createCategory)
router.put('/:id', staffOnly, updateCategory)
router.delete('/:id', staffOnly, deleteCategory)

export default router
