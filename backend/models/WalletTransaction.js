import mongoose from 'mongoose'

const WalletTransactionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['credit', 'debit'], required: true },
  amount:      { type: Number, required: true },
  description: { type: String, required: true },
  reference:   { type: String },
  status:      { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
}, { timestamps: true })

export default mongoose.model('WalletTransaction', WalletTransactionSchema)
