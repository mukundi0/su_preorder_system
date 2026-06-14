import Category from '../models/Category.js'
import MenuItem from '../models/MenuItem.js'

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
            matchStage,
            {
                $lookup: {
                    from: "menuitems",
                    let: {
                        categoryId: "$_id",
                        categoryName: { $toLower: "$name" }
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ["$category", "$$categoryId"] },
                                        {
                                            $and: [
                                                { $eq: [{ $type: "$category" }, "string"] },
                                                { $eq: [{ $toLower: "$category" }, "$$categoryName"] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "items"
                }
            },
            {
                $addFields: {
                    itemCount: { $size: "$items" }
                }
            },
            {
                $project: {
                    items: 0
                }
            },
            { $sort: { updatedAt: -1 } }
        ]

        const totalPipeline = [
            matchStage,
            { $count: "total" }
        ]

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
        const { name, description, iconName, colorTheme, updatedBy } = req.body

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
            updatedBy: updatedBy || "System"
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
        if (updatedBy !== undefined) updateData.updatedBy = updatedBy

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
