import mongoose from "mongoose"

const MenuItemSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        set: (value) => 
            value
                .toLowerCase()
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join("")
    },
    fullPrice: {
        type: Number, 
        required: true
    },
    halfPrice: Number,
    isAvailable: {
        type: Boolean,
        default: true
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    }
})

const MenuItem = mongoose.model("MenuItem", MenuItemSchema)

export default MenuItem