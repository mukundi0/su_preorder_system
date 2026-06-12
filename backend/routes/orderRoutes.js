import express from "express"
import { createOrder, deleteOrder, getAllOrders, getOrder, updateOrder } from "../controllers/orderController"

const router = express.Router()

router.get('/', getAllOrders)
router.get('/:id', getOrder)
router.post('/create', createOrder)
router.put('/update/:id', updateOrder)
router.delete('/delete/:id', deleteOrder)

export default router