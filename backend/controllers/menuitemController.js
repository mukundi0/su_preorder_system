import cloudinary from '../config/cloudinary.js'
import MenuItem from '../models/MenuItem.js'

function parseOptionalNumber(value) {
    if (value === undefined || value === null || value === '') return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
}

export async function getMenuItems(req, res) {
    try {
        const { search, available, category, mealPeriod, featured, page, limit } = req.query

        const filter = {}

        if (search) {
            filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: "i" }
        }
        if (available !== undefined) {
            filter.isAvailable = available === "true"
        }
        if (category && category !== "all") {
            filter.category = category
        }
        if (mealPeriod && mealPeriod !== 'all-day') {
            filter.$or = [{ mealPeriod }, { mealPeriod: 'all-day' }]
        }
        if (featured === 'true') {
            filter.isFeatured = true
        }

        // Paginated response when `page` param is present (admin table)
        if (page !== undefined) {
            const pageNum  = Math.max(1, parseInt(page, 10) || 1)
            const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
            const skip     = (pageNum - 1) * limitNum

            const [items, total] = await Promise.all([
                MenuItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('category'),
                MenuItem.countDocuments(filter)
            ])

            return res.json({
                items,
                pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
            })
        }

        // Plain array (StudentOrderPage backward-compat)
        const menuItems = await MenuItem.find(filter).sort({ createdAt: -1 }).populate('category')
        res.json(menuItems)
    } catch (error) {
        console.error("getMenuItems error:", error)
        res.status(500).json({ error: "Server error" })
    }
}

export async function createMenuItem(req, res) {
    try {
        const { name, category, description, isAvailable } = req.body
        const halfPrice = parseOptionalNumber(req.body.halfPrice)
        const fullPrice = parseOptionalNumber(req.body.fullPrice)
        const prepTime  = parseOptionalNumber(req.body.prepTime) ?? 0

        if (!req.file) {
            return res.status(400).json({ error: "Image is required" })
        }

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "menuitem_uploads" },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )
            stream.end(req.file.buffer)
        })

        const tags       = req.body.tags ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : []
        const mealPeriod = req.body.mealPeriod || 'all-day'
        const isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true
        const specialNote = req.body.specialNote?.trim() || ''

        const newMenuItem = await MenuItem.create({
            name,
            category,
            halfPrice,
            fullPrice,
            description: description || "",
            imageUrl: result.secure_url,
            isAvailable: isAvailable === "true" || isAvailable === true,
            prepTime: prepTime ?? 0,
            tags,
            mealPeriod,
            isFeatured,
            specialNote,
        })

        res.status(201).json(newMenuItem)
    } catch (error) {
        console.error("createMenuItem error:", error)
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(", ") })
        }
        res.status(500).json({ error: "Server error" })
    }
}

export async function updateMenuItem(req, res) {
    try {
        const updateData = {}

        // Scalar string fields
        if (req.body.name        !== undefined) updateData.name        = req.body.name
        if (req.body.category    !== undefined) updateData.category    = req.body.category
        if (req.body.description !== undefined) updateData.description = req.body.description
        if (req.body.mealPeriod  !== undefined) updateData.mealPeriod  = req.body.mealPeriod
        if (req.body.specialNote !== undefined) updateData.specialNote = req.body.specialNote?.trim() ?? ''

        // Numeric fields — parse from FormData strings
        const halfPrice = parseOptionalNumber(req.body.halfPrice)
        const fullPrice = parseOptionalNumber(req.body.fullPrice)
        const prepTime  = parseOptionalNumber(req.body.prepTime)
        if (halfPrice !== undefined) updateData.halfPrice = halfPrice
        if (fullPrice !== undefined) updateData.fullPrice = fullPrice
        if (prepTime  !== undefined) updateData.prepTime  = prepTime

        // Boolean fields
        if (req.body.isAvailable !== undefined) {
            updateData.isAvailable = req.body.isAvailable === 'true' || req.body.isAvailable === true
        }
        if (req.body.isFeatured !== undefined) {
            updateData.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true
        }

        // Tags — comma-separated string from FormData
        if (req.body.tags !== undefined) {
            updateData.tags = req.body.tags
                ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
                : []
        }

        // Cross-field price guard (pre('validate') does not run on findByIdAndUpdate)
        const hp = updateData.halfPrice
        const fp = updateData.fullPrice
        if (hp != null && fp != null && hp >= fp) {
            return res.status(400).json({ error: 'Half price must be less than full price' })
        }

        // New image: delete old Cloudinary asset first, then upload replacement
        if (req.file) {
            const existing = await MenuItem.findById(req.params.id).select('imageUrl')
            if (existing?.imageUrl) {
                try {
                    const uploadPart = existing.imageUrl.split('/upload/')[1]
                    if (uploadPart) {
                        const publicId = uploadPart
                            .replace(/^v\d+\//, '')
                            .replace(/\.[^/.]+$/, '')
                        await cloudinary.uploader.destroy(publicId)
                    }
                } catch (err) {
                    console.warn('Non-fatal: old Cloudinary image delete failed:', err.message)
                }
            }

            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "menuitem_uploads" },
                    (error, result) => {
                        if (error) reject(error)
                        else resolve(result)
                    }
                )
                stream.end(req.file.buffer)
            })
            updateData.imageUrl = result.secure_url
        }

        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            updateData,
            { returnDocument: "after", runValidators: true }
        ).populate('category')

        if (!updatedMenuItem) {
            return res.status(404).json({ error: "Menu item not found" })
        }

        res.json(updatedMenuItem)
    } catch (error) {
        console.error("updateMenuItem error:", error)
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(", ") })
        }
        res.status(500).json({ error: "Server error" })
    }
}

export async function toggleAvailability(req, res) {
    try {
        const existingItem = await MenuItem.findById(req.params.id).select('isAvailable')

        if (!existingItem)
            return res.status(404).json({ message: "Menu Item not found" })

        const nextAvailability = req.body && req.body.isAvailable !== undefined
            ? req.body.isAvailable === true || req.body.isAvailable === "true"
            : !existingItem.isAvailable

        const updatedItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { $set: { isAvailable: nextAvailability } },
            { returnDocument: "after" }
        ).populate('category')

        res.json(updatedItem)
    } catch (error) {
        console.error("toggleAvailability error:", error)
        res.status(500).json({ error: "Server error" })
    }
}

export async function deleteMenuItem(req, res) {
    try {
        const deletedMenuItem = await MenuItem.findByIdAndDelete(req.params.id)

        if (!deletedMenuItem)
            return res.status(404).json({ message: "Menu Item not found" })

        res.json(deletedMenuItem)
    } catch (error) {
        console.error("deleteMenuItem error:", error)
        res.status(500).json({ error: "Server error" })
    }
}
