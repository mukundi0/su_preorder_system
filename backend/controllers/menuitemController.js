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

        if (category && category !== "All Categories") {
            filter.category = category
        }

        const menuItems = await MenuItem.find(filter).sort({ createdAt: -1 })

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
        const fallbackPrice = parseOptionalNumber(req.body.price)
        const price = fullPrice ?? halfPrice ?? fallbackPrice

        if (price === undefined) {
            return res.status(400).json({ error: "At least one price is required" })
        }

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
            price,
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
        const existingMenuItem = await MenuItem.findById(req.params.id)

        if (!existingMenuItem)
            return res.status(404).json({ message: "Menu Item not found" })

        const setData = {}
        const unsetData = {}

        if (req.body.name !== undefined) setData.name = req.body.name
        if (req.body.category !== undefined) setData.category = req.body.category
        if (req.body.description !== undefined) setData.description = req.body.description

        if (req.body.isAvailable !== undefined) {
            setData.isAvailable = req.body.isAvailable === "true" || req.body.isAvailable === true
        }

        const hasHalfPriceField = Object.prototype.hasOwnProperty.call(req.body, 'halfPrice')
        const hasFullPriceField = Object.prototype.hasOwnProperty.call(req.body, 'fullPrice')
        const hasPriceField = Object.prototype.hasOwnProperty.call(req.body, 'price')

        const halfPrice = parseOptionalNumber(req.body.halfPrice)
        const fullPrice = parseOptionalNumber(req.body.fullPrice)
        const fallbackPrice = parseOptionalNumber(req.body.price)

        if (hasHalfPriceField) {
            if (halfPrice === undefined) unsetData.halfPrice = 1
            else setData.halfPrice = halfPrice
        }

        if (hasFullPriceField) {
            if (fullPrice === undefined) unsetData.fullPrice = 1
            else setData.fullPrice = fullPrice
        }

        const nextHalfPrice = hasHalfPriceField ? halfPrice : existingMenuItem.halfPrice
        const nextFullPrice = hasFullPriceField ? fullPrice : existingMenuItem.fullPrice

        let nextPrice = hasPriceField ? fallbackPrice : existingMenuItem.price
        if (!hasPriceField && (hasHalfPriceField || hasFullPriceField)) {
            nextPrice = nextFullPrice ?? nextHalfPrice ?? existingMenuItem.price
        }
        if (nextPrice === undefined || nextPrice === null) {
            nextPrice = nextFullPrice ?? nextHalfPrice
        }

        if (nextPrice === undefined || nextPrice === null) {
            return res.status(400).json({ error: "At least one price is required" })
        }

        setData.price = nextPrice

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
            setData.imageUrl = result.secure_url
        }

        const updatePayload = { $set: setData }
        if (Object.keys(unsetData).length > 0) {
            updatePayload.$unset = unsetData
        }

        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            updatePayload,
            { returnDocument: "after", runValidators: true }
        )

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
        )

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
