import express from "express"
import { registerUser, loginUser, logoutUser, getUser } from "../controllers/authController.js"

const router = express.Router()

router.get('/', getUser)
router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/logout', logoutUser)

export default router