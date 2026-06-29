import express from "express"
import multer from "multer"
import {
    createMenuItem,
    deleteMenuItem,
    getMenuItems,
    updateMenuItem,
    toggleAvailability
} from "../controllers/menuitemController.js"

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

router.get("/", getMenuItems)
router.post("/create", upload.single("image"), createMenuItem)
router.put("/update/:id", upload.single("image"), updateMenuItem)
router.patch("/toggle/:id", toggleAvailability)
router.delete("/delete/:id", deleteMenuItem)

export default router
