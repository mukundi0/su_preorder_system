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
    },
    prepTime: {
        type: Number,
        default: 0,
        min: [0, "Prep time cannot be negative"]
    },
    tags: {
        type: [String],
        enum: {
            values: ['vegan', 'vegetarian', 'halal', 'gluten-free', 'spicy', 'contains-nuts'],
            message: '{VALUE} is not a recognised dietary tag'
        },
        default: []
    },
    mealPeriod: {
        type: String,
        enum: {
            values: ['breakfast', 'lunch', 'dinner', 'snack', 'all-day'],
            message: '{VALUE} is not a valid meal period'
        },
        default: 'all-day'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    specialNote: {
        type: String,
        default: ''
    },
    avgRating:   { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
}, { timestamps: true })


MenuItemSchema.pre('validate', function () {
  const { halfPrice, fullPrice } = this

  if (halfPrice == null && fullPrice == null) {
    this.invalidate('price', 'At least one price is required')
  }

  if (halfPrice != null && fullPrice != null && halfPrice >= fullPrice) {
    this.invalidate('halfPrice', 'Half price must be less than full price')
  }
})

const MenuItem = mongoose.model("MenuItem", MenuItemSchema)

export default MenuItem
