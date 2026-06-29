import Category from '../models/Category.js'
import MenuItem from '../models/MenuItem.js'
import Order from '../models/Order.js'

export async function getAllCategories(req, res) {
    try {
        const { page = 1, limit = 10, search = '' } = req.query

        const pageNum = parseInt(page, 10)
        const limitNum = parseInt(limit, 10)
        const skip = (pageNum - 1) * limitNum

        const matchStage = search
            ? {
                $match: {
                    name: { $regex: search, $options: "i" }
                }
            }
            : { $match: {} }


        const pipeline = [
            matchStage, // Search
            {  
                $lookup: { // Join menu items
                    from: "menuitems",
                    localField: "_id",
                    foreignField: "category",
                    as: "items"
                }
            },
            {
                $addFields: { // Count items
                    itemCount: { $size: "$items" }
                }
            },
            {
                $project: { // Remove items array after obtaining "itemCount"
                    items: 0
                }
            },
            { $sort: { updatedAt: -1 } } // Sort by most recently updated (descending order)
        ]

        // Count categories
        const totalPipeline = [
            matchStage,
            { $count: "total" }
        ]

        // Run both queries (pipeline & totalPipeline) simultaneously
        const [categories, totalResult] = await Promise.all([
            Category.aggregate([...pipeline, { $skip: skip }, { $limit: limitNum }]),
            Category.aggregate(totalPipeline)
        ])

        const total = totalResult.length > 0 ? totalResult[0].total : 0
        const totalPages = Math.ceil(total / limitNum)

        res.json({
            categories,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}


export async function createCategory(req, res) {
    try {
        const { name, description, iconName, colorTheme } = req.body

        const normalizedName = name.trim().toLowerCase()

        const existingCategory = await Category.findOne({
            name: normalizedName
        })

        if (existingCategory)
            return res.status(409).json({ error: "Category already exists!" })

        const category = await Category.create({
            name: normalizedName,
            description,
            iconName: iconName || "category",
            colorTheme: colorTheme || "bg-primary-fixed text-primary",
        })

        res.status(201).json(category)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}


export async function updateCategory(req, res) {
    try {
        const { name, description, iconName, colorTheme, updatedBy } = req.body

        const updateData = {}
        if (name !== undefined) updateData.name = name.trim().toLowerCase()
        if (description !== undefined) updateData.description = description
        if (iconName !== undefined) updateData.iconName = iconName
        if (colorTheme !== undefined) updateData.colorTheme = colorTheme

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            updateData,
            { returnDocument: "after" }
        )

        if (!updatedCategory)
            return res.status(404).json({ message: "Category not found!" })

        res.status(200).json(updatedCategory)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}


export async function deleteCategory(req, res) {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id)

        if (!deletedCategory)
            return res.status(404).json({ message: "Category not found" })

        res.status(200).json(deletedCategory)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}


export async function getDemandForecast(req, res) {
    try {
        const now        = new Date()
        const todayDow   = now.getDay()
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
        // Look back 14 days so even a fresh demo with 1-2 days of data works
        const lookbackStart = new Date(todayStart); lookbackStart.setDate(lookbackStart.getDate() - 14)

        const [historicalOrders, todayOrders] = await Promise.all([
            Order.find({
                createdAt:     { $gte: lookbackStart, $lt: todayStart },
                orderStatus:   { $ne: 'cancelled' },
            }).populate('items.item'),
            Order.find({
                createdAt:     { $gte: todayStart },
                orderStatus:   { $ne: 'cancelled' },
            }).populate('items.item'),
        ])

        // Prep guide: group all historical orders by date (any weekday) =
        const byDate = {}
        historicalOrders.forEach(order => {
            const dateStr = new Date(order.createdAt).toISOString().split('T')[0]
            if (!byDate[dateStr]) byDate[dateStr] = {}
            order.items?.forEach(entry => {
                const name = entry.item?.name || 'Unknown'
                byDate[dateStr][name] = (byDate[dateStr][name] || 0) + (entry.qty || 1)
            })
        })

        // Last 7 days that had any orders
        const recentDates = Object.keys(byDate).sort().reverse().slice(0, 7)

        const todayItemQty = {}
        todayOrders.forEach(order => {
            order.items?.forEach(entry => {
                const name = entry.item?.name || 'Unknown'
                todayItemQty[name] = (todayItemQty[name] || 0) + (entry.qty || 1)
            })
        })

        const allItems = new Set()
        recentDates.forEach(d => Object.keys(byDate[d]).forEach(n => allItems.add(n)))

        const prepGuide = Array.from(allItems).map(itemName => {
            // weekData oldest→newest
            const weekData = [...recentDates].reverse().map(d => byDate[d][itemName] || 0)
            const avg      = weekData.length > 0
                ? Math.round(weekData.reduce((s, v) => s + v, 0) / weekData.length)
                : 0

            // trend: compare newest half vs oldest half
            const mid        = Math.ceil(weekData.length / 2)
            const recent     = weekData.slice(mid)
            const older      = weekData.slice(0, mid)
            const recentAvg  = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : avg
            const olderAvg   = older.length  ? older.reduce((s, v) => s + v, 0)  / older.length  : avg
            const trend      = recentAvg > olderAvg * 1.15 ? 'up' : recentAvg < olderAvg * 0.85 ? 'down' : 'stable'

            return { name: itemName, weekData, avg, trend, todayQty: todayItemQty[itemName] || 0 }
        }).sort((a, b) => b.avg - a.avg).slice(0, 10)

        //  Weekly pattern: total orders per day of week 
        const dowTotals   = Array(7).fill(0)
        const dowDayCount = Array.from({ length: 7 }, () => new Set())
        historicalOrders.forEach(order => {
            const d = new Date(order.createdAt)
            dowTotals[d.getDay()]++
            dowDayCount[d.getDay()].add(d.toISOString().split('T')[0])
        })
        const weeklyPattern = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => ({
            day,
            avg:         dowDayCount[i].size > 0 ? Math.round(dowTotals[i] / dowDayCount[i].size) : 0,
            totalOrders: dowTotals[i],
        }))

        const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
        res.json({
            prepGuide,
            weeklyPattern,
            todayDayName:   DAY_NAMES[todayDow],
            daysAnalysed:   recentDates.length,
            periodDates:    recentDates,
        })
    } catch (error) {
        console.error('Error in getDemandForecast:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

export async function getStats(req, res) {
    try {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const [totalCategories, totalItemsResult, thisMonthCategories, categoryHealthRaw] = await Promise.all([
            Category.countDocuments(),
            MenuItem.aggregate([
                { $group: { _id: null, count: { $sum: 1 } } }
            ]),
            Category.countDocuments({ createdAt: { $gte: startOfMonth } }),
            MenuItem.aggregate([
                {
                    $project: {
                        normalizedCategory: {
                            $cond: [
                                { $eq: [{ $type: "$category" }, "string"] },
                                { $trim: { input: { $toLower: "$category" } } },
                                null
                            ]
                        }
                    }
                },
                {
                    $match: {
                        normalizedCategory: { $nin: [null, ""] }
                    }
                },
                {
                    $group: {
                        _id: "$normalizedCategory",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ])
        ])

        const totalItems = totalItemsResult.length > 0 ? totalItemsResult[0].count : 0
        const categoryHealth = categoryHealthRaw.map((entry) => ({
            name: entry._id,
            count: entry.count,
            percentage: totalItems > 0 ? Math.round((entry.count / totalItems) * 100) : 0
        }))

        res.json({
            totalCategories,
            totalItems,
            thisMonthCategories,
            categoryHealth
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}
