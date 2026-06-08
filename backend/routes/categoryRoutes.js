import express from "express"
import { createCategory, deleteCategory, getAllCategories, updateCategory } from "../controllers/categoryController.js"

const router = express.Router()

router.get('/', getAllCategories)
router.post('/create', createCategory)
router.put('/update/:id', updateCategory)
router.delete('/delete/:id', deleteCategory)

export default router