import MenuItem from '../models/MenuItem.js'

export async function getMenuItems(req, res) {
    try {
        const menuItems = await MenuItem.find()

        res.json(menuItems)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error!" })
    }
}

export async function createMenuItem(req, res) {
    try {
        const { name, fullPrice, halfPrice } = req.body

        const newMenuItem = await MenuItem.create({
            name, fullPrice, halfPrice 
        })

        res.status(201).json(newMenuItem)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}


export async function updateMenuItem(req, res) {
    try {
        const updateData = req.body

        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id, 
            { $set: updateData },
            { 
                returnDocument: "after"
            }
        )

        if (!updatedMenuItem)
            return res.status(404).json({ message: "Menu Item not found!" })

        res.status(200).json(updatedMenuItem)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}

export async function deleteMenuItem(req, res) {
    try {
        const deletedMenuItem = await MenuItem.findByIdAndDelete(req.params.id)
        
        if (!deletedMenuItem)
            return res.status(404).json({ message: "Menu Item not found" })

        res.status(200).json(deletedMenuItem)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}