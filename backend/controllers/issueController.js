import Issue from '../models/Issue.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import { sendIssueAlert } from '../utils/sendEmail.js'

export async function createIssue(req, res) {
  try {
    const userId   = req.user.id
    const userRole = req.user.role
    const { orderId, category, description } = req.body

    if (!category || !description?.trim()) {
      return res.status(400).json({ error: 'category and description are required' })
    }

    let order = null
    if (orderId) {
      order = await Order.findById(orderId).populate('user', 'name email')
      if (!order) return res.status(404).json({ error: 'Order not found' })
      if (userRole === 'student' && order.user._id.toString() !== userId) {
        return res.status(403).json({ error: 'You can only report issues for your own orders' })
      }
    }

    const issue = await Issue.create({
      order:       orderId || null,
      user:        userId,
      category,
      description: description.trim(),
    })

    // Email all admins — fire and forget
    const reporter = await User.findById(userId).select('name email role')
    const admins   = await User.find({ role: 'admin' }).select('email')
    const adminEmails = admins.map(a => a.email).filter(Boolean)

    if (adminEmails.length > 0 && reporter) {
      sendIssueAlert({
        adminEmails,
        reporterName:  reporter.name  || 'Unknown',
        reporterEmail: reporter.email || '',
        reporterRole:  reporter.role  || userRole,
        orderNumber:   order?.orderNumber || null,
        category,
        description:   description.trim(),
      }).catch(err => console.error('Issue alert email error:', err))
    }

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
      .populate('user', 'name email')
      .populate({ path: 'order', select: 'orderNumber totalAmt orderStatus' })
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    res.json(issue)
  } catch (err) {
    console.error('Error in updateIssueStatus:', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function updateIssueNote(req, res) {
  try {
    const { id } = req.params
    const { adminNote } = req.body
    const issue = await Issue.findByIdAndUpdate(
      id,
      { adminNote: (adminNote || '').trim() },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate({ path: 'order', select: 'orderNumber totalAmt orderStatus' })
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    res.json(issue)
  } catch (err) {
    console.error('Error in updateIssueNote:', err)
    res.status(500).json({ error: 'Server error' })
  }
}
