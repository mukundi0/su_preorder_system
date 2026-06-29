import mongoose from 'mongoose'

const IssueSchema = new mongoose.Schema({
  order:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  category:    {
    type: String,
    enum: ['wrong_order', 'missing_item', 'food_quality', 'payment', 'other'],
    required: true,
  },
  description: { type: String, required: true, maxlength: 1000 },
  status:      { type: String, enum: ['open', 'in_review', 'resolved'], default: 'open' },
  adminNote:   { type: String, default: '', maxlength: 2000 },
}, { timestamps: true })

export default mongoose.model('Issue', IssueSchema)
