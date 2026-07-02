import express from "express"
import multer from "multer"
import {
    createMenuItem,
    deleteMenuItem,
    getMenuItems,
    updateMenuItem,
    toggleAvailability
} from "../controllers/menuitemController.js"
import { authenticate, authorise } from "../middleware/auth.js"

const router = express.Router()

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new Error("Only image files are allowed"))
        } else {
            cb(null, true)
        }
    }
})

// Browsing the menu is public; all writes are staff-only
router.get("/", getMenuItems)

const staffOnly = [authenticate, authorise('kitchen_staff', 'admin')]

router.post("/create", staffOnly, upload.single("image"), createMenuItem)
router.put("/update/:id", staffOnly, upload.single("image"), updateMenuItem)
router.patch("/toggle/:id", staffOnly, toggleAvailability)
router.delete("/delete/:id", staffOnly, deleteMenuItem)

export default router
