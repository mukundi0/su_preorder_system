import Issue from '../models/Issue.js'
import Order from '../models/Order.js'

export async function createIssue(req, res) {
  try {
    const userId = req.user.id
    const { orderId, category, description } = req.body

    if (!orderId || !category || !description?.trim()) {
      return res.status(400).json({ error: 'orderId, category, and description are required' })
    }

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ error: 'Order not found' })

    if (order.user.toString() !== userId) {
      return res.status(403).json({ error: 'You can only report issues for your own orders' })
    }

    const issue = await Issue.create({
      order:    orderId,
      user:     userId,
      category,
      description: description.trim(),
    })

    res.status(201).json(issue)
  } catch (err) {
    console.error('Error in createIssue:', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getAllIssues(req, res) {
  try {
    const issues = await Issue.find()
      .populate('user', 'name email')
      .populate({ path: 'order', select: 'orderNumber totalAmt orderStatus' })
      .sort({ createdAt: -1 })
    res.json(issues)
  } catch (err) {
    console.error('Error in getAllIssues:', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function updateIssueStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    const issue = await Issue.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    res.json(issue)
  } catch (err) {
    console.error('Error in updateIssueStatus:', err)
    res.status(500).json({ error: 'Server error' })
  }
}
