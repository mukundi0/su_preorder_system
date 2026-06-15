import mongoose from "mongoose"

// Subdocument schema for OrderItems
const OrderItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 1
    },
    servingSize: {
        type: String, 
        enum: ['half', 'full'],
        required: true
    }
})

// Main Order Schame
const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalAmt: { // We can derive this, but what if prices change??
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'received', 'preparing', 'ready for pickup', 'ready', 'completed', 'collected', 'cancelled'],
        default: 'pending'
    },
    items: [OrderItemSchema],
    qrCode:        { type: String },
    qrPin:         { type: String },
    orderNumber:   { type: String },
    pickupCounter:          { type: String, default: 'Counter 1' },
    collectedAt:            { type: Date },
    paymentMethod:          { type: String, enum: ['mpesa', 'wallet'], default: 'mpesa' },
    // M-Pesa payment tracking
    paymentStatus:          { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    mpesaCheckoutRequestId: { type: String },   // returned by Safaricom after STK push
    mpesaReceiptNumber:     { type: String },   // returned by Safaricom in callback
}, { timestamps: true })

const Order = mongoose.model('Order', OrderSchema)

export default Order