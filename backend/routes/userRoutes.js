import express from 'express'
import { getAllUsers, createUser, updateUser, deleteUser, updateProfile } from '../controllers/userController.js'
import { authenticate, authorise } from '../middleware/auth.js'

const router = express.Router()

// Own profile — must come before /:id to avoid conflict
router.put('/profile', authenticate, updateProfile)

// Admin-only user management
router.get('/',     authenticate, authorise('admin'), getAllUsers)
router.post('/',    authenticate, authorise('admin'), createUser)
router.put('/:id',  authenticate, authorise('admin'), updateUser)
router.delete('/:id', authenticate, authorise('admin'), deleteUser)

export default router
