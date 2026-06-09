import express from "express"
import multer from "multer"
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from "../controllers/menuitemController.js"

const router = express.Router()

// Multer middleware
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new Error("Only image files are allowed"));
        } else {
            cb(null, true)
        }
    }
})

router.get('/', getMenuItems)
router.post('/create', upload.single("image") ,createMenuItem)
router.put('/update/:id', updateMenuItem)
router.delete('/delete/:id', deleteMenuItem)

export default router