import express from "express"
import { registerUser, loginUser, logoutUser, getUser, verifyEmail, resendVerificationEmail, googleAuth } from "../controllers/authController.js"

const router = express.Router()

router.get('/', getUser)
router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/logout', logoutUser)

router.post('/google', googleAuth)

router.get('/verify/:token', verifyEmail)
router.post('/resend-verification', resendVerificationEmail)

export default router