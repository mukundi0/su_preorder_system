import User from '../models/User.js'
import WalletTransaction from '../models/WalletTransaction.js'

export async function getWallet(req, res) {
  try {
    const userId = req.user.id
    const user = await User.findById(userId).select('name walletBalance')
    if (!user) return res.status(404).json({ error: 'User not found' })

    const transactions = await WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20)

    res.json({ balance: user.walletBalance, transactions })
  } catch (error) {
    console.error('Error in getWallet:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// Admin / sandbox convenience top-up (bypasses M-Pesa).
// Real wallet top-ups go through POST /api/mpesa/topup (STK push).
export async function topUp(req, res) {
  try {
    const userId = req.user.id
    const { amount } = req.body

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }

    const numAmount = Number(amount)

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: numAmount } },
      { new: true }
    ).select('walletBalance')

    const tx = await WalletTransaction.create({
      user:        userId,
      type:        'credit',
      amount:      numAmount,
      description: 'Manual Top Up',
      reference:   `MANUAL-${Date.now()}`,
      status:      'completed',
    })

    res.json({ balance: user.walletBalance, transaction: tx })
  } catch (error) {
    console.error('Error in topUp:', error)
    res.status(500).json({ error: 'Server error' })
  }
}
