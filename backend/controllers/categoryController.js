import Category from '../models/Category.js'
import MenuItem from '../models/MenuItem.js'

export async function getAllCategories(req, res) {
    try {
        const categories = await Category.aggregate([
            { // lookup acts as a join
                $lookup: {
                    from: "menuitems", // collection to join with
                    localField: "_id",
                    foreignField: "category",
                    as: "items"
                }
            },
            { // project decides which fields should appear in final output
                $project: {
                    name: 1, // keep name, description
                    description: 1,
                    itemCount: { $size: "$items" } // count how many elements are inside 'items'
                }
            }
        ])

        res.json(categories)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}


export async function createCategory(req, res) {
    try {
        const { name } = req.body

        const normalizedName = name.trim().toLowerCase()

        // Check if category already exists
        const existingCategory = await Category.findOne({ 
            name: normalizedName
        })

        if (existingCategory) 
            return res.status(409).json({ error: "Category already exists!" })

        const category = await Category.create({ 
            name: normalizedName
        })

        res.status(201).json(category)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Server error" })
    }
}


export async function updateCategory(req, res) {
    try {
        const { name } = req.body

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { name },
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
