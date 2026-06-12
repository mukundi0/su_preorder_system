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
        enum: ['pending', 'preparing', 'ready for pickup', 'completed', 'cancelled'],
        default: 'pending'
    },
    items: [OrderItemSchema],
}, { timestamps: true })

const Order = mongoose.model('Order', OrderSchema)

export default Order