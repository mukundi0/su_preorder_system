import express from "express"
import { createOrder, deleteOrder, getAllOrders, getOrder, updateOrder, updateOrderStatus, verifyQR } from "../controllers/orderController.js"
import { authenticate, authorise } from "../middleware/auth.js"

const router = express.Router()

router.get('/', getAllOrders)
router.get('/:id', getOrder)
router.post('/create', createOrder)
router.put('/update/:id', updateOrder)
router.delete('/delete/:id', deleteOrder)

// Kitchen staff / admin: update order status through the workflow
router.patch('/:id/status', authenticate, authorise('kitchen_staff', 'admin'), updateOrderStatus)

// Kitchen staff: scan QR and mark order collected
router.post('/verify-qr', authenticate, authorise('kitchen_staff', 'admin'), verifyQR)

export default router
