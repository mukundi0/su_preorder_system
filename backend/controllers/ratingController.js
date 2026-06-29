import Rating from '../models/Rating.js'
import MenuItem from '../models/MenuItem.js'
import Order from '../models/Order.js'

export async function submitRating(req, res) {
  try {
    const studentId = req.user.id
    const { orderId, menuItemId, stars } = req.body

    if (!orderId || !menuItemId || !stars) {
      return res.status(400).json({ error: 'orderId, menuItemId, and stars are required' })
    }
    if (stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars must be between 1 and 5' })
    }

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (String(order.user) !== String(studentId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const completed = ['completed', 'collected']
    if (!completed.includes(order.orderStatus)) {
      return res.status(400).json({ error: 'Order must be completed before rating' })
    }
    const hasItem = order.items.some(i => String(i.item) === String(menuItemId))
    if (!hasItem) return res.status(400).json({ error: 'Item not in this order' })

    await Rating.create({ student: studentId, menuItem: menuItemId, order: orderId, stars })

    // Recompute avg and count
    const { Types } = (await import('mongoose')).default
    const agg = await Rating.aggregate([
      { $match: { menuItem: new Types.ObjectId(menuItemId) } },
      { $group: { _id: '$menuItem', avg: { $avg: '$stars' }, count: { $sum: 1 } } }
    ])
    if (agg.length) {
      await MenuItem.findByIdAndUpdate(menuItemId, {
        avgRating: Math.round(agg[0].avg * 10) / 10,
        ratingCount: agg[0].count,
      })
    }

    res.status(201).json({ message: 'Rating submitted' })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Already rated this item for this order' })
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getOrderRatings(req, res) {
  try {
    const { orderId } = req.params
    const ratings = await Rating.find({ order: orderId, student: req.user.id }).select('menuItem stars')
    res.json(ratings)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
}
