import MenuItem from "../models/MenuItem.js"
import Order from "../models/Order.js"
import User from "../models/User.js"
import WalletTransaction from "../models/WalletTransaction.js"
import generateQRCode from "../utils/generateQR.js"
import { sendOrderReady } from "../utils/sendEmail.js"
import { v4 as uuidv4 } from "uuid"

const STAFF_ROLES = ['kitchen_staff', 'admin']

export async function getAllOrders(req, res) {
    try {
        // Staff see every order; students only their own
        const filter = STAFF_ROLES.includes(req.user.role) ? {} : { user: req.user.id }

        const orders = await Order.find(filter)
            .populate({
                path: 'user'
            })
            .populate({
                path: 'items.item'
            }).sort({ createdAt: -1 })

        res.json(orders)
    } catch (error) {
        console.error("Error in getAllOrders Controller:", error)
        res.status(500).json({ error: "Server error" })
    }
}

export async function getOrder(req, res) {
    try {
        const { id } = req.params

        const order = await Order.findById(id)
            .populate([
                { path: 'user'},
                { path: 'items.item' }
            ])

        if (!order) return res.status(404).json({ error: 'Order not found' })

        const isOwner = String(order.user?._id) === String(req.user.id)
        if (!isOwner && !STAFF_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' })
        }

        res.set('Cache-Control', 'no-store')
        res.json(order)
    } catch (error) {
        console.error("Error in getOrder controller:", error)
        res.status(500).json({ error: "Server error" })
    }
}

// Batch-fetch the menu items and price the order.
// Returns { error } on bad input, otherwise { totalAmt, maxPrepTime }.
async function priceOrderItems(items) {
    const menuItems = await MenuItem.find({ _id: { $in: items.map(i => i.item) } })
    const byId = new Map(menuItems.map(m => [String(m._id), m]))

    let totalAmt = 0
    let maxPrepTime = 0

    for (const orderItem of items) {
        const menuItem = byId.get(String(orderItem.item))

        if (!menuItem) {
            return { error: `Item with ID ${orderItem.item} not found!` }
        }

        // Calculate price
        let itemPrice;
        if (orderItem.servingSize == "half") {
            if (!menuItem.halfPrice) {
                return { error: `Menu Item: ${menuItem.name} does not have half Price!` }
            }

            itemPrice = menuItem.halfPrice;
        } else if (orderItem.servingSize == "full") {
            itemPrice = menuItem.fullPrice;
        } else {
            return { error: `Menu item ${menuItem.name} does not have selected serving size` }
        }

        // Add to running total
        totalAmt += itemPrice * orderItem.qty

        // Track longest prep time across all items
        const pt = menuItem.prepTime || 0
        if (pt > maxPrepTime) maxPrepTime = pt
    }

    return { totalAmt, maxPrepTime }
}

export async function createOrder(req, res) {
    try {
        const { items, paymentMethod } = req.body

        // Order is always placed for the authenticated user
        const user = await User.findById(req.user.id)
        if (!user) {
            return res.status(404).json({ error: "User does not exist!" })
        }

        // Check if items are empty
        if (!items || items.length === 0) {
            return res.status(400).json({
                error: "Cart is empty!"
            })
        }

        const { error, totalAmt, maxPrepTime } = await priceOrderItems(items)
        if (error) return res.status(400).json({ error })

        // Fast-fail on an obviously short balance (the real guard is the
        // atomic deduction below)
        if (paymentMethod === 'wallet' && user.walletBalance < totalAmt) {
            return res.status(400).json({ error: 'Insufficient wallet balance' })
        }

        // Generate order number first (needed for QR payload and M-Pesa reference)
        const shortId     = uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase()
        const orderNumber = `STR-${shortId}`

        const method = paymentMethod || 'mpesa'

        // Wallet: deduct immediately, activate order, generate QR
        // M-Pesa: create order in 'pending' state — callback activates it after payment
        let paymentStatus  = method === 'wallet' ? 'paid'     : 'pending'
        let qrDataUrl      = null
        let qrPin          = null

        // Determine initial order status based on prep time
        // M-Pesa orders start pending until payment callback
        // Wallet orders skip straight to preparing or ready based on prep time
        let initialStatus
        let readyAt = null
        if (method === 'wallet') {
            if (maxPrepTime === 0) {
                initialStatus = 'ready for pickup'
            } else {
                initialStatus = 'preparing'
                readyAt = new Date(Date.now() + maxPrepTime * 60000)
            }
        } else {
            initialStatus = 'pending'
        }

        if (method === 'wallet') {
            const qrPayload = JSON.stringify({
                orderId:     'PLACEHOLDER', // filled in after order.create below
                orderNumber,
                userId:      user._id.toString(),
                timestamp:   new Date().toISOString()
            })
            qrDataUrl = await generateQRCode(qrPayload)
            qrPin     = shortId
        }

        // Create order
        const order = await Order.create({
            user: user._id,
            totalAmt,
            items,
            paymentMethod:  method,
            paymentStatus,
            orderNumber,
            orderStatus:    initialStatus,
            ...(readyAt ? { readyAt } : {}),
            ...(qrDataUrl ? { qrCode: qrDataUrl, qrPin } : {}),
        })

        // For wallet: regenerate QR with the real orderId now that we have it
        if (method === 'wallet') {
            const qrPayload = JSON.stringify({
                orderId:     order._id.toString(),
                orderNumber,
                userId:      order.user.toString(),
                timestamp:   new Date().toISOString()
            })
            order.qrCode = await generateQRCode(qrPayload)
            await order.save()

            // Atomic deduction: only succeeds if the balance still covers the
            // total, so two simultaneous orders can't both spend the same money
            const debited = await User.findOneAndUpdate(
                { _id: user._id, walletBalance: { $gte: totalAmt } },
                { $inc: { walletBalance: -totalAmt } }
            )
            if (!debited) {
                await Order.findByIdAndDelete(order._id)
                return res.status(400).json({ error: 'Insufficient wallet balance' })
            }

            await WalletTransaction.create({
                user: user._id,
                type: 'debit',
                amount: totalAmt,
                description: `Order Payment - ${orderNumber}`,
                reference: orderNumber,
                status: 'completed',
            })
        }

        const populatedOrder = await Order.findById(order._id)
            .populate([
                { path: 'user'},
                { path: 'items.item' }
            ])

        // Only email when order is immediately ready (pre-prepared items, no wait needed)
        if (method === 'wallet' && maxPrepTime === 0 && populatedOrder.user?.email) {
            sendOrderReady({
                to:            populatedOrder.user.email,
                name:          populatedOrder.user.name,
                orderNumber,
                pickupCounter: populatedOrder.pickupCounter,
            }).catch(err => console.error('Email error:', err))
        }

        return res.status(201).json(populatedOrder)
    } catch (error) {
        console.error("Error in createOrder controller:", error)
        res.status(500).json({ error: "Server error" })
    }
}


// Update order - you can use this to update items in orders
// e.g. when a user removes an item or adds items
// or edits qty
// We can also use this to update orderStatus
export async function updateOrder(req, res) {
    try {
        const { id } = req.params
        const { items, orderStatus } = req.body; // Updated full array of items from frontend


        // Verify order exists
        const existingOrder = await Order.findById(id)
        if (!existingOrder) {
            return res.status(404).json({
                error: "Order does not exist!"
            })
        }

        // Prevent modifications if the order is not pending
        if (existingOrder.orderStatus != "pending") {
            return res.status(400).json({
                error: `Cannot update order. The order is already ${existingOrder.orderStatus}`
            })
        }

        let totalAmt = existingOrder.totalAmt
        let updatedItems = existingOrder.items

        if (items && items.length > 0) {
            const { error, totalAmt: recalculated } = await priceOrderItems(items)
            if (error) return res.status(400).json({ error })

            totalAmt = recalculated
            updatedItems = items
        }

        const finalStatus = orderStatus ? orderStatus.toLowerCase() : existingOrder.orderStatus;

        const updatedOrder = await Order.findByIdAndUpdate(
            id, 
            { 
                items: updatedItems, 
                totalAmt,
                orderStatus: finalStatus
            },
            { new: true, runValidators: true }
        ).populate([
            { path: 'user'},
            { path: 'items.item' }
        ])

        return res.json(updatedOrder)
    } catch (error) {
        console.error("Error in updateOrder controller:", error)
        res.status(500).json({ error: "Server error" })
    }
}

// Background job: advance preparing orders whose readyAt time has passed
export async function autoAdvanceOrders() {
    try {
        const ordersToAdvance = await Order.find({
            orderStatus: 'preparing',
            readyAt: { $lte: new Date() }
        }).populate('user')

        if (ordersToAdvance.length === 0) return

        const ids = ordersToAdvance.map(o => o._id)
        await Order.updateMany({ _id: { $in: ids } }, { $set: { orderStatus: 'ready for pickup' } })
        console.log(`Auto-advanced ${ordersToAdvance.length} order(s) to ready for pickup`)

        // Send ready-for-collection emails (fire-and-forget)
        ordersToAdvance.forEach(order => {
            if (!order.user?.email) return
            sendOrderReady({
                to:            order.user.email,
                name:          order.user.name,
                orderNumber:   order.orderNumber,
                pickupCounter: order.pickupCounter,
            }).catch(err => console.error('Email error:', err))
        })
    } catch (error) {
        console.error('autoAdvanceOrders error:', error)
    }
}

// Kitchen staff / admin: advance order through the workflow
export async function updateOrderStatus(req, res) {
    try {
        const { id } = req.params
        const { orderStatus } = req.body

        const validStatuses = ['pending', 'received', 'preparing', 'ready for pickup', 'ready', 'completed', 'collected', 'cancelled']
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({ error: 'Invalid status' })
        }

        const order = await Order.findByIdAndUpdate(
            id,
            { orderStatus },
            { new: true, runValidators: true }
        ).populate([
            { path: 'user' },
            { path: 'items.item' }
        ])

        if (!order) return res.status(404).json({ error: 'Order not found' })

        res.json(order)
    } catch (error) {
        console.error('Error in updateOrderStatus:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

// For cancelling the order
export async function deleteOrder(req, res) {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)

        if (!deletedOrder)
            return res.status(404).json({ message: "Order not found" })

        res.json(deletedOrder)
    } catch (error) {
        console.error("Error in deleteOrder controller:", error)
        res.status(500).json({ error: "Server error" })
    }
}

// Student: cancel their own order (only while pending/received)
export async function cancelOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id).populate('user')
        if (!order) return res.status(404).json({ error: 'Order not found' })

        if (String(order.user._id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const notCancellable = ['collected', 'completed', 'cancelled']
        if (notCancellable.includes(order.orderStatus)) {
            return res.status(400).json({ error: 'Order has already been collected and cannot be cancelled' })
        }

        order.orderStatus = 'cancelled'
        await order.save()

        // Refund wallet payments
        if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
            await User.findByIdAndUpdate(order.user._id, { $inc: { walletBalance: order.totalAmt } })
            await WalletTransaction.create({
                user:        order.user._id,
                type:        'credit',
                amount:      order.totalAmt,
                description: `Refund - Cancelled Order ${order.orderNumber}`,
                reference:   order.orderNumber,
                status:      'completed',
            })
        }

        res.json({ success: true, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus })
    } catch (error) {
        console.error('Error in cancelOrder:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

// Kitchen staff: verify QR scan and mark order as collected
export async function verifyQR(req, res) {
    try {
        const { orderId, orderNumber } = req.body
        const order = await Order.findById(orderId)

        if (!order)
            return res.status(404).json({ message: 'Order not found' })

        if (order.orderNumber !== orderNumber)
            return res.status(400).json({ message: 'QR mismatch' })

        if (order.orderStatus === 'collected')
            return res.status(400).json({ message: 'Already collected' })

        if (!['ready', 'ready for pickup'].includes(order.orderStatus))
            return res.status(400).json({ message: 'Order is not ready for collection yet' })

        order.orderStatus = 'collected'
        order.collectedAt = new Date()
        await order.save()

        res.json({ success: true, message: 'Order collected', order })
    } catch (error) {
        console.error("Error in verifyQR controller:", error)
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}