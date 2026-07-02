import express from "express"
import { createOrder, cancelOrder, deleteOrder, getAllOrders, getOrder, updateOrder, updateOrderStatus, verifyQR } from "../controllers/orderController.js"
import { authenticate, authorise } from "../middleware/auth.js"

const router = express.Router()

// Students see only their own orders; kitchen staff / admin see all
router.get('/', authenticate, getAllOrders)

// Owner or kitchen staff / admin only
router.get('/:id', authenticate, getOrder)

// Order is created for the authenticated user (not a userId from the body)
router.post('/create', authenticate, createOrder)

router.put('/update/:id', authenticate, authorise('kitchen_staff', 'admin'), updateOrder)
router.delete('/delete/:id', authenticate, authorise('kitchen_staff', 'admin'), deleteOrder)

// Student: cancel their own order
router.post('/:id/cancel', authenticate, cancelOrder)

// Kitchen staff / admin: update order status through the workflow
router.patch('/:id/status', authenticate, authorise('kitchen_staff', 'admin'), updateOrderStatus)

// Kitchen staff: scan QR and mark order collected
router.post('/verify-qr', authenticate, authorise('kitchen_staff', 'admin'), verifyQR)

export default router
