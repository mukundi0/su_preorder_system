import mongoose from "mongoose"

const RatingSchema = new mongoose.Schema({
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  order:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order',    required: true },
  stars:    { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true })

RatingSchema.index({ student: 1, menuItem: 1, order: 1 }, { unique: true })

const Rating = mongoose.model('Rating', RatingSchema)
export default Rating
