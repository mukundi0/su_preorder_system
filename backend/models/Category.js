import mongoose from "mongoose"

const CategorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    iconName: {
        type: String,
        default: "category"
    },
    colorTheme: {
        type: String,
        default: "bg-primary-fixed text-primary"
    }
}, { timestamps: true })

const Category = mongoose.model("Category", CategorySchema)

export default Category
