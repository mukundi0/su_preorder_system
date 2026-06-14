import mongoose from "mongoose"

const MenuItemSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Item name is required"],
        set: (value) =>
            value
                .toLowerCase()
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    halfPrice: {
        type: Number,
        min: [0, "Half price cannot be negative"]
    },
    fullPrice: {
        type: Number,
        min: [0, "Full price cannot be negative"],
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    imageUrl: {
        type: String,
        required: [true, "Image URL is required"]
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })


MenuItemSchema.pre('validate', function () {
  const {halfPrice, fullPrice } = this

  if (halfPrice == null && fullPrice == null) {
    this.invalidate('price', 'At least one price is required')
  }
})

const MenuItem = mongoose.model("MenuItem", MenuItemSchema)

export default MenuItem
