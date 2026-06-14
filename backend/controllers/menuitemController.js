import cloudinary from '../config/cloudinary.js'
import MenuItem from '../models/MenuItem.js'

function parseOptionalNumber(value) {
    if (value === undefined || value === null || value === '') return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
}

export async function getMenuItems(req, res) {
    try {
        const { search, available, category } = req.query

        let filter = {}

        if (search) {
            filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: "i" }
        }

        if (available !== undefined) {
            filter.isAvailable = available === "true"
        }

        if (category && category !== "all") {
            filter.category = category
        }

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

        const newMenuItem = await MenuItem.create({
            name,
            category,
            halfPrice,
            fullPrice,
            description: description || "",
            imageUrl: result.secure_url,
            isAvailable: isAvailable === "true" || isAvailable === true
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
        const updateData = { ...req.body }

        if (req.file) {
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
            { 
                returnDocument: "after", 
                runValidators: true 
            }
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
